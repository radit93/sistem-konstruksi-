import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function BoqSection({ user, projects = [], drawings = [], onToast }) {
    const [boqList, setBoqList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        item_code: 'BOQ-ENG-FAB-01',
        work_scope: 'Workshop Spool Fabrication Carbon Steel',
        material_group: 'Carbon Steel',
        dia_inch_total: 96.0,
        joints_count: 24,
        spools_count: 4,
        weight_kg: 850.0,
        status: 'APPROVED',
        line_no: '15-MPP-AB',
        drawing_id: '',
        project_id: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/engineering-boqs');
            setBoqList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load engineering BOQ:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const totalDI = boqList.reduce((acc, b) => acc + (parseFloat(b.dia_inch_total) || 0), 0);
        const totalJoints = boqList.reduce((acc, b) => acc + (parseInt(b.joints_count, 10) || 0), 0);
        const totalWeight = boqList.reduce((acc, b) => acc + (parseFloat(b.weight_kg) || 0), 0);
        const totalSpools = boqList.reduce((acc, b) => acc + (parseInt(b.spools_count, 10) || 0), 0);
        return { totalDI, totalJoints, totalWeight, totalSpools };
    }, [boqList]);

    const filteredBoq = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return boqList;
        return boqList.filter(b =>
            (b.item_code || '').toLowerCase().includes(q) ||
            (b.work_scope || '').toLowerCase().includes(q) ||
            (b.material_group || '').toLowerCase().includes(q) ||
            (b.line_no || '').toLowerCase().includes(q)
        );
    }, [boqList, search]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                item_code: item.item_code || '',
                work_scope: item.work_scope || '',
                material_group: item.material_group || 'Carbon Steel',
                dia_inch_total: item.dia_inch_total || 0,
                joints_count: item.joints_count || 0,
                spools_count: item.spools_count || 0,
                weight_kg: item.weight_kg || 0,
                status: item.status || 'ESTIMATED',
                line_no: item.line_no || '15-MPP-AB',
                drawing_id: item.drawing_id || '',
                project_id: item.project_id || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                item_code: `BOQ-ENG-${String(boqList.length + 1).padStart(2, '0')}`,
                work_scope: 'Shop Spool Fabrication Carbon Steel',
                material_group: 'Carbon Steel',
                dia_inch_total: 96.0,
                joints_count: 24,
                spools_count: 4,
                weight_kg: 850.0,
                status: 'ESTIMATED',
                line_no: '15-MPP-AB',
                drawing_id: drawings[0]?.id || '',
                project_id: projects[0]?.id || ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.item_code.trim() || !form.work_scope.trim()) {
            setFormError('Item Code dan Work Scope wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/engineering-boqs/${editingItem.id}`, form);
                if (onToast) onToast('Item BOQ Engineering berhasil diperbarui.');
            } else {
                await api.post('/engineering-boqs', form);
                if (onToast) onToast('Item BOQ Engineering baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan data BOQ.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus item BOQ ini?')) return;
        try {
            await api.delete(`/engineering-boqs/${id}`);
            if (onToast) onToast('Item BOQ berhasil dihapus.');
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Bill of Quantity (BOQ) Engineering</h2>
                    <p className="text-muted small mb-0">
                        Perhitungan kuantitas teknis per lingkup pekerjaan: volume diameter-inch (DI), bobot tonase, serta estimasi sambungan las.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Item BOQ
                    </button>
                )}
            </div>

            {/* Summary Metrics */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Volume DI</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.totalDI.toFixed(1)}</strong>
                        <span className="text-muted ms-1 small">Dia-Inch</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Sambungan</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.totalJoints}</strong>
                        <span className="text-muted ms-1 small">joints</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Spool</span>
                        <strong className="h3 fw-bold text-dark mb-0">{stats.totalSpools}</strong>
                        <span className="text-muted ms-1 small">spools</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Bobot Material</span>
                        <strong className="h3 fw-bold text-warning text-dark mb-0">{stats.totalWeight.toFixed(0)}</strong>
                        <span className="text-muted ms-1 small">kg</span>
                    </div>
                </div>
            </div>

            {/* Search Toolbar */}
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Cari Item Code, Lingkup Pekerjaan, Material Group..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ borderRadius: '6px', padding: '0.65rem 0.85rem' }}
                />
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Item Code</th>
                                <th className="py-3">Lingkup Pekerjaan</th>
                                <th className="py-3">Material Group</th>
                                <th className="py-3">Total Dia-Inch</th>
                                <th className="py-3">Joints</th>
                                <th className="py-3">Spools</th>
                                <th className="py-3">Weight (Kg)</th>
                                <th className="py-3">Status</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 text-muted">
                                        Memuat data BOQ Engineering...
                                    </td>
                                </tr>
                            ) : filteredBoq.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 text-muted">
                                        Tidak ada item BOQ yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredBoq.map((b) => (
                                    <tr key={b.id}>
                                        <td className="ps-3 fw-bold font-monospace text-primary">{b.item_code}</td>
                                        <td className="fw-semibold">{b.work_scope}</td>
                                        <td><span className="badge bg-secondary">{b.material_group}</span></td>
                                        <td className="fw-bold">{parseFloat(b.dia_inch_total).toFixed(1)} DI</td>
                                        <td>{b.joints_count} joints</td>
                                        <td>{b.spools_count} spools</td>
                                        <td>{parseFloat(b.weight_kg).toFixed(1)} kg</td>
                                        <td>
                                            <span className={`badge ${b.status === 'APPROVED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm me-1 px-2 py-1"
                                                    onClick={() => handleOpenModal(b)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    onClick={() => handleDelete(b.id)}
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Add / Edit */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Item BOQ Engineering' : 'Tambah Item BOQ Baru'}
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
                                        <div className="col-12 col-md-8">
                                            <label className="form-label small fw-bold">Lingkup Pekerjaan (Work Scope) *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.work_scope}
                                                onChange={(e) => setForm({ ...form, work_scope: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Material Group</label>
                                            <select
                                                className="form-select"
                                                value={form.material_group}
                                                onChange={(e) => setForm({ ...form, material_group: e.target.value })}
                                            >
                                                <option value="Carbon Steel">Carbon Steel</option>
                                                <option value="Stainless Steel">Stainless Steel</option>
                                                <option value="Alloy Steel">Alloy Steel</option>
                                                <option value="Structural Steel">Structural Steel</option>
                                            </select>
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Total DI</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={form.dia_inch_total}
                                                onChange={(e) => setForm({ ...form, dia_inch_total: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Joints Count</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.joints_count}
                                                onChange={(e) => setForm({ ...form, joints_count: parseInt(e.target.value, 10) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Spools Count</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.spools_count}
                                                onChange={(e) => setForm({ ...form, spools_count: parseInt(e.target.value, 10) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Weight (Kg)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={form.weight_kg}
                                                onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Status Estimasi</label>
                                            <select
                                                className="form-select"
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option value="ESTIMATED">ESTIMATED</option>
                                                <option value="REVIEWED">REVIEWED</option>
                                                <option value="APPROVED">APPROVED</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Line Number Terkait</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.line_no}
                                                onChange={(e) => setForm({ ...form, line_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan BOQ'}
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
