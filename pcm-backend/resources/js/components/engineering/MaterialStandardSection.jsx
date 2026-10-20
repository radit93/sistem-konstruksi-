import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function MaterialStandardSection({ user, onToast }) {
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        code: '',
        category: 'Pipe',
        specification: 'ASTM A106 Gr. B Seamless',
        material_group: 'Carbon Steel',
        rating_class: 'N/A',
        schedule: 'Sch 40 / Sch 80',
        size_range: '1/2" - 24"',
        description: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/material-standards');
            setStandards(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load material standards:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const categories = ['ALL', 'Pipe', 'Fitting', 'Flange', 'Valve', 'Gasket', 'Fastener'];

    const filteredStandards = useMemo(() => {
        const q = search.toLowerCase();
        return standards.filter(s => {
            const matchCat = filterCategory === 'ALL' || s.category === filterCategory;
            const matchSearch = !q ||
                (s.code || '').toLowerCase().includes(q) ||
                (s.specification || '').toLowerCase().includes(q) ||
                (s.material_group || '').toLowerCase().includes(q) ||
                (s.schedule || '').toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
    }, [standards, search, filterCategory]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                code: item.code || '',
                category: item.category || 'Pipe',
                specification: item.specification || '',
                material_group: item.material_group || 'Carbon Steel',
                rating_class: item.rating_class || '',
                schedule: item.schedule || '',
                size_range: item.size_range || '',
                description: item.description || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                code: `STD-${String(standards.length + 1).padStart(3, '0')}`,
                category: 'Pipe',
                specification: 'ASTM A106 Gr. B Seamless',
                material_group: 'Carbon Steel',
                rating_class: 'N/A',
                schedule: 'Sch 40',
                size_range: '1/2" - 24"',
                description: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.code.trim() || !form.specification.trim()) {
            setFormError('Kode Standar dan Spesifikasi Material wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/material-standards/${editingItem.id}`, form);
                if (onToast) onToast('Standar Material berhasil diperbarui.');
            } else {
                await api.post('/material-standards', form);
                if (onToast) onToast('Standar Material baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan Standar Material.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus standar material ini?')) return;
        try {
            await api.delete(`/material-standards/${id}`);
            if (onToast) onToast('Standar Material berhasil dihapus.');
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
                    <h2 className="h4 fw-bold text-dark mb-1">Master Standar Material (Material Standards)</h2>
                    <p className="text-muted small mb-0">
                        Katalog acuan spesifikasi teknis material: ASTM standar, kelompok logam (CS/SS/Alloy), rating tekanan, dan schedule ketebalan.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Standar Material
                    </button>
                )}
            </div>

            {/* Category Filter Pills & Search */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="btn-group" role="group">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            className={`btn btn-sm ${filterCategory === cat ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                            onClick={() => setFilterCategory(cat)}
                        >
                            {cat === 'ALL' ? 'Semua Kategori' : cat}
                        </button>
                    ))}
                </div>
                <div style={{ minWidth: '260px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Kode, Spesifikasi ASTM, Group..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.5rem 0.75rem' }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Kode Standar</th>
                                <th className="py-3">Kategori</th>
                                <th className="py-3">Spesifikasi Material</th>
                                <th className="py-3">Material Group</th>
                                <th className="py-3">Rating / Class</th>
                                <th className="py-3">Schedule</th>
                                <th className="py-3">Rentang Ukuran</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 8 : 7} className="text-center py-4 text-muted">
                                        Memuat data Standar Material...
                                    </td>
                                </tr>
                            ) : filteredStandards.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 8 : 7} className="text-center py-4 text-muted">
                                        Tidak ada standar material yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredStandards.map((s) => (
                                    <tr key={s.id}>
                                        <td className="ps-3 fw-bold font-monospace text-primary">{s.code}</td>
                                        <td><span className="badge bg-secondary">{s.category}</span></td>
                                        <td className="fw-semibold">{s.specification}</td>
                                        <td>
                                            <span className={`badge ${s.material_group === 'Stainless Steel' ? 'bg-info text-dark' : s.material_group === 'Alloy Steel' ? 'bg-warning text-dark' : 'bg-dark'}`}>
                                                {s.material_group}
                                            </span>
                                        </td>
                                        <td>{s.rating_class || 'N/A'}</td>
                                        <td><span className="badge bg-light text-dark border font-monospace">{s.schedule || '—'}</span></td>
                                        <td className="small">{s.size_range || '—'}</td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm me-1 px-2 py-1"
                                                    onClick={() => handleOpenModal(s)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    onClick={() => handleDelete(s.id)}
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
                                        {editingItem ? 'Edit Standar Material' : 'Tambah Standar Material Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kode Standar *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.code}
                                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kategori Komponen *</label>
                                            <select
                                                className="form-select"
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="Pipe">Pipe</option>
                                                <option value="Fitting">Fitting</option>
                                                <option value="Flange">Flange</option>
                                                <option value="Valve">Valve</option>
                                                <option value="Gasket">Gasket</option>
                                                <option value="Fastener">Fastener (Bolt &amp; Nut)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Material Group *</label>
                                            <select
                                                className="form-select"
                                                value={form.material_group}
                                                onChange={(e) => setForm({ ...form, material_group: e.target.value })}
                                            >
                                                <option value="Carbon Steel">Carbon Steel</option>
                                                <option value="Stainless Steel">Stainless Steel</option>
                                                <option value="Alloy Steel">Alloy Steel</option>
                                                <option value="Duplex Steel">Duplex Steel</option>
                                                <option value="Structural Steel">Structural Steel</option>
                                            </select>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Spesifikasi Lengkap *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: ASTM A106 Gr. B Seamless"
                                                value={form.specification}
                                                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label className="form-label small fw-bold">Rating / Class</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Class 150# / 300#"
                                                value={form.rating_class}
                                                onChange={(e) => setForm({ ...form, rating_class: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label className="form-label small fw-bold">Schedule / Ketebalan</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Sch 40 / Sch 80"
                                                value={form.schedule}
                                                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Rentang Ukuran</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder='1/2" - 24"'
                                                value={form.size_range}
                                                onChange={(e) => setForm({ ...form, size_range: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Catatan / Keterangan</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Standar'}
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
