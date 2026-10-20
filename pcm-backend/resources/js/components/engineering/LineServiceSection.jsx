import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function LineServiceSection({ user, projects = [], onToast }) {
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        line_no: '',
        service_name: '',
        fluid_code: '',
        piping_class: 'A1A (Carbon Steel 150#)',
        design_press: '10.5 bar',
        design_temp: '120 °C',
        operating_press: '8.0 bar',
        operating_temp: '90 °C',
        test_press: '15.8 bar',
        test_medium: 'Hydrostatic (Water)',
        insulation: 'None',
        project_id: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/line-services');
            setLines(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load line services:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredLines = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return lines;
        return lines.filter(l =>
            (l.line_no || '').toLowerCase().includes(q) ||
            (l.service_name || '').toLowerCase().includes(q) ||
            (l.fluid_code || '').toLowerCase().includes(q) ||
            (l.piping_class || '').toLowerCase().includes(q)
        );
    }, [lines, search]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                line_no: item.line_no || '',
                service_name: item.service_name || '',
                fluid_code: item.fluid_code || '',
                piping_class: item.piping_class || 'A1A (Carbon Steel 150#)',
                design_press: item.design_press || '',
                design_temp: item.design_temp || '',
                operating_press: item.operating_press || '',
                operating_temp: item.operating_temp || '',
                test_press: item.test_press || '',
                test_medium: item.test_medium || 'Hydrostatic (Water)',
                insulation: item.insulation || 'None',
                project_id: item.project_id || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                line_no: '',
                service_name: '',
                fluid_code: '',
                piping_class: 'A1A (Carbon Steel 150#)',
                design_press: '10.5 bar',
                design_temp: '120 °C',
                operating_press: '8.0 bar',
                operating_temp: '90 °C',
                test_press: '15.8 bar',
                test_medium: 'Hydrostatic (Water)',
                insulation: 'None',
                project_id: projects[0]?.id || ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.line_no.trim() || !form.service_name.trim()) {
            setFormError('Nomor Line dan Nama Service wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/line-services/${editingItem.id}`, form);
                if (onToast) onToast('Line Service berhasil diperbarui.');
            } else {
                await api.post('/line-services', form);
                if (onToast) onToast('Line Service baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan Line Service.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus Line Service ini?')) return;
        try {
            await api.delete(`/line-services/${id}`);
            if (onToast) onToast('Line Service berhasil dihapus.');
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus Line Service.');
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Line Service Register</h2>
                    <p className="text-muted small mb-0">
                        Klasifikasi jalur perpipaan, kode fluida, spesifikasi piping class, dan parameter tekanan/temperatur uji.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Line Service
                    </button>
                )}
            </div>

            {/* Filter & Summary Card */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Jalur Pipa</span>
                        <strong className="h3 fw-bold text-primary mb-0">{lines.length}</strong>
                        <span className="text-muted ms-1 small">line numbers</span>
                    </div>
                </div>
                <div className="col-12 col-md-8 d-flex align-items-center">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Cari berdasarkan Line No, Service, Fluid Code, Piping Class..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.65rem 0.85rem' }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Line Number</th>
                                <th className="py-3">Service Name</th>
                                <th className="py-3">Fluid</th>
                                <th className="py-3">Piping Class</th>
                                <th className="py-3">Design (P/T)</th>
                                <th className="py-3">Operating (P/T)</th>
                                <th className="py-3">Test Pressure</th>
                                <th className="py-3">Insulation</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 text-muted">
                                        Memuat data Line Service...
                                    </td>
                                </tr>
                            ) : filteredLines.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 text-muted">
                                        Tidak ada data Line Service yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredLines.map((l) => (
                                    <tr key={l.id}>
                                        <td className="ps-3 fw-bold text-primary font-monospace">{l.line_no}</td>
                                        <td>{l.service_name}</td>
                                        <td><span className="badge bg-secondary">{l.fluid_code || '—'}</span></td>
                                        <td className="font-monospace small">{l.piping_class || '—'}</td>
                                        <td>{l.design_press || '—'} / {l.design_temp || '—'}</td>
                                        <td>{l.operating_press || '—'} / {l.operating_temp || '—'}</td>
                                        <td><span className="badge bg-info text-dark">{l.test_press || '—'}</span> ({l.test_medium || 'Hydro'})</td>
                                        <td>{l.insulation || 'None'}</td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm me-1 px-2 py-1"
                                                    onClick={() => handleOpenModal(l)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    onClick={() => handleDelete(l.id)}
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
                                        {editingItem ? 'Edit Line Service' : 'Tambah Line Service Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Line Number *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: 15-MPP-AB"
                                                value={form.line_no}
                                                onChange={(e) => setForm({ ...form, line_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nama Service *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: Main Process Piping"
                                                value={form.service_name}
                                                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kode Fluida</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: MPP, FG, CW"
                                                value={form.fluid_code}
                                                onChange={(e) => setForm({ ...form, fluid_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Piping Class</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: A1A (CS 150#)"
                                                value={form.piping_class}
                                                onChange={(e) => setForm({ ...form, piping_class: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Insulation</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="None / Hot / Cold"
                                                value={form.insulation}
                                                onChange={(e) => setForm({ ...form, insulation: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Design Press</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="10.5 bar"
                                                value={form.design_press}
                                                onChange={(e) => setForm({ ...form, design_press: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Design Temp</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="120 °C"
                                                value={form.design_temp}
                                                onChange={(e) => setForm({ ...form, design_temp: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Operating Press</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="8.0 bar"
                                                value={form.operating_press}
                                                onChange={(e) => setForm({ ...form, operating_press: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Operating Temp</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="90 °C"
                                                value={form.operating_temp}
                                                onChange={(e) => setForm({ ...form, operating_temp: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Test Pressure</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="15.8 bar"
                                                value={form.test_press}
                                                onChange={(e) => setForm({ ...form, test_press: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Test Medium</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Hydrostatic (Water) / Pneumatic"
                                                value={form.test_medium}
                                                onChange={(e) => setForm({ ...form, test_medium: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Line Service'}
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
