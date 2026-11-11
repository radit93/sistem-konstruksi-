import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { formatRupiah } from '../../currency';
import { PcmSelect } from '../SearchSelect';

export function BudgetCostSection({ project, engBoqs = [], boms = [], user, onToast }) {
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
                labor_cost: 10000,
                equipment_cost: 5000,
                consumable_cost: 5000,
                total_budget: 20000,
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
            const payload = { ...form, project_id: project?.id };
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

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Budget vs Actual Cost Control</h2>
                    <p className="text-muted small mb-0">
                        Pengendalian biaya proyek (Direct &amp; Indirect Cost): alokasi tenaga kerja (Labor), peralatan (Equipment), dan bahan habis pakai (Consumable). Semua nilai dalam Rupiah (IDR).
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Item Anggaran
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Anggaran (Budget)</span>
                        <strong className="h4 fw-bold text-primary mb-0 d-block text-truncate" title={formatRupiah(stats.totalBudget)}>{formatRupiah(stats.totalBudget)}</strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Realisasi Biaya (Actual)</span>
                        <strong className="h4 fw-bold text-success mb-0 d-block text-truncate" title={formatRupiah(stats.totalActual)}>{formatRupiah(stats.totalActual)}</strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Sisa Pagu Anggaran</span>
                        <strong className={`h4 fw-bold mb-0 d-block text-truncate ${stats.budgetVariance < 0 ? 'text-danger' : 'text-dark'}`} title={formatRupiah(stats.budgetVariance)}>
                            {formatRupiah(stats.budgetVariance)}
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Budget Absorption</span>
                        <strong className="h4 fw-bold text-primary mb-0">{stats.burnRatePct}%</strong>
                        <span className="text-muted ms-1 small">terserap</span>
                    </div>
                </div>
            </div>

            {/* Integrasi Biaya Engineering BOQ & Material BOM (Sinkronisasi Pekerjaan Engineering) */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '8px', borderLeft: '4px solid #1d4ed8' }}>
                <div className="card-body py-3 px-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <div>
                            <div className="small fw-bold text-uppercase text-primary">
                                Estimasi Biaya Teknis Dari Engineering (BOQ Jasa Las + Elektroda + Material MTO)
                            </div>
                            <div className="text-muted small">
                                Dihitung otomatis dari tabel Welding Map Engineering BOQ ({(engBoqs || []).length} baris) dan Bill of Materials ({(boms || []).length} item).
                            </div>
                        </div>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold px-2.5 py-1.5">
                            Total Proyeksi Teknis: {formatRupiah(stats.totalEngineeringEstimate)}
                        </span>
                    </div>
                    <div className="row g-2 small">
                        <div className="col-6 col-md-3">
                            <div className="p-2 rounded bg-light border">
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Jasa Fabrikasi &amp; Erection</div>
                                <div className="fw-bold text-dark">{formatRupiah(stats.engWorkTotal)}</div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="p-2 rounded bg-light border">
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Biaya Elektroda Las</div>
                                <div className="fw-bold text-dark">{formatRupiah(stats.engWeldingTotal)}</div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="p-2 rounded bg-light border">
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Pengadaan Material (BOM/MTO)</div>
                                <div className="fw-bold text-dark">{formatRupiah(stats.bomMaterialTotal)}</div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="p-2 rounded bg-light border">
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Alokasi Manpower (Budget)</div>
                                <div className="fw-bold text-dark">{formatRupiah(stats.totalLabor)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Item Code, Deskripsi Scope..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.5rem 0.75rem' }}
                    />
                </div>
                <PcmSelect
                    
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ width: 'auto', borderRadius: '6px' }}
                >
                    <option value="ALL">Semua Kategori</option>
                    <option value="Direct Cost">Direct Cost</option>
                    <option value="Indirect Cost">Indirect Cost</option>
                </PcmSelect>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Item Code</th>
                                <th className="py-3">Kategori</th>
                                <th className="py-3">Deskripsi Scope Biaya</th>
                                <th className="py-3 text-center">Unit</th>
                                <th className="py-3 text-end">Labor Cost</th>
                                <th className="py-3 text-end">Equipment</th>
                                <th className="py-3 text-end">Consumables</th>
                                <th className="py-3 text-end">Total Budget</th>
                                <th className="py-3 text-end">Actual Cost</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Memuat data anggaran biaya...
                                    </td>
                                </tr>
                            ) : filteredBudget.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Tidak ada data anggaran yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredBudget.map((b) => {
                                    const budget = parseFloat(b.total_budget) || 0;
                                    const actual = parseFloat(b.actual_cost) || 0;
                                    const isOver = actual > budget;
                                    return (
                                        <tr key={b.id}>
                                            <td className="ps-3 fw-bold font-monospace text-dark">{b.item_code}</td>
                                            <td><span className="badge bg-secondary">{b.category}</span></td>
                                            <td className="fw-semibold text-dark">{b.scope_description}</td>
                                            <td className="text-center font-monospace">{b.unit}</td>
                                            <td className="text-end">{formatRupiah(b.labor_cost)}</td>
                                            <td className="text-end">{formatRupiah(b.equipment_cost)}</td>
                                            <td className="text-end">{formatRupiah(b.consumable_cost)}</td>
                                            <td className="text-end fw-bold text-dark">{formatRupiah(budget)}</td>
                                            <td className="text-end fw-bold">
                                                <span className={isOver ? 'text-danger' : 'text-success'}>
                                                    {formatRupiah(actual)}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="text-end pe-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
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
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Item Anggaran' : 'Tambah Item Anggaran Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Item Code *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.item_code}
                                                onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kategori</label>
                                            <PcmSelect
                                                
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
                                                step="0.01"
                                                className="form-control"
                                                value={form.labor_cost}
                                                onChange={(e) => {
                                                    const lc = parseFloat(e.target.value) || 0;
                                                    const eq = parseFloat(form.equipment_cost) || 0;
                                                    const cs = parseFloat(form.consumable_cost) || 0;
                                                    setForm({ ...form, labor_cost: lc, total_budget: lc + eq + cs });
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Equipment Cost (Rp)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={form.equipment_cost}
                                                onChange={(e) => {
                                                    const eq = parseFloat(e.target.value) || 0;
                                                    const lc = parseFloat(form.labor_cost) || 0;
                                                    const cs = parseFloat(form.consumable_cost) || 0;
                                                    setForm({ ...form, equipment_cost: eq, total_budget: lc + eq + cs });
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Consumables (Rp)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={form.consumable_cost}
                                                onChange={(e) => {
                                                    const cs = parseFloat(e.target.value) || 0;
                                                    const lc = parseFloat(form.labor_cost) || 0;
                                                    const eq = parseFloat(form.equipment_cost) || 0;
                                                    setForm({ ...form, consumable_cost: cs, total_budget: lc + eq + cs });
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Total Budget (Rp)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control fw-bold"
                                                value={form.total_budget}
                                                onChange={(e) => setForm({ ...form, total_budget: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Realisasi Biaya Aktual (Rp)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={form.actual_cost}
                                                onChange={(e) => setForm({ ...form, actual_cost: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Anggaran'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
