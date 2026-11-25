import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { confirmDelete } from '../../confirm';
import { SearchSelect } from '../SearchSelect';
import { buildPlantAreaOptions } from '../masterParameters';
import {
    DateRangeFilter, EmptyState, Field, FilterField, HseFilters, HseModal, PhotoLink, SHIFTS,
    SectionToolbar, fmtDate, fmtNumber, inDateRange, labelOf, matchesSearch,
    submitHseForm, today, useHseFilters,
} from './HseShared';

/* -------------------------------------------------------------------------
 * Toolbox Meeting
 * ---------------------------------------------------------------------- */

const emptyTbm = () => ({
    tbm_date: today(),
    shift: 'PAGI',
    location: '',
    topic: '',
    leader_name: '',
    notes: '',
    attendeeLines: '',
});

const parseAttendees = (lines) => lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        const [name, company] = line.split('|').map((part) => part.trim());
        return { name: name || '', company: company || '' };
    });

export function HseTbmSection({ rows = [], project, canEdit, onReload, onPrint }) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyTbm());
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const filters = useHseFilters();
    const [shift, setShift] = useState('');
    const resetFilters = () => {
        filters.reset();
        setShift('');
    };
    const filtersActive = filters.active || Boolean(shift);

    const visibleRows = rows.filter((row) => (
        (!filters.status || row.status === filters.status)
        && (!shift || row.shift === shift)
        && inDateRange(row.tbm_date, filters.from, filters.to)
        && matchesSearch(filters.search, [row.location, row.topic, row.leader_name, row.notes])
    ));

    const openCreate = () => {
        setEditing(null);
        setForm(emptyTbm());
        setPhoto(null);
        setError('');
        setShowModal(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm({
            tbm_date: row.tbm_date ? String(row.tbm_date).slice(0, 10) : today(),
            shift: row.shift || 'PAGI',
            location: row.location || '',
            topic: row.topic || '',
            leader_name: row.leader_name || '',
            notes: row.notes || '',
            attendeeLines: Array.isArray(row.attendee_list)
                ? row.attendee_list.map((person) => `${person.name || ''}${person.company ? ` | ${person.company}` : ''}`).join('\n')
                : '',
        });
        setPhoto(null);
        setError('');
        setShowModal(true);
    };

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');

        const attendees = parseAttendees(form.attendeeLines);

        try {
            await submitHseForm(
                editing ? `/hse-tbm/${editing.id}` : '/hse-tbm',
                {
                    project_id: project?.id,
                    tbm_date: form.tbm_date,
                    shift: form.shift,
                    location: form.location,
                    topic: form.topic,
                    leader_name: form.leader_name,
                    notes: form.notes,
                    attendees_count: attendees.length,
                    attendee_list: JSON.stringify(attendees),
                },
                { photo_file: photo },
                editing ? 'PUT' : 'POST'
            );
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan TBM.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = await confirmDelete(`Hapus TBM ${fmtDate(row.tbm_date)} — ${row.topic}?`);
        if (!ok) return;

        try {
            await api.del(`/hse-tbm/${row.id}`);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menghapus TBM.');
        }
    };

    return (
        <div>
            <SectionToolbar
                title="Toolbox meeting (TBM)"
                description="Briefing keselamatan harian beserta jumlah dan daftar peserta."
                count={visibleRows.length}
            >
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrint}>
                    <i className="cs-file me-1"></i> Cetak / PDF
                </button>
                {canEdit && (
                    <button type="button" className="btn btn-dark btn-sm" onClick={openCreate}>
                        <i className="cs-plus me-1"></i> Catat TBM
                    </button>
                )}
            </SectionToolbar>

            <HseFilters
                search={filters.search}
                onSearchChange={filters.setSearch}
                placeholder="Cari lokasi, topik, atau pemimpin TBM…"
                shown={visibleRows.length}
                total={rows.length}
                active={filtersActive}
                onReset={resetFilters}
            >
                <FilterField label="Shift" width={140}>
                    <select
                        className="form-select form-select-sm"
                        value={shift}
                        onChange={(event) => setShift(event.target.value)}
                    >
                        <option value="">Semua shift</option>
                        {SHIFTS.map(([key, text]) => (
                            <option key={key} value={key}>{text}</option>
                        ))}
                    </select>
                </FilterField>
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
                                <th>Tanggal</th>
                                <th>Shift</th>
                                <th>Lokasi</th>
                                <th>Topik</th>
                                <th>Peserta</th>
                                <th>Pemimpin</th>
                                <th>Bukti</th>
                                {canEdit && <th className="text-end">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.length === 0 ? (
                                <EmptyState
                                    colSpan={canEdit ? 8 : 7}
                                    message={filtersActive
                                        ? 'Tidak ada TBM yang cocok dengan filter. Ubah kata kunci atau reset filter.'
                                        : 'Belum ada TBM untuk project ini.'}
                                />
                            ) : visibleRows.map((row) => (
                                <tr key={row.id}>
                                    <td className="text-nowrap fw-semibold">{fmtDate(row.tbm_date)}</td>
                                    <td>{labelOf(SHIFTS, row.shift)}</td>
                                    <td>{row.location || '-'}</td>
                                    <td style={{ minWidth: 220 }}>{row.topic}</td>
                                    <td className="text-nowrap">{fmtNumber(row.attendees_count, 0)} orang</td>
                                    <td>{row.leader_name || '-'}</td>
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
                    title={editing ? 'Ubah TBM' : 'Catat toolbox meeting'}
                    subtitle="Peserta boleh pekerja subcon tanpa akun; tulis satu nama per baris."
                    size="modal-lg"
                    onClose={() => setShowModal(false)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-tbm-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Simpan TBM'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-tbm-form" onSubmit={submit} className="row g-3">
                        {error && <div className="col-12"><div className="alert alert-danger py-2 small mb-0">{error}</div></div>}

                        <Field label="Tanggal" required>
                            <input
                                type="date"
                                className="form-control"
                                required
                                value={form.tbm_date}
                                onChange={(event) => setForm({ ...form, tbm_date: event.target.value })}
                            />
                        </Field>

                        <Field label="Shift">
                            <select
                                className="form-select"
                                value={form.shift}
                                onChange={(event) => setForm({ ...form, shift: event.target.value })}
                            >
                                {SHIFTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>

                        <Field label="Lokasi">
                            <input
                                className="form-control"
                                value={form.location}
                                onChange={(event) => setForm({ ...form, location: event.target.value })}
                            />
                        </Field>

                        <Field label="Pemimpin TBM">
                            <input
                                className="form-control"
                                value={form.leader_name}
                                onChange={(event) => setForm({ ...form, leader_name: event.target.value })}
                            />
                        </Field>

                        <Field label="Topik" required className="col-12">
                            <textarea
                                className="form-control"
                                rows="2"
                                required
                                value={form.topic}
                                onChange={(event) => setForm({ ...form, topic: event.target.value })}
                            />
                        </Field>

                        <Field
                            label="Daftar peserta"
                            className="col-12"
                            hint="Format: Nama | Perusahaan. Satu peserta per baris. Jumlah peserta dihitung otomatis."
                        >
                            <textarea
                                className="form-control"
                                rows="5"
                                placeholder={'Budi | PT Subcon Jaya\nSlamet | PCM'}
                                value={form.attendeeLines}
                                onChange={(event) => setForm({ ...form, attendeeLines: event.target.value })}
                            />
                            <div className="form-text">
                                {parseAttendees(form.attendeeLines).length} peserta terbaca.
                            </div>
                        </Field>

                        <Field label="Catatan" className="col-12">
                            <textarea
                                className="form-control"
                                rows="2"
                                value={form.notes}
                                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                            />
                        </Field>

                        <Field label="Foto kegiatan" className="col-12">
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

/* -------------------------------------------------------------------------
 * Safe man-hours
 * ---------------------------------------------------------------------- */

const emptyManhour = () => ({
    work_date: today(),
    area: '',
    contractor: '',
    worker_count: '',
    work_hours: '8',
    notes: '',
});

export function HseManhourSection({ rows = [], project, canEdit, onReload, onPrint }) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyManhour());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [parameters, setParameters] = useState([]);
    const [areaMasterLoaded, setAreaMasterLoaded] = useState(false);

    const filters = useHseFilters();
    const visibleRows = rows.filter((row) => (
        inDateRange(row.work_date, filters.from, filters.to)
        && matchesSearch(filters.search, [row.area, row.contractor, row.notes])
    ));

    const preview = (Number(form.worker_count) || 0) * (Number(form.work_hours) || 0);

    /* Area memakai master Plant Area yang sama dengan Engineering (menu
       Administrasi → Parameters, kategori plant_area). Satu sumber data:
       pilihan di sini tidak akan berbeda tulisan dengan gambar Engineering. */
    useEffect(() => {
        let alive = true;
        api.get('/system-parameters')
            .then((data) => { if (alive) setParameters(Array.isArray(data) ? data : []); })
            .catch(() => { if (alive) setParameters([]); })
            .finally(() => { if (alive) setAreaMasterLoaded(true); });
        return () => { alive = false; };
    }, []);

    const areaOptions = useMemo(() => buildPlantAreaOptions(
        parameters,
        (rows || []).map((row) => (row.area || '').trim()).filter(Boolean)
    ), [parameters, rows]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyManhour());
        setError('');
        setShowModal(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm({
            work_date: row.work_date ? String(row.work_date).slice(0, 10) : today(),
            area: row.area || '',
            contractor: row.contractor || '',
            worker_count: row.worker_count ?? '',
            work_hours: row.work_hours ?? '8',
            notes: row.notes || '',
        });
        setError('');
        setShowModal(true);
    };

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');

        try {
            await submitHseForm(
                editing ? `/hse-manhours/${editing.id}` : '/hse-manhours',
                { ...form, project_id: project?.id },
                {},
                editing ? 'PUT' : 'POST'
            );
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan man-hours.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = await confirmDelete(`Hapus man-hours ${fmtDate(row.work_date)} — ${row.area || '-'}?`);
        if (!ok) return;

        try {
            await api.del(`/hse-manhours/${row.id}`);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menghapus man-hours.');
        }
    };

    return (
        <div>
            <SectionToolbar
                title="Safe man-hours"
                description="Jumlah pekerja × jam kerja per hari. Angka ini yang dipakai KPI, bukan konstanta."
                count={visibleRows.length}
            >
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrint}>
                    <i className="cs-file me-1"></i> Cetak / PDF
                </button>
                {canEdit && (
                    <button type="button" className="btn btn-dark btn-sm" onClick={openCreate}>
                        <i className="cs-plus me-1"></i> Input man-hours
                    </button>
                )}
            </SectionToolbar>

            <HseFilters
                search={filters.search}
                onSearchChange={filters.setSearch}
                placeholder="Cari area, kontraktor, atau catatan…"
                shown={visibleRows.length}
                total={rows.length}
                active={filters.active}
                onReset={filters.reset}
            >
                <DateRangeFilter
                    from={filters.from}
                    to={filters.to}
                    onFromChange={filters.setFrom}
                    onToChange={filters.setTo}
                    labelFrom="Kerja dari"
                    labelTo="Kerja sampai"
                />
            </HseFilters>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>Tanggal</th>
                                <th>Area</th>
                                <th>Kontraktor</th>
                                <th>Pekerja</th>
                                <th>Jam / orang</th>
                                <th>Man-hours</th>
                                <th>Catatan</th>
                                {canEdit && <th className="text-end">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.length === 0 ? (
                                <EmptyState
                                    colSpan={canEdit ? 8 : 7}
                                    message={filters.active
                                        ? 'Tidak ada man-hours yang cocok dengan filter. Ubah kata kunci atau reset filter.'
                                        : 'Belum ada catatan man-hours. KPI akan tetap 0 sampai ada data.'}
                                />
                            ) : visibleRows.map((row) => (
                                <tr key={row.id}>
                                    <td className="text-nowrap fw-semibold">{fmtDate(row.work_date)}</td>
                                    <td>{row.area || '-'}</td>
                                    <td>{row.contractor || '-'}</td>
                                    <td className="text-nowrap">{fmtNumber(row.worker_count, 0)}</td>
                                    <td className="text-nowrap">{fmtNumber(row.work_hours, 2)}</td>
                                    <td className="text-nowrap fw-bold text-dark">{fmtNumber(row.manhours, 2)}</td>
                                    <td className="text-muted">{row.notes || '-'}</td>
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
                    title={editing ? 'Ubah man-hours' : 'Input safe man-hours'}
                    subtitle="Total dihitung server: jumlah pekerja × jam kerja."
                    onClose={() => setShowModal(false)}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button type="submit" form="hse-manhour-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Simpan'}
                            </button>
                        </>
                    )}
                >
                    <form id="hse-manhour-form" onSubmit={submit} className="row g-3">
                        {error && <div className="col-12"><div className="alert alert-danger py-2 small mb-0">{error}</div></div>}

                        <Field label="Tanggal" required hint="Satu tanggal + area + kontraktor hanya boleh dicatat sekali.">
                            <input
                                type="date"
                                className="form-control"
                                required
                                value={form.work_date}
                                onChange={(event) => setForm({ ...form, work_date: event.target.value })}
                            />
                        </Field>

                        <Field
                            label="Area"
                            hint={areaOptions.length === 0 && areaMasterLoaded
                                ? 'Master Plant Area belum diisi. Tambahkan di Administrasi → Master Parameter (kategori Plant Area).'
                                : 'Pilihan diambil dari master Plant Area (Administrasi → Master Parameter) yang juga dipakai Engineering.'}
                        >
                            <SearchSelect
                                value={form.area || ''}
                                onChange={(val) => setForm({ ...form, area: val })}
                                options={areaOptions}
                                placeholder={areaMasterLoaded ? 'Pilih area plant…' : 'Memuat area…'}
                                disabled={!areaMasterLoaded}
                                allowCustom={areaMasterLoaded && areaOptions.length === 0}
                                ariaLabel="Area"
                            />
                        </Field>

                        <Field label="Kontraktor / subcon">
                            <input
                                className="form-control"
                                value={form.contractor}
                                onChange={(event) => setForm({ ...form, contractor: event.target.value })}
                            />
                        </Field>

                        <Field label="Jumlah pekerja" required hint="1 sampai 5.000 orang per baris.">
                            <input
                                type="number"
                                min="1"
                                max="5000"
                                className="form-control"
                                required
                                value={form.worker_count}
                                onChange={(event) => setForm({ ...form, worker_count: event.target.value })}
                            />
                        </Field>

                        <Field label="Jam kerja per orang" required hint="Maksimal 24 jam per orang per hari.">
                            <input
                                type="number"
                                min="0.5"
                                max="24"
                                step="0.5"
                                className="form-control"
                                required
                                value={form.work_hours}
                                onChange={(event) => setForm({ ...form, work_hours: event.target.value })}
                            />
                        </Field>

                        <Field
                            label="Total man-hours"
                            hint={Number(form.worker_count) > 0
                                ? `${fmtNumber(form.worker_count, 0)} pekerja × ${fmtNumber(form.work_hours, 2)} jam = ${fmtNumber(preview, 2)} man-hours`
                                : 'Isi jumlah pekerja — total muncul otomatis (pekerja × jam) dan dihitung ulang oleh server.'}
                        >
                            <input
                                className="form-control"
                                readOnly
                                value={fmtNumber(preview, 2)}
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
                    </form>
                </HseModal>
            )}
        </div>
    );
}
