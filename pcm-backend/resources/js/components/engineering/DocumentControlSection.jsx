import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';

export function DocumentControlSection({ user, projects = [], drawings = [], activeProjectId = '', onToast }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [deleteError, setDeleteError] = useState('');

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

    const scopedDocs = useMemo(
        () => scopeRows(docs, activeProjectId, filterProject),
        [docs, activeProjectId, filterProject]
    );

    const scopedDrawings = useMemo(
        () => scopeRows(drawings, activeProjectId, filterProject),
        [drawings, activeProjectId, filterProject]
    );

    const stats = useMemo(() => {
        const total = scopedDocs.length;
        const ifcCount = scopedDocs.filter(d => d.status_doc === 'IFC').length;
        const ifaCount = scopedDocs.filter(d => d.status_doc === 'IFA' || d.status_doc === 'IFR').length;
        const asBuiltCount = scopedDocs.filter(d => d.status_doc === 'AS-BUILT').length;
        return { total, ifcCount, ifaCount, asBuiltCount };
    }, [scopedDocs]);

    const filteredDocs = useMemo(() => {
        const q = search.toLowerCase();
        return scopedDocs.filter(d => {
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
    }, [scopedDocs, search, filterStatus]);

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
                drawing_no: scopedDrawings[0]?.drawing_no || '2428-M-15-MPP-AB-SHT1',
                title: scopedDrawings[0]?.title || 'Main Process Piping Sheet 1',
                rev_no: '0',
                status_doc: 'IFC',
                incoming_date: today,
                issued_date: today,
                distributed_to: 'Workshop Spool Fabrication',
                receiver_name: 'Bpk. Sutrisno (QC Lead)',
                transmittal_no: `TRANS-2428-ENG-${String(docs.length + 1).padStart(3, '0')}`,
                remarks: 'Issued for Construction resmi untuk fabrikasi spool shop.',
                drawing_id: scopedDrawings[0]?.id || '',
                project_id: defaultProjectId(activeProjectId, filterProject, projects)
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
        if (!(await confirmDelete('Yakin ingin menghapus catatan distribusi dokumen ini?'))) return;
        setDeleteError('');
        try {
            await api.delete(`/document-controls/${id}`);
            if (onToast) onToast('Dokumen berhasil dihapus.');
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
                    <h2 className="h4 fw-bold text-dark mb-1">Document Control &amp; Transmittal Register</h2>
                    <p className="pcm-cell-sub mb-0">
                        Pencatatan riwayat revisi gambar isometrik, surat pengantar transmittal, dan verifikasi distribusi resmi IFC ke lapangan.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Dokumen Transmittal
                    </button>
                )}
            </div>

            {deleteError && (
                <div role="alert" className="alert alert-danger py-2 small mb-3">{deleteError}</div>
            )}

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Dokumen</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">{stats.total}</strong>
                        <span className="pcm-tile__unit">tercatat</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Status IFC (Konstruksi)</span>
                        <strong className="pcm-tile__value text-success">{stats.ifcCount}</strong>
                        <span className="pcm-tile__unit">berkas aktif</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Dalam Review (IFA/IFR)</span>
                        <strong className="pcm-tile__value text-warning">{stats.ifaCount}</strong>
                        <span className="pcm-tile__unit">berkas</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">As-Built Final</span>
                        <strong className="pcm-tile__value text-dark">{stats.asBuiltCount}</strong>
                        <span className="pcm-tile__unit">berkas selesai</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="pcm-filter-bar">
                <div className="pcm-filter-search">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Document No, Drawing No, Title, Transmittal No, Penerima..."
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
                <select
                    className="form-select form-select-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="ALL">Semua Status Dokumen</option>
                    <option value="IFC">IFC (Issued for Construction)</option>
                    <option value="IFA">IFA (Issued for Approval)</option>
                    <option value="IFR">IFR (Issued for Review)</option>
                    <option value="AS-BUILT">AS-BUILT</option>
                </select>
            </div>

            {/* Table */}
            <div className="pcm-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle pcm-table">
                        <thead>
                            <tr>
                                <th className="ps-3">Doc No</th>
                                <th>Drawing Number</th>
                                <th>Judul Gambar</th>
                                <th>Rev</th>
                                <th>Status</th>
                                <th>Tanggal Terbit</th>
                                <th>Didistribusikan Ke</th>
                                <th>Penerima</th>
                                <th>Transmittal No</th>
                                {canEdit && <th className="text-end pe-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 pcm-cell-sub">
                                        Memuat data Document Control...
                                    </td>
                                </tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 pcm-cell-sub">
                                        Tidak ada dokumen kontrol yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((d) => (
                                    <tr key={d.id}>
                                        <td className="ps-3 fw-bold pcm-code text-dark">{d.document_no}</td>
                                        <td className="pcm-code fw-semibold">{d.drawing_no}</td>
                                        <td className="pcm-cell-strong">{d.title}</td>
                                        <td><span className="pcm-chip pcm-chip--neutral pcm-code">Rev {d.rev_no}</span></td>
                                        <td>
                                            <span className={`pcm-chip ${d.status_doc === 'IFC' ? 'pcm-chip--success' : d.status_doc === 'AS-BUILT' ? 'pcm-chip--dark' : 'pcm-chip--warning'}`}>
                                                {d.status_doc}
                                            </span>
                                        </td>
                                        <td className="pcm-cell-sub">{d.issued_date || '—'}</td>
                                        <td className="small pcm-cell-sub">{d.distributed_to || '—'}</td>
                                        <td className="small pcm-cell-sub">{d.receiver_name || '—'}</td>
                                        <td className="pcm-code small">{d.transmittal_no || '—'}</td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm me-1 px-2.5 py-1 fw-bold"
                                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                                                    onClick={() => handleOpenModal(d)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm px-2.5 py-1 fw-bold"
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
