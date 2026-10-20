import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function DocumentControlSection({ user, projects = [], drawings = [], onToast }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        document_no: '',
        drawing_no: '',
        title: '',
        rev_no: '0',
        status_doc: 'IFC',
        incoming_date: new Date().toISOString().split('T')[0],
        issued_date: new Date().toISOString().split('T')[0],
        distributed_to: 'Workshop Spool Fabrication',
        receiver_name: '',
        transmittal_no: '',
        remarks: '',
        drawing_id: '',
        project_id: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/document-controls');
            setDocs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load document controls:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const total = docs.length;
        const ifcCount = docs.filter(d => d.status_doc === 'IFC').length;
        const ifaCount = docs.filter(d => d.status_doc === 'IFA' || d.status_doc === 'IFR').length;
        const asBuiltCount = docs.filter(d => d.status_doc === 'AS-BUILT').length;
        return { total, ifcCount, ifaCount, asBuiltCount };
    }, [docs]);

    const filteredDocs = useMemo(() => {
        const q = search.toLowerCase();
        return docs.filter(d => {
            const matchStatus = filterStatus === 'ALL' || d.status_doc === filterStatus;
            const matchSearch = !q ||
                (d.document_no || '').toLowerCase().includes(q) ||
                (d.drawing_no || '').toLowerCase().includes(q) ||
                (d.title || '').toLowerCase().includes(q) ||
                (d.transmittal_no || '').toLowerCase().includes(q) ||
                (d.distributed_to || '').toLowerCase().includes(q) ||
                (d.receiver_name || '').toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [docs, search, filterStatus]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        const today = new Date().toISOString().split('T')[0];
        if (item) {
            setEditingItem(item);
            setForm({
                document_no: item.document_no || '',
                drawing_no: item.drawing_no || '',
                title: item.title || '',
                rev_no: item.rev_no || '0',
                status_doc: item.status_doc || 'IFC',
                incoming_date: item.incoming_date || today,
                issued_date: item.issued_date || today,
                distributed_to: item.distributed_to || 'Workshop Spool Fabrication',
                receiver_name: item.receiver_name || '',
                transmittal_no: item.transmittal_no || '',
                remarks: item.remarks || '',
                drawing_id: item.drawing_id || '',
                project_id: item.project_id || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                document_no: `DOC-2428-ISO-${String(docs.length + 1).padStart(3, '0')}`,
                drawing_no: drawings[0]?.drawing_no || '2428-M-15-MPP-AB-SHT1',
                title: drawings[0]?.title || 'Main Process Piping Sheet 1',
                rev_no: '0',
                status_doc: 'IFC',
                incoming_date: today,
                issued_date: today,
                distributed_to: 'Workshop Spool Fabrication',
                receiver_name: 'Bpk. Sutrisno (QC Lead)',
                transmittal_no: `TRANS-2428-ENG-${String(docs.length + 1).padStart(3, '0')}`,
                remarks: 'Issued for Construction resmi untuk fabrikasi spool shop.',
                drawing_id: drawings[0]?.id || '',
                project_id: projects[0]?.id || ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.document_no.trim() || !form.drawing_no.trim()) {
            setFormError('Nomor Dokumen dan Nomor Drawing wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/document-controls/${editingItem.id}`, form);
                if (onToast) onToast('Dokumen Transmittal berhasil diperbarui.');
            } else {
                await api.post('/document-controls', form);
                if (onToast) onToast('Dokumen Transmittal baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan Dokumen Transmittal.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus catatan distribusi dokumen ini?')) return;
        try {
            await api.delete(`/document-controls/${id}`);
            if (onToast) onToast('Dokumen berhasil dihapus.');
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
                    <h2 className="h4 fw-bold text-dark mb-1">Document Control &amp; Transmittal Register</h2>
                    <p className="text-muted small mb-0">
                        Pencatatan riwayat revisi gambar isometrik, surat pengantar transmittal, dan verifikasi distribusi resmi IFC ke lapangan.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Dokumen Transmittal
                    </button>
                )}
            </div>

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Dokumen</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.total}</strong>
                        <span className="text-muted ms-1 small">tercatat</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Status IFC (Konstruksi)</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.ifcCount}</strong>
                        <span className="text-muted ms-1 small">berkas aktif</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Dalam Review (IFA/IFR)</span>
                        <strong className="h3 fw-bold text-warning text-dark mb-0">{stats.ifaCount}</strong>
                        <span className="text-muted ms-1 small">berkas</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">As-Built Final</span>
                        <strong className="h3 fw-bold text-dark mb-0">{stats.asBuiltCount}</strong>
                        <span className="text-muted ms-1 small">berkas selesai</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Document No, Drawing No, Title, Transmittal No, Penerima..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.5rem 0.75rem' }}
                    />
                </div>
                <select
                    className="form-select form-select-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: 'auto', borderRadius: '6px' }}
                >
                    <option value="ALL">Semua Status Dokumen</option>
                    <option value="IFC">IFC (Issued for Construction)</option>
                    <option value="IFA">IFA (Issued for Approval)</option>
                    <option value="IFR">IFR (Issued for Review)</option>
                    <option value="AS-BUILT">AS-BUILT</option>
                </select>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Doc No</th>
                                <th className="py-3">Drawing Number</th>
                                <th className="py-3">Judul Gambar</th>
                                <th className="py-3">Rev</th>
                                <th className="py-3">Status</th>
                                <th className="py-3">Tanggal Terbit</th>
                                <th className="py-3">Didistribusikan Ke</th>
                                <th className="py-3">Penerima</th>
                                <th className="py-3">Transmittal No</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Memuat data Document Control...
                                    </td>
                                </tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Tidak ada dokumen kontrol yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((d) => (
                                    <tr key={d.id}>
                                        <td className="ps-3 fw-bold font-monospace text-primary">{d.document_no}</td>
                                        <td className="font-monospace fw-semibold">{d.drawing_no}</td>
                                        <td>{d.title}</td>
                                        <td><span className="badge bg-secondary font-monospace">Rev {d.rev_no}</span></td>
                                        <td>
                                            <span className={`badge ${d.status_doc === 'IFC' ? 'bg-success' : d.status_doc === 'AS-BUILT' ? 'bg-dark' : 'bg-warning text-dark'}`}>
                                                {d.status_doc}
                                            </span>
                                        </td>
                                        <td>{d.issued_date || '—'}</td>
                                        <td className="small">{d.distributed_to || '—'}</td>
                                        <td className="small">{d.receiver_name || '—'}</td>
                                        <td className="font-monospace small">{d.transmittal_no || '—'}</td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm me-1 px-2 py-1"
                                                    onClick={() => handleOpenModal(d)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    onClick={() => handleDelete(d.id)}
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
                                        {editingItem ? 'Edit Dokumen Transmittal' : 'Tambah Dokumen Transmittal Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nomor Dokumen *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.document_no}
                                                onChange={(e) => setForm({ ...form, document_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nomor Drawing Isometrik *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.drawing_no}
                                                onChange={(e) => setForm({ ...form, drawing_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Judul Gambar / Deskripsi Dokumen</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.title}
                                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Nomor Revisi</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="0 / A / 1"
                                                value={form.rev_no}
                                                onChange={(e) => setForm({ ...form, rev_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Status Dokumen</label>
                                            <select
                                                className="form-select"
                                                value={form.status_doc}
                                                onChange={(e) => setForm({ ...form, status_doc: e.target.value })}
                                            >
                                                <option value="IFC">IFC (Issued for Construction)</option>
                                                <option value="IFA">IFA (Issued for Approval)</option>
                                                <option value="IFR">IFR (Issued for Review)</option>
                                                <option value="AS-BUILT">AS-BUILT</option>
                                            </select>
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Tanggal Diterima</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={form.incoming_date}
                                                onChange={(e) => setForm({ ...form, incoming_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Tanggal Terbit / Distribusi</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={form.issued_date}
                                                onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Didistribusikan Ke (Divisi/Penerima)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.distributed_to}
                                                onChange={(e) => setForm({ ...form, distributed_to: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nama PIC Penerima</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.receiver_name}
                                                onChange={(e) => setForm({ ...form, receiver_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nomor Surat Transmittal</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.transmittal_no}
                                                onChange={(e) => setForm({ ...form, transmittal_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Catatan / Remarks</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.remarks}
                                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Dokumen'}
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
