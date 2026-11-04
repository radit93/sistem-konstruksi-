import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

const CATEGORY_OPTIONS = {
    receiving: ['PACKING_LIST', 'MTC', 'BAP', 'PHOTO', 'OTHER'],
    issuing: ['ISSUING_SLIP', 'REQUEST', 'PHOTO', 'OTHER'],
    storing: ['MAPPING', 'LAYOUT', 'PHOTO', 'OTHER'],
};

const CATEGORY_LABELS = {
    PACKING_LIST: 'Packing List',
    MTC: 'Mill Test Certificate',
    BAP: 'Berita Acara Penerimaan',
    ISSUING_SLIP: 'Bukti Pengeluaran',
    REQUEST: 'Surat Permintaan',
    MAPPING: 'Denah Lokasi',
    LAYOUT: 'Layout Penyimpanan',
    PHOTO: 'Foto Material',
    OTHER: 'Dokumen Lain',
};

const TYPE_LABELS = {
    receiving: 'Penerimaan Material',
    issuing: 'Pengeluaran Material',
    storing: 'Stok / Lokasi Material',
};

const formatFileSize = (bytes) => {
    const size = Number(bytes) || 0;

    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`;

    return `${size} B`;
};

export function MaterialDocumentsModal({
    open,
    subjectType,
    subject,
    canEdit = false,
    onClose,
    onChanged,
}) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadKey, setUploadKey] = useState(0);
    const [deletingId, setDeletingId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [category, setCategory] = useState('OTHER');
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);

    const loadDocuments = useCallback(async () => {
        if (!subjectType || !subject?.id) return;

        setLoading(true);
        setError('');

        try {
            const data = await api.get(
                `/material-documents?documentable_type=${encodeURIComponent(subjectType)}&documentable_id=${subject.id}`
            );
            setDocuments(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Gagal memuat dokumen material.');
        } finally {
            setLoading(false);
        }
    }, [subjectType, subject?.id]);

    useEffect(() => {
        if (!open) return;

        const options = CATEGORY_OPTIONS[subjectType] || ['OTHER'];
        setCategory(options[0]);
        setNotes('');
        setFile(null);
        setError('');
        loadDocuments();
    }, [open, subjectType, loadDocuments]);

    if (!open || !subject) return null;

    const categoryOptions = CATEGORY_OPTIONS[subjectType] || ['OTHER'];

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!file) {
            setError('Pilih berkas dokumen terlebih dahulu.');
            return;
        }

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('documentable_type', subjectType);
        formData.append('documentable_id', String(subject.id));
        formData.append('category', category);
        formData.append('notes', notes);
        formData.append('file', file);

        try {
            await api.upload('/material-documents', formData);
            setFile(null);
            setNotes('');
            setUploadKey((value) => value + 1);
            await loadDocuments();
            if (onChanged) onChanged();
        } catch (err) {
            setError(err.message || 'Gagal mengunggah dokumen.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (document) => {
        if (!window.confirm(`Hapus dokumen "${document.original_name}"?`)) return;

        setDeletingId(document.id);
        setError('');

        try {
            await api.del(`/material-documents/${document.id}`);
            await loadDocuments();
            if (onChanged) onChanged();
        } catch (err) {
            setError(err.message || 'Gagal menghapus dokumen.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = async (document) => {
        setDownloadingId(document.id);
        setError('');

        try {
            await api.download(document.download_url, document.original_name);
        } catch (err) {
            setError(err.message || 'Gagal mengunduh dokumen.');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header border-bottom">
                        <div>
                            <h5 className="modal-title fw-bold text-dark mb-1">Dokumen Material</h5>
                            <div className="text-muted small">
                                {TYPE_LABELS[subjectType] || 'Material'} · {subject.item_name || subject.issue_no || subject.shipment_no || `#${subject.id}`}
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4">
                        {error && <div className="alert alert-danger py-2 mb-3 small">{error}</div>}

                        {canEdit && (
                            <form onSubmit={handleUpload} className="border rounded-3 p-3 bg-light mb-4">
                                <div className="fw-semibold text-dark mb-3">Unggah Dokumen Pendukung</div>
                                <div className="row g-3">
                                    <div className="col-12 col-md-4">
                                        <label className="form-label small fw-semibold text-secondary">Jenis Dokumen</label>
                                        <select
                                            className="form-select"
                                            value={category}
                                            onChange={(event) => setCategory(event.target.value)}
                                        >
                                            {categoryOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {CATEGORY_LABELS[option] || option.replaceAll('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-8">
                                        <label className="form-label small fw-semibold text-secondary">Berkas</label>
                                        <input
                                            key={uploadKey}
                                            type="file"
                                            className="form-control"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                            onChange={(event) => setFile(event.target.files?.[0] || null)}
                                            required
                                        />
                                        <div className="form-text">PDF, gambar, Word, atau Excel. Maksimal 10 MB.</div>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-semibold text-secondary">Catatan (opsional)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={notes}
                                            onChange={(event) => setNotes(event.target.value)}
                                            placeholder="Nomor surat, keterangan revisi, dll"
                                        />
                                    </div>
                                </div>
                                <div className="d-flex justify-content-end mt-3">
                                    <button type="submit" className="btn btn-primary px-3" disabled={uploading}>
                                        {uploading ? 'Mengunggah...' : 'Unggah Dokumen'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="fw-semibold text-dark">Dokumen Tersimpan</div>
                            <span className="badge bg-secondary">{documents.length}</span>
                        </div>

                        {loading ? (
                            <div className="text-muted small py-3">Memuat dokumen...</div>
                        ) : documents.length === 0 ? (
                            <div className="border rounded-3 text-center text-muted small py-4">
                                Belum ada dokumen yang diunggah.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>Jenis</th>
                                            <th>Nama Berkas</th>
                                            <th>Ukuran</th>
                                            <th>Diunggah</th>
                                            <th className="text-end">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((document) => (
                                            <tr key={document.id}>
                                                <td className="text-nowrap small">
                                                    {document.category_label || document.category}
                                                </td>
                                                <td>
                                                    <div className="small fw-semibold text-dark">{document.original_name}</div>
                                                    {document.notes && (
                                                        <div className="text-muted small">{document.notes}</div>
                                                    )}
                                                </td>
                                                <td className="small text-nowrap">{formatFileSize(document.file_size)}</td>
                                                <td className="small text-nowrap">
                                                    {document.created_at
                                                        ? new Date(document.created_at).toLocaleString('id-ID')
                                                        : '-'}
                                                </td>
                                                <td className="text-end text-nowrap">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary me-1"
                                                        onClick={() => handleDownload(document)}
                                                        disabled={downloadingId === document.id}
                                                    >
                                                        {downloadingId === document.id ? '...' : 'Unduh'}
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDelete(document)}
                                                            disabled={deletingId === document.id}
                                                        >
                                                            {deletingId === document.id ? '...' : 'Hapus'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer border-top bg-light">
                        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
