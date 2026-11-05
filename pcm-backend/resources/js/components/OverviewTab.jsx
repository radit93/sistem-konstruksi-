/* Hallmark · macrostructure: Workbench · theme: Acorn-Blue · tone: utilitarian
 * module: Global Dashboard · tokens: public/css/main.css (--pcm-*)
 * direction: DESIGN.md · dials: ENERGY 1 · RHYTHM 1 · MOTION 1
 * disciplines: honest-copy · locked-tokens · mobile-responsive · keyboard-a11y
 *
 * Every number on this screen is computed from API data. A value with no
 * source renders as a dash, never as a guessed figure (DESIGN.md section 10).
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PcmSelect } from './SearchSelect';

/* -------------------------------------------------------------------------
 * Icon set. Heroicons outline paths, one stroke weight, one 24x24 grid, drawn
 * inline. No emoji, no icon font, no second library (R-04). The previous
 * version used `bi bi-*` classes, but Bootstrap Icons is not loaded anywhere
 * in this app, so those icons never rendered at all.
 * ---------------------------------------------------------------------- */
const SVG_PROPS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false'
};

const iconClass = (size) => (
    size === 'lg' ? 'pcm-i pcm-i--lg' : size === 'sm' ? 'pcm-i pcm-i--sm' : 'pcm-i'
);

const IconContract = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M3 7h18v10H3z" />
        <path d="M12 14a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
);

const IconJoint = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M9 8H6a4 4 0 000 8h3" />
        <path d="M15 8h3a4 4 0 010 8h-3" />
        <path d="M8 12h8" />
    </svg>
);

const IconWeld = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />
    </svg>
);

const IconVolume = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M4 20h7M4 20v-7M20 4h-7M20 4v7" />
        <path d="M4 20l6-6M20 4l-6 6" />
    </svg>
);

const IconQuality = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M12 3l7 3v6c0 3.5-2.5 6.5-7 9-4.5-2.5-7-5.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

const IconSafety = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M3 13h4l1.5 3h7L17 13h4" />
        <path d="M5 3h14l2 10v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6L5 3z" />
    </svg>
);

const IconSearch = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M21 21l-4.35-4.35" />
        <path d="M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />
    </svg>
);

const IconFolder = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M3 7a2 2 0 012-2h3.5l2 2H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
);

const IconCube = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
        <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
);

const IconGantry = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M4 21V8l8-5 8 5v13" />
        <path d="M9 21v-6h6v6" />
    </svg>
);

const IconFlask = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M9 3h6" />
        <path d="M10 3v6l-5.5 9A1.5 1.5 0 005.8 20h12.4a1.5 1.5 0 001.3-2.2L14 9V3" />
    </svg>
);

const IconChart = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M4 20h16" />
        <path d="M7 16v-6M12 16V5M17 16v-8" />
    </svg>
);

const IconAlert = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" />
    </svg>
);

const IconDoc = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M14 3v5h5" />
    </svg>
);

const IconReload = ({ size }) => (
    <svg className={iconClass(size)} {...SVG_PROPS}>
        <path d="M4 4v5h5M20 20v-5h-5" />
        <path d="M20 9a8 8 0 00-14.9-3M4 15a8 8 0 0014.9 3" />
    </svg>
);

/* -------------------------------------------------------------------------
 * Joint lifecycle. The register walks one ordered pipeline, so the funnel
 * counts every joint that reached a stage OR passed beyond it. That keeps the
 * funnel monotonic and shows where the work actually stops, which eight
 * isolated per-status counts could not.
 * ---------------------------------------------------------------------- */
const FLOW = [
    { key: 'RECEIVED', label: 'Material Diterima' },
    { key: 'ISSUED', label: 'Dikeluarkan ke Shop' },
    { key: 'FITUP_OK', label: 'Fit-Up OK' },
    { key: 'WELDED', label: 'Selesai Las' },
    { key: 'VISUAL_OK', label: 'Visual OK' },
    { key: 'NDT_OK', label: 'NDT OK' },
    { key: 'TESTED', label: 'Hydrotest OK' },
    { key: 'REINSTATED', label: 'Reinstated' }
];

const stageIndex = (status) => FLOW.findIndex((s) => s.key === status);

const fmt = (value, digits = 1) => (
    Number(value || 0).toLocaleString('id-ID', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    })
);

const Dash = ({ title = 'Belum ada data' }) => <span className="pcm-dash" title={title}>-</span>;

export function OverviewTab({
    overview,
    joints = [],
    scopes = [],
    drawings = [],
    stockMoves = [],
    inspections = [],
    testPackages = [],
    hseLogs = [],
    projects = [],
    user,
    scopeLabel,
    loading,
    error,
    onSelectTab,
    onReload
}) {
    const [selectedDrawing, setSelectedDrawing] = useState(null);
    const [searchIso, setSearchIso] = useState('');
    const [filterArea, setFilterArea] = useState('ALL');
    const [showAllDrawings, setShowAllDrawings] = useState(false);
    const [showAllScopes, setShowAllScopes] = useState(false);
    const closeRef = useRef(null);

    // The drawing modal closes three ways: control, Escape, backdrop (section 9).
    useEffect(() => {
        if (!selectedDrawing) {
            return undefined;
        }
        closeRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSelectedDrawing(null);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedDrawing]);

    const jointList = joints || [];
    const scopeList = scopes || [];
    const drawingList = drawings || [];
    const tpList = testPackages || [];
    const smList = stockMoves || [];
    const hseList = hseLogs || [];
    const inspectionList = inspections || [];

    const totalJoints = jointList.length;

    // Joints that reached a stage or went past it.
    const reachedAt = (index) => jointList.filter((j) => stageIndex(j.status) >= index).length;
    const stageCount = (key) => jointList.filter((j) => j.status === key).length;

    const shopJoints = jointList.filter((j) => (j.shop_field || '').toLowerCase() === 'shop');
    const fieldJoints = jointList.filter((j) => (j.shop_field || '').toLowerCase() === 'field');
    const shopCount = shopJoints.length;
    const fieldCount = fieldJoints.length;
    const shopReachedAt = (index) => shopJoints.filter((j) => stageIndex(j.status) >= index).length;
    const fieldReachedAt = (index) => fieldJoints.filter((j) => stageIndex(j.status) >= index).length;

    const weldedReached = reachedAt(3);
    const visualReached = reachedAt(4);

    const flowSteps = FLOW.map((step, index) => {
        const count = reachedAt(index);
        return {
            key: step.key,
            label: step.label,
            count,
            reached: count > 0,
            share: totalJoints > 0 ? (count / totalJoints) * 100 : 0,
            exact: stageCount(step.key)
        };
    });

    const furthest = flowSteps.reduce((last, step) => (step.count > 0 ? step : last), null);

    // Diameter-inch volume, summed from the register.
    const totalDiaInch = useMemo(
        () => jointList.reduce((sum, j) => sum + (parseFloat(j.size_in) || 0), 0),
        [jointList]
    );
    const weldedDiaInch = useMemo(
        () => jointList.filter((j) => stageIndex(j.status) >= 3)
            .reduce((sum, j) => sum + (parseFloat(j.size_in) || 0), 0),
        [jointList]
    );

    // Contract baseline, read from the scope register.
    const boqContractDI = scopeList
        .filter((s) => (s.unit || '').toUpperCase() === 'DI')
        .reduce((sum, s) => sum + (parseFloat(s.contract_qty) || 0), 0);
    const boqCumulativeDI = scopeList
        .filter((s) => (s.unit || '').toUpperCase() === 'DI')
        .reduce((sum, s) => sum + (parseFloat(s.cumulative_qty) || 0), 0);
    const boqPct = boqContractDI > 0 ? (boqCumulativeDI / boqContractDI) * 100 : null;

    // HSE, read from the log register. There is no man-hour column in the
    // schema, so this screen never claims safe man-hours.
    const hseTotal = hseList.length;
    const hseOpen = hseList.filter((l) => (l.status || '').toLowerCase() === 'open').length;

    // QA/QC, read from the inspection register.
    const inspectionTotal = inspectionList.length;
    const ndtRejectPct = inspectionTotal > 0 ? (overview?.ndt_reject_pct ?? 0) : null;

    // Contract weight model. Every milestone input is derived from the register.
    const milestones = useMemo(() => {
        const rows = [
            { name: 'Material Receiving & Spool Prep', weight: 5, value: totalJoints > 0 ? (reachedAt(0) / totalJoints) * 100 : 0 },
            { name: 'Shop Spool Fit-Up', weight: 15, value: shopCount > 0 ? (shopReachedAt(2) / shopCount) * 100 : 0 },
            { name: 'Shop Spool Welding', weight: 20, value: shopCount > 0 ? (shopReachedAt(3) / shopCount) * 100 : 0 },
            { name: 'Field Spool Erection', weight: 25, value: fieldCount > 0 ? (fieldReachedAt(2) / fieldCount) * 100 : 0 },
            { name: 'Field Joint Welding', weight: 15, value: fieldCount > 0 ? (fieldReachedAt(3) / fieldCount) * 100 : 0 },
            { name: 'QA/QC Inspection & NDT', weight: 10, value: totalJoints > 0 ? (reachedAt(4) / totalJoints) * 100 : 0 },
            { name: 'Hydrostatic Pressure Testing', weight: 7, value: totalJoints > 0 ? (reachedAt(6) / totalJoints) * 100 : 0 },
            { name: 'Reinstatement & Punch List', weight: 3, value: totalJoints > 0 ? (reachedAt(7) / totalJoints) * 100 : 0 }
        ];
        return rows.map((row) => ({ ...row, earned: (row.value * row.weight) / 100 }));
    }, [totalJoints, shopCount, fieldCount, jointList]);

    const weightedProgress = milestones.reduce((sum, m) => sum + m.earned, 0);

    // The API returns projects newest first, so projects[0] can be an empty
    // demo folder. Summarise the project the register actually belongs to.
    const projectList = projects || [];
    const primaryProject = useMemo(() => {
        if (projectList.length === 0) {
            return null;
        }
        const byDrawings = [...projectList].sort(
            (a, b) => (b.drawings_count || 0) - (a.drawings_count || 0)
        )[0];
        if (byDrawings && (byDrawings.drawings_count || 0) > 0) {
            return byDrawings;
        }
        const referencedId = drawingList.map((d) => d.project_id).find(Boolean);
        return projectList.find((p) => p.id === referencedId) || projectList[0];
    }, [projectList, drawingList]);

    const jobNo = primaryProject?.job_no || null;
    const clientName = primaryProject?.client || null;

    const availableAreas = useMemo(() => {
        const set = new Set();
        drawingList.forEach((d) => { if (d.area) set.add(d.area); });
        return Array.from(set);
    }, [drawingList]);

    const filteredDrawings = useMemo(() => drawingList.filter((d) => {
        const needle = searchIso.toLowerCase();
        const matchesSearch =
            (d.drawing_no || '').toLowerCase().includes(needle) ||
            (d.line_no || '').toLowerCase().includes(needle) ||
            (d.title || '').toLowerCase().includes(needle) ||
            (d.material_spec || '').toLowerCase().includes(needle);
        const matchesArea = filterArea === 'ALL' || d.area === filterArea;
        return matchesSearch && matchesArea;
    }), [drawingList, searchIso, filterArea]);

    const tpReady = tpList.filter((t) => t.status === 'READY_FOR_TEST').length;

    // Kartu navigasi hanya untuk modul yang boleh dibuka role ini. Kalau tidak
    // difilter, klik kartu akan memantul kembali lewat penjaga tab.
    const modulePerms = {
        engineering: 'drawing.view',
        material: 'stock.view',
        fabrication: 'joint.view',
        erection: 'joint.view',
        qaqc: 'inspection.view',
        testpackage: 'testpackage.view',
        schedule: 'scope.view'
    };
    const canOpen = (tab) =>
        Boolean(user?.is_superadmin) || (user?.permissions || []).includes(modulePerms[tab]);

    const quickNav = [
        { tab: 'engineering', icon: <IconFolder size="sm" />, title: 'Engineering Drawing', count: `${drawingList.length} iso` },
        { tab: 'material', icon: <IconCube size="sm" />, title: 'Material Control', count: `${smList.length} mutasi` },
        { tab: 'fabrication', icon: <IconWeld size="sm" />, title: 'Construction Shop', count: `${shopCount} joint` },
        { tab: 'erection', icon: <IconGantry size="sm" />, title: 'Field Erection', count: `${fieldCount} joint` },
        { tab: 'qaqc', icon: <IconSearch size="sm" />, title: 'QA-QC Inspection', count: `${inspectionTotal} laporan` },
        { tab: 'testpackage', icon: <IconFlask size="sm" />, title: 'Test Package', count: `${tpList.length} paket` },
        { tab: 'schedule', icon: <IconChart size="sm" />, title: 'Project Manager', count: `${scopeList.length} scope` }
    ].filter((item) => canOpen(item.tab));

    const isEmpty = totalJoints === 0 && scopeList.length === 0 && drawingList.length === 0;

    return (
        <div className="pcm-dashboard pb-4">

            {error && (
                <div className="alert alert-danger d-flex align-items-start gap-2" role="alert">
                    <IconAlert />
                    <div>
                        <strong className="d-block">Data Global Dashboard tidak dapat dimuat</strong>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* ---------- Header band: the single focal point of the screen ---------- */}
            <header className="pcm-page-head mb-4">
                <div className="pcm-page-head__text">
                    <span className="pcm-eyebrow">
                        {jobNo ? `Job No. ${jobNo}` : 'Seluruh Proyek'}
                        {clientName ? ` · ${clientName}` : ''}
                    </span>
                    <h1 className="pcm-page-head__title">Global Project Control Dashboard</h1>
                    <div className="pcm-page-head__aside mt-2.5">
                        <span className="pcm-note">ASME B31.3 Process Piping</span>
                        <span className="pcm-note">
                            {scopeLabel || (user?.is_superadmin
                                ? 'Semua departemen'
                                : `Dept. ${user?.department?.code || '—'}`)}
                        </span>
                        {projectList.length > 1 && (
                            <span className="pcm-note">{projectList.length} proyek terdaftar</span>
                        )}
                    </div>
                </div>
                <div className="pcm-page-head__aside">
                    <div className="pcm-stat">
                        <span className="pcm-stat__label">Progres bobot</span>
                        <span className="pcm-stat__value">
                            {totalJoints > 0 ? `${fmt(weightedProgress)}%` : <Dash />}
                        </span>
                    </div>
                    <div className="pcm-stat">
                        <span className="pcm-stat__label">Tahap terjauh</span>
                        <span className="pcm-stat__value">{furthest ? furthest.label : <Dash />}</span>
                    </div>
                    <div className="pcm-stat">
                        <span className="pcm-stat__label">Joint terdaftar</span>
                        <span className="pcm-stat__value">{totalJoints > 0 ? totalJoints : <Dash />}</span>
                    </div>
                </div>
            </header>

            {isEmpty && !loading ? (
                <div className="pcm-state mb-4">
                    <span className="pcm-state__icon"><IconChart size="lg" /></span>
                    <h2 className="pcm-state__title">Belum ada data proyek</h2>
                    <p className="pcm-state__text">
                        Dashboard ini membaca register joint, scope BOQ, dan drawing. Mulai dari
                        menu Engineering untuk mengunggah isometrik pertama.
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm mt-3"
                        onClick={() => onSelectTab('engineering')}
                    >
                        Buka Engineering
                    </button>
                </div>
            ) : (
                <>
                    {/* ---------- KPI tiles: peer metrics of one job ---------- */}
                    <div className="row g-3 mb-4">
                        <div className="col-12 col-sm-6 col-xl-4 col-xxl-2">
                            <div className="pcm-tile">
                                <div className="pcm-kpi__head">
                                    <span className="pcm-tile__label">Kontrak BOQ</span>
                                    <span className="pcm-kpi__icon"><IconContract size="sm" /></span>
                                </div>
                                <span className="pcm-tile__value">
                                    {boqContractDI > 0 ? fmt(boqContractDI, 2) : <Dash />}
                                    {boqContractDI > 0 && <span className="pcm-tile__unit">DI</span>}
                                </span>
                                <span className="pcm-kpi__foot">
                                    {scopeList.length > 0 ? <><strong>{scopeList.length}</strong> scope</> : <Dash />}
                                </span>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-xl-4 col-xxl-2">
                            <div className="pcm-tile">
                                <div className="pcm-kpi__head">
                                    <span className="pcm-tile__label">Total Joint</span>
                                    <span className="pcm-kpi__icon"><IconJoint size="sm" /></span>
                                </div>
                                <span className="pcm-tile__value">
                                    {totalJoints > 0 ? totalJoints : <Dash />}
                                    {totalJoints > 0 && <span className="pcm-tile__unit">joint</span>}
                                </span>
                                <span className="pcm-kpi__foot">
                                    {totalJoints > 0 ? `Shop ${shopCount} · Field ${fieldCount}` : <Dash />}
                                </span>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-xl-4 col-xxl-2">
                            <div className="pcm-tile">
                                <div className="pcm-kpi__head">
                                    <span className="pcm-tile__label">Selesai Las</span>
                                    <span className="pcm-kpi__icon"><IconWeld size="sm" /></span>
                                </div>
                                <span className="pcm-tile__value">
                                    {totalJoints > 0 ? weldedReached : <Dash />}
                                    {totalJoints > 0 && <span className="pcm-tile__unit">joint</span>}
                                </span>
                                <span className="pcm-kpi__foot">
                                    {totalJoints > 0
                                        ? `${fmt((weldedReached / totalJoints) * 100)}% joint`
                                        : <Dash />}
                                </span>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-xl-4 col-xxl-2">
                            <div className="pcm-tile">
                                <div className="pcm-kpi__head">
                                    <span className="pcm-tile__label">Volume DI</span>
                                    <span className="pcm-kpi__icon"><IconVolume size="sm" /></span>
                                </div>
                                <span className="pcm-tile__value">
                                    {totalDiaInch > 0 ? fmt(weldedDiaInch, 2) : <Dash />}
                                    {totalDiaInch > 0 && <span className="pcm-tile__unit">DI</span>}
                                </span>
                                <span className="pcm-kpi__foot">
                                    {totalDiaInch > 0
                                        ? `dari ${fmt(totalDiaInch, 2)} DI`
                                        : <Dash />}
                                </span>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-xl-4 col-xxl-2">
                            <div className="pcm-tile">
                                <div className="pcm-kpi__head">
                                    <span className="pcm-tile__label">Lolos Visual</span>
                                    <span className="pcm-kpi__icon"><IconQuality size="sm" /></span>
                                </div>
                                <span className="pcm-tile__value">
                                    {totalJoints > 0 ? visualReached : <Dash />}
                                    {totalJoints > 0 && <span className="pcm-tile__unit">joint</span>}
                                </span>
                                <span className="pcm-kpi__foot">
                                    {inspectionTotal > 0
                                        ? <>NDT reject <strong>{fmt(ndtRejectPct)}%</strong> dari {inspectionTotal} inspeksi</>
                                        : 'belum ada inspeksi'}
                                </span>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-xl-4 col-xxl-2">
                            <div className="pcm-tile">
                                <div className="pcm-kpi__head">
                                    <span className="pcm-tile__label">Log HSE</span>
                                    <span className="pcm-kpi__icon"><IconSafety size="sm" /></span>
                                </div>
                                <span className="pcm-tile__value">
                                    {hseTotal > 0 ? hseTotal : <Dash />}
                                    {hseTotal > 0 && <span className="pcm-tile__unit">catatan</span>}
                                </span>
                                <span className="pcm-kpi__foot">
                                    {hseTotal > 0 ? <><strong>{hseOpen}</strong> open</> : 'belum ada catatan'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ---------- Joint lifecycle funnel ---------- */}
                    <section className="pcm-card mb-4" aria-labelledby="flow-title">
                        <div className="pcm-card__head">
                            <div>
                                <h2 className="pcm-card__title" id="flow-title">Posisi Pipeline Joint</h2>
                                <small className="pcm-card__sub">
                                    Angka adalah joint yang sudah mencapai tahap ini atau lebih jauh.
                                </small>
                            </div>
                            <span className="pcm-chip pcm-chip--neutral">
                                {totalJoints} joint di register
                            </span>
                        </div>
                        <div className="pcm-card__body">
                            {totalJoints === 0 ? (
                                <p className="pcm-card__sub mb-0">Belum ada joint di register.</p>
                            ) : (
                                <ol className="pcm-flow">
                                    {flowSteps.map((step, index) => (
                                        <li
                                            key={step.key}
                                            className={`pcm-flow__step${step.reached ? ' pcm-flow__step--done' : ''}`}
                                        >
                                            <span className="pcm-flow__top">
                                                <span className="pcm-flow__n">{index + 1}</span>
                                                <span className="pcm-flow__share">{fmt(step.share, 0)}%</span>
                                            </span>
                                            <span className="pcm-flow__count">
                                                {step.count}
                                                <small>joint</small>
                                            </span>
                                            <span className="pcm-flow__label">{step.label}</span>
                                            {step.exact > 0 && (
                                                <span className="pcm-flow__sub">{step.exact} joint tepat di tahap ini</span>
                                            )}
                                            <span className="pcm-flow__bar" aria-hidden="true">
                                                <span style={{ width: `${Math.min(100, step.share)}%` }}></span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </section>

                    {/* ---------- Row 1: Weight model & Quick Nav ---------- */}
                    <div className="row g-4 mb-4">
                        <div className="col-12 col-xl-8">
                            <section className="pcm-card h-100 mb-0" aria-labelledby="weight-title">
                                <div className="pcm-card__head">
                                    <div>
                                        <h2 className="pcm-card__title" id="weight-title">Bobot Progres Fisik</h2>
                                        <small className="pcm-card__sub">Bobot kontrak, dihitung dari register joint aktual.</small>
                                    </div>
                                    <span className="pcm-chip pcm-chip--primary">
                                        {fmt(weightedProgress)}% terbobot
                                    </span>
                                </div>
                                <div className="pcm-card__body pcm-card__body--flush">
                                    <div className="table-responsive">
                                        <table className="table pcm-table align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th className="ps-3">Milestone</th>
                                                    <th className="text-end">Bobot</th>
                                                    <th style={{ minWidth: '12rem' }}>Pencapaian</th>
                                                    <th className="text-end pe-3">Terbobot</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {milestones.map((item) => (
                                                    <tr key={item.name}>
                                                        <td className="ps-3 pcm-cell-strong">{item.name}</td>
                                                        <td className="text-end pcm-cell-sub">{item.weight}%</td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="pcm-bar flex-grow-1">
                                                                    <span style={{ width: `${Math.min(100, item.value)}%` }}></span>
                                                                </div>
                                                                <span className="pcm-cell-sub" style={{ minWidth: '3rem' }}>
                                                                    {fmt(item.value)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="text-end pe-3 pcm-cell-strong">{fmt(item.earned)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="col-12 col-xl-4">
                            <section className="pcm-card h-100 mb-0" aria-labelledby="nav-title">
                                <div className="pcm-card__head">
                                    <div>
                                        <h2 className="pcm-card__title" id="nav-title">Navigasi Modul</h2>
                                        <small className="pcm-card__sub">Akses cepat ke modul aktif</small>
                                    </div>
                                </div>
                                <div className="pcm-card__body">
                                    <div className="d-grid gap-2">
                                        {quickNav.map((item) => (
                                            <button
                                                key={item.tab}
                                                type="button"
                                                className="pcm-quick"
                                                onClick={() => onSelectTab(item.tab)}
                                            >
                                                <span className="pcm-quick__icon">{item.icon}</span>
                                                <span className="pcm-quick__text">
                                                    <span className="pcm-quick__title">{item.title}</span>
                                                </span>
                                                <span className="pcm-quick__count">{item.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* ---------- Row 2: Status Hydrotest & Mutasi Material (2 Kolom Seimbang) ---------- */}
                    <div className="row g-4 mb-4">
                        <div className="col-12 col-lg-6">
                            <section className="pcm-card h-100 mb-0" aria-labelledby="tp-title">
                                <div className="pcm-card__head">
                                    <div>
                                        <h2 className="pcm-card__title" id="tp-title">Status Hydrotest &amp; Uji Tekan</h2>
                                        <small className="pcm-card__sub">{tpReady} paket siap uji</small>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="pcm-chip pcm-chip--neutral">{tpList.length} paket</span>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                            onClick={() => onSelectTab('testpackage')}
                                        >
                                            Buka Paket Uji &rarr;
                                        </button>
                                    </div>
                                </div>
                                <div className="pcm-card__body">
                                    {tpList.length === 0 ? (
                                        <p className="pcm-card__sub mb-0 py-3 text-center">Belum ada test package terdaftar.</p>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {tpList.slice(0, 5).map((tp, index) => (
                                                <div key={tp.id || index} className="pcm-row">
                                                    <div className="pcm-row__top">
                                                        <span className="pcm-row__id">{tp.pkg_no || <Dash />}</span>
                                                        <span className={`pcm-chip ${tp.status === 'READY_FOR_TEST' ? 'pcm-chip--success' : 'pcm-chip--neutral'}`}>
                                                            {tp.status || <Dash />}
                                                        </span>
                                                    </div>
                                                    <div className="pcm-row__meta">
                                                        <span>{tp.system_name || <Dash />}</span>
                                                        <span>
                                                            <strong>{tp.test_pressure_bar ? `${fmt(tp.test_pressure_bar, 2)} bar` : '-'}</strong>
                                                            {' · '}
                                                            {tp.schedule_date || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="col-12 col-lg-6">
                            <section className="pcm-card h-100 mb-0" aria-labelledby="sm-title">
                                <div className="pcm-card__head">
                                    <div>
                                        <h2 className="pcm-card__title" id="sm-title">Mutasi Material Terkini</h2>
                                        <small className="pcm-card__sub">{smList.length} total mutasi gudang &amp; yard</small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                        onClick={() => onSelectTab('material')}
                                    >
                                        Buka Material &rarr;
                                    </button>
                                </div>
                                <div className="pcm-card__body">
                                    {smList.length === 0 ? (
                                        <p className="pcm-card__sub mb-0 py-3 text-center">Belum ada transaksi mutasi material.</p>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {smList.slice(0, 5).map((sm, index) => (
                                                <div key={sm.id || index} className="pcm-row">
                                                    <div className="pcm-row__top">
                                                        <span className="pcm-cell-strong">{sm.description || <Dash />}</span>
                                                        <span className="pcm-cell-strong pcm-code">
                                                            {sm.qty !== null && sm.qty !== undefined
                                                                ? `${fmt(sm.qty, 2)} ${sm.unit || ''}`.trim()
                                                                : <Dash />}
                                                        </span>
                                                    </div>
                                                    <div className="pcm-row__meta">
                                                        <span>
                                                            {sm.kind || '-'}
                                                            {' · '}Heat {sm.heat_no || '-'}
                                                        </span>
                                                        <span>{sm.location || '-'} · {sm.move_date || '-'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* ---------- Row 3: Monitoring BOQ Pipa (Compact & Expandable) ---------- */}
                    <section className="pcm-card mb-4" aria-labelledby="boq-title">
                        <div className="pcm-card__head">
                            <div>
                                <h2 className="pcm-card__title" id="boq-title">Monitoring BOQ Kontrak Pipa</h2>
                                <small className="pcm-card__sub">Realisasi kumulatif terhadap baseline kontrak</small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="pcm-chip pcm-chip--neutral">
                                    {boqCumulativeDI > 0 ? `${fmt(boqPct)}% dari ${fmt(boqContractDI, 2)} DI` : 'Realisasi belum diinput'}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                    onClick={() => onSelectTab('schedule')}
                                >
                                    Buka Kurva S &amp; BOQ &rarr;
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table pcm-table align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-3" style={{ width: '45px' }}>No</th>
                                        <th>Item Scope Pekerjaan</th>
                                        <th className="text-center" style={{ width: '80px' }}>Satuan</th>
                                        <th className="text-end" style={{ width: '130px' }}>Target Kontrak</th>
                                        <th className="text-end" style={{ width: '130px' }}>Realisasi</th>
                                        <th style={{ minWidth: '12rem' }}>Persentase</th>
                                        <th className="pe-3 text-end" style={{ width: '120px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scopeList.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 pcm-cell-sub">
                                                Belum ada scope BOQ terdaftar.
                                            </td>
                                        </tr>
                                    ) : (
                                        (showAllScopes ? scopeList : scopeList.slice(0, 5)).map((scope, index) => {
                                            const contractQty = parseFloat(scope.contract_qty) || 0;
                                            const cumulativeQty = parseFloat(scope.cumulative_qty) || 0;
                                            const pct = contractQty > 0 ? Math.min(100, (cumulativeQty / contractQty) * 100) : 0;
                                            const tone = pct >= 100 ? 'pcm-chip--success' : pct > 0 ? 'pcm-chip--primary' : 'pcm-chip--neutral';
                                            const label = pct >= 100 ? 'SELESAI' : pct > 0 ? 'BERJALAN' : 'BELUM MULAI';
                                            return (
                                                <tr key={scope.id || index}>
                                                    <td className="ps-3 pcm-cell-sub">{index + 1}</td>
                                                    <td className="pcm-cell-strong">{scope.scope}</td>
                                                    <td className="text-center pcm-code">{scope.unit || <Dash />}</td>
                                                    <td className="text-end pcm-cell-sub">{fmt(contractQty, 2)}</td>
                                                    <td className="text-end pcm-cell-strong">{fmt(cumulativeQty, 2)}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="pcm-bar flex-grow-1">
                                                                <span style={{ width: `${pct}%` }}></span>
                                                            </div>
                                                            <span className="pcm-cell-sub" style={{ minWidth: '3.2rem' }}>
                                                                {fmt(pct)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="pe-3 text-end">
                                                        <span className={`pcm-chip ${tone}`}>{label}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {scopeList.length > 5 && (
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top bg-light">
                                <span className="pcm-cell-sub small">
                                    Menampilkan {showAllScopes ? scopeList.length : 5} dari {scopeList.length} item scope kontrak
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link text-decoration-none fw-bold p-0"
                                    style={{ color: '#1e40af' }}
                                    onClick={() => setShowAllScopes(prev => !prev)}
                                >
                                    {showAllScopes ? 'Tampilkan 5 Teratas ▲' : `Tampilkan Seluruh ${scopeList.length} Scope ▼`}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* ---------- Row 4: Drawing Isometrik Registry (Compact & Expandable) ---------- */}
                    <section className="pcm-card mb-4" aria-labelledby="registry-title">
                        <div className="pcm-card__head">
                            <div>
                                <h2 className="pcm-card__title" id="registry-title">Isometrik Drawing Prioritas</h2>
                                <small className="pcm-card__sub">{drawingList.length} total drawing isometrik terdaftar</small>
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                {availableAreas.length > 0 && (
                                    <PcmSelect
                                        
                                        style={{ width: '10rem' }}
                                        value={filterArea}
                                        onChange={(e) => setFilterArea(e.target.value)}
                                        aria-label="Filter area"
                                    >
                                        <option value="ALL">Semua Area</option>
                                        {availableAreas.map((area) => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </PcmSelect>
                                )}
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    style={{ minWidth: '11rem' }}
                                    placeholder="Cari isometrik, line..."
                                    value={searchIso}
                                    onChange={(e) => setSearchIso(e.target.value)}
                                    aria-label="Cari isometrik"
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm fw-bold px-3 py-1.5 text-nowrap"
                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                    onClick={() => onSelectTab('engineering')}
                                >
                                    Buka Engineering &rarr;
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table pcm-table align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-3" style={{ width: '110px' }}>Rev / Sheet</th>
                                        <th>Drawing Isometrik</th>
                                        <th style={{ width: '180px' }}>Line No &amp; Area</th>
                                        <th style={{ width: '200px' }}>Material Spec</th>
                                        <th className="text-end" style={{ width: '110px' }}>Total DI</th>
                                        <th className="pe-3 text-end" style={{ width: '130px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDrawings.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 pcm-cell-sub">
                                                Tidak ada isometrik yang cocok dengan pencarian.
                                            </td>
                                        </tr>
                                    ) : (
                                        (showAllDrawings ? filteredDrawings : filteredDrawings.slice(0, 5)).map((d, index) => (
                                            <tr key={d.id || index}>
                                                <td className="ps-3">
                                                    <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                        REV {d.rev || 0}
                                                    </span>
                                                    <span className="pcm-cell-sub d-block mt-1 font-monospace">
                                                        {d.sheet || <Dash />}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="pcm-cell-id">{d.drawing_no}</span>
                                                    <span className="pcm-cell-sub d-block pcm-cell-clip">
                                                        {d.title || <Dash />}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="pcm-cell-strong pcm-code">{d.line_no || <Dash />}</span>
                                                    <span className="pcm-cell-sub d-block">{d.area || <Dash />}</span>
                                                </td>
                                                <td>
                                                    <span className="pcm-cell-strong">{d.material_spec || <Dash />}</span>
                                                    <span className="pcm-cell-sub d-block pcm-code">
                                                        {d.size_range || '-'}
                                                    </span>
                                                </td>
                                                <td className="text-end pcm-cell-strong pcm-code">
                                                    {d.total_dia_inch ? `${fmt(d.total_dia_inch, 2)} DI` : <Dash />}
                                                </td>
                                                <td className="pe-3 text-end">
                                                    <div className="d-flex justify-content-end gap-1.5">
                                                        {d.scan_path && (
                                                            <a
                                                                href={d.scan_path}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-outline-primary btn-sm px-2 py-1"
                                                                aria-label={`Buka berkas isometrik ${d.drawing_no}`}
                                                                title="Buka berkas isometrik"
                                                            >
                                                                <IconDoc size="sm" />
                                                            </a>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm px-2.5 py-1 fw-bold"
                                                            style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                            onClick={() => setSelectedDrawing(d)}
                                                        >
                                                            Detail
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredDrawings.length > 5 && (
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top bg-light">
                                <span className="pcm-cell-sub small">
                                    Menampilkan {showAllDrawings ? filteredDrawings.length : 5} dari {filteredDrawings.length} drawing isometrik
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link text-decoration-none fw-bold p-0"
                                    style={{ color: '#1e40af' }}
                                    onClick={() => setShowAllDrawings(prev => !prev)}
                                >
                                    {showAllDrawings ? 'Tampilkan 5 Teratas ▲' : `Tampilkan Seluruh ${filteredDrawings.length} Isometrik ▼`}
                                </button>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* ---------- Drawing detail modal ---------- */}
            {selectedDrawing && (
                <div
                    className="modal fade show d-block pcm-modal"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="drawing-modal-title"
                    onClick={() => setSelectedDrawing(null)}
                >
                    <div
                        className="modal-dialog modal-dialog-centered modal-lg"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-content">
                            <div className="modal-header">
                                <div>
                                    <h2 className="modal-title" id="drawing-modal-title">
                                        Detail Isometrik
                                    </h2>
                                    <span className="pcm-modal__sub pcm-code">
                                        {selectedDrawing.drawing_no}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"
                                    ref={closeRef}
                                    onClick={() => setSelectedDrawing(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Judul Gambar</span>
                                            <span className="pcm-spec__value">{selectedDrawing.title || <Dash />}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Revision / Sheet</span>
                                            <span className="pcm-spec__value pcm-code">
                                                REV {selectedDrawing.rev || 0} · {selectedDrawing.sheet || '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Area</span>
                                            <span className="pcm-spec__value">{selectedDrawing.area || <Dash />}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Line Number &amp; Service</span>
                                            <span className="pcm-spec__value pcm-code">{selectedDrawing.line_no || <Dash />}</span>
                                            {selectedDrawing.line_service && (
                                                <span className="pcm-cell-sub">{selectedDrawing.line_service}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Material Specification</span>
                                            <span className="pcm-spec__value">{selectedDrawing.material_spec || <Dash />}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Size Range</span>
                                            <span className="pcm-spec__value">{selectedDrawing.size_range || <Dash />}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Total Diameter-Inch</span>
                                            <span className="pcm-spec__value pcm-code">
                                                {selectedDrawing.total_dia_inch
                                                    ? `${fmt(selectedDrawing.total_dia_inch, 2)} DI`
                                                    : <Dash />}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Total Joint</span>
                                            <span className="pcm-spec__value pcm-code">
                                                {selectedDrawing.total_joints
                                                    ? `${selectedDrawing.total_joints} joint`
                                                    : <Dash />}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pcm-file-box mt-3">
                                    <div>
                                        <span className="pcm-spec__label">Berkas isometrik</span>
                                        <span className="pcm-spec__value pcm-code">
                                            {selectedDrawing.scan_path
                                                ? selectedDrawing.scan_path.split('/').pop()
                                                : <Dash title="Berkas belum diunggah" />}
                                        </span>
                                    </div>
                                    {selectedDrawing.scan_path && (
                                        <a
                                            href={selectedDrawing.scan_path}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-primary btn-sm"
                                        >
                                            <IconDoc size="sm" />
                                            <span className="ms-2">Buka berkas</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm border"
                                    onClick={() => setSelectedDrawing(null)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
