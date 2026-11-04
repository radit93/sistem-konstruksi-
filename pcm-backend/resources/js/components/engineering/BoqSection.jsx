import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';

export function BoqSection({ user, projects = [], drawings = [], activeProjectId = '', onToast }) {
    const [boqList, setBoqList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [deleteError, setDeleteError] = useState('');

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

    const scopedBoq = useMemo(
        () => scopeRows(boqList, activeProjectId, filterProject),
        [boqList, activeProjectId, filterProject]
    );

    const scopedDrawings = useMemo(
        () => scopeRows(drawings, activeProjectId, filterProject),
        [drawings, activeProjectId, filterProject]
    );

    const stats = useMemo(() => {
        const totalDI = scopedBoq.reduce((acc, b) => acc + (parseFloat(b.dia_inch_total) || 0), 0);
        const totalJoints = scopedBoq.reduce((acc, b) => acc + (parseInt(b.joints_count, 10) || 0), 0);
        const totalWeight = scopedBoq.reduce((acc, b) => acc + (parseFloat(b.weight_kg) || 0), 0);
        const totalSpools = scopedBoq.reduce((acc, b) => acc + (parseInt(b.spools_count, 10) || 0), 0);
        return { totalDI, totalJoints, totalWeight, totalSpools };
    }, [scopedBoq]);

    const filteredBoq = useMemo(() => {
        const q = search.toLowerCase();
        return scopedBoq.filter(b => {
            const matchSearch = !q ||
                (b.item_code || '').toLowerCase().includes(q) ||
                (b.work_scope || '').toLowerCase().includes(q) ||
                (b.material_group || '').toLowerCase().includes(q) ||
                (b.line_no || '').toLowerCase().includes(q);
            return matchSearch;
        });
    }, [scopedBoq, search]);

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
                drawing_id: scopedDrawings[0]?.id || '',
                project_id: defaultProjectId(activeProjectId, filterProject, projects)
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
        if (!(await confirmDelete('Yakin ingin menghapus item BOQ ini?'))) return;
        setDeleteError('');
        try {
            await api.delete(`/engineering-boqs/${id}`);
            if (onToast) onToast('Item BOQ berhasil dihapus.');
            loadData();
        } catch (err) {
            setDeleteError(err.message || 'Gagal menghapus data.');
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Bill of Quantity (BOQ) Engineering</h2>
                    <p className="pcm-cell-sub mb-0">
                        Perhitungan kuantitas teknis per lingkup pekerjaan: volume diameter-inch (DI), bobot tonase, serta estimasi sambungan las.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Item BOQ
                    </button>
                )}
            </div>

            {deleteError && (
                <div role="alert" className="alert alert-danger py-2 small mb-3">{deleteError}</div>
            )}

            {/* Summary Metrics */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Volume DI</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">{stats.totalDI.toFixed(1)}</strong>
                        <span className="pcm-tile__unit">Dia-Inch</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Sambungan</span>
                        <strong className="pcm-tile__value text-success">{stats.totalJoints}</strong>
                        <span className="pcm-tile__unit">joints</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Spool</span>
                        <strong className="pcm-tile__value">{stats.totalSpools}</strong>
                        <span className="pcm-tile__unit">spools</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Bobot Material</span>
                        <strong className="pcm-tile__value text-dark">{stats.totalWeight.toFixed(0)}</strong>
                        <span className="pcm-tile__unit">kg</span>
                    </div>
                </div>
            </div>

            {/* Search & Project Filter Toolbar */}
            <div className="pcm-filter-bar">
                <div className="pcm-filter-search">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Item Code, Lingkup Pekerjaan, Material Group..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {!isProjectLocked(activeProjectId) && (
                    <select
                        className="form-select form-select-sm"
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="ALL">Semua Proyek ({projects.length})</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.client ? `[${p.client}] ` : ''}{p.name} (JOB: {p.job_no || '-'})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="pcm-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle pcm-table">
                        <thead>
                            <tr>
                                <th className="ps-3">Item Code</th>
                                <th>Lingkup Pekerjaan</th>
                                <th>Material Group</th>
                                <th>Total Dia-Inch</th>
                                <th>Joints</th>
                                <th>Spools</th>
                                <th>Weight (Kg)</th>
                                <th>Status</th>
                                {canEdit && <th className="text-end pe-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                        Memuat data BOQ Engineering...
                                    </td>
                                </tr>
                            ) : filteredBoq.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                        Tidak ada item BOQ yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredBoq.map((b) => (
                                    <tr key={b.id}>
                                        <td className="ps-3 fw-bold pcm-code text-dark">{b.item_code}</td>
                                        <td className="pcm-cell-strong">{b.work_scope}</td>
                                        <td><span className="pcm-chip pcm-chip--neutral">{b.material_group}</span></td>
                                        <td className="fw-bold pcm-code">{parseFloat(b.dia_inch_total).toFixed(1)} DI</td>
                                        <td>{b.joints_count} joints</td>
                                        <td>{b.spools_count} spools</td>
                                        <td className="pcm-code">{parseFloat(b.weight_kg).toFixed(1)} kg</td>
                                        <td>
                                            <span className={`pcm-chip ${b.status === 'APPROVED' ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td className="text-end pe-3 text-nowrap">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm me-1 px-2.5 py-1 fw-bold"
                                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                                                    onClick={() => handleOpenModal(b)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm px-2.5 py-1 fw-bold"
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
