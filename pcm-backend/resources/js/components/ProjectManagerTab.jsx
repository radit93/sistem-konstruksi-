import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { BoqContractSection } from './pm/BoqContractSection';
import { SCurveSection } from './pm/SCurveSection';
import { BudgetCostSection } from './pm/BudgetCostSection';
import { DailyLogSection } from './pm/DailyLogSection';
import { MilestoneSection } from './pm/MilestoneSection';
import { ExecutiveReportSection } from './pm/ExecutiveReportSection';
import { PcmSelect } from './SearchSelect';

/* -------------------------------------------------------------------------
 * Inline SVG Icons (Consistent with EngineeringTab, no emoji, standard grid)
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

function IconFolder({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
    );
}

function IconBuilding({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    );
}

function IconSearch({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function IconPlus({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M12 4v16m8-8H4" />
        </svg>
    );
}

function IconChevronRight({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M9 5l7 7-7 7" />
        </svg>
    );
}

function IconArrowLeft({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
    );
}

function IconShield({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

const SECTION_LABELS = {
    schedule: 'Kontrak & BOQ',
    pm_scurve: 'S-Curve & Schedule',
    pm_budget: 'Budget vs Actual',
    pm_daily: 'Daily Progress Log',
    pm_milestone: 'Project Milestone',
    report: 'Laporan Eksekutif'
};

const emptyFolderForm = () => ({ client: '', name: '', job_no: '' });

export function ProjectManagerTab({
    currentSection = 'schedule',
    projects = [],
    activeProjectId = '',
    onSetActiveProject,
    drawings = [],
    scopes = [],
    joints = [],
    stockMoves = [],
    overview = null,
    user,
    onReload
}) {
    // Navigasi: null = direktori folder proyek (Parents level), number = id folder proyek aktif
    const [localProjectId, setLocalProjectId] = useState(() => {
        const saved = localStorage.getItem('pcm_active_project_id') || localStorage.getItem('pcm_active_pm_project_id');
        return saved ? Number(saved) : null;
    });
    const selectedProjectId = onSetActiveProject
        ? (activeProjectId ? Number(activeProjectId) : null)
        : localProjectId;

    const [searchFolder, setSearchFolder] = useState('');
    const [clientFilter, setClientFilter] = useState('ALL');

    // Data lintas departemen untuk pengawasan PM pada proyek aktif
    const [crossData, setCrossData] = useState({
        engineeringBoqs: [],
        boms: [],
        dailyLogs: [],
        materialInspections: [],
        inspections: [],
        testPackages: [],
        hseLogs: [],
        loading: false,
    });

    // Modal buat folder proyek baru
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderForm, setFolderForm] = useState(emptyFolderForm);
    const [folderLoading, setFolderLoading] = useState(false);
    const [folderError, setFormError] = useState('');

    const canEdit = can(user, 'project.create') || can(user, 'scope.write');

    // Muat data lintas departemen setiap kali proyek aktif dibuka
    useEffect(() => {
        if (!selectedProjectId) return undefined;
        let alive = true;
        setCrossData((prev) => ({ ...prev, loading: true }));

        Promise.allSettled([
            api.get('/engineering-boqs'),
            api.get('/bill-of-materials'),
            api.get(`/daily-progress?project_id=${selectedProjectId}`),
            api.get('/material-inspections'),
            api.get('/inspections'),
            api.get('/test-packages'),
            api.get('/hse'),
        ]).then((results) => {
            if (!alive) return;
            const val = (idx) => (results[idx]?.status === 'fulfilled' && Array.isArray(results[idx].value) ? results[idx].value : []);
            setCrossData({
                engineeringBoqs: val(0),
                boms: val(1),
                dailyLogs: val(2),
                materialInspections: val(3),
                inspections: val(4),
                testPackages: val(5),
                hseLogs: val(6),
                loading: false,
            });
        });

        return () => {
            alive = false;
        };
    }, [selectedProjectId]);

    // Sinkronisasi penyimpanan proyek aktif ke global App & localStorage
    const handleSelectProject = (projId) => {
        if (projId) {
            localStorage.setItem('pcm_active_pm_project_id', String(projId));
            if (onSetActiveProject) onSetActiveProject(String(projId));
            else setLocalProjectId(Number(projId));
        } else {
            localStorage.removeItem('pcm_active_pm_project_id');
            if (onSetActiveProject) onSetActiveProject('');
            else setLocalProjectId(null);
        }
    };

    // Client list options
    const clientOptions = useMemo(() => {
        return Array.from(
            new Set((projects || []).map(p => (p.client || '').trim()).filter(Boolean))
        ).sort();
    }, [projects]);

    // Data proyek terkayakan (enriched) dengan metrik scope & joint
    const enrichedProjects = useMemo(() => {
        return (projects || []).map(p => {
            const pScopes = (scopes || []).filter(s =>
                Number(s.project_id) === Number(p.id) || (!s.project_id && Number(p.id) === 1)
            );
            const totalContractDI = pScopes
                .filter(s => s.unit === 'DI')
                .reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0);
            const totalActualDI = pScopes
                .filter(s => s.unit === 'DI')
                .reduce((acc, s) => acc + (parseFloat(s.cumulative_qty) || 0), 0);
            const pct = totalContractDI > 0 ? Math.round((totalActualDI / totalContractDI) * 100) : 0;

            const pDrawings = (drawings || []).filter(d => Number(d.project_id) === Number(p.id));

            return {
                ...p,
                scopes_count: pScopes.length,
                total_contract_di: totalContractDI,
                total_actual_di: totalActualDI,
                progress_pct: pct,
                drawings_count: pDrawings.length || p.drawings_count || 0
            };
        });
    }, [projects, scopes, drawings]);

    // Proyek yang sedang aktif
    const activeProject = useMemo(() => {
        if (!selectedProjectId) return null;
        return enrichedProjects.find(p => Number(p.id) === Number(selectedProjectId)) || null;
    }, [selectedProjectId, enrichedProjects]);

    // Filter folder
    const filteredFolders = useMemo(() => {
        const q = searchFolder.toLowerCase();
        return enrichedProjects.filter(p => {
            const matchClient = clientFilter === 'ALL' || (p.client || '').toLowerCase() === clientFilter.toLowerCase();
            const matchSearch = !q ||
                (p.name || '').toLowerCase().includes(q) ||
                (p.client || '').toLowerCase().includes(q) ||
                (p.job_no || '').toLowerCase().includes(q);
            return matchClient && matchSearch;
        });
    }, [enrichedProjects, searchFolder, clientFilter]);

    // Data terisolasi untuk proyek aktif
    const projectScopes = useMemo(() => {
        if (!activeProject) return [];
        return (scopes || []).filter(s =>
            Number(s.project_id) === Number(activeProject.id) || (!s.project_id && Number(activeProject.id) === 1)
        );
    }, [activeProject, scopes]);

    const projectDrawings = useMemo(() => {
        if (!activeProject) return [];
        return (drawings || []).filter(d => Number(d.project_id) === Number(activeProject.id));
    }, [activeProject, drawings]);

    const projectJoints = useMemo(() => {
        if (!activeProject) return [];
        const dwgNos = new Set(projectDrawings.map(d => d.drawing_no));
        return (joints || []).filter(j => dwgNos.has(j.drawing_no) || (Number(activeProject.id) === 1 && !j.project_id));
    }, [activeProject, projectDrawings, joints]);

    const projectEngBoqs = useMemo(() => {
        if (!activeProject) return [];
        return crossData.engineeringBoqs.filter(b =>
            Number(b.project_id) === Number(activeProject.id) || (!b.project_id && Number(activeProject.id) === 1)
        );
    }, [activeProject, crossData.engineeringBoqs]);

    const projectBoms = useMemo(() => {
        if (!activeProject) return [];
        return crossData.boms.filter(b =>
            Number(b.project_id) === Number(activeProject.id) || (!b.project_id && Number(activeProject.id) === 1)
        );
    }, [activeProject, crossData.boms]);

    const projectDailyLogs = useMemo(() => {
        if (!activeProject) return [];
        return crossData.dailyLogs.filter(l =>
            Number(l.project_id) === Number(activeProject.id) || (!l.project_id && Number(activeProject.id) === 1)
        );
    }, [activeProject, crossData.dailyLogs]);

    // Handler buat proyek baru
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setFormError('');
        setFolderLoading(true);
        try {
            const res = await api.post('/projects', {
                client: folderForm.client.trim(),
                name: folderForm.name.trim(),
                job_no: folderForm.job_no.trim()
            });
            setShowFolderModal(false);
            setFolderForm(emptyFolderForm());
            if (onReload) await onReload();
            if (res && res.id) handleSelectProject(res.id);
        } catch (err) {
            setFormError(err.message || 'Gagal membuat proyek baru.');
        } finally {
            setFolderLoading(false);
        }
    };

    return (
        <div className="py-1">
            {/* ============================================================
                VIEW A: DIREKTORI FOLDER PROYEK CLIENT (PARENTS LEVEL)
                ============================================================ */}
            {!activeProject && (
                <div>
                    {/* GUARD SCREEN JIKA MENGAKSES SUB-MODUL TANPA MEMILIH PROYEK */}
                    {currentSection !== 'schedule' && (
                        <div className="alert alert-warning border-0 shadow-sm mb-4 py-3 px-4 d-flex align-items-center gap-3">
                            <div className="text-warning" style={{ flexShrink: 0 }}>
                                <IconShield size="lg" />
                            </div>
                            <div>
                                <h3 className="h6 fw-bold text-dark mb-1">
                                    Project Guard: Akses Terproteksi Modul {SECTION_LABELS[currentSection] || currentSection}
                                </h3>
                                <p className="mb-0 text-secondary small">
                                    Modul ini memerlukan konteks proyek aktif. Setiap proyek memiliki rincian kontrak, kurva S, anggaran biaya, dan log progres yang terisolasi. Silakan pilih salah satu folder proyek client di bawah ini.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Page Head */}
                    <div className="pcm-page-head mb-4">
                        <div className="pcm-page-head__text">
                            <span className="pcm-eyebrow">Direktori Folder Proyek Client</span>
                            <h1 className="pcm-page-head__title">Folder Proyek &amp; Manajemen Kontrak Piping</h1>
                            <p className="pcm-page-head__lede">
                                Seluruh modul Project Management (Kontrak, Kurva S, Budget Cost, Log Harian, Milestone, dan Laporan Eksekutif) dikelola per folder proyek. Pilih folder proyek aktif untuk memulai.
                            </p>
                        </div>
                        <div className="pcm-page-head__aside">
                            {canEdit && (
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm fw-bold text-primary"
                                    onClick={() => setShowFolderModal(true)}
                                >
                                    <IconPlus size="sm" />
                                    <span>Buat Proyek Baru</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Metric Tiles */}
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-lg-3">
                            <div className="pcm-tile">
                                <span className="pcm-tile__label">Folder Proyek</span>
                                <strong className="pcm-tile__value">
                                    {projects.length}
                                    <span className="pcm-tile__unit">proyek</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="pcm-tile">
                                <span className="pcm-tile__label">Client Aktif</span>
                                <strong className="pcm-tile__value">
                                    {clientOptions.length}
                                    <span className="pcm-tile__unit">perusahaan</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="pcm-tile">
                                <span className="pcm-tile__label">Total Scope Kontrak</span>
                                <strong className="pcm-tile__value pcm-tile__value--primary">
                                    {scopes.length}
                                    <span className="pcm-tile__unit">scopes</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="pcm-tile">
                                <span className="pcm-tile__label">Sistem Pengawasan</span>
                                <strong className="pcm-tile__value text-success">
                                    TERISOLASI
                                    <span className="pcm-tile__unit">per proyek</span>
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar Pencarian & Filter */}
                    <div className="pcm-toolbar mb-4">
                        <div className="pcm-toolbar__grow">
                            <div className="pcm-search">
                                <span className="pcm-search__icon"><IconSearch size="sm" /></span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Cari nama folder proyek, client, job no..."
                                    aria-label="Cari folder proyek"
                                    value={searchFolder}
                                    onChange={(e) => setSearchFolder(e.target.value)}
                                />
                            </div>
                            <PcmSelect
                                aria-label="Filter client"
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                            >
                                <option value="ALL">Semua Client ({projects.length})</option>
                                {clientOptions.map((client) => (
                                    <option key={client} value={client}>Client: {client}</option>
                                ))}
                            </PcmSelect>
                        </div>
                        <span className="pcm-count">
                            Menampilkan <strong>{filteredFolders.length}</strong> folder proyek
                        </span>
                    </div>

                    {/* Grid Folder Proyek Cards */}
                    <div className="row g-3">
                        {filteredFolders.map((p) => (
                            <div className="col-12 col-md-6 col-xl-4" key={p.id}>
                                <button
                                    type="button"
                                    className="pcm-folder-card text-start w-100"
                                    onClick={() => handleSelectProject(p.id)}
                                >
                                    <span className="pcm-folder-card__top">
                                        <span className="pcm-folder-card__icon"><IconFolder /></span>
                                        <span className="pcm-folder-card__tags">
                                            <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                JOB: {p.job_no || '-'}
                                            </span>
                                            <span className="pcm-chip pcm-chip--primary">
                                                <IconBuilding size="sm" />
                                                <span>{p.client || 'Client Umum'}</span>
                                            </span>
                                        </span>
                                    </span>

                                    <span className="pcm-folder-card__name">{p.name}</span>

                                    <span className="pcm-folder-card__metrics">
                                        <span className="pcm-folder-card__metric">
                                            <span>Lingkup Kontrak</span>
                                            <strong>{p.scopes_count} scopes</strong>
                                        </span>
                                        <span className="pcm-folder-card__metric">
                                            <span>Realisasi Target DI</span>
                                            <strong className="pcm-code">
                                                {p.total_actual_di.toLocaleString('id-ID')} / {p.total_contract_di.toLocaleString('id-ID')} DI
                                            </strong>
                                        </span>
                                        <span className="pcm-folder-card__metric">
                                            <span>Progres Kumulatif</span>
                                            <strong className="text-success">{p.progress_pct}%</strong>
                                        </span>
                                    </span>

                                    <span className="pcm-folder-card__cta">
                                        <span>Buka Proyek Ini</span>
                                        <IconChevronRight size="sm" />
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================================
                VIEW B: KONTEN DI DALAM PROYEK AKTIF (CHILD LEVEL DENGAN GUARD)
                ============================================================ */}
            {activeProject && (
                <div>
                    {/* BREADCRUMB & PROJECT CONTEXT BAR */}
                    <div
                        className="pcm-crumbs mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-white border"
                        style={{ borderRadius: 'var(--pcm-radius-card)', boxShadow: 'var(--pcm-elev-1)', borderColor: 'var(--pcm-line-soft)' }}
                    >
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                                onClick={() => handleSelectProject(null)}
                            >
                                <IconArrowLeft size="sm" />
                                <span>Daftar Proyek</span>
                            </button>
                            <span className="pcm-chip pcm-chip--primary pcm-code">
                                JOB: {activeProject.job_no || '-'}
                            </span>
                            <span className="fw-bold text-dark">{activeProject.name}</span>
                            <span className="pcm-chip pcm-chip--neutral">
                                <IconBuilding size="sm" />
                                <span>{activeProject.client || 'Client Umum'}</span>
                            </span>
                        </div>

                        {/* Quick Project Switcher */}
                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small fw-semibold text-nowrap">Pindah Proyek:</span>
                            <PcmSelect
                                style={{ width: 'auto', minWidth: '210px' }}
                                value={activeProject.id}
                                onChange={(e) => handleSelectProject(e.target.value)}
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.job_no ? `[${p.job_no}] ` : ''}{p.name}
                                    </option>
                                ))}
                            </PcmSelect>
                        </div>
                    </div>

                    {/* SUB-MODUL KONTEN PROYEK (LAYOUT IDENTIK DENGAN NILAI TERISOLASI) */}
                    {currentSection === 'schedule' && (
                        <BoqContractSection
                            project={activeProject}
                            scopes={projectScopes}
                            engBoqs={projectEngBoqs}
                            joints={projectJoints}
                            user={user}
                            onReload={onReload}
                        />
                    )}
                    {currentSection === 'pm_scurve' && (
                        <SCurveSection
                            project={activeProject}
                            scopes={projectScopes}
                            joints={projectJoints}
                            dailyLogs={projectDailyLogs}
                            user={user}
                        />
                    )}
                    {currentSection === 'pm_budget' && (
                        <BudgetCostSection
                            project={activeProject}
                            engBoqs={projectEngBoqs}
                            boms={projectBoms}
                            user={user}
                            onToast={onReload}
                        />
                    )}
                    {currentSection === 'pm_daily' && (
                        <DailyLogSection
                            project={activeProject}
                            scopes={projectScopes}
                            joints={projectJoints}
                            user={user}
                            onReload={onReload}
                        />
                    )}
                    {currentSection === 'pm_milestone' && (
                        <MilestoneSection
                            project={activeProject}
                            drawings={projectDrawings}
                            joints={projectJoints}
                            materialInspections={crossData.materialInspections}
                            inspections={crossData.inspections}
                            testPackages={crossData.testPackages}
                            user={user}
                            onToast={onReload}
                        />
                    )}
                    {currentSection === 'report' && (
                        <ExecutiveReportSection
                            project={activeProject}
                            overview={overview}
                            joints={projectJoints}
                            stockMoves={stockMoves}
                            scopes={projectScopes}
                            engBoqs={projectEngBoqs}
                            boms={projectBoms}
                            testPackages={crossData.testPackages}
                            hseLogs={crossData.hseLogs}
                            user={user}
                        />
                    )}
                </div>
            )}

            {/* MODAL INPUT PROYEK BARU */}
            {showFolderModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">Buat Folder Proyek Baru</h5>
                                <button type="button" className="btn-close" onClick={() => setShowFolderModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateProject}>
                                <div className="modal-body p-4">
                                    {folderError && (
                                        <div className="alert alert-danger py-2 mb-3 small">
                                            {folderError}
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Nama Perusahaan Client</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            placeholder="Contoh: PT Pertamina EP / Chevron"
                                            value={folderForm.client}
                                            onChange={(e) => setFolderForm({ ...folderForm, client: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Nama Folder / Paket Proyek</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            placeholder="Contoh: Pekerjaan Instalasi Piping Flare Gas"
                                            value={folderForm.name}
                                            onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Nomor Kontrak / Job No</label>
                                        <input
                                            type="text"
                                            className="form-control font-monospace"
                                            required
                                            placeholder="Contoh: 2428 / 2026-FL"
                                            value={folderForm.job_no}
                                            onChange={(e) => setFolderForm({ ...folderForm, job_no: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setShowFolderModal(false)}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={folderLoading}
                                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' }}
                                    >
                                        {folderLoading ? 'Menyimpan...' : 'Buat Folder Proyek'}
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
