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
    pm_projects: 'Project List',
    schedule: 'Kontrak & BOQ',
    pm_scurve: 'S-Curve & Schedule',
    pm_budget: 'Budgeting',
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
    onSelectTab,
    loading = false,
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
    const isPmOversight = Boolean(user?.is_superadmin) || can(user, 'scope.view');

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

    // Proyek yang sedang aktif (auto-pilih proyek pertama saat membuka modul kerja jika belum ada pilihan)
    const activeProject = useMemo(() => {
        if (currentSection === 'pm_projects') return null;
        if (selectedProjectId) {
            const found = enrichedProjects.find(p => Number(p.id) === Number(selectedProjectId));
            if (found) return found;
        }
        return enrichedProjects[0] || null;
    }, [currentSection, selectedProjectId, enrichedProjects]);

    const effectiveProjectId = activeProject?.id || selectedProjectId;

    // Muat data lintas departemen hanya jika user punya izin pengawasan PM (scope.view)
    useEffect(() => {
        if (!effectiveProjectId || currentSection === 'pm_projects' || !isPmOversight) return undefined;
        let alive = true;
        setCrossData((prev) => ({ ...prev, loading: true }));

        Promise.allSettled([
            api.get('/engineering-boqs'),
            api.get('/bill-of-materials'),
            api.get(`/daily-progress?project_id=${effectiveProjectId}`),
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
    }, [effectiveProjectId, currentSection, isPmOversight]);

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
                VIEW A: HALAMAN PROJECT LIST (TAMPILAN LIST / TABEL SAJA)
                ============================================================ */}
            {currentSection === 'pm_projects' && (
                <div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                        <div>
                            <h2 className="h4 fw-bold text-dark mb-1">Project List</h2>
                            <p className="text-muted small mb-0">
                                Daftar seluruh proyek kontrak piping. Pilih proyek aktif untuk membuka Kontrak &amp; BOQ, S-Curve, Budget, dan Laporan.
                            </p>
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-2 d-inline-flex align-items-center gap-1"
                                style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                onClick={() => setShowFolderModal(true)}
                            >
                                <IconPlus size="sm" />
                                <span>Buat Proyek Baru</span>
                            </button>
                        )}
                    </div>

                    {/* Toolbar Pencarian & Filter */}
                    <div className="pcm-toolbar mb-3">
                        <div className="pcm-toolbar__grow">
                            <div className="pcm-search">
                                <span className="pcm-search__icon"><IconSearch size="sm" /></span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Cari nama proyek, client, atau job no..."
                                    aria-label="Cari proyek"
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
                            Menampilkan <strong>{filteredFolders.length}</strong> proyek
                        </span>
                    </div>

                    {/* Tabel List Proyek */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
                                <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                                    <tr>
                                        <th className="ps-3 py-3" style={{ width: '50px' }}>No</th>
                                        <th className="py-3" style={{ width: '115px' }}>Job No</th>
                                        <th className="py-3">Nama Proyek</th>
                                        <th className="py-3">Client</th>
                                        <th className="py-3 text-center" style={{ width: '100px' }}>Scopes</th>
                                        <th className="py-3 text-end" style={{ width: '210px' }}>Realisasi / Target DI</th>
                                        <th className="py-3 text-center" style={{ width: '110px' }}>Progres</th>
                                        <th className="text-end pe-3 py-3" style={{ width: '140px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFolders.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-4 text-muted">
                                                Belum ada proyek yang sesuai filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredFolders.map((p, idx) => {
                                            const isCurrent = Number(selectedProjectId) === Number(p.id);
                                            return (
                                                <tr key={p.id}>
                                                    <td className="ps-3 text-muted fw-bold">{idx + 1}</td>
                                                    <td className="font-monospace fw-bold text-primary">
                                                        {p.job_no || '-'}
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{p.name}</div>
                                                        {isCurrent && (
                                                            <span className="badge bg-success mt-1" style={{ fontSize: '0.66rem' }}>
                                                                Proyek Aktif
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-muted">{p.client || 'Client Umum'}</td>
                                                    <td className="text-center font-monospace fw-semibold">
                                                        {p.scopes_count}
                                                    </td>
                                                    <td className="text-end font-monospace">
                                                        <span className="fw-bold text-dark">{p.total_actual_di.toLocaleString('id-ID')}</span>
                                                        <span className="text-muted"> / {p.total_contract_di.toLocaleString('id-ID')} DI</span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge px-2.5 py-1 fw-bold text-dark border font-monospace" style={{ backgroundColor: '#f1f5f9', borderRadius: 'var(--pcm-radius-chip)' }}>
                                                            {p.progress_pct}%
                                                        </span>
                                                    </td>
                                                    <td className="text-end pe-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm px-3 py-1 fw-bold"
                                                            style={{ borderRadius: 'var(--pcm-radius-chip)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                            onClick={() => {
                                                                handleSelectProject(p.id);
                                                                if (onSelectTab) onSelectTab('schedule');
                                                            }}
                                                        >
                                                            Buka Proyek
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                LOADING / EMPTY STATE JIKA PROYEK BELUM SIAP
                ============================================================ */}
            {currentSection !== 'pm_projects' && !(currentSection === 'pm_milestone' && isPmOversight) && !activeProject && loading && (
                <div className="pcm-state" role="status" aria-live="polite">
                    <span className="spinner-border spinner-border-sm text-primary mb-2" aria-hidden="true" />
                    <p className="pcm-state__title">Memuat data proyek</p>
                    <p className="pcm-state__text">Mengambil daftar proyek dan baseline kontrak dari server.</p>
                </div>
            )}

            {currentSection !== 'pm_projects' && !(currentSection === 'pm_milestone' && isPmOversight) && !activeProject && !loading && (
                <div className="pcm-state">
                    <span className="pcm-state__icon"><IconFolder size="lg" /></span>
                    <h2 className="pcm-state__title">Belum ada proyek terdaftar</h2>
                    <p className="pcm-state__text">
                        Silakan buat proyek terlebih dahulu di halaman Project List untuk menggunakan modul {SECTION_LABELS[currentSection] || currentSection}.
                    </p>
                    {isPmOversight && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm fw-bold px-3 py-2"
                            style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                            onClick={() => onSelectTab?.('pm_projects')}
                        >
                            Buka Project List
                        </button>
                    )}
                </div>
            )}

            {/* KHUSUS PROJECT MANAGER: MONITORING MILESTONE PER AKUN -> PER PROJECT */}
            {currentSection === 'pm_milestone' && isPmOversight && (
                <MilestoneSection
                    project={activeProject}
                    projects={enrichedProjects}
                    drawings={projectDrawings}
                    joints={projectJoints}
                    materialInspections={crossData.materialInspections}
                    inspections={crossData.inspections}
                    testPackages={crossData.testPackages}
                    user={user}
                    onToast={onReload}
                />
            )}

            {/* ============================================================
                VIEW B: KONTEN DI DALAM PROYEK AKTIF (KONTRAK & BOQ, S-CURVE, DLL)
                ============================================================ */}
            {currentSection !== 'pm_projects' && !(currentSection === 'pm_milestone' && isPmOversight) && activeProject && (
                <div>
                    {/* BREADCRUMB & PROJECT CONTEXT BAR */}
                    <div
                        className="pcm-crumbs mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-white border"
                        style={{ borderRadius: 'var(--pcm-radius-card)', boxShadow: 'var(--pcm-elev-1)', borderColor: 'var(--pcm-line-soft)' }}
                    >
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            {isPmOversight && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                                    onClick={() => (onSelectTab ? onSelectTab('pm_projects') : handleSelectProject(null))}
                                >
                                    <IconArrowLeft size="sm" />
                                    <span>Project List</span>
                                </button>
                            )}
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
                                searchable={false}
                                clearable={false}
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
                            joints={projectJoints}
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
                            projects={enrichedProjects}
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
