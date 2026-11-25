import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { ProjectGuard } from './ProjectGuard';
import {
    HAZARD_CATEGORIES, HAZARD_SEVERITIES, HAZARD_STATUS, HsePrintStyles,
    LOG_KINDS, PERMIT_TYPES, PERMIT_STATUS, PrintSheet, SHIFTS,
    fmtDate, fmtDateTime, fmtNumber, inDateRange, labelOf, monthRange,
} from './hse/HseShared';
import { HseSummarySection } from './hse/HseSummarySection';
import { HseLogSection } from './hse/HseLogSection';
import { HsePermitSection } from './hse/HsePermitSection';
import { HseHazardSection } from './hse/HseHazardSection';
import { HseTbmSection, HseManhourSection } from './hse/HseOperationsSections';

/* Satu menu sidebar = satu layar. Id menu HSE dipetakan ke bagian yang
   dirender; tidak ada lagi tab pil di dalam halaman. */
const SECTION_TABS = {
    hse_summary: 'summary',
    hse_log: 'log',
    hse_permit: 'permit',
    hse_hazard: 'hazard',
    hse_tbm: 'tbm',
    hse_manhours: 'manhours',
};

export function HseTab({
    currentSection = 'hse_summary',
    projects = [],
    hseLogs = [],
    hsePermits = [],
    hseHazards = [],
    hseTbm = [],
    hseManhours = [],
    hseSummary = null,
    user,
    onReload,
    activeProjectId,
    onSetActiveProject,
}) {
    const canViewHse = can(user, 'hse.view') || can(user, 'hse.write');
    const canEdit = can(user, 'hse.write');
    const canApprove = can(user, 'hse.approve');
    const canReport = can(user, 'hse.hazard.report') || canEdit;

    /* Role non-HSE tetap boleh membuka layar hazard (satu-satunya sub-menu
       yang terlihat untuk mereka). Section lain hanya untuk hse.view. */
    const tab = canViewHse
        ? (SECTION_TABS[currentSection] || 'summary')
        : 'hazard';

    const [printMode, setPrintMode] = useState(null);
    const [projectSummary, setProjectSummary] = useState(hseSummary);
    const [period, setPeriod] = useState(() => monthRange());

    const activeProject = useMemo(
        () => (projects || []).find((project) => String(project.id) === String(activeProjectId)) || null,
        [projects, activeProjectId]
    );

    const byProject = (rows) => (rows || []).filter(
        (row) => String(row.project_id) === String(activeProjectId)
    );

    const logs = useMemo(() => byProject(hseLogs), [hseLogs, activeProjectId]);
    const permits = useMemo(() => byProject(hsePermits), [hsePermits, activeProjectId]);
    const hazards = useMemo(() => byProject(hseHazards), [hseHazards, activeProjectId]);
    const tbm = useMemo(() => byProject(hseTbm), [hseTbm, activeProjectId]);
    const manhours = useMemo(() => byProject(hseManhours), [hseManhours, activeProjectId]);

    /* Baris yang masuk ke laporan periode. Setiap modul punya tanggal acuan
       sendiri: log_date, valid_from, found_date, tbm_date, work_date. */
    const periodRows = useMemo(() => {
        const inRange = (value) => inDateRange(value, period?.from, period?.to);
        return {
            logs: logs.filter((row) => inRange(row.log_date)),
            permits: permits.filter((row) => inRange(row.valid_from)),
            hazards: hazards.filter((row) => inRange(row.found_date)),
            tbm: tbm.filter((row) => inRange(row.tbm_date)),
            manhours: manhours.filter((row) => inRange(row.work_date)),
        };
    }, [logs, permits, hazards, tbm, manhours, period]);

    const periodValid = Boolean(period?.from && period?.to && period.from <= period.to);

    const periodSummary = useMemo(() => {
        const rows = periodRows;
        const totalManhours = rows.manhours.reduce((sum, row) => sum + (Number(row.manhours) || 0), 0);
        const workDays = new Set(rows.manhours.map((row) => String(row.work_date).slice(0, 10))).size;
        const attendees = rows.tbm.reduce((sum, row) => sum + (Number(row.attendees_count) || 0), 0);
        const hazardsDone = rows.hazards.filter((row) => row.status === 'CLOSED').length;
        const hazardsLeft = rows.hazards.length - hazardsDone;
        const permitsApproved = rows.permits.filter((row) => row.status === 'APPROVED' || row.status === 'CLOSED').length;
        const permitsPending = rows.permits.filter((row) => row.status === 'PENDING').length;

        return [
            {
                label: 'Safe man-hours',
                value: `${fmtNumber(totalManhours, 2)} jam`,
                note: `${workDays} hari tercatat`,
            },
            {
                label: 'Toolbox meeting',
                value: `${fmtNumber(rows.tbm.length, 0)} kegiatan`,
                note: `${fmtNumber(attendees, 0)} peserta`,
            },
            {
                label: 'Hazard dilaporkan',
                value: `${fmtNumber(rows.hazards.length, 0)} temuan`,
                note: `${fmtNumber(hazardsDone, 0)} selesai · ${fmtNumber(hazardsLeft, 0)} belum`,
            },
            {
                label: 'Permit to work',
                value: `${fmtNumber(rows.permits.length, 0)} izin`,
                note: `${fmtNumber(permitsApproved, 0)} disetujui · ${fmtNumber(permitsPending, 0)} menunggu`,
            },
        ];
    }, [periodRows]);

    /* KPI harus mengikuti project yang sedang dibuka. Endpoint menerima
       project_id; tanpa ini kartu ringkasan mencampur semua project. Effect
       dijalankan ulang setiap parent selesai memuat data (hseSummary baru). */
    useEffect(() => {
        if (!canViewHse || !activeProjectId) {
            setProjectSummary(null);
            return undefined;
        }

        let alive = true;
        api.get(`/hse-summary?project_id=${activeProjectId}`)
            .then((data) => { if (alive) setProjectSummary(data || null); })
            .catch(() => { if (alive) setProjectSummary(null); });

        return () => { alive = false; };
    }, [canViewHse, activeProjectId, hseSummary]);

    useEffect(() => {
        if (!printMode) return undefined;
        const timer = window.setTimeout(() => window.print(), 80);
        return () => window.clearTimeout(timer);
    }, [printMode]);

    useEffect(() => {
        const reset = () => setPrintMode(null);
        window.addEventListener('afterprint', reset);
        return () => window.removeEventListener('afterprint', reset);
    }, []);

    const printSections = useMemo(() => {
        if (!printMode) return [];

        const source = printMode === 'period'
            ? periodRows
            : { logs, permits, hazards, tbm, manhours };

        const definitions = {
            log: {
                title: 'Log Harian HSE',
                columns: ['No. Log', 'Tanggal', 'Jenis', 'Lokasi', 'Uraian', 'Tindakan', 'PIC', 'Due', 'Status'],
                rows: source.logs.map((row) => [
                    row.log_no, fmtDate(row.log_date), labelOf(LOG_KINDS, row.kind),
                    row.location, row.description, row.action_taken, row.pic,
                    fmtDate(row.due_date), row.status,
                ]),
            },
            permit: {
                title: 'Permit to Work (PTW)',
                columns: ['No. Permit', 'Jenis', 'Lokasi', 'Line', 'Pemohon', 'Perusahaan', 'Berlaku', 'Status'],
                rows: source.permits.map((row) => [
                    row.permit_no, labelOf(PERMIT_TYPES, row.permit_type), row.work_location,
                    row.line_no, row.applicant_name, row.applicant_company,
                    `${fmtDateTime(row.valid_from)} s.d. ${fmtDateTime(row.valid_to)}`,
                    labelOf(PERMIT_STATUS, row.status),
                ]),
            },
            hazard: {
                title: 'Hazard & Temuan Lapangan',
                columns: ['No. Temuan', 'Tanggal', 'Lokasi', 'Kategori', 'Severity', 'Uraian', 'PIC', 'Due', 'Perbaikan', 'Status'],
                rows: source.hazards.map((row) => [
                    row.hazard_no, fmtDate(row.found_date), row.location,
                    labelOf(HAZARD_CATEGORIES, row.category), labelOf(HAZARD_SEVERITIES, row.severity),
                    row.description, row.pic_name || row.pic_company, fmtDate(row.due_date),
                    row.corrective_action, labelOf(HAZARD_STATUS, row.status),
                ]),
            },
            tbm: {
                title: 'Toolbox Meeting',
                columns: ['Tanggal', 'Shift', 'Lokasi', 'Topik', 'Peserta', 'Pemimpin'],
                rows: source.tbm.map((row) => [
                    fmtDate(row.tbm_date), labelOf(SHIFTS, row.shift), row.location,
                    row.topic, fmtNumber(row.attendees_count, 0), row.leader_name,
                ]),
            },
            manhours: {
                title: 'Safe Man-hours',
                columns: ['Tanggal', 'Area', 'Kontraktor', 'Pekerja', 'Jam/orang', 'Man-hours', 'Catatan'],
                rows: source.manhours.map((row) => [
                    fmtDate(row.work_date), row.area, row.contractor,
                    fmtNumber(row.worker_count, 0), fmtNumber(row.work_hours, 2),
                    fmtNumber(row.manhours, 2), row.notes,
                ]),
            },
        };

        if (printMode === 'all' || printMode === 'period') {
            return ['log', 'permit', 'hazard', 'tbm', 'manhours'].map((key) => definitions[key]);
        }

        return definitions[printMode] ? [definitions[printMode]] : [];
    }, [printMode, logs, permits, hazards, tbm, manhours, periodRows]);

    if (!activeProjectId) {
        return <ProjectGuard projects={projects} onSelectProject={onSetActiveProject} />;
    }

    if (!canViewHse && !canReport) {
        return (
            <div className="alert alert-light border">
                Akun ini tidak memiliki akses HSE. Hubungi Super Admin untuk izin <code>hse.view</code> atau
                <code className="ms-1">hse.hazard.report</code>.
            </div>
        );
    }

    const printButton = (mode) => () => setPrintMode(mode);

    const projectLabel = activeProject
        ? `${activeProject.name || 'Project'}${activeProject.job_no ? ` • JOB ${activeProject.job_no}` : ''}`
        : `Project #${activeProjectId}`;

    return (
        <div className="container-fluid px-4 py-4">
            <HsePrintStyles />

            <div className="hse-print-sheet">
                <PrintSheet
                    project={activeProject}
                    sections={printSections}
                    user={user}
                    period={printMode === 'period' ? period : null}
                    summary={printMode === 'period' ? periodSummary : null}
                />
            </div>

            <div className="d-print-none">
                {/* Project context bar: sama seperti departemen lain. */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body py-2">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span
                                className="text-muted fw-bold text-uppercase"
                                style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}
                            >
                                Project
                            </span>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                {projectLabel}
                            </span>
                            <span className="text-muted small">
                                Data HSE terkunci ke project ini.
                            </span>
                            {canViewHse && (
                                <button
                                    type="button"
                                    className="btn btn-outline-dark btn-sm ms-auto"
                                    onClick={printButton('all')}
                                >
                                    <i className="cs-file me-1"></i> Cetak semua modul
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {!canViewHse && (
                    <div className="alert alert-light border small">
                        Modul HSE lengkap hanya untuk departemen HSE. Anda dapat melihat semua temuan dalam project ini,
                        melaporkan hazard baru, dan mengisi tindakan perbaikan bila ditunjuk sebagai PIC.
                    </div>
                )}

                {tab === 'summary' && canViewHse && (
                    <HseSummarySection
                        summary={projectSummary}
                        hazards={hazards}
                        permits={permits}
                        period={period}
                        onPeriodChange={setPeriod}
                        periodValid={periodValid}
                        onPrintPeriod={printButton('period')}
                        periodCounts={{
                            logs: periodRows.logs.length,
                            permits: periodRows.permits.length,
                            hazards: periodRows.hazards.length,
                            tbm: periodRows.tbm.length,
                            manhours: periodRows.manhours.length,
                        }}
                    />
                )}

                {tab === 'log' && canViewHse && (
                    <HseLogSection
                        rows={logs}
                        project={activeProject}
                        user={user}
                        canEdit={canEdit}
                        onReload={onReload}
                        onPrint={printButton('log')}
                    />
                )}

                {tab === 'permit' && canViewHse && (
                    <HsePermitSection
                        rows={permits}
                        project={activeProject}
                        user={user}
                        canEdit={canEdit}
                        canApprove={canApprove}
                        onReload={onReload}
                        onPrint={printButton('permit')}
                    />
                )}

                {tab === 'hazard' && (
                    <HseHazardSection
                        rows={hazards}
                        project={activeProject}
                        user={user}
                        canManage={canEdit}
                        canApprove={canApprove}
                        canReport={canReport}
                        onReload={onReload}
                        onPrint={printButton('hazard')}
                    />
                )}

                {tab === 'tbm' && canViewHse && (
                    <HseTbmSection
                        rows={tbm}
                        project={activeProject}
                        user={user}
                        canEdit={canEdit}
                        onReload={onReload}
                        onPrint={printButton('tbm')}
                    />
                )}

                {tab === 'manhours' && canViewHse && (
                    <HseManhourSection
                        rows={manhours}
                        project={activeProject}
                        user={user}
                        canEdit={canEdit}
                        onReload={onReload}
                        onPrint={printButton('manhours')}
                    />
                )}
            </div>
        </div>
    );
}
