/* Hallmark · macrostructure: Workbench · theme: Acorn-Blue · tone: utilitarian
 * module: Engineering · tokens: public/css/main.css (--pcm-*)
 * direction: DESIGN.md · dials: ENERGY 1 · RHYTHM 1 · MOTION 1
 * disciplines: honest-copy · locked-tokens · mobile-responsive · keyboard-a11y
 */
import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { LineServiceSection } from './engineering/LineServiceSection';
import { WeldingMapSection } from './engineering/WeldingMapSection';
import { BoqSection } from './engineering/BoqSection';
import { BomSection } from './engineering/BomSection';
import { MaterialStandardSection } from './engineering/MaterialStandardSection';
import { PipeScheduleSection } from './engineering/PipeScheduleSection';
import { DocumentControlSection } from './engineering/DocumentControlSection';

export const ENG_SUB_TABS = [
    { id: 'isometric', label: 'Isometric Drawing' },
    { id: 'line_service', label: 'Line Service' },
    { id: 'welding_map', label: 'Welding Map' },
    { id: 'boq', label: 'Bill of Quantity' },
    { id: 'bom', label: 'Bill of Material' },
    { id: 'material_standard', label: 'Material Standart' },
    { id: 'pipe_schedule', label: 'Pipe Schedule' },
    { id: 'document_control', label: 'Document Control' },
];

/* -------------------------------------------------------------------------
 * Icon set. Heroicons outline paths, one stroke weight, one 24x24 grid, drawn
 * inline. No emoji, no icon font, no second library (R-04).
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

function IconFile({ size }) {
    return (
        <svg className={iconClass(size)} {...SVG_PROPS}>
            <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}

/* -------------------------------------------------------------------------
 * Form defaults. Declared once so create and reset cannot drift apart.
 * ---------------------------------------------------------------------- */
const emptyFolderForm = () => ({ client: '', name: '', job_no: '' });

const emptyDrawingForm = () => ({
    drawing_no: '',
    title: '',
    line_no: '',
    line_service: '',
    area: 'MPP Area',
    sheet: 'Sheet 1 of 1',
    rev: '0',
    material_spec: 'ASTM A106 Gr. B',
    size_range: '2" - 4" Sch 40',
    total_dia_inch: '',
    total_joints: '',
    distributed_to: 'Workshop Spool Fabrication',
    distribution_date: new Date().toISOString().split('T')[0],
    status: 'active'
});

export function EngineeringTab({
    currentSection = 'engineering',
    drawings = [],
    projects = [],
    user,
    onReload,
    loading = false,
    error = ''
}) {
    // Navigasi: null = daftar folder proyek, nilai lain = id folder yang dibuka
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const activeEngTab = currentSection === 'engineering' ? 'isometric' : currentSection;

    // Filter dan pencarian
    const [searchFolder, setSearchFolder] = useState('');
    const [clientFilter, setClientFilter] = useState('ALL');
    const [searchDrawing, setSearchDrawing] = useState('');

    // Modal
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showDrawingModal, setShowDrawingModal] = useState(false);
    const [selectedDrawing, setSelectedDrawing] = useState(null);

    // Form folder proyek baru
    const [folderForm, setFolderForm] = useState(emptyFolderForm);
    const [folderLoading, setFolderLoading] = useState(false);
    const [folderError, setFolderError] = useState('');

    // Form drawing baru
    const [drawingForm, setDrawingForm] = useState(emptyDrawingForm);
    const [drawingFile, setDrawingFile] = useState(null);
    const [drawingLoading, setDrawingLoading] = useState(false);
    const [drawingError, setDrawingError] = useState('');

    const canEdit = can(user, 'drawing.write');

    // Escape menutup modal yang sedang terbuka (R-32)
    const anyModalOpen = showFolderModal || showDrawingModal || Boolean(selectedDrawing);
    useEffect(() => {
        if (!anyModalOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            if (selectedDrawing) setSelectedDrawing(null);
            else if (showDrawingModal) setShowDrawingModal(false);
            else if (showFolderModal) setShowFolderModal(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [anyModalOpen, selectedDrawing, showDrawingModal, showFolderModal]);

    // Klik backdrop menutup modal (R-26)
    const closeOnBackdrop = (setter) => (event) => {
        if (event.target === event.currentTarget) setter(false);
    };

    // Statistik folder dan drawing
    const { folderList, unassignedDrawings, clientOptions } = useMemo(() => {
        const pList = projects || [];
        const dList = drawings || [];

        const enrichedProjects = pList.map((proj) => {
            const projDrawings = dList.filter((d) => Number(d.project_id) === Number(proj.id));
            const totalDia = projDrawings.reduce((sum, d) => sum + (parseFloat(d.total_dia_inch) || 0), 0);
            const totalJoints = projDrawings.reduce((sum, d) => sum + (parseInt(d.total_joints, 10) || 0), 0);

            return {
                ...proj,
                drawings_count: projDrawings.length || proj.drawings_count || 0,
                total_dia_inch: totalDia,
                total_joints: totalJoints,
                drawings: projDrawings
            };
        });

        const validProjIds = new Set(pList.map((p) => Number(p.id)));
        const unassigned = dList.filter((d) => !d.project_id || !validProjIds.has(Number(d.project_id)));

        const clients = Array.from(
            new Set(pList.map((p) => (p.client || '').trim()).filter(Boolean))
        ).sort();

        return { folderList: enrichedProjects, unassignedDrawings: unassigned, clientOptions: clients };
    }, [projects, drawings]);

    const activeProject = useMemo(() => {
        if (!selectedProjectId) return null;
        if (selectedProjectId === 'unassigned') {
            return {
                id: 'unassigned',
                name: 'Drawing Tanpa Folder / Umum',
                client: 'Umum (Belum Diplot)',
                job_no: 'N/A',
                drawings_count: unassignedDrawings.length,
                total_dia_inch: unassignedDrawings.reduce((sum, d) => sum + (parseFloat(d.total_dia_inch) || 0), 0),
                total_joints: unassignedDrawings.reduce((sum, d) => sum + (parseInt(d.total_joints, 10) || 0), 0)
            };
        }
        return folderList.find((p) => Number(p.id) === Number(selectedProjectId)) || null;
    }, [selectedProjectId, folderList, unassignedDrawings]);

    const filteredFolders = useMemo(() => folderList.filter((f) => {
        const matchClient = clientFilter === 'ALL'
            || (f.client || '').toLowerCase() === clientFilter.toLowerCase();
        const q = searchFolder.toLowerCase();
        const matchSearch = !q
            || (f.name || '').toLowerCase().includes(q)
            || (f.client || '').toLowerCase().includes(q)
            || (f.job_no || '').toLowerCase().includes(q);
        return matchClient && matchSearch;
    }), [folderList, clientFilter, searchFolder]);

    const activeFolderDrawings = useMemo(() => {
        if (!selectedProjectId) return [];
        const list = selectedProjectId === 'unassigned'
            ? unassignedDrawings
            : (drawings || []).filter((d) => Number(d.project_id) === Number(selectedProjectId));

        const q = searchDrawing.toLowerCase();
        if (!q) return list;
        return list.filter((d) => (
            (d.drawing_no || '').toLowerCase().includes(q)
            || (d.line_no || '').toLowerCase().includes(q)
            || (d.area || '').toLowerCase().includes(q)
            || (d.title || '').toLowerCase().includes(q)
            || (d.material_spec || '').toLowerCase().includes(q)
        ));
    }, [selectedProjectId, drawings, unassignedDrawings, searchDrawing]);

    // Handler: buat folder proyek baru
    const handleCreateFolder = async (event) => {
        event.preventDefault();
        setFolderError('');
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
            if (res && res.id) setSelectedProjectId(res.id);
        } catch (err) {
            setFolderError(err.message || 'Gagal membuat folder proyek baru');
        } finally {
            setFolderLoading(false);
        }
    };

    // Handler: simpan drawing ke folder aktif
    const handleSaveDrawing = async (event) => {
        event.preventDefault();
        setDrawingError('');
        setDrawingLoading(true);
        try {
            const data = new FormData();
            Object.keys(drawingForm).forEach((key) => {
                if (drawingForm[key] !== '') data.append(key, drawingForm[key]);
            });
            if (selectedProjectId && selectedProjectId !== 'unassigned') {
                data.append('project_id', selectedProjectId);
            }
            if (drawingFile) data.append('file', drawingFile);

            const token = api.getToken();
            const res = await fetch('/api/drawings', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: data
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal menyimpan berkas drawing');
            }

            setShowDrawingModal(false);
            setDrawingFile(null);
            setDrawingForm(emptyDrawingForm());
            if (onReload) onReload();
        } catch (err) {
            setDrawingError(err.message || 'Gagal menyimpan isometrik drawing');
        } finally {
            setDrawingLoading(false);
        }
    };

    const showDirectoryEmpty = !loading
        && filteredFolders.length === 0
        && unassignedDrawings.length === 0;

    return (
        <div className="container-fluid px-4 py-4">

            {error && (
                <div className="alert alert-danger py-2 mb-4" role="alert">
                    <strong className="fw-bold">Gagal memuat data.</strong> {error}
                </div>
            )}

            {/* ============================================================
                MODUL 1: Isometric Drawing (ENG-000 / ENG-007)
                ============================================================ */}
            {activeEngTab === 'isometric' && (
                <>
                    {/* VIEW A: daftar folder proyek client */}
                    {!selectedProjectId && (
                        <div>
                    <div className="pcm-page-head mb-4">
                        <div className="pcm-page-head__text">
                            <span className="pcm-eyebrow">Direktori Folder Proyek Client</span>
                            <h1 className="pcm-page-head__title">Folder Proyek Client &amp; Manajemen Drawing</h1>
                            <p className="pcm-page-head__lede">
                                Drawing dikelompokkan ke dalam folder proyek dari masing-masing client.
                                Buka folder proyek untuk mengelola berkas drawing isometrik.
                            </p>
                        </div>
                        <div className="pcm-page-head__aside">
                            {canEdit ? (
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm fw-bold text-primary"
                                    onClick={() => setShowFolderModal(true)}
                                >
                                    <IconPlus size="sm" />
                                    <span>Buat Folder Proyek Baru</span>
                                </button>
                            ) : (
                                <span className="pcm-note">Akses terbatas: Engineer dan Manager</span>
                            )}
                        </div>
                    </div>

                    {/* Empat hitungan dari satu kumpulan data, jadi diperlakukan setara (R-14) */}
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-lg-3">
                            <div className="pcm-tile">
                                <span className="pcm-tile__label">Folder Proyek</span>
                                <strong className="pcm-tile__value">
                                    {folderList.length}
                                    <span className="pcm-tile__unit">folder</span>
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
                                <span className="pcm-tile__label">Total Drawing</span>
                                <strong className="pcm-tile__value pcm-tile__value--primary">
                                    {drawings.length}
                                    <span className="pcm-tile__unit">drawing</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="pcm-tile">
                                <span className="pcm-tile__label">Belum Diplot</span>
                                <strong
                                    className={`pcm-tile__value${unassignedDrawings.length > 0 ? ' pcm-tile__value--warning' : ''}`}
                                >
                                    {unassignedDrawings.length}
                                    <span className="pcm-tile__unit">berkas</span>
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="pcm-toolbar mb-4">
                        <div className="pcm-toolbar__grow">
                            <div className="pcm-search">
                                <span className="pcm-search__icon"><IconSearch size="sm" /></span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Cari nama folder proyek, client, job no"
                                    aria-label="Cari folder proyek"
                                    value={searchFolder}
                                    onChange={(e) => setSearchFolder(e.target.value)}
                                />
                            </div>
                            <select
                                className="form-select form-select-sm pcm-select"
                                aria-label="Filter client"
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                            >
                                <option value="ALL">Semua Client ({folderList.length})</option>
                                {clientOptions.map((client) => (
                                    <option key={client} value={client}>Client: {client}</option>
                                ))}
                            </select>
                        </div>
                        <span className="pcm-count">
                            Menampilkan <strong>{filteredFolders.length}</strong> folder proyek
                        </span>
                    </div>

                    {loading && folderList.length === 0 && (
                        <div className="pcm-state" role="status" aria-live="polite">
                            <span className="spinner-border spinner-border-sm text-primary mb-2" aria-hidden="true" />
                            <p className="pcm-state__title">Memuat data drawing</p>
                            <p className="pcm-state__text">Mengambil daftar folder proyek dan register drawing dari server.</p>
                        </div>
                    )}

                    {showDirectoryEmpty && (
                        <div className="pcm-state">
                            <span className="pcm-state__icon"><IconFolder size="lg" /></span>
                            <h2 className="pcm-state__title">Belum ada folder proyek client</h2>
                            <p className="pcm-state__text">
                                Belum ada folder proyek yang terdaftar. Tambahkan folder baru untuk mulai
                                mengunggah gambar drawing per client.
                            </p>
                            {canEdit && (
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm fw-bold mt-3"
                                    onClick={() => setShowFolderModal(true)}
                                >
                                    <IconPlus size="sm" />
                                    <span>Buat Folder Proyek Baru</span>
                                </button>
                            )}
                        </div>
                    )}

                    {(filteredFolders.length > 0 || unassignedDrawings.length > 0) && (
                        <div className="row g-3">
                            {filteredFolders.map((folder) => (
                                <div className="col-12 col-md-6 col-xl-4" key={folder.id}>
                                    <button
                                        type="button"
                                        className="pcm-folder-card"
                                        onClick={() => setSelectedProjectId(folder.id)}
                                    >
                                        <span className="pcm-folder-card__top">
                                            <span className="pcm-folder-card__icon"><IconFolder /></span>
                                            <span className="pcm-folder-card__tags">
                                                <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                    JOB: {folder.job_no || '-'}
                                                </span>
                                                <span className="pcm-chip pcm-chip--primary">
                                                    <IconBuilding size="sm" />
                                                    <span>{folder.client || 'Client Umum'}</span>
                                                </span>
                                            </span>
                                        </span>

                                        <span className="pcm-folder-card__name">{folder.name}</span>

                                        <span className="pcm-folder-card__metrics">
                                            <span className="pcm-folder-card__metric">
                                                <span>Jumlah Drawing</span>
                                                <strong>{folder.drawings_count || 0} drawing</strong>
                                            </span>
                                            <span className="pcm-folder-card__metric">
                                                <span>Total Diameter Inch</span>
                                                <strong className="pcm-code">
                                                    {(folder.total_dia_inch || 0).toFixed(2)} DI
                                                </strong>
                                            </span>
                                            <span className="pcm-folder-card__metric">
                                                <span>Estimasi Total Joint</span>
                                                <strong>{folder.total_joints || 0} joint</strong>
                                            </span>
                                        </span>

                                        <span className="pcm-folder-card__cta">
                                            <span>Buka Folder Drawing</span>
                                            <IconChevronRight size="sm" />
                                        </span>
                                    </button>
                                </div>
                            ))}

                            {unassignedDrawings.length > 0 && (
                                <div className="col-12 col-md-6 col-xl-4">
                                    <button
                                        type="button"
                                        className="pcm-folder-card pcm-folder-card--warning"
                                        onClick={() => setSelectedProjectId('unassigned')}
                                    >
                                        <span className="pcm-folder-card__top">
                                            <span className="pcm-folder-card__icon"><IconFolder /></span>
                                            <span className="pcm-folder-card__tags">
                                                <span className="pcm-chip pcm-chip--warning">Belum Diplot</span>
                                            </span>
                                        </span>

                                        <span className="pcm-folder-card__name">Drawing Tanpa Folder / Umum</span>

                                        <span className="pcm-folder-card__metrics">
                                            <span className="pcm-folder-card__metric">
                                                <span>Jumlah Drawing</span>
                                                <strong>{unassignedDrawings.length} drawing</strong>
                                            </span>
                                        </span>

                                        <span className="pcm-folder-card__cta">
                                            <span>Buka Berkas Unassigned</span>
                                            <IconChevronRight size="sm" />
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && filteredFolders.length === 0 && unassignedDrawings.length > 0 && (
                        <p className="pcm-count mt-3 mb-0">
                            Tidak ada folder proyek yang cocok dengan filter. Drawing tanpa folder tetap
                            ditampilkan di atas.
                        </p>
                    )}
                </div>
            )}

            {/* ============================================================
                VIEW B: register drawing di dalam folder
                ============================================================ */}
            {selectedProjectId && activeProject && (
                <div>
                    <div className="pcm-crumbs mb-3">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setSelectedProjectId(null)}
                        >
                            <IconArrowLeft size="sm" />
                            <span>Kembali ke Daftar Folder</span>
                        </button>
                        <span className="pcm-crumbs__sep">/</span>
                        <span className="pcm-crumbs__item">
                            Client: <strong>{activeProject.client || '-'}</strong>
                        </span>
                        <span className="pcm-crumbs__sep">/</span>
                        <span className="pcm-crumbs__item pcm-crumbs__item--current">{activeProject.name}</span>

                        {canEdit && selectedProjectId !== 'unassigned' && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold ms-auto"
                                onClick={() => setShowDrawingModal(true)}
                            >
                                <IconPlus size="sm" />
                                <span>Input Drawing ke Folder Ini</span>
                            </button>
                        )}
                    </div>

                    <div className="pcm-page-head mb-4">
                        <div className="pcm-page-head__text">
                            <span className="pcm-folder-card__top mb-2">
                                <span className="pcm-chip pcm-chip--primary">
                                    <IconBuilding size="sm" />
                                    <span>Client: {activeProject.client || 'Client Umum'}</span>
                                </span>
                                <span className="pcm-chip pcm-chip--neutral pcm-code">
                                    JOB NO: {activeProject.job_no || '-'}
                                </span>
                            </span>
                            <h1 className="pcm-page-head__title">{activeProject.name}</h1>
                        </div>
                        <div className="pcm-page-head__aside">
                            <span className="pcm-stat">
                                <span className="pcm-stat__label">Total Drawing</span>
                                <strong className="pcm-stat__value">{activeProject.drawings_count || 0}</strong>
                            </span>
                            <span className="pcm-stat">
                                <span className="pcm-stat__label">Total DI</span>
                                <strong className="pcm-stat__value pcm-code">
                                    {(activeProject.total_dia_inch || 0).toFixed(2)}
                                </strong>
                            </span>
                            <span className="pcm-stat">
                                <span className="pcm-stat__label">Total Joint</span>
                                <strong className="pcm-stat__value">{activeProject.total_joints || 0}</strong>
                            </span>
                        </div>
                    </div>

                    <div className="pcm-toolbar mb-4">
                        <div className="pcm-toolbar__grow">
                            <div className="pcm-search">
                                <span className="pcm-search__icon"><IconSearch size="sm" /></span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Cari drawing no, line no, atau area"
                                    aria-label="Cari drawing di folder ini"
                                    value={searchDrawing}
                                    onChange={(e) => setSearchDrawing(e.target.value)}
                                />
                            </div>
                        </div>
                        <span className="pcm-count">
                            Menampilkan <strong>{activeFolderDrawings.length}</strong> dari{' '}
                            {activeProject.drawings_count || 0} drawing di folder ini
                        </span>
                    </div>

                    <div className="pcm-card">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle pcm-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Revision</th>
                                        <th scope="col">Drawing No</th>
                                        <th scope="col">Line No / Service</th>
                                        <th scope="col">Material / Size</th>
                                        <th scope="col">DI / Joint</th>
                                        <th scope="col">File</th>
                                        <th scope="col">Status</th>
                                        <th scope="col" className="text-end">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeFolderDrawings.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="py-4">
                                                <div className="pcm-state border-0 bg-transparent py-4">
                                                    <span className="pcm-state__icon"><IconFile size="lg" /></span>
                                                    <p className="pcm-state__title">Belum ada drawing di dalam folder ini</p>
                                                    <p className="pcm-state__text">
                                                        Gunakan tombol di atas untuk menambahkan isometrik drawing baru
                                                        ke folder ini.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        activeFolderDrawings.map((d, idx) => (
                                            <tr key={d.id || idx}>
                                                <td>
                                                    <span className="pcm-chip pcm-chip--primary pcm-code">REV-{d.rev || 0}</span>
                                                </td>
                                                <td>
                                                    <span className="d-block pcm-cell-id">{d.drawing_no}</span>
                                                    <span className="d-block pcm-cell-sub">{d.sheet || 'Sheet 1 of 1'}</span>
                                                    {d.title && (
                                                        <span className="d-block pcm-cell-sub pcm-cell-clip">{d.title}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="d-block pcm-code pcm-cell-strong">{d.line_no || '-'}</span>
                                                    {d.line_service && (
                                                        <span className="d-block pcm-cell-sub">{d.line_service}</span>
                                                    )}
                                                    <span className="d-block pcm-cell-sub">{d.area || 'Area belum diisi'}</span>
                                                </td>
                                                <td>
                                                    <span className="d-block pcm-cell-strong">{d.material_spec || '-'}</span>
                                                    <span className="d-block pcm-cell-sub">{d.size_range || '-'}</span>
                                                </td>
                                                <td>
                                                    <span className="d-block pcm-code pcm-cell-strong">
                                                        {d.total_dia_inch ? `${parseFloat(d.total_dia_inch).toFixed(2)} DI` : '-'}
                                                    </span>
                                                    <span className="d-block pcm-cell-sub pcm-code">
                                                        {d.total_joints ? `${d.total_joints} JTS` : '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {d.scan_path ? (
                                                        <a
                                                            href={d.scan_path}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-outline-primary btn-sm"
                                                        >
                                                            <IconFile size="sm" />
                                                            <span>CAD/PDF</span>
                                                        </a>
                                                    ) : (
                                                        <span className="pcm-cell-sub">Tidak ada file</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`pcm-chip ${d.status === 'active' ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                        {d.status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => setSelectedDrawing(d)}
                                                    >
                                                        Spesifikasi
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}

            {/* ============================================================
                MODUL 2: Line Service (ENG-001 / ENG-008)
                ============================================================ */}
            {activeEngTab === 'line_service' && (
                <LineServiceSection user={user} projects={projects} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 3: Welding Map (ENG-002 / ENG-009)
                ============================================================ */}
            {activeEngTab === 'welding_map' && (
                <WeldingMapSection user={user} projects={projects} drawings={drawings} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 4: Bill of Quantity / BOQ (ENG-003 / ENG-010)
                ============================================================ */}
            {activeEngTab === 'boq' && (
                <BoqSection user={user} projects={projects} drawings={drawings} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 5: Bill of Material / BOM / MTO (ENG-004 / ENG-011)
                ============================================================ */}
            {activeEngTab === 'bom' && (
                <BomSection user={user} projects={projects} drawings={drawings} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 6: Material Standart (ENG-005 / ENG-012)
                ============================================================ */}
            {activeEngTab === 'material_standard' && (
                <MaterialStandardSection user={user} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 6B: Master Pipe Schedule (ASME B36.10)
                ============================================================ */}
            {activeEngTab === 'pipe_schedule' && (
                <PipeScheduleSection />
            )}

            {/* ============================================================
                MODUL 7: Document Control (ENG-006 / ENG-013)
                ============================================================ */}
            {activeEngTab === 'document_control' && (
                <DocumentControlSection user={user} projects={projects} drawings={drawings} onToast={onReload} />
            )}

            {/* ============================================================
                MODAL 1: buat folder proyek baru
                ============================================================ */}
            {showFolderModal && (
                <div
                    className="modal show d-block pcm-modal"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pcm-folder-modal-title"
                    onMouseDown={closeOnBackdrop(setShowFolderModal)}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0">
                            <form onSubmit={handleCreateFolder}>
                                <div className="modal-header">
                                    <div>
                                        <h2 className="modal-title" id="pcm-folder-modal-title">Buat Folder Proyek Client</h2>
                                        <span className="pcm-modal__sub">
                                            Kelompokkan gambar isometrik berdasarkan proyek dan client
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Tutup"
                                        onClick={() => setShowFolderModal(false)}
                                    />
                                </div>

                                <div className="modal-body">
                                    {folderError && (
                                        <div className="alert alert-danger py-2 mb-3" role="alert">{folderError}</div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label pcm-form-label" htmlFor="pcm-folder-client">
                                            Nama Perusahaan Client <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            id="pcm-folder-client"
                                            type="text"
                                            required
                                            className="form-control form-control-sm"
                                            placeholder="Contoh: PT Pertamina EP"
                                            value={folderForm.client}
                                            onChange={(e) => setFolderForm({ ...folderForm, client: e.target.value })}
                                        />
                                        <span className="pcm-hint">
                                            Nama client menjadi label kelompok utama direktori folder.
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label pcm-form-label" htmlFor="pcm-folder-name">
                                            Nama Folder / Judul Proyek <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            id="pcm-folder-name"
                                            type="text"
                                            required
                                            className="form-control form-control-sm"
                                            placeholder="Contoh: Proyek Flare Gas Tie-In"
                                            value={folderForm.name}
                                            onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label pcm-form-label" htmlFor="pcm-folder-job">
                                            Nomor Job / Kontrak Proyek <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            id="pcm-folder-job"
                                            type="text"
                                            required
                                            className="form-control form-control-sm pcm-code"
                                            placeholder="Contoh: 2428"
                                            value={folderForm.job_no}
                                            onChange={(e) => setFolderForm({ ...folderForm, job_no: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFolderModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={folderLoading}>
                                        {folderLoading ? 'Membuat Folder' : 'Buat Folder Proyek'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                MODAL 2: input drawing baru ke folder aktif
                ============================================================ */}
            {showDrawingModal && activeProject && (
                <div
                    className="modal show d-block pcm-modal"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pcm-drawing-modal-title"
                    onMouseDown={closeOnBackdrop(setShowDrawingModal)}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content border-0">
                            <form onSubmit={handleSaveDrawing}>
                                <div className="modal-header">
                                    <div>
                                        <h2 className="modal-title" id="pcm-drawing-modal-title">Input Isometrik Drawing Pipa</h2>
                                        <span className="pcm-modal__sub">
                                            Spesifikasi drawing dan berkas CAD/PDF
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Tutup"
                                        onClick={() => setShowDrawingModal(false)}
                                    />
                                </div>

                                <div className="modal-body">
                                    {drawingError && (
                                        <div className="alert alert-danger py-2 mb-3" role="alert">{drawingError}</div>
                                    )}

                                    <div className="pcm-bind mb-3">
                                        <div>
                                            <span className="pcm-form-label d-block">Menyimpan ke folder proyek</span>
                                            <strong className="pcm-cell-strong">{activeProject.name}</strong>
                                        </div>
                                        <div className="text-end">
                                            <span className="pcm-chip pcm-chip--primary">
                                                <IconBuilding size="sm" />
                                                <span>{activeProject.client}</span>
                                            </span>
                                            <span className="d-block pcm-cell-sub pcm-code mt-1">
                                                Job: {activeProject.job_no}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">1. Data Pokok Drawing</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-no">
                                                    Isometric Drawing No <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-no"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm pcm-code"
                                                    placeholder="Contoh: 2428-M-15-MPP-AB-SHT2"
                                                    value={drawingForm.drawing_no}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, drawing_no: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-title">
                                                    Title / Keterangan <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-title"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: Process Piping Main Header"
                                                    value={drawingForm.title}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-rev">Revision No</label>
                                                <select
                                                    id="pcm-dwg-rev"
                                                    className="form-select form-select-sm"
                                                    value={drawingForm.rev}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, rev: e.target.value })}
                                                >
                                                    <option value="0">Rev 0 (Issued For Construction)</option>
                                                    <option value="A">Rev A (Internal Review)</option>
                                                    <option value="B">Rev B (Client Review)</option>
                                                    <option value="1">Rev 1</option>
                                                    <option value="2">Rev 2 (As-Built)</option>
                                                </select>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-sheet">
                                                    Sheet <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-sheet"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: Sheet 2 of 3"
                                                    value={drawingForm.sheet}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, sheet: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-line">
                                                    Line No <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-line"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm pcm-code"
                                                    placeholder={'Contoh: 3"-MPP-1002-A1A'}
                                                    value={drawingForm.line_no}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, line_no: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-area">
                                                    Area <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-area"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: Area 10 / Compressor House"
                                                    value={drawingForm.area}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, area: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">2. Spesifikasi Teknis Pipa</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-material">
                                                    Material Specification
                                                </label>
                                                <input
                                                    id="pcm-dwg-material"
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: ASTM A106 Gr. B"
                                                    value={drawingForm.material_spec}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, material_spec: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-size">
                                                    Size Range / Schedule
                                                </label>
                                                <input
                                                    id="pcm-dwg-size"
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: 2 inch - 4 inch Sch 40"
                                                    value={drawingForm.size_range}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, size_range: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-di">
                                                    Total Diameter Inch (DI)
                                                </label>
                                                <input
                                                    id="pcm-dwg-di"
                                                    type="number"
                                                    step="0.01"
                                                    className="form-control form-control-sm pcm-code"
                                                    placeholder="Contoh: 64.00"
                                                    value={drawingForm.total_dia_inch}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, total_dia_inch: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-joints">
                                                    Estimasi Total Joint
                                                </label>
                                                <input
                                                    id="pcm-dwg-joints"
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: 32"
                                                    value={drawingForm.total_joints}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, total_joints: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">3. Berkas Software Engineer</span>
                                        <label className="form-label pcm-form-label" htmlFor="pcm-dwg-file">
                                            File Drawing (CAD / PDF / Image) <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            id="pcm-dwg-file"
                                            type="file"
                                            required
                                            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.zip"
                                            className="form-control form-control-sm"
                                            onChange={(e) => setDrawingFile(e.target.files[0])}
                                        />
                                        <span className="pcm-hint">
                                            Format didukung: PDF, AutoCAD (DWG/DXF), ZIP, PNG, JPG.
                                        </span>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDrawingModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={drawingLoading}>
                                        {drawingLoading ? 'Mengunggah' : 'Simpan Drawing'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                MODAL 3: spesifikasi lengkap drawing
                ============================================================ */}
            {selectedDrawing && (
                <div
                    className="modal show d-block pcm-modal"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pcm-spec-modal-title"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setSelectedDrawing(null);
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0">
                            <div className="modal-header">
                                <h2 className="modal-title" id="pcm-spec-modal-title">
                                    Spesifikasi Drawing: <span className="pcm-code">{selectedDrawing.drawing_no}</span>
                                </h2>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"
                                    onClick={() => setSelectedDrawing(null)}
                                />
                            </div>

                            <div className="modal-body">
                                <div className="row g-2">
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Proyek / Client</span>
                                            <span className="pcm-spec__value">
                                                {selectedDrawing.project?.name || activeProject?.name || '-'}
                                                {' ('}
                                                {selectedDrawing.project?.client || activeProject?.client || '-'}
                                                {')'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Revision No</span>
                                            <span className="pcm-spec__value pcm-code">REV-{selectedDrawing.rev || 0}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Sheet</span>
                                            <span className="pcm-spec__value">{selectedDrawing.sheet || 'Sheet 1 of 1'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Line No</span>
                                            <span className="pcm-spec__value pcm-code">{selectedDrawing.line_no || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Area</span>
                                            <span className="pcm-spec__value">{selectedDrawing.area || 'MPP'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Material Spec</span>
                                            <span className="pcm-spec__value">{selectedDrawing.material_spec || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Size Range</span>
                                            <span className="pcm-spec__value">{selectedDrawing.size_range || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Total Diameter Inch</span>
                                            <span className="pcm-spec__value pcm-code">
                                                {selectedDrawing.total_dia_inch
                                                    ? `${parseFloat(selectedDrawing.total_dia_inch).toFixed(2)} DI`
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Total Joint</span>
                                            <span className="pcm-spec__value">{selectedDrawing.total_joints || 0} joint</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pcm-file-box mt-3">
                                    <div>
                                        <span className="pcm-form-label d-block">Berkas Drawing Software</span>
                                        <small className="pcm-cell-sub">
                                            {selectedDrawing.scan_path
                                                ? selectedDrawing.scan_path.split('/').pop()
                                                : 'Tidak ada berkas'}
                                        </small>
                                    </div>
                                    {selectedDrawing.scan_path && (
                                        <a
                                            href={selectedDrawing.scan_path}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-primary btn-sm fw-bold"
                                        >
                                            Buka File Asli
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDrawing(null)}>
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
