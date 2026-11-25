import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { confirmDelete } from '../../confirm';
import {
    DateRangeFilter, EmptyState, Field, FilterField, HAZARD_CATEGORIES, HAZARD_SEVERITIES, HAZARD_STATUS,
    HseFilters, HseModal, PhotoLink, SectionToolbar, StatusBadge, StatusFilter, fmtDate, inDateRange,
    isOverdue, labelOf, matchesSearch, submitHseForm, today, useHseFilters,
} from './HseShared';

const emptyForm = () => ({
    found_date: today(),
    location: '',
    category: 'UNSAFE_CONDITION',
    severity: 'MEDIUM',
    description: '',
    due_date: '',
    pic_mode: 'external',
    pic_user_id: '',
    pic_name: '',
    pic_company: '',
    reporter_mode: 'self',
    reporter_name: '',
    reporter_company: '',
    is_anonymous: false,
    corrective_action: '',
    status: 'OPEN',
    verification_note: '',
});

const SEVERITY_TONE = {
    LOW: 'bg-secondary',
    MEDIUM: 'bg-warning text-dark',
    HIGH: 'bg-danger',
    CRITICAL: 'bg-dark',
};

export function HseHazardSection({
    rows = [], project, user, canManage, canApprove, canReport, onReload, onPrint,
}) {
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState('create');
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [photoBefore, setPhotoBefore] = useState(null);
    const [photoAfter, setPhotoAfter] = useState(null);
    const [picOptions, setPicOptions] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(null);
    const [verifyAction, setVerifyAction] = useState('CLOSED');
    const [verifyNote, setVerifyNote] = useState('');

    const filters = useHseFilters();
    const [severity, setSeverity] = useState('');
    const resetFilters = () => {
        filters.reset();
        setSeverity('');
    };
    const filtersActive = filters.active || Boolean(severity);

    const visibleRows = rows.filter((row) => (
        (!filters.status || row.status === filters.status)
        && (!severity || row.severity === severity)
        && inDateRange(row.found_date, filters.from, filters.to)
        && matchesSearch(filters.search, [
            row.hazard_no, row.location, row.description, row.pic_name, row.pic_company,
            row.reporter_name, row.reporter_company, row.corrective_action,
            labelOf(HAZARD_CATEGORIES, row.category),
        ])
    ));

    useEffect(() => {
        if (!canManage) return undefined;
        let alive = true;

        api.get('/hse-pic-options')
            .then((list) => { if (alive) setPicOptions(Array.isArray(list) ? list : []); })
            .catch(() => { if (alive) setPicOptions([]); });

        return () => { alive = false; };
    }, [canManage]);

    const usersById = useMemo(() => {
        const map = {};
        picOptions.forEach((option) => { map[String(option.id)] = option; });
        return map;
    }, [picOptions]);

    const openCreate = () => {
        setMode('create');
        setSelected(null);
        setForm(emptyForm());
        setPhotoBefore(null);
        setPhotoAfter(null);
        setError('');
        setShowModal(true);
    };

    const openEdit = (row) => {
        setMode('edit');
        setSelected(row);
        setForm({
            ...emptyForm(),
            found_date: row.found_date ? String(row.found_date).slice(0, 10) : today(),
            location: row.location || '',
            category: row.category || 'UNSAFE_CONDITION',
            severity: row.severity || 'MEDIUM',
            description: row.description || '',
            due_date: row.due_date ? String(row.due_date).slice(0, 10) : '',
            pic_mode: row.pic_user_id ? 'internal' : 'external',
            pic_user_id: row.pic_user_id ? String(row.pic_user_id) : '',
            pic_name: row.pic_name || '',
            pic_company: row.pic_company || '',
            reporter_mode: 'self',
            reporter_name: row.reporter_name || '',
            reporter_company: row.reporter_company || '',
            is_anonymous: Boolean(row.is_anonymous),
            corrective_action: row.corrective_action || '',
            status: row.status || 'OPEN',
            verification_note: row.verification_note || '',
        });
        setPhotoBefore(null);
        setPhotoAfter(null);
        setError('');
        setShowModal(true);
    };

    const openRespond = (row) => {
        setMode('respond');
        setSelected(row);
        setForm({
            ...emptyForm(),
            corrective_action: row.corrective_action || '',
            status: row.status === 'OPEN' || row.status === 'REOPENED' ? 'IN_PROGRESS' : row.status,
        });
        setPhotoBefore(null);
        setPhotoAfter(null);
        setError('');
        setShowModal(true);
    };

    const payloadForSave = () => {
        const payload = { project_id: project?.id };

        if (mode === 'respond') {
            payload.corrective_action = form.corrective_action;
            payload.status = form.status;
            return payload;
        }

        Object.assign(payload, {
            found_date: form.found_date,
            location: form.location,
            category: form.category,
            severity: form.severity,
            description: form.description,
            due_date: form.due_date,
            pic_user_id: form.pic_mode === 'internal' ? form.pic_user_id : '',
            pic_name: form.pic_name,
            pic_company: form.pic_company,
        });

        if (mode === 'create') {
            payload.reporter_name = form.reporter_mode === 'other' ? form.reporter_name : '';
            payload.reporter_company = form.reporter_mode === 'other' ? form.reporter_company : '';
            payload.is_anonymous = form.is_anonymous;
        }

        if (mode === 'edit') {
            payload.corrective_action = form.corrective_action;
            payload.status = form.status;
            payload.verification_note = form.verification_note;
        }

        return payload;
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (form.pic_mode === 'external' && !form.pic_name.trim() && !form.pic_company.trim()) {
            setError('Isi nama PIC atau pilih PIC internal.');
            return;
        }

        setBusy(true);
        try {
            await submitHseForm(
                mode === 'create' ? '/hse-hazards' : `/hse-hazards/${selected.id}`,
                payloadForSave(),
                { photo_before_file: photoBefore, photo_after_file: photoAfter },
                mode === 'create' ? 'POST' : 'PUT'
            );
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan temuan hazard.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = await confirmDelete(`Hapus temuan ${row.hazard_no}?`);
        if (!ok) return;

        try {
            await api.del(`/hse-hazards/${row.id}`);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menghapus temuan.');
        }
    };

    const submitVerify = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            await api.put(`/hse-hazards/${verifying.id}`, {
                status: verifyAction,
                verification_note: verifyNote,
            });
            setVerifying(null);
            setVerifyNote('');
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal memverifikasi temuan.');
        } finally {
            setBusy(false);
        }
    };

    const isPic = (row) => row.pic_user_id && String(row.pic_user_id) === String(user?.id);

    return (
        <div>
            <SectionToolbar
                title="Hazard & temuan lapangan"
                description="Siapa pun yang punya akun boleh melapor; PIC memperbaiki; HSE memverifikasi."
                count={visibleRows.length}
            >
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrint}>
                    <i className="cs-file me-1"></i> Cetak / PDF
                </button>
                {canReport && (
                    <button type="button" className="btn btn-dark btn-sm" onClick={openCreate}>
                        <i className="cs-plus me-1"></i> Lapor hazard
                    </button>
                )}
            </SectionToolbar>

            <HseFilters
                search={filters.search}
                onSearchChange={filters.setSearch}
                placeholder="Cari no. temuan, lokasi, uraian, PIC, atau pelapor…"
                shown={visibleRows.length}
                total={rows.length}
                active={filtersActive}
                onReset={resetFilters}
            >
                <StatusFilter value={filters.status} onChange={filters.setStatus} options={HAZARD_STATUS} />
                <FilterField label="Severity" width={140}>
                    <select
                        className="form-select form-select-sm"
                        value={severity}
                        onChange={(event) => setSeverity(event.target.value)}
                    >
                        <option value="">Semua severity</option>
                        {HAZARD_SEVERITIES.map(([key, text]) => (
                            <option key={key} value={key}>{text}</option>
                        ))}
                    </select>
                </FilterField>
                <DateRangeFilter
                    from={filters.from}
                    to={filters.to}
                    onFromChange={filters.setFrom}
                    onToChange={filters.setTo}
                    labelFrom="Ditemukan dari"
                    labelTo="Ditemukan sampai"
                />
            </HseFilters>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>No. Temuan</th>
                                <th>Tanggal</th>
                                <th>Lokasi</th>
                                <th>Kategori</th>
                                <th>Uraian &amp; pelapor</th>
                                <th>PIC</th>
                                <th>Due</th>
                                <th>Status</th>
                                <th>Bukti</th>
                                <th className="text-end">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.length === 0 ? (
                                <EmptyState
                                    colSpan={10}
                                    message={filtersActive
                                        ? 'Tidak ada temuan yang cocok dengan filter. Ubah kata kunci atau reset filter.'
                                        : 'Belum ada temuan hazard. Laporkan unsafe act/condition pertama untuk project ini.'}
                                />
                            ) : visibleRows.map((row) => {
                                const pic = row.pic_user_id ? usersById[String(row.pic_user_id)] : null;
                                const overdue = isOverdue(row);
                                return (
                                    <tr key={row.id}>
                                        <td className="fw-semibold text-dark text-nowrap">{row.hazard_no}</td>
                                        <td className="text-nowrap">{fmtDate(row.found_date)}</td>
                                        <td>{row.location || '-'}</td>
                                        <td>
                                            <div>{labelOf(HAZARD_CATEGORIES, row.category)}</div>
                                            <span className={`badge ${SEVERITY_TONE[row.severity] || 'bg-secondary'} mt-1`}>
                                                {labelOf(HAZARD_SEVERITIES, row.severity)}
                                            </span>
                                        </td>
                                        <td style={{ minWidth: 240 }}>
                                            <div className="text-dark">{row.description || '-'}</div>
                                            <div className="text-muted small">
                                                Pelapor: {row.reporter_name || row.reporter_company || '-'}
                                                {row.reporter_company && row.reporter_name ? ` · ${row.reporter_company}` : ''}
                                            </div>
                                        </td>
                                        <td style={{ minWidth: 140 }}>
                                            <div>{row.pic_name || pic?.name || '-'}</div>
                                            <div className="text-muted small">{row.pic_company || pic?.department?.code || '-'}</div>
                                        </td>
                                        <td className={`text-nowrap ${overdue ? 'text-danger fw-semibold' : ''}`}>
                                            {fmtDate(row.due_date)}
                                        </td>
                                        <td><StatusBadge value={row.status} list={HAZARD_STATUS} /></td>
                                        <td className="text-nowrap">
                                            <div><PhotoLink path={row.photo_before} label="Before" /></div>
                                            <div><PhotoLink path={row.photo_after} label="After" /></div>
                                        </td>
                                        <td className="text-end text-nowrap">
                                            {(isPic(row) || canManage) && row.status !== 'CLOSED' && (
                                                <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => openRespond(row)}>
                                                    Tanggapi
                                                </button>
                                            )}
                                            {canManage && (
                                                <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => openEdit(row)}>
                                                    Edit
                                                </button>
                                            )}
                                            {canApprove && (row.status === 'RESOLVED' || row.status === 'CLOSED') && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-success me-1"
                                                    onClick={() => {
                                                        setVerifying(row);
                                                        setVerifyAction(row.status === 'CLOSED' ? 'REOPENED' : 'CLOSED');
                                                        setVerifyNote(row.verification_note || '');
                                                    }}
                                                >
                                                    Verifikasi
                                                </button>
                                            )}
                                            {canManage && (
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(row)}>
                                                    Hapus
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <HseModal
                    title={
                        mode === 'create' ? 'Laporkan hazard'
                            : mode === 'respond' ? `Tanggapi ${selected?.hazard_no}`
                                : `Ubah temuan ${selected?.hazard_no}`
                    }
                    subtitle={
                        mode === 'respond'
                            ? 'Isi tindakan perbaikan yang benar-benar dilakukan, lalu unggah bukti after.'
                            : 'Temuan yang jujur lebih berguna daripada laporan yang selalu aman.'
                    }
                    size="modal-lg"
                    onClose={() => setShowModal(false)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-hazard-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : mode === 'respond' ? 'Simpan tindakan' : 'Simpan temuan'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-hazard-form" onSubmit={submit} className="row g-3">
                        {error && <div className="col-12"><div className="alert alert-danger py-2 small mb-0">{error}</div></div>}

                        {mode !== 'respond' && (
                            <>
                                <Field label="Tanggal ditemukan" required>
                                    <input
                                        type="date"
                                        className="form-control"
                                        required
                                        value={form.found_date}
                                        onChange={(event) => setForm({ ...form, found_date: event.target.value })}
                                    />
                                </Field>

                                <Field label="Lokasi" required>
                                    <input
                                        className="form-control"
                                        required
                                        placeholder="Area, line, atau spool"
                                        value={form.location}
                                        onChange={(event) => setForm({ ...form, location: event.target.value })}
                                    />
                                </Field>

                                <Field label="Kategori" required>
                                    <select
                                        className="form-select"
                                        value={form.category}
                                        onChange={(event) => setForm({ ...form, category: event.target.value })}
                                    >
                                        {HAZARD_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </Field>

                                <Field label="Severity" required>
                                    <select
                                        className="form-select"
                                        value={form.severity}
                                        onChange={(event) => setForm({ ...form, severity: event.target.value })}
                                    >
                                        {HAZARD_SEVERITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </Field>

                                <Field label="Uraian temuan" required className="col-12">
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        required
                                        placeholder="Apa yang tidak sesuai, di mana, dan risikonya."
                                        value={form.description}
                                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                                    />
                                </Field>

                                <Field label="Due date perbaikan">
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={form.due_date}
                                        onChange={(event) => setForm({ ...form, due_date: event.target.value })}
                                    />
                                </Field>

                                {mode === 'create' && (
                                    <Field label="Bukti foto before">
                                        <input
                                            type="file"
                                            className="form-control"
                                            accept="image/*"
                                            onChange={(event) => setPhotoBefore(event.target.files?.[0] || null)}
                                        />
                                    </Field>
                                )}

                                <div className="col-12">
                                    <hr className="my-1" />
                                    <div className="fw-semibold small text-dark mb-2">PIC (penanggung jawab perbaikan)</div>
                                    <div className="d-flex flex-wrap gap-3 mb-2">
                                        <label className="form-check-label small">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                checked={form.pic_mode === 'internal'}
                                                onChange={() => setForm({ ...form, pic_mode: 'internal' })}
                                            />
                                            User internal
                                        </label>
                                        <label className="form-check-label small">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                checked={form.pic_mode === 'external'}
                                                onChange={() => setForm({ ...form, pic_mode: 'external' })}
                                            />
                                            Nama &amp; perusahaan (termasuk subcon)
                                        </label>
                                    </div>
                                    {form.pic_mode === 'internal' ? (
                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <select
                                                    className="form-select"
                                                    value={form.pic_user_id}
                                                    onChange={(event) => setForm({ ...form, pic_user_id: event.target.value })}
                                                >
                                                    <option value="">Pilih user…</option>
                                                    {picOptions.map((option) => (
                                                        <option key={option.id} value={option.id}>
                                                            {option.name} — {option.department?.code || option.role}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <input
                                                    className="form-control"
                                                    placeholder="Nama tampilan PIC (opsional)"
                                                    value={form.pic_name}
                                                    onChange={(event) => setForm({ ...form, pic_name: event.target.value })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <input
                                                    className="form-control"
                                                    placeholder="Nama PIC"
                                                    value={form.pic_name}
                                                    onChange={(event) => setForm({ ...form, pic_name: event.target.value })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <input
                                                    className="form-control"
                                                    placeholder="Perusahaan / subcon"
                                                    value={form.pic_company}
                                                    onChange={(event) => setForm({ ...form, pic_company: event.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {mode === 'create' && (
                                    <div className="col-12">
                                        <hr className="my-1" />
                                        <div className="fw-semibold small text-dark mb-2">Pelapor</div>
                                        <div className="d-flex flex-wrap gap-3 mb-2">
                                            <label className="form-check-label small">
                                                <input
                                                    type="radio"
                                                    className="form-check-input me-1"
                                                    checked={form.reporter_mode === 'self'}
                                                    onChange={() => setForm({ ...form, reporter_mode: 'self' })}
                                                />
                                                Saya sendiri
                                            </label>
                                            <label className="form-check-label small">
                                                <input
                                                    type="radio"
                                                    className="form-check-input me-1"
                                                    checked={form.reporter_mode === 'other'}
                                                    onChange={() => setForm({ ...form, reporter_mode: 'other' })}
                                                />
                                                Atas nama pekerja / subcon tanpa akun
                                            </label>
                                        </div>
                                        {form.reporter_mode === 'other' && (
                                            <div className="row g-2">
                                                <div className="col-md-6">
                                                    <input
                                                        className="form-control"
                                                        placeholder="Nama pelapor"
                                                        value={form.reporter_name}
                                                        onChange={(event) => setForm({ ...form, reporter_name: event.target.value })}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <input
                                                        className="form-control"
                                                        placeholder="Perusahaan / subcon"
                                                        value={form.reporter_company}
                                                        onChange={(event) => setForm({ ...form, reporter_company: event.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <label className="form-check-label small mt-2 d-block">
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-1"
                                                checked={form.is_anonymous}
                                                onChange={(event) => setForm({ ...form, is_anonymous: event.target.checked })}
                                            />
                                            Sembunyikan identitas pelapor dari selain HSE
                                        </label>
                                    </div>
                                )}
                            </>
                        )}

                        {(mode === 'edit' || mode === 'respond') && (
                            <>
                                <Field label="Tindakan perbaikan" required className="col-12">
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        required
                                        value={form.corrective_action}
                                        onChange={(event) => setForm({ ...form, corrective_action: event.target.value })}
                                    />
                                </Field>

                                <Field label="Status">
                                    <select
                                        className="form-select"
                                        value={form.status}
                                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                                    >
                                        {mode === 'respond' ? (
                                            <>
                                                <option value="IN_PROGRESS">In progress</option>
                                                <option value="RESOLVED">Resolved — bukti perbaikan sudah diunggah</option>
                                            </>
                                        ) : HAZARD_STATUS.map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Bukti foto after">
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="image/*"
                                        onChange={(event) => setPhotoAfter(event.target.files?.[0] || null)}
                                    />
                                    {selected?.photo_after && (
                                        <div className="mt-1"><PhotoLink path={selected.photo_after} label="Lihat foto after" /></div>
                                    )}
                                </Field>

                                {mode === 'edit' && (
                                    <Field label="Catatan verifikasi HSE" className="col-12">
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            value={form.verification_note}
                                            onChange={(event) => setForm({ ...form, verification_note: event.target.value })}
                                        />
                                    </Field>
                                )}

                                {selected?.photo_before && mode === 'edit' && (
                                    <div className="col-12 small">
                                        Foto before: <PhotoLink path={selected.photo_before} label="Lihat" />
                                    </div>
                                )}
                            </>
                        )}
                    </form>
                </HseModal>
            )}

            {verifying && (
                <HseModal
                    title={`Verifikasi ${verifying.hazard_no}`}
                    subtitle="Tutup hanya jika perbaikan terbukti; buka kembali bila bukti belum memadai."
                    onClose={() => setVerifying(null)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setVerifying(null)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-verify-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Simpan verifikasi'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-verify-form" onSubmit={submitVerify} className="row g-3">
                        <div className="col-12">
                            <label className="form-label small fw-semibold">Keputusan</label>
                            <select
                                className="form-select"
                                value={verifyAction}
                                onChange={(event) => setVerifyAction(event.target.value)}
                            >
                                <option value="CLOSED">Tutup — perbaikan diterima</option>
                                <option value="REOPENED">Buka kembali — perbaikan belum diterima</option>
                            </select>
                        </div>
                        <div className="col-12">
                            <label className="form-label small fw-semibold">Catatan verifikasi</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={verifyNote}
                                onChange={(event) => setVerifyNote(event.target.value)}
                            />
                        </div>
                    </form>
                </HseModal>
            )}
        </div>
    );
}
