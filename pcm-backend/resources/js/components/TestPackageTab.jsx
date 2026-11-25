import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { PcmSelect } from './SearchSelect';
import { ProjectGuard } from './ProjectGuard';
import { HseModal, Field, EmptyState, fmtDate, today } from './hse/HseShared';

/* --------------------------------------------------------------------------
 * Test Package
 * Satu paket uji = satu sistem/line + daftar joint yang diuji bersama.
 * Kesiapannya bukan tebakan: dihitung dari joint anggota paket itu sendiri.
 * ----------------------------------------------------------------------- */

const JOINT_READY = ['NDT_OK', 'TESTED'];

// Alur status dijaga sama persis di server (CrudController::TEST_PACKAGE_FLOW).
const STATUS_FLOW = {
    DRAFT: ['READY_FOR_TEST'],
    READY_FOR_TEST: ['TEST_IN_PROGRESS', 'DRAFT'],
    TEST_IN_PROGRESS: ['PASSED', 'FAILED'],
    PASSED: ['REINSTATED'],
    FAILED: ['READY_FOR_TEST'],
    REINSTATED: ['CLOSED'],
    CLOSED: [],
};

const STATUS_META = {
    DRAFT: { label: 'Draft', chip: 'pcm-chip--neutral', hint: 'Paket masih disusun' },
    READY_FOR_TEST: { label: 'Siap Uji', chip: 'pcm-chip--warning', hint: 'Prasyarat uji terpenuhi' },
    TEST_IN_PROGRESS: { label: 'Sedang Diuji', chip: 'pcm-chip--primary', hint: 'Uji tekan berlangsung' },
    PASSED: { label: 'Lulus', chip: 'pcm-chip--success', hint: 'Uji tekan lulus' },
    FAILED: { label: 'Gagal', chip: 'pcm-chip--danger', hint: 'Perlu perbaikan & retest' },
    REINSTATED: { label: 'Reinstated', chip: 'pcm-chip--dark', hint: 'Blind dilepas, sistem dikembalikan' },
    CLOSED: { label: 'Ditutup', chip: 'pcm-chip--dark', hint: 'Paket selesai & diarsipkan' },
};

const STATUS_FILTER = Object.keys(STATUS_META);

const normaliseStatus = (value) => {
    const key = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (key === '' || key === 'PLANNED') return 'DRAFT';
    if (key === 'READY' || key === 'READY_TO_TEST') return 'READY_FOR_TEST';
    if (key === 'TESTING' || key === 'IN_PROGRESS') return 'TEST_IN_PROGRESS';
    if (key === 'PASS') return 'PASSED';
    if (key === 'FAIL') return 'FAILED';
    return key;
};

const statusMeta = (value) => STATUS_META[normaliseStatus(value)] || { label: value || '-', chip: 'pcm-chip--neutral', hint: '' };

const jointLabel = (joint) => (joint.spool_no
    ? `${joint.spool_no} · Joint #${joint.seq || '—'}`
    : `Joint #${joint.seq || joint.id}`);

const jointPlace = (joint) => joint.line_no || joint.drawing_no || '—';

const dateValue = (value) => (value ? String(value).slice(0, 10) : '');

function readinessOf(pkg) {
    const members = Array.isArray(pkg?.joints) ? pkg.joints : [];
    const total = members.length;
    const cleared = members.filter((joint) => JOINT_READY.includes(joint.status)).length;
    const punch = Number(pkg?.punch_list_open || 0);
    const blinds = !!pkg?.blinds_installed;

    const blockers = [];
    if (total === 0) blockers.push('Paket belum berisi joint');
    if (total > 0 && cleared < total) blockers.push(`${total - cleared} joint belum lolos NDT`);
    if (punch > 0) blockers.push(`${punch} punch list terbuka`);
    if (!blinds) blockers.push('Blind belum terpasang');

    return { members, total, cleared, punch, blinds, blockers, ready: blockers.length === 0 };
}

function MetricCard({ label, value, hint, tone = 'primary' }) {
    return (
        <div className="col-6 col-lg-3">
            <div className="pcm-card h-100 p-3">
                <div className="text-uppercase text-muted fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                    {label}
                </div>
                <div className={`fw-bolder text-${tone}`} style={{ fontSize: '1.6rem', lineHeight: 1.2 }}>{value}</div>
                {hint && <div className="text-muted small">{hint}</div>}
            </div>
        </div>
    );
}

export function TestPackageTab({
    projects = [],
    testPackages = [],
    joints = [],
    user,
    onReload,
    activeProjectId,
    onSetActiveProject,
}) {
    const canEdit = can(user, 'testpackage.write');

    const activeProject = useMemo(
        () => projects.find((project) => String(project.id) === String(activeProjectId)) || null,
        [projects, activeProjectId]
    );

    const [filters, setFilters] = useState({ search: '', status: '' });
    const [detail, setDetail] = useState(null);
    const [editor, setEditor] = useState(null);
    const [form, setForm] = useState(null);
    const [jointOptions, setJointOptions] = useState([]);
    const [jointQuery, setJointQuery] = useState('');
    const [jointLoading, setJointLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // Paket hanya ditampilkan untuk project yang sedang aktif. Paket lama yang
    // belum punya project_id ditandai terpisah, tidak dicampur ke project lain.
    const scopedPackages = useMemo(
        () => (testPackages || []).filter((pkg) => String(pkg.project_id || '') === String(activeProjectId || '')),
        [testPackages, activeProjectId]
    );
    const orphanPackages = useMemo(
        () => (testPackages || []).filter((pkg) => !pkg.project_id),
        [testPackages]
    );

    const rows = useMemo(() => {
        const query = filters.search.trim().toLowerCase();
        return scopedPackages.filter((pkg) => {
            const status = normaliseStatus(pkg.status);
            if (filters.status && status !== filters.status) return false;
            if (!query) return true;
            return [pkg.pkg_no, pkg.system_name, pkg.line_no]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [scopedPackages, filters]);

    const summary = useMemo(() => {
        const counts = { total: scopedPackages.length, ready: 0, testing: 0, done: 0, punch: 0 };
        scopedPackages.forEach((pkg) => {
            const status = normaliseStatus(pkg.status);
            if (status === 'READY_FOR_TEST') counts.ready += 1;
            if (status === 'TEST_IN_PROGRESS') counts.testing += 1;
            if (['PASSED', 'REINSTATED', 'CLOSED'].includes(status)) counts.done += 1;
            counts.punch += Number(pkg.punch_list_open || 0);
        });
        return counts;
    }, [scopedPackages]);

    const editingPkg = useMemo(
        () => (editor?.mode === 'edit' ? (testPackages || []).find((pkg) => pkg.id === editor.id) || null : null),
        [editor, testPackages]
    );

    // Joint yang bisa dipilih: joint project aktif, ditambah joint yang sudah
    // tercatat di paket ini walau isometric-nya tidak lagi terdaftar.
    const pickerJoints = useMemo(() => {
        const map = new Map();
        (jointOptions || []).forEach((joint) => map.set(joint.id, joint));
        (editingPkg?.joints || []).forEach((joint) => {
            if (!map.has(joint.id)) map.set(joint.id, joint);
        });
        return [...map.values()].sort((a, b) => String(a.spool_no || '').localeCompare(String(b.spool_no || '')));
    }, [jointOptions, editingPkg]);

    const filteredPicker = useMemo(() => {
        const query = jointQuery.trim().toLowerCase();
        if (!query) return pickerJoints;
        return pickerJoints.filter((joint) => [joint.spool_no, joint.line_no, joint.drawing_no]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)));
    }, [pickerJoints, jointQuery]);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = window.setTimeout(() => setNotice(''), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const loadJointOptions = async (projectId) => {
        setJointLoading(true);
        try {
            const result = await api.get(`/joints?project_id=${projectId}`);
            setJointOptions(Array.isArray(result) ? result : []);
        } catch (err) {
            setJointOptions(Array.isArray(joints) ? joints : []);
            setError(err.message || 'Gagal memuat daftar joint project.');
        } finally {
            setJointLoading(false);
        }
    };

    const openCreate = () => {
        setError('');
        setNotice('');
        setJointQuery('');
        setForm({
            pkg_no: '',
            system_name: '',
            line_no: '',
            test_kind: 'Hydro',
            test_pressure_bar: '',
            holding_time_min: 60,
            schedule_date: today(),
            status: 'DRAFT',
            punch_list_open: 0,
            blinds: '',
            blinds_installed: false,
            reinstated: false,
            joint_ids: [],
        });
        setEditor({ mode: 'create' });
        loadJointOptions(activeProjectId);
    };

    const openEdit = (pkg) => {
        setError('');
        setNotice('');
        setJointQuery('');
        setForm({
            pkg_no: pkg.pkg_no || '',
            system_name: pkg.system_name || '',
            line_no: pkg.line_no || '',
            test_kind: pkg.test_kind || 'Hydro',
            test_pressure_bar: pkg.test_pressure_bar ?? '',
            holding_time_min: pkg.holding_time_min ?? 60,
            schedule_date: dateValue(pkg.schedule_date),
            status: normaliseStatus(pkg.status),
            punch_list_open: pkg.punch_list_open ?? 0,
            blinds: pkg.blinds || '',
            blinds_installed: !!pkg.blinds_installed,
            reinstated: !!pkg.reinstated,
            joint_ids: (pkg.joints || []).map((joint) => joint.id),
        });
        setEditor({ mode: 'edit', id: pkg.id });
        loadJointOptions(activeProjectId);
    };

    const closeEditor = () => {
        setEditor(null);
        setForm(null);
        setError('');
    };

    const toggleJoint = (id) => {
        setForm((current) => {
            const selected = current.joint_ids.includes(id)
                ? current.joint_ids.filter((value) => value !== id)
                : [...current.joint_ids, id];
            return { ...current, joint_ids: selected };
        });
    };

    const selectReadyJoints = () => {
        const ready = pickerJoints.filter((joint) => JOINT_READY.includes(joint.status)).map((joint) => joint.id);
        setForm((current) => ({ ...current, joint_ids: ready }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form) return;

        setBusy(true);
        setError('');

        const payload = {
            project_id: Number(activeProjectId),
            pkg_no: form.pkg_no.trim(),
            system_name: form.system_name.trim(),
            line_no: form.line_no.trim() || null,
            test_kind: form.test_kind,
            test_pressure_bar: form.test_pressure_bar === '' ? null : Number(form.test_pressure_bar),
            holding_time_min: form.holding_time_min === '' ? null : Number(form.holding_time_min),
            schedule_date: form.schedule_date || null,
            punch_list_open: Number(form.punch_list_open || 0),
            blinds: form.blinds.trim() || null,
            blinds_installed: !!form.blinds_installed,
            reinstated: !!form.reinstated,
            joint_ids: form.joint_ids,
        };

        if (editor.mode === 'edit') payload.status = form.status;

        try {
            const saved = editor.mode === 'edit'
                ? await api.put(`/test-packages/${editor.id}`, payload)
                : await api.post('/test-packages', payload);

            closeEditor();
            const demoted = payload.status
                && normaliseStatus(saved.status) !== normaliseStatus(payload.status);

            setNotice(demoted
                ? `${saved.pkg_no || payload.pkg_no} tersimpan, tetapi status diturunkan ke Draft karena prasyarat uji belum lengkap.`
                : `${saved.pkg_no || payload.pkg_no} tersimpan.`);
            if (onReload) await onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan test package.');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (pkg) => {
        const confirmed = window.confirm(
            `Hapus ${pkg.pkg_no}? Paket yang sudah masuk tahap uji tidak bisa dihapus dan harus ditutup sebagai rekaman.`
        );
        if (!confirmed) return;

        setBusy(true);
        setError('');
        try {
            await api.del(`/test-packages/${pkg.id}`);
            setDetail(null);
            setNotice(`${pkg.pkg_no} dihapus.`);
            if (onReload) await onReload();
        } catch (err) {
            setError(err.message || 'Gagal menghapus test package.');
        } finally {
            setBusy(false);
        }
    };

    const changeStatus = async (pkg, next) => {
        setBusy(true);
        setError('');
        try {
            await api.put(`/test-packages/${pkg.id}`, { status: next });
            setDetail(null);
            setNotice(`${pkg.pkg_no} → ${statusMeta(next).label}.`);
            if (onReload) await onReload();
        } catch (err) {
            setError(err.message || 'Gagal mengubah status paket.');
        } finally {
            setBusy(false);
        }
    };

    if (!activeProjectId) {
        return (
            <ProjectGuard
                sectionLabel="Test Package"
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={onSetActiveProject}
            />
        );
    }

    const detailReadiness = detail ? readinessOf(detail) : null;
    const detailStatus = detail ? normaliseStatus(detail.status) : null;

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Test Package &amp; Hydrotest Control</h3>
                    <p className="text-muted mb-0 small">
                        Paket uji tekan per sistem/line{activeProject ? ` · ${activeProject.job_no ? `[${activeProject.job_no}] ` : ''}${activeProject.name}` : ''}
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {canEdit ? (
                        <button type="button" className="btn btn-dark btn-sm px-3" onClick={openCreate}>
                            <i className="cs-plus me-1" /> Buat Test Package
                        </button>
                    ) : (
                        <span className="pcm-chip pcm-chip--neutral">Mode baca</span>
                    )}
                </div>
            </div>

            {notice && <div className="alert alert-success py-2 small">{notice}</div>}
            {error && !editor && !detail && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="row g-3 mb-4">
                <MetricCard label="Total paket" value={summary.total} hint="pada project ini" />
                <MetricCard label="Siap uji" value={summary.ready} hint="prasyarat terpenuhi" tone="warning" />
                <MetricCard label="Sedang diuji" value={summary.testing} hint={`${summary.done} sudah selesai`} tone="primary" />
                <MetricCard label="Punch list" value={summary.punch} hint="terbuka, harus nol sebelum uji" tone={summary.punch > 0 ? 'danger' : 'success'} />
            </div>

            {orphanPackages.length > 0 && (
                <div className="alert alert-warning py-2 small d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span>
                        {orphanPackages.length} paket lama belum terikat project sehingga tidak tampil di sini.
                        Buka salah satu lewat daftar paket dan pilih project-nya.
                    </span>
                </div>
            )}

            <div className="pcm-card">
                <div className="d-flex flex-wrap align-items-center gap-2 p-3 border-bottom">
                    <input
                        type="search"
                        className="form-control form-control-sm"
                        style={{ maxWidth: '280px' }}
                        placeholder="Cari nomor paket / sistem / line..."
                        value={filters.search}
                        onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                    />
                    <div style={{ width: '180px' }}>
                        <PcmSelect
                            className="form-select form-select-sm"
                            value={filters.status}
                            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                        >
                            <option value="">Semua status</option>
                            {STATUS_FILTER.map((status) => (
                                <option key={status} value={status}>{STATUS_META[status].label}</option>
                            ))}
                        </PcmSelect>
                    </div>
                    {(filters.search || filters.status) && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setFilters({ search: '', status: '' })}
                        >
                            Reset
                        </button>
                    )}
                    <span className="ms-auto text-muted small">{rows.length} dari {scopedPackages.length} paket</span>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover align-middle pcm-table mb-0">
                        <thead>
                            <tr>
                                <th scope="col" style={{ width: '48px' }}><span className="pcm-th-title">No</span></th>
                                <th scope="col"><span className="pcm-th-title">Paket</span></th>
                                <th scope="col"><span className="pcm-th-title">Joint</span></th>
                                <th scope="col"><span className="pcm-th-title">Kesiapan</span></th>
                                <th scope="col"><span className="pcm-th-title">Uji</span></th>
                                <th scope="col"><span className="pcm-th-title">Jadwal</span></th>
                                <th scope="col"><span className="pcm-th-title">Status</span></th>
                                <th scope="col" className="text-end" style={{ minWidth: '170px' }}><span className="pcm-th-title">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <EmptyState
                                    colSpan={8}
                                    message={scopedPackages.length === 0
                                        ? 'Belum ada test package untuk project ini. Buat paket pertama dari joint yang sudah siap.'
                                        : 'Tidak ada paket yang cocok dengan filter.'}
                                />
                            ) : rows.map((pkg, index) => {
                                const readiness = readinessOf(pkg);
                                const meta = statusMeta(pkg.status);
                                return (
                                    <tr key={pkg.id}>
                                        <td className="text-muted">{index + 1}</td>
                                        <td>
                                            <div className="fw-bold text-dark">{pkg.pkg_no}</div>
                                            <div className="text-muted small">{pkg.system_name || '—'}</div>
                                        </td>
                                        <td>
                                            <div className="fw-semibold">{readiness.total} joint</div>
                                            <div className="text-muted small">{pkg.line_no || '—'}</div>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className={`pcm-chip ${readiness.ready ? 'pcm-chip--success' : 'pcm-chip--neutral'}`}>
                                                    {readiness.cleared}/{readiness.total} NDT
                                                </span>
                                                {readiness.punch > 0 && (
                                                    <span className="pcm-chip pcm-chip--danger">{readiness.punch} punch</span>
                                                )}
                                            </div>
                                            {!readiness.ready && (
                                                <div className="text-muted small mt-1" style={{ maxWidth: '220px' }}>
                                                    {readiness.blockers.slice(0, 2).join(' · ')}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="fw-semibold">{pkg.test_kind || 'Hydro'}</div>
                                            <div className="text-muted small">
                                                {pkg.test_pressure_bar != null ? `${pkg.test_pressure_bar} bar` : '—'}
                                                {pkg.holding_time_min ? ` · ${pkg.holding_time_min} mnt` : ''}
                                            </div>
                                        </td>
                                        <td>{pkg.schedule_date ? fmtDate(pkg.schedule_date) : '—'}</td>
                                        <td>
                                            <span className={`pcm-chip ${meta.chip}`}>{meta.label}</span>
                                            {pkg.reinstated && <div className="text-muted small mt-1">reinstated</div>}
                                        </td>
                                        <td className="text-end text-nowrap">
                                            <div className="d-inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary btn-sm px-2"
                                                    onClick={() => { setDetail(pkg); setError(''); }}
                                                    title="Lihat detail paket dan daftar joint"
                                                >
                                                    Detail
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-dark btn-sm px-2"
                                                        onClick={() => openEdit(pkg)}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {canEdit && ['DRAFT', 'READY_FOR_TEST'].includes(normaliseStatus(pkg.status)) && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm px-2"
                                                        onClick={() => handleDelete(pkg)}
                                                        disabled={busy}
                                                    >
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ---------------------------------------------------------------
             * Detail paket: kesiapan + daftar joint + aksi status
             * ------------------------------------------------------------ */}
            {detail && (
                <HseModal
                    title={`${detail.pkg_no} · ${detail.system_name || 'Test Package'}`}
                    subtitle={`${detail.test_kind || 'Hydro'} ${detail.test_pressure_bar != null ? `${detail.test_pressure_bar} bar` : ''}${detail.holding_time_min ? ` · holding ${detail.holding_time_min} menit` : ''}`}
                    size="modal-xl"
                    onClose={() => { setDetail(null); setError(''); }}
                    footer={(
                        <>
                            {canEdit && (STATUS_FLOW[detailStatus] || []).map((next) => (
                                <button
                                    key={next}
                                    type="button"
                                    className={`btn btn-sm ${next === 'READY_FOR_TEST' ? 'btn-warning' : next === 'PASSED' ? 'btn-success' : 'btn-dark'}`}
                                    onClick={() => changeStatus(detail, next)}
                                    disabled={busy}
                                    title={statusMeta(next).hint}
                                >
                                    {busy ? 'Memproses…' : `→ ${statusMeta(next).label}`}
                                </button>
                            ))}
                            <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={() => { setDetail(null); setError(''); }}>
                                Tutup
                            </button>
                        </>
                    )}
                >
                    {error && <div className="alert alert-danger py-2 small">{error}</div>}

                    <div className="row g-3 mb-3">
                        <div className="col-12 col-md-8">
                            <div className={`border rounded p-3 h-100 ${detailReadiness.ready ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}`}>
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                        <div className="fw-bold">
                                            {detailReadiness.ready ? 'Prasyarat uji terpenuhi' : 'Belum siap diuji'}
                                        </div>
                                        <div className="small text-muted">
                                            {detailReadiness.cleared} dari {detailReadiness.total} joint sudah NDT OK
                                        </div>
                                    </div>
                                    <span className={`pcm-chip ${statusMeta(detail.status).chip}`}>{statusMeta(detail.status).label}</span>
                                </div>
                                {detailReadiness.blockers.length > 0 && (
                                    <ul className="small mb-0 mt-2 ps-3">
                                        {detailReadiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="border rounded p-3 h-100 small">
                                <div><span className="text-muted">Project:</span> {detail.project?.name || activeProject?.name || '—'}</div>
                                <div><span className="text-muted">Line:</span> {detail.line_no || '—'}</div>
                                <div><span className="text-muted">Jadwal:</span> {detail.schedule_date ? fmtDate(detail.schedule_date) : '—'}</div>
                                <div><span className="text-muted">Punch list:</span> {detailReadiness.punch}</div>
                                <div><span className="text-muted">Blind:</span> {detailReadiness.blinds ? 'terpasang' : 'belum'}{detail.reinstated ? ' · reinstated' : ''}</div>
                            </div>
                        </div>
                    </div>

                    {detail.blinds && (
                        <div className="small mb-3">
                            <span className="text-muted">Catatan blind:</span> {detail.blinds}
                        </div>
                    )}

                    <div className="table-responsive border rounded">
                        <table className="table table-sm align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Spool / Joint</th>
                                    <th>Line / Isometric</th>
                                    <th>Size</th>
                                    <th>Status QC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailReadiness.members.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted py-4 small">
                                            Paket ini belum berisi joint.
                                        </td>
                                    </tr>
                                ) : detailReadiness.members.map((joint) => (
                                    <tr key={joint.id}>
                                        <td className="fw-semibold">{jointLabel(joint)}</td>
                                        <td className="text-muted small">{jointPlace(joint)}</td>
                                        <td>{joint.size_in ? `${joint.size_in}"` : '—'}</td>
                                        <td>
                                            <span className={`pcm-chip ${JOINT_READY.includes(joint.status) ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                {joint.status || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </HseModal>
            )}

            {/* ---------------------------------------------------------------
             * Form buat / ubah paket + pemilih joint
             * ------------------------------------------------------------ */}
            {editor && form && (
                <HseModal
                    title={editor.mode === 'edit' ? `Ubah ${form.pkg_no || 'test package'}` : 'Buat Test Package'}
                    subtitle="Nomor paket dikosongkan = dibuat otomatis. Joint menentukan kesiapan uji paket ini."
                    size="modal-xl"
                    onClose={closeEditor}
                    footer={(
                        <>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeEditor}>Batal</button>
                            <button type="submit" form="test-package-form" className="btn btn-dark btn-sm" disabled={busy}>
                                {busy ? 'Menyimpan…' : 'Simpan Paket'}
                            </button>
                        </>
                    )}
                >
                    <form id="test-package-form" className="row g-3" onSubmit={handleSubmit}>
                        {error && <div className="col-12"><div className="alert alert-danger py-2 small mb-0">{error}</div></div>}

                        <Field label="Nomor paket" hint="Kosongkan untuk nomor otomatis TP-<job>-001">
                            <input
                                className="form-control form-control-sm"
                                value={form.pkg_no}
                                placeholder="otomatis"
                                onChange={(event) => setForm({ ...form, pkg_no: event.target.value })}
                            />
                        </Field>

                        <Field label="Nama sistem / line" required>
                            <input
                                className="form-control form-control-sm"
                                required
                                value={form.system_name}
                                placeholder="mis. Cooling Water System Line 101"
                                onChange={(event) => setForm({ ...form, system_name: event.target.value })}
                            />
                        </Field>

                        <Field label="Line number">
                            <input
                                className="form-control form-control-sm"
                                value={form.line_no}
                                placeholder="mis. CW-2428-01"
                                onChange={(event) => setForm({ ...form, line_no: event.target.value })}
                            />
                        </Field>

                        <Field label="Media uji">
                            <PcmSelect
                                className="form-select form-select-sm"
                                value={form.test_kind}
                                onChange={(event) => setForm({ ...form, test_kind: event.target.value })}
                            >
                                <option value="Hydro">Hydro (air)</option>
                                <option value="Pneumatic">Pneumatic (udara)</option>
                            </PcmSelect>
                        </Field>

                        <Field label="Tekanan uji (bar)">
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                className="form-control form-control-sm"
                                value={form.test_pressure_bar}
                                onChange={(event) => setForm({ ...form, test_pressure_bar: event.target.value })}
                            />
                        </Field>

                        <Field label="Holding time (menit)">
                            <input
                                type="number"
                                min="1"
                                max="1440"
                                className="form-control form-control-sm"
                                value={form.holding_time_min}
                                onChange={(event) => setForm({ ...form, holding_time_min: event.target.value })}
                            />
                        </Field>

                        <Field label="Target tanggal uji">
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={form.schedule_date}
                                onChange={(event) => setForm({ ...form, schedule_date: event.target.value })}
                            />
                        </Field>

                        <Field label="Punch list terbuka">
                            <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm"
                                value={form.punch_list_open}
                                onChange={(event) => setForm({ ...form, punch_list_open: event.target.value })}
                            />
                        </Field>

                        {editor.mode === 'edit' && (
                            <Field
                                label="Status paket"
                                hint="Hanya transisi yang sah yang bisa dipilih; server tetap memeriksa ulang"
                            >
                                <PcmSelect
                                    className="form-select form-select-sm"
                                    value={form.status}
                                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                                >
                                    <option value={form.status}>{statusMeta(form.status).label}</option>
                                    {(STATUS_FLOW[form.status] || []).map((next) => (
                                        <option key={next} value={next}>{statusMeta(next).label}</option>
                                    ))}
                                </PcmSelect>
                            </Field>
                        )}

                        <Field label="Catatan blind / tag" className="col-12" hint="Daftar blind yang dipasang untuk isolasi sistem">
                            <textarea
                                className="form-control form-control-sm"
                                rows="2"
                                value={form.blinds}
                                placeholder="mis. B-01 6in 150#, B-02 4in 150#"
                                onChange={(event) => setForm({ ...form, blinds: event.target.value })}
                            />
                        </Field>

                        <div className="col-12 d-flex flex-wrap gap-4">
                            <div className="form-check">
                                <input
                                    id="tp-blinds"
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={form.blinds_installed}
                                    onChange={(event) => setForm({ ...form, blinds_installed: event.target.checked })}
                                />
                                <label className="form-check-label small" htmlFor="tp-blinds">Blind sudah terpasang</label>
                            </div>
                            <div className="form-check">
                                <input
                                    id="tp-reinstated"
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={form.reinstated}
                                    onChange={(event) => setForm({ ...form, reinstated: event.target.checked })}
                                />
                                <label className="form-check-label small" htmlFor="tp-reinstated">Sistem sudah di-reinstate (blind dilepas)</label>
                            </div>
                        </div>

                        <div className="col-12">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                <label className="form-label small fw-semibold mb-0">
                                    Joint yang diuji <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={selectReadyJoints}>
                                        Pilih yang NDT OK
                                    </button>
                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setForm({ ...form, joint_ids: [] })}>
                                        Kosongkan
                                    </button>
                                </div>
                            </div>

                            <input
                                type="search"
                                className="form-control form-control-sm mb-2"
                                placeholder="Cari spool / line / isometric..."
                                value={jointQuery}
                                onChange={(event) => setJointQuery(event.target.value)}
                            />

                            <div className="border rounded" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                {jointLoading ? (
                                    <div className="text-muted small p-3">Memuat joint project…</div>
                                ) : filteredPicker.length === 0 ? (
                                    <div className="text-muted small p-3">
                                        Tidak ada joint pada project ini. Tambahkan joint di modul Construction lebih dulu.
                                    </div>
                                ) : filteredPicker.map((joint) => (
                                    <label
                                        key={joint.id}
                                        className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
                                        style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="form-check-input mt-0"
                                            checked={form.joint_ids.includes(joint.id)}
                                            onChange={() => toggleJoint(joint.id)}
                                        />
                                        <span className="flex-grow-1">
                                            <span className="fw-semibold">{jointLabel(joint)}</span>
                                            <span className="text-muted"> · {jointPlace(joint)}</span>
                                        </span>
                                        <span className={`pcm-chip ${JOINT_READY.includes(joint.status) ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                            {joint.status || '—'}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="form-text small">
                                {form.joint_ids.length} joint dipilih. Joint yang belum NDT OK tetap boleh masuk paket,
                                tetapi paket tidak bisa ditandai <strong>Siap Uji</strong> sebelum semuanya lolos.
                            </div>
                        </div>
                    </form>
                </HseModal>
            )}
        </div>
    );
}
