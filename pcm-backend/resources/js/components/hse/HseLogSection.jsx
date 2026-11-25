import React, { useState } from 'react';
import { api } from '../../api';
import { confirmDelete } from '../../confirm';
import {
    DateRangeFilter, EmptyState, Field, HseFilters, HseModal, LOG_KINDS, LOG_STATUS,
    PhotoLink, SectionToolbar, StatusBadge, StatusFilter, fmtDate, inDateRange, labelOf,
    matchesSearch, submitHseForm, today, useHseFilters,
} from './HseShared';

const emptyForm = () => ({
    log_date: today(),
    kind: 'tbm',
    location: '',
    severity: 'MEDIUM',
    description: '',
    action_taken: '',
    status: 'open',
    pic: '',
    due_date: '',
});

const KIND_TONE = {
    tbm: 'bg-primary',
    permit: 'bg-dark',
    finding: 'bg-warning text-dark',
    inspection: 'bg-secondary',
    induction: 'bg-success',
    incident: 'bg-danger',
};

export function HseLogSection({ rows = [], project, canEdit, onReload, onPrint }) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const filters = useHseFilters();
    const visibleRows = rows.filter((row) => (
        (!filters.status || row.status === filters.status)
        && inDateRange(row.log_date, filters.from, filters.to)
        && matchesSearch(filters.search, [
            row.log_no, row.location, row.description, row.pic, row.action_taken,
            labelOf(LOG_KINDS, row.kind),
        ])
    ));

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setPhoto(null);
        setError('');
        setShowModal(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm({
            log_date: row.log_date ? String(row.log_date).slice(0, 10) : today(),
            kind: row.kind || 'tbm',
            location: row.location || '',
            severity: row.severity || 'MEDIUM',
            description: row.description || '',
            action_taken: row.action_taken || '',
            status: row.status || 'open',
            pic: row.pic || '',
            due_date: row.due_date ? String(row.due_date).slice(0, 10) : '',
        });
        setPhoto(null);
        setError('');
        setShowModal(true);
    };

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');

        try {
            const payload = { ...form, project_id: project?.id };
            await submitHseForm(
                editing ? `/hse/${editing.id}` : '/hse',
                payload,
                { photo_file: photo },
                editing ? 'PUT' : 'POST'
            );
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan log HSE.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = await confirmDelete(`Hapus log ${row.log_no || row.description}?`);
        if (!ok) return;

        try {
            await api.del(`/hse/${row.id}`);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menghapus log HSE.');
        }
    };

    return (
        <div>
            <SectionToolbar
                title="Log harian HSE"
                description="Catatan briefing, inspeksi, induksi, dan kejadian lapangan."
                count={visibleRows.length}
            >
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrint}>
                    <i className="cs-file me-1"></i> Cetak / PDF
                </button>
                {canEdit && (
                    <button type="button" className="btn btn-dark btn-sm" onClick={openCreate}>
                        <i className="cs-plus me-1"></i> Catat log
                    </button>
                )}
            </SectionToolbar>

            <HseFilters
                search={filters.search}
                onSearchChange={filters.setSearch}
                placeholder="Cari no. log, lokasi, uraian, atau PIC…"
                shown={visibleRows.length}
                total={rows.length}
                active={filters.active}
                onReset={filters.reset}
            >
                <StatusFilter value={filters.status} onChange={filters.setStatus} options={LOG_STATUS} />
                <DateRangeFilter
                    from={filters.from}
                    to={filters.to}
                    onFromChange={filters.setFrom}
                    onToChange={filters.setTo}
                />
            </HseFilters>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>No. Log</th>
                                <th>Tanggal</th>
                                <th>Jenis</th>
                                <th>Uraian</th>
                                <th>PIC / Tindakan</th>
                                <th>Tenggat</th>
                                <th>Status</th>
                                <th>Bukti</th>
                                {canEdit && <th className="text-end">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.length === 0 ? (
                                <EmptyState
                                    colSpan={canEdit ? 9 : 8}
                                    message={filters.active
                                        ? 'Tidak ada log yang cocok dengan filter. Ubah kata kunci atau reset filter.'
                                        : 'Belum ada log HSE untuk project ini. Catat briefing atau inspeksi pertama.'}
                                />
                            ) : visibleRows.map((row) => (
                                <tr key={row.id}>
                                    <td className="fw-semibold text-dark">{row.log_no || '-'}</td>
                                    <td className="text-nowrap">{fmtDate(row.log_date)}</td>
                                    <td>
                                        <span className={`badge ${KIND_TONE[row.kind] || 'bg-secondary'}`}>
                                            {labelOf(LOG_KINDS, row.kind)}
                                        </span>
                                    </td>
                                    <td style={{ minWidth: 220 }}>
                                        <div className="text-dark">{row.description || '-'}</div>
                                        <div className="text-muted small">{row.location || '-'}</div>
                                    </td>
                                    <td style={{ minWidth: 180 }}>
                                        <div className="fw-semibold">{row.pic || '-'}</div>
                                        <div className="text-muted small">{row.action_taken || '-'}</div>
                                    </td>
                                    <td className="text-nowrap">{fmtDate(row.due_date)}</td>
                                    <td><StatusBadge value={row.status} list={LOG_STATUS} /></td>
                                    <td><PhotoLink path={row.photo_path} /></td>
                                    {canEdit && (
                                        <td className="text-end text-nowrap">
                                            <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => openEdit(row)}>
                                                Edit
                                            </button>
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(row)}>
                                                Hapus
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <HseModal
                    title={editing ? `Ubah log ${editing.log_no || ''}` : 'Catat log HSE'}
                    subtitle="Isi hanya kejadian yang benar-benar terjadi; log kosong lebih jujur daripada teks contoh."
                    onClose={() => setShowModal(false)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-log-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Simpan log'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-log-form" onSubmit={submit} className="row g-3">
                        {error && <div className="col-12"><div className="alert alert-danger py-2 small mb-0">{error}</div></div>}

                        <Field label="Tanggal" required>
                            <input
                                type="date"
                                className="form-control"
                                required
                                value={form.log_date}
                                onChange={(event) => setForm({ ...form, log_date: event.target.value })}
                            />
                        </Field>

                        <Field label="Jenis kegiatan" required>
                            <select
                                className="form-select"
                                value={form.kind}
                                onChange={(event) => setForm({ ...form, kind: event.target.value })}
                            >
                                {LOG_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>

                        <Field label="Lokasi / area">
                            <input
                                className="form-control"
                                placeholder="Contoh: Shop Fabrikasi / Line MPP-AB"
                                value={form.location}
                                onChange={(event) => setForm({ ...form, location: event.target.value })}
                            />
                        </Field>

                        <Field label="Tingkat keparahan">
                            <select
                                className="form-select"
                                value={form.severity}
                                onChange={(event) => setForm({ ...form, severity: event.target.value })}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </Field>

                        <Field label="Uraian / topik" required className="col-12">
                            <textarea
                                className="form-control"
                                rows="3"
                                required
                                placeholder="Tulis kejadian atau topik apa adanya."
                                value={form.description}
                                onChange={(event) => setForm({ ...form, description: event.target.value })}
                            />
                        </Field>

                        <Field label="Tindakan / mitigasi" className="col-12">
                            <textarea
                                className="form-control"
                                rows="2"
                                value={form.action_taken}
                                onChange={(event) => setForm({ ...form, action_taken: event.target.value })}
                            />
                        </Field>

                        <Field label="PIC tindak lanjut">
                            <input
                                className="form-control"
                                value={form.pic}
                                onChange={(event) => setForm({ ...form, pic: event.target.value })}
                            />
                        </Field>

                        <Field label="Due date tindak lanjut">
                            <input
                                type="date"
                                className="form-control"
                                value={form.due_date}
                                onChange={(event) => setForm({ ...form, due_date: event.target.value })}
                            />
                        </Field>

                        <Field label="Status">
                            <select
                                className="form-select"
                                value={form.status}
                                onChange={(event) => setForm({ ...form, status: event.target.value })}
                            >
                                {LOG_STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>

                        <Field label="Foto / bukti" hint={editing?.photo_path ? 'Foto lama tetap dipakai bila tidak memilih file baru.' : 'JPG/PNG, maksimal 5 MB.'}>
                            <input
                                type="file"
                                className="form-control"
                                accept="image/*"
                                onChange={(event) => setPhoto(event.target.files?.[0] || null)}
                            />
                            {editing?.photo_path && (
                                <div className="mt-1"><PhotoLink path={editing.photo_path} label="Lihat foto tersimpan" /></div>
                            )}
                        </Field>
                    </form>
                </HseModal>
            )}
        </div>
    );
}
