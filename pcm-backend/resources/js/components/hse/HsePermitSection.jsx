import React, { useState } from 'react';
import { api } from '../../api';
import { confirmDelete } from '../../confirm';
import {
    DateRangeFilter, EmptyState, Field, HseFilters, HseModal, PhotoLink, PERMIT_STATUS, PERMIT_TYPES,
    SectionToolbar, StatusBadge, StatusFilter, fmtDateTime, inDateRange, labelOf,
    matchesSearch, submitHseForm, toInputDateTime, useHseFilters,
} from './HseShared';

const emptyForm = () => ({
    permit_type: 'HOT_WORK',
    work_location: '',
    line_no: '',
    work_scope: '',
    applicant_name: '',
    applicant_company: '',
    valid_from: '',
    valid_to: '',
    jsa_ref: '',
    notes: '',
});

const isPermitExpired = (row) => {
    if (row.status !== 'APPROVED' || !row.valid_to) return false;
    const end = new Date(row.valid_to).getTime();
    return !Number.isNaN(end) && end < Date.now();
};

export function HsePermitSection({ rows = [], project, canEdit, canApprove, onReload, onPrint }) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [attachment, setAttachment] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [rejecting, setRejecting] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const filters = useHseFilters();
    const visibleRows = rows.filter((row) => (
        (!filters.status || row.status === filters.status)
        && inDateRange(row.valid_from, filters.from, filters.to)
        && matchesSearch(filters.search, [
            row.permit_no, row.work_location, row.line_no, row.applicant_name,
            row.applicant_company, row.work_scope, row.jsa_ref,
            labelOf(PERMIT_TYPES, row.permit_type),
        ])
    ));

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setAttachment(null);
        setError('');
        setShowModal(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm({
            permit_type: row.permit_type || 'HOT_WORK',
            work_location: row.work_location || '',
            line_no: row.line_no || '',
            work_scope: row.work_scope || '',
            applicant_name: row.applicant_name || '',
            applicant_company: row.applicant_company || '',
            valid_from: toInputDateTime(row.valid_from),
            valid_to: toInputDateTime(row.valid_to),
            jsa_ref: row.jsa_ref || '',
            notes: row.notes || '',
        });
        setAttachment(null);
        setError('');
        setShowModal(true);
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (form.valid_from && form.valid_to && form.valid_to < form.valid_from) {
            setError('Masa berlaku selesai tidak boleh lebih awal dari mulai.');
            return;
        }

        setBusy(true);
        try {
            await submitHseForm(
                editing ? `/hse-permits/${editing.id}` : '/hse-permits',
                { ...form, project_id: project?.id },
                { attachment_file: attachment },
                editing ? 'PUT' : 'POST'
            );
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan permit.');
        } finally {
            setBusy(false);
        }
    };

    const changeStatus = async (row, status) => {
        try {
            await api.put(`/hse-permits/${row.id}`, { status });
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal mengubah status permit.');
        }
    };

    const approve = async (row) => {
        try {
            await api.post(`/hse-permits/${row.id}/approve`, {});
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyetujui permit.');
        }
    };

    const submitReject = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            await api.post(`/hse-permits/${rejecting.id}/reject`, { rejection_reason: rejectReason });
            setRejecting(null);
            setRejectReason('');
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menolak permit.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = await confirmDelete(`Hapus permit ${row.permit_no}?`);
        if (!ok) return;

        try {
            await api.del(`/hse-permits/${row.id}`);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menghapus permit.');
        }
    };

    return (
        <div>
            <SectionToolbar
                title="Permit to Work (PTW)"
                description="Izin kerja berisiko: hot work, confined space, ketinggian, lifting, dan lainnya."
                count={visibleRows.length}
            >
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrint}>
                    <i className="cs-file me-1"></i> Cetak / PDF
                </button>
                {canEdit && (
                    <button type="button" className="btn btn-dark btn-sm" onClick={openCreate}>
                        <i className="cs-plus me-1"></i> Ajukan permit
                    </button>
                )}
            </SectionToolbar>

            <HseFilters
                search={filters.search}
                onSearchChange={filters.setSearch}
                placeholder="Cari no. permit, lokasi, line, atau pemohon…"
                shown={visibleRows.length}
                total={rows.length}
                active={filters.active}
                onReset={filters.reset}
            >
                <StatusFilter value={filters.status} onChange={filters.setStatus} options={PERMIT_STATUS} />
                <DateRangeFilter
                    from={filters.from}
                    to={filters.to}
                    onFromChange={filters.setFrom}
                    onToChange={filters.setTo}
                    labelFrom="Berlaku dari"
                    labelTo="Berlaku sampai"
                />
            </HseFilters>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>No. Permit</th>
                                <th>Jenis</th>
                                <th>Lokasi / Line</th>
                                <th>Pemohon</th>
                                <th>Masa berlaku</th>
                                <th>Status</th>
                                <th>Lampiran</th>
                                {(canEdit || canApprove) && <th className="text-end">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.length === 0 ? (
                                <EmptyState
                                    colSpan={canEdit || canApprove ? 8 : 7}
                                    message={filters.active
                                        ? 'Tidak ada permit yang cocok dengan filter. Ubah kata kunci atau reset filter.'
                                        : 'Belum ada permit untuk project ini.'}
                                />
                            ) : visibleRows.map((row) => {
                                const expired = isPermitExpired(row);
                                return (
                                    <tr key={row.id}>
                                        <td className="fw-semibold text-dark">{row.permit_no}</td>
                                        <td>{labelOf(PERMIT_TYPES, row.permit_type)}</td>
                                        <td>
                                            <div>{row.work_location || '-'}</div>
                                            <div className="text-muted small">{row.line_no || '-'}</div>
                                        </td>
                                        <td>
                                            <div>{row.applicant_name}</div>
                                            <div className="text-muted small">{row.applicant_company || '-'}</div>
                                        </td>
                                        <td className="text-nowrap small">
                                            {fmtDateTime(row.valid_from)}
                                            <br />
                                            <span className={expired ? 'text-danger fw-semibold' : 'text-muted'}>
                                                s.d. {fmtDateTime(row.valid_to)}
                                            </span>
                                        </td>
                                        <td>
                                            <StatusBadge value={row.status} list={PERMIT_STATUS} />
                                            {expired && <div className="badge bg-danger mt-1">Kedaluwarsa</div>}
                                            {row.rejection_reason && (
                                                <div className="text-danger small mt-1">{row.rejection_reason}</div>
                                            )}
                                        </td>
                                        <td><PhotoLink path={row.attachment_path} label="Dokumen" /></td>
                                        {(canEdit || canApprove) && (
                                            <td className="text-end text-nowrap">
                                                {canApprove && row.status === 'PENDING' && (
                                                    <>
                                                        <button type="button" className="btn btn-sm btn-success me-1" onClick={() => approve(row)}>
                                                            Setujui
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger me-1"
                                                            onClick={() => { setRejecting(row); setRejectReason(''); }}
                                                        >
                                                            Tolak
                                                        </button>
                                                    </>
                                                )}
                                                {canEdit && (
                                                    <>
                                                        <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => openEdit(row)}>
                                                            Edit
                                                        </button>
                                                        {row.status === 'APPROVED' && (
                                                            <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => changeStatus(row, 'CLOSED')}>
                                                                Tutup
                                                            </button>
                                                        )}
                                                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(row)}>
                                                            Hapus
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <HseModal
                    title={editing ? `Ubah permit ${editing.permit_no}` : 'Ajukan permit baru'}
                    subtitle="Permit harus disetujui HSE sebelum pekerjaan berisiko dimulai."
                    size="modal-lg"
                    onClose={() => setShowModal(false)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-permit-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Simpan permit'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-permit-form" onSubmit={submit} className="row g-3">
                        {error && <div className="col-12"><div className="alert alert-danger py-2 small mb-0">{error}</div></div>}

                        <Field label="Jenis pekerjaan" required>
                            <select
                                className="form-select"
                                value={form.permit_type}
                                onChange={(event) => setForm({ ...form, permit_type: event.target.value })}
                            >
                                {PERMIT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>

                        <Field label="Lokasi kerja" required>
                            <input
                                className="form-control"
                                required
                                placeholder="Area / unit"
                                value={form.work_location}
                                onChange={(event) => setForm({ ...form, work_location: event.target.value })}
                            />
                        </Field>

                        <Field label="Line / ISO number">
                            <input
                                className="form-control"
                                value={form.line_no}
                                onChange={(event) => setForm({ ...form, line_no: event.target.value })}
                            />
                        </Field>

                        <Field label="Referensi JSA / HIRA">
                            <input
                                className="form-control"
                                value={form.jsa_ref}
                                onChange={(event) => setForm({ ...form, jsa_ref: event.target.value })}
                            />
                        </Field>

                        <Field label="Lingkup pekerjaan" required className="col-12">
                            <textarea
                                className="form-control"
                                rows="2"
                                required
                                value={form.work_scope}
                                onChange={(event) => setForm({ ...form, work_scope: event.target.value })}
                            />
                        </Field>

                        <Field label="Nama pemohon" required>
                            <input
                                className="form-control"
                                required
                                value={form.applicant_name}
                                onChange={(event) => setForm({ ...form, applicant_name: event.target.value })}
                            />
                        </Field>

                        <Field label="Perusahaan / subcon pemohon">
                            <input
                                className="form-control"
                                value={form.applicant_company}
                                onChange={(event) => setForm({ ...form, applicant_company: event.target.value })}
                            />
                        </Field>

                        <Field label="Berlaku mulai" required>
                            <input
                                type="datetime-local"
                                className="form-control"
                                required
                                value={form.valid_from}
                                onChange={(event) => setForm({ ...form, valid_from: event.target.value })}
                            />
                        </Field>

                        <Field label="Berlaku sampai" required>
                            <input
                                type="datetime-local"
                                className="form-control"
                                required
                                value={form.valid_to}
                                onChange={(event) => setForm({ ...form, valid_to: event.target.value })}
                            />
                        </Field>

                        <Field label="Catatan" className="col-12">
                            <textarea
                                className="form-control"
                                rows="2"
                                value={form.notes}
                                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                            />
                        </Field>

                        <Field label="Lampiran JSA / checklist" className="col-12" hint="PDF atau foto dokumen izin.">
                            <input
                                type="file"
                                className="form-control"
                                accept="image/*,application/pdf"
                                onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                            />
                            {editing?.attachment_path && (
                                <div className="mt-1"><PhotoLink path={editing.attachment_path} label="Lihat lampiran tersimpan" /></div>
                            )}
                        </Field>
                    </form>
                </HseModal>
            )}

            {rejecting && (
                <HseModal
                    title={`Tolak permit ${rejecting.permit_no}`}
                    subtitle="Alasan penolakan wajib diisi agar pemohon bisa memperbaiki."
                    onClose={() => setRejecting(null)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setRejecting(null)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-reject-form" className="btn btn-danger btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Tolak permit'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-reject-form" onSubmit={submitReject}>
                        <label className="form-label small fw-semibold">Alasan penolakan</label>
                        <textarea
                            className="form-control"
                            rows="3"
                            required
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                        />
                    </form>
                </HseModal>
            )}
        </div>
    );
}
