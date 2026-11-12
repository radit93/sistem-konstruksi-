import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { formatRupiah } from '../../currency';
import { PcmSelect } from '../SearchSelect';

export function BudgetCostSection({ project, engBoqs = [], boms = [], joints = [], user, onToast }) {
    const [budgetList, setBudgetList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        item_code: '',
        category: 'Direct Cost',
        scope_description: '',
        unit: 'DI',
        contract_qty: 0,
        unit_price: 0,
        labor_cost: 0,
        equipment_cost: 0,
        consumable_cost: 0,
        total_budget: 0,
        actual_cost: 0,
        currency: 'IDR'
    });

    const canEdit = can(user, 'scope.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const url = project?.id ? `/budget-items?project_id=${project.id}` : '/budget-items';
            const data = await api.get(url);
            const rawList = Array.isArray(data) ? data : [];
            const filtered = project?.id
                ? rawList.filter(b => Number(b.project_id) === Number(project.id) || (!b.project_id && Number(project.id) === 1))
                : rawList;
            setBudgetList(filtered);
        } catch (err) {
            console.error('Failed to load budget items:', err);
        } finally {
            setLoading(false);
        }
    }, [project?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const totalBudget = budgetList.reduce((acc, b) => acc + (parseFloat(b.total_budget) || 0), 0);
        const totalActual = budgetList.reduce((acc, b) => acc + (parseFloat(b.actual_cost) || 0), 0);
        const totalLabor = budgetList.reduce((acc, b) => acc + (parseFloat(b.labor_cost) || 0), 0);
        const totalEquip = budgetList.reduce((acc, b) => acc + (parseFloat(b.equipment_cost) || 0), 0);
        const burnRatePct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

        // Integrasi langsung dari Engineering BOQ & Bill of Materials (MTO)
        const engBoqTotal = (engBoqs || []).reduce((acc, b) => acc + (parseFloat(b.total_amount ?? b.total_price) || 0), 0);
        const engWeldingTotal = (engBoqs || []).reduce((acc, b) => acc + (parseFloat(b.welding_cost_total) || 0), 0);
        const engWorkTotal = Math.max(0, engBoqTotal - engWeldingTotal);
        const bomMaterialTotal = (boms || []).reduce((acc, b) => acc + (parseFloat(b.total_price) || 0), 0);
        const totalEngineeringEstimate = engBoqTotal + bomMaterialTotal;
        const budgetVariance = totalBudget - totalActual;

        return {
            totalBudget,
            totalActual,
            totalLabor,
            totalEquip,
            burnRatePct,
            engBoqTotal,
            engWeldingTotal,
            engWorkTotal,
            bomMaterialTotal,
            totalEngineeringEstimate,
            budgetVariance,
        };
    }, [budgetList, engBoqs, boms]);

    const filteredBudget = useMemo(() => {
        const q = search.toLowerCase();
        return budgetList.filter(b => {
            const matchCat = filterCategory === 'ALL' || b.category === filterCategory;
            const matchSearch = !q ||
                (b.item_code || '').toLowerCase().includes(q) ||
                (b.scope_description || '').toLowerCase().includes(q) ||
                (b.category || '').toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
    }, [budgetList, search, filterCategory]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                item_code: item.item_code || '',
                category: item.category || 'Direct Cost',
                scope_description: item.scope_description || '',
                unit: item.unit || 'DI',
                contract_qty: item.contract_qty || 0,
                unit_price: item.unit_price || 0,
                labor_cost: item.labor_cost || 0,
                equipment_cost: item.equipment_cost || 0,
                consumable_cost: item.consumable_cost || 0,
                total_budget: item.total_budget || 0,
                actual_cost: item.actual_cost || 0,
                currency: 'IDR'
            });
        } else {
            setEditingItem(null);
            setForm({
                item_code: `BUD-${String(budgetList.length + 1).padStart(2, '0')}`,
                category: 'Direct Cost',
                scope_description: '',
                unit: 'DI',
                contract_qty: 1000,
                unit_price: 20,
                labor_cost: 10000000,
                equipment_cost: 5000000,
                consumable_cost: 5000000,
                total_budget: 20000000,
                actual_cost: 0,
                currency: 'IDR'
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.item_code.trim() || !form.scope_description.trim()) {
            setFormError('Kode Item dan Deskripsi Scope wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            const payload = {
                ...form,
                project_id: project?.id,
                labor_cost: parseFloat(form.labor_cost) || 0,
                equipment_cost: parseFloat(form.equipment_cost) || 0,
                consumable_cost: parseFloat(form.consumable_cost) || 0,
                total_budget: parseFloat(form.total_budget) || 0,
                actual_cost: parseFloat(form.actual_cost) || 0,
                contract_qty: parseFloat(form.contract_qty) || 0,
                unit_price: parseFloat(form.unit_price) || 0,
            };
            if (editingItem) {
                await api.put(`/budget-items/${editingItem.id}`, payload);
                if (onToast) onToast('Item Anggaran berhasil diperbarui.');
            } else {
                await api.post('/budget-items', payload);
                if (onToast) onToast('Item Anggaran baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan data anggaran.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!window.confirm(`Hapus item anggaran "${editingItem.item_code} - ${editingItem.scope_description}"?`)) return;
        setFormLoading(true);
        try {
            await api.delete(`/budget-items/${editingItem.id}`);
            if (onToast) onToast('Item Anggaran berhasil dihapus.');
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menghapus item anggaran.');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Budgeting &amp; Cost Control</h2>
                    <p className="text-muted small mb-0">
                        Pagu anggaran (Budget) dan realisasi aktual (Actual Cost) proyek.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Item Anggaran
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles (PCM Design Tokens) */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100 p-3">
                        <span className="pcm-tile__label">Total Anggaran (Budget)</span>
                        <div className="pcm-tile__value pcm-tile__value--primary fw-bold font-monospace" style={{ fontSize: '1.25rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {formatRupiah(stats.totalBudget)}
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100 p-3">
                        <span className="pcm-tile__label">Realisasi Biaya (Actual)</span>
                        <div className="pcm-tile__value text-success fw-bold font-monospace" style={{ fontSize: '1.25rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {formatRupiah(stats.totalActual)}
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100 p-3">
                        <span className="pcm-tile__label">Sisa Pagu Anggaran</span>
                        <div className={`pcm-tile__value fw-bold font-monospace ${stats.budgetVariance < 0 ? 'text-danger' : 'text-dark'}`} style={{ fontSize: '1.25rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {formatRupiah(stats.budgetVariance)}
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100 p-3">
                        <span className="pcm-tile__label">Penyerapan Anggaran</span>
                        <div className="pcm-tile__value fw-bold font-monospace" style={{ fontSize: '1.25rem' }}>
                            {stats.burnRatePct}%
                            <span className="pcm-tile__unit ms-1 fw-normal text-muted" style={{ fontSize: '0.8rem' }}>terserap</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <div style={{ width: '280px', maxWidth: '100%' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Item Code, Deskripsi Scope..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: 'var(--pcm-radius-control)', height: '38px', padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}
                    />
                </div>
                <div style={{ width: '220px', maxWidth: '100%' }}>
                    <PcmSelect
                        searchable={false}
                        clearable={false}
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="ALL">Semua Kategori</option>
                        <option value="Direct Cost">Direct Cost</option>
                        <option value="Indirect Cost">Indirect Cost</option>
                    </PcmSelect>
                </div>
            </div>

            {/* Table dengan Grid Rapi */}
            <div className="card border shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', borderColor: '#cbd5e1' }}>
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.82rem', borderColor: '#cbd5e1' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em', borderColor: '#cbd5e1' }}>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th className="ps-3 py-2.5 text-dark" style={{ width: '130px', borderColor: '#cbd5e1' }}>Item Code</th>
                                <th className="py-2.5 text-dark" style={{ width: '110px', borderColor: '#cbd5e1' }}>Kategori</th>
                                <th className="py-2.5 text-dark" style={{ minWidth: '320px', borderColor: '#cbd5e1' }}>Deskripsi Scope &amp; Komponen Biaya</th>
                                <th className="py-2.5 text-center text-dark" style={{ width: '60px', borderColor: '#cbd5e1' }}>Unit</th>
                                <th className="py-2.5 text-end text-dark" style={{ width: '135px', borderColor: '#cbd5e1' }}>Total Budget</th>
                                <th className="py-2.5 text-end text-dark" style={{ width: '135px', borderColor: '#cbd5e1' }}>Actual Cost</th>
                                <th className="py-2.5 text-end text-dark" style={{ width: '135px', borderColor: '#cbd5e1' }}>Sisa Anggaran</th>
                                {canEdit && <th className="text-center pe-3 py-2.5 text-dark" style={{ width: '85px', borderColor: '#cbd5e1' }}>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody style={{ borderColor: '#cbd5e1' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 8 : 7} className="text-center py-4 text-muted" style={{ borderColor: '#cbd5e1' }}>
                                        Memuat data anggaran biaya...
                                    </td>
                                </tr>
                            ) : filteredBudget.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 8 : 7} className="text-center py-4 text-muted" style={{ borderColor: '#cbd5e1' }}>
                                        Tidak ada data anggaran yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredBudget.map((b) => {
                                    const budget = parseFloat(b.total_budget) || 0;
                                    const actual = parseFloat(b.actual_cost) || 0;
                                    const variance = budget - actual;
                                    const isOver = actual > budget;
                                    const labor = parseFloat(b.labor_cost) || 0;
                                    const equip = parseFloat(b.equipment_cost) || 0;
                                    const consum = parseFloat(b.consumable_cost) || 0;
                                    const hasBreakdown = labor > 0 || equip > 0 || consum > 0;
                                    return (
                                        <tr key={b.id}>
                                            <td className="ps-3 fw-bold font-monospace text-dark" style={{ borderColor: '#cbd5e1' }}>{b.item_code}</td>
                                            <td style={{ borderColor: '#cbd5e1' }}>
                                                <span className="badge px-2 py-1 text-dark border" style={{ backgroundColor: '#f1f5f9' }}>
                                                    {b.category}
                                                </span>
                                            </td>
                                            <td style={{ borderColor: '#cbd5e1' }}>
                                                <div className="fw-semibold text-dark">{b.scope_description}</div>
                                                {hasBreakdown && (
                                                    <div className="text-muted font-monospace mt-0.5" style={{ fontSize: '0.72rem' }}>
                                                        {labor > 0 && <span>Tenaga Kerja: {formatRupiah(labor)}</span>}
                                                        {equip > 0 && <span className="ms-2">&bull; Alat: {formatRupiah(equip)}</span>}
                                                        {consum > 0 && <span className="ms-2">&bull; Bahan: {formatRupiah(consum)}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-center font-monospace" style={{ borderColor: '#cbd5e1' }}>{b.unit}</td>
                                            <td className="text-end fw-bold text-dark font-monospace" style={{ borderColor: '#cbd5e1' }}>{formatRupiah(budget)}</td>
                                            <td className="text-end fw-bold font-monospace" style={{ borderColor: '#cbd5e1' }}>
                                                <span className={isOver ? 'text-danger' : 'text-success'}>
                                                    {formatRupiah(actual)}
                                                </span>
                                            </td>
                                            <td className="text-end fw-bold font-monospace" style={{ borderColor: '#cbd5e1' }}>
                                                <span className={variance < 0 ? 'text-danger' : 'text-dark'}>
                                                    {variance >= 0 ? `+${formatRupiah(variance)}` : formatRupiah(variance)}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="text-center pe-3" style={{ borderColor: '#cbd5e1' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ borderRadius: 'var(--pcm-radius-chip)' }}
                                                        onClick={() => handleOpenModal(b)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit / Add */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content bg-white border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)', backgroundColor: '#ffffff' }}>
                            <form onSubmit={handleSave}>
                                <div className="modal-header border-bottom bg-white">
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        {editingItem ? 'Edit Item Anggaran' : 'Tambah Item Anggaran Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4 bg-white">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Item Code *</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                value={form.item_code}
                                                onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kategori</label>
                                            <PcmSelect
                                                searchable={false}
                                                clearable={false}
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="Direct Cost">Direct Cost</option>
                                                <option value="Indirect Cost">Indirect Cost</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Satuan (Unit)</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Deskripsi Scope Biaya *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.scope_description}
                                                onChange={(e) => setForm({ ...form, scope_description: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Labor Cost (Rp)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                className="form-control font-monospace"
                                                value={form.labor_cost}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const lc = parseFloat(val) || 0;
                                                    const eq = parseFloat(form.equipment_cost) || 0;
                                                    const cs = parseFloat(form.consumable_cost) || 0;
                                                    setForm(prev => ({ ...prev, labor_cost: val, total_budget: lc + eq + cs }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Equipment Cost (Rp)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                className="form-control font-monospace"
                                                value={form.equipment_cost}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const eq = parseFloat(val) || 0;
                                                    const lc = parseFloat(form.labor_cost) || 0;
                                                    const cs = parseFloat(form.consumable_cost) || 0;
                                                    setForm(prev => ({ ...prev, equipment_cost: val, total_budget: lc + eq + cs }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Consumables (Rp)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                className="form-control font-monospace"
                                                value={form.consumable_cost}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const cs = parseFloat(val) || 0;
                                                    const lc = parseFloat(form.labor_cost) || 0;
                                                    const eq = parseFloat(form.equipment_cost) || 0;
                                                    setForm(prev => ({ ...prev, consumable_cost: val, total_budget: lc + eq + cs }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Total Budget (Rp)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                className="form-control fw-bold font-monospace"
                                                value={form.total_budget}
                                                onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold text-dark">Realisasi Biaya Aktual (Input PM / Lapangan) (Rp)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                className="form-control font-monospace fw-bold"
                                                value={form.actual_cost}
                                                onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                                    {editingItem ? (
                                        <button type="button" className="btn btn-outline-danger btn-sm fw-bold" onClick={handleDelete} disabled={formLoading}>
                                            Hapus Item
                                        </button>
                                    ) : <div />}
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} disabled={formLoading}>
                                            {formLoading ? 'Menyimpan...' : 'Simpan Anggaran'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
