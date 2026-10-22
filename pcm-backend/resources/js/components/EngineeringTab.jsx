/* Hallmark · macrostructure: Workbench · theme: Acorn-Blue · tone: utilitarian
 * module: Engineering · tokens: public/css/main.css (--pcm-*)
 * direction: DESIGN.md · dials: ENERGY 1 · RHYTHM 1 · MOTION 1
 * disciplines: honest-copy · locked-tokens · mobile-responsive · keyboard-a11y
 */
import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { confirmDelete } from '../confirm';
import { LineServiceSection } from './engineering/LineServiceSection';
import { WeldingMapSection } from './engineering/WeldingMapSection';
import { BoqSection } from './engineering/BoqSection';
import { BomSection } from './engineering/BomSection';
import { MaterialStandardSection } from './engineering/MaterialStandardSection';
import { DocumentControlSection } from './engineering/DocumentControlSection';

export const ENG_SUB_TABS = [
    { id: 'isometric', label: 'Isometric Drawing' },
    { id: 'line_service', label: 'Line Service' },
    { id: 'welding_map', label: 'Welding Map' },
    { id: 'boq', label: 'Bill of Quantity' },
    { id: 'bom', label: 'Bill of Material' },
    { id: 'material_standard', label: 'Material Standart' },
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
const emptyDrawingForm = () => ({
    drawing_no: '',
    title: '',
    line_no: '',
    line_service: '',
    line_service_id: '',
    area: 'MPP Area',
    sheet_num: 1,
    sheet_total: 1,
    sheet: 'Sheet 1 of 1',
    rev: '0',
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
    activeProject: propActiveProject = null,
    activeProjectId = '',
    onSetActiveProject,
    user,
    onReload,
    loading = false,
    error = ''
}) {
    // Navigasi: bila activeProjectId ada, default ke id tersebut
    const [selectedProjectId, setSelectedProjectIdState] = useState(() => activeProjectId || null);
    const activeEngTab = currentSection === 'engineering' ? 'isometric' : currentSection;

    const setSelectedProjectId = (id) => {
        setSelectedProjectIdState(id);
        if (onSetActiveProject) {
            onSetActiveProject(id && id !== 'unassigned' ? String(id) : '');
        }
    };

    useEffect(() => {
        if (activeProjectId && activeProjectId !== selectedProjectId) {
            setSelectedProjectIdState(activeProjectId);
        }
    }, [activeProjectId]);

    const [lineServices, setLineServices] = useState([]);
    useEffect(() => {
        api.get('/line-services').then(res => {
            setLineServices(Array.isArray(res) ? res : []);
        }).catch(() => {});
    }, []);

    // Filter dan pencarian
    const [searchFolder, setSearchFolder] = useState('');
    const [clientFilter, setClientFilter] = useState('ALL');
    const [searchDrawing, setSearchDrawing] = useState('');

    // Modal Drawing
    const [showDrawingModal, setShowDrawingModal] = useState(false);
    const [selectedDrawing, setSelectedDrawing] = useState(null);

    // Modal Fit-Up Specs Terpisah (setelah drawing dibuat)
    const [fitupModalDrawing, setFitupModalDrawing] = useState(null);
    const [fitupList, setFitupList] = useState([]);
    const [fitupForm, setFitupForm] = useState({ size: '', schedule: '', material_spec: '' });
    const [fitupSaving, setFitupSaving] = useState(false);
    const [fitupError, setFitupError] = useState('');

    // Form drawing baru / edit
    const [drawingForm, setDrawingForm] = useState(emptyDrawingForm);
    const [drawingFile, setDrawingFile] = useState(null);
    const [drawingLoading, setDrawingLoading] = useState(false);
    const [drawingError, setDrawingError] = useState('');
    const [editingDrawing, setEditingDrawing] = useState(null);
    const [targetProjectId, setTargetProjectId] = useState('');

    const canEdit = can(user, 'drawing.write');

    // Escape menutup modal yang sedang terbuka (R-32)
    const anyModalOpen = showDrawingModal || Boolean(selectedDrawing) || Boolean(fitupModalDrawing);
    useEffect(() => {
        if (!anyModalOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            if (fitupModalDrawing) setFitupModalDrawing(null);
            else if (selectedDrawing) setSelectedDrawing(null);
            else if (showDrawingModal) setShowDrawingModal(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [anyModalOpen, selectedDrawing, showDrawingModal, fitupModalDrawing]);

    // Fit-Up Modal Handlers
    const handleOpenFitupModal = (drawing) => {
        setFitupModalDrawing(drawing);
        let specs = [];
        if (Array.isArray(drawing.fitup_specs)) {
            specs = drawing.fitup_specs;
        } else if (typeof drawing.fitup_specs === 'string') {
            try { specs = JSON.parse(drawing.fitup_specs); } catch (e) { specs = []; }
        }
        setFitupList(specs);
        setFitupForm({ size: '', schedule: '', material_spec: '' });
        setFitupError('');
    };

    const handleAddFitupRow = (e) => {
        e.preventDefault();
        if (!fitupForm.size.trim() || !fitupForm.schedule.trim()) {
            setFitupError('Ukuran Size (NPS) dan Schedule / Rating wajib diisi.');
            return;
        }
        setFitupError('');
        setFitupList([...fitupList, { ...fitupForm }]);
        setFitupForm({ size: '', schedule: '', material_spec: '' });
    };

    const handleRemoveFitupRow = (index) => {
        setFitupList(fitupList.filter((_, i) => i !== index));
    };

    const handleSaveFitupModal = async () => {
        if (!fitupModalDrawing) return;
        setFitupSaving(true);
        setFitupError('');
        try {
            await api.put(`/drawings/${fitupModalDrawing.id}`, {
                fitup_specs: fitupList,
                material_spec: fitupList.map(s => s.material_spec).filter(Boolean).join(', '),
                size_range: fitupList.map(s => s.size).filter(Boolean).join(', ')
            });
            setFitupModalDrawing(null);
            if (onReload) await onReload();
        } catch (err) {
            setFitupError(err.message || 'Gagal menyimpan Fit-Up Specs.');
        } finally {
            setFitupSaving(false);
        }
    };

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

    // Buka modal untuk input drawing baru
    const handleOpenCreateDrawing = (projectId = null) => {
        setEditingDrawing(null);
        setDrawingForm(emptyDrawingForm());
        setDrawingFile(null);
        setDrawingError('');
        const chosenId = projectId || (selectedProjectId && selectedProjectId !== 'unassigned' ? selectedProjectId : '') || (projects[0]?.id ? String(projects[0].id) : '');
        setTargetProjectId(chosenId ? String(chosenId) : '');
        setShowDrawingModal(true);
    };

    // Buka modal untuk edit drawing
    const handleOpenEditDrawing = (drawing) => {
        setEditingDrawing(drawing);
        let specs = [];
        if (Array.isArray(drawing.fitup_specs)) {
            specs = drawing.fitup_specs;
        } else if (typeof drawing.fitup_specs === 'string') {
            try { specs = JSON.parse(drawing.fitup_specs); } catch (e) { specs = []; }
        }
        if (specs.length === 0 && (drawing.material_spec || drawing.size_range)) {
            specs = [{ size: drawing.size_range || '', schedule: '', material_spec: drawing.material_spec || '' }];
        }
        if (specs.length === 0) {
            specs = [{ size: '', schedule: '', material_spec: '' }];
        }

        let sNum = 1;
        let sTot = 1;
        if (drawing.sheet) {
            const m = drawing.sheet.match(/Sheet\s+(\d+)\s+of\s+(\d+)/i);
            if (m) {
                sNum = parseInt(m[1], 10) || 1;
                sTot = parseInt(m[2], 10) || 1;
            }
        }

        const matchedService = lineServices.find(s => s.line_no === drawing.line_no);

        setDrawingForm({
            drawing_no: drawing.drawing_no || '',
            title: drawing.title || '',
            line_no: drawing.line_no || '',
            line_service: drawing.line_service || '',
            line_service_id: matchedService ? String(matchedService.id) : '',
            area: drawing.area || 'MPP Area',
            sheet_num: sNum,
            sheet_total: sTot,
            sheet: drawing.sheet || `Sheet ${sNum} of ${sTot}`,
            rev: drawing.rev || '0',
            material_spec: drawing.material_spec || '',
            size_range: drawing.size_range || '',
            total_dia_inch: drawing.total_dia_inch || '',
            total_joints: drawing.total_joints || '',
            fitup_specs: specs,
            distributed_to: drawing.distributed_to || 'Workshop Spool Fabrication',
            distribution_date: drawing.distribution_date ? drawing.distribution_date.split('T')[0] : new Date().toISOString().split('T')[0],
            status: drawing.status || 'active'
        });
        setDrawingFile(null);
        setDrawingError('');
        setTargetProjectId(drawing.project_id ? String(drawing.project_id) : '');
        setShowDrawingModal(true);
    };

    // Hapus drawing
    const handleDeleteDrawing = async (drawingId) => {
        if (!(await confirmDelete('Yakin ingin menghapus drawing ini?'))) return;
        try {
            await api.del(`/drawings/${drawingId}`);
            if (selectedDrawing && selectedDrawing.id === drawingId) {
                setSelectedDrawing(null);
            }
            if (onReload) await onReload();
        } catch (err) {
            alert(err.message || 'Gagal menghapus drawing');
        }
    };

    // Handler: simpan atau perbarui drawing
    const handleSaveDrawing = async (event) => {
        event.preventDefault();
        setDrawingError('');
        if (!targetProjectId) {
            setDrawingError('Silakan pilih Folder Proyek Client terlebih dahulu.');
            return;
        }
        setDrawingLoading(true);
        try {
            const data = new FormData();
            Object.keys(drawingForm).forEach((key) => {
                if (key === 'fitup_specs') {
                    const validSpecs = (drawingForm.fitup_specs || []).filter(s => s.size || s.schedule || s.material_spec);
                    data.append('fitup_specs', JSON.stringify(validSpecs));
                    if (validSpecs.length > 0) {
                        data.append('material_spec', validSpecs.map(s => s.material_spec).filter(Boolean).join(', '));
                        data.append('size_range', validSpecs.map(s => s.size).filter(Boolean).join(', '));
                    }
                } else if (drawingForm[key] !== '' && drawingForm[key] !== null) {
                    data.append(key, drawingForm[key]);
                }
            });
            data.append('project_id', targetProjectId);
            if (drawingFile) data.append('file', drawingFile);

            const token = api.getToken();
            const url = editingDrawing ? `/api/drawings/${editingDrawing.id}` : '/api/drawings';
            if (editingDrawing) {
                data.append('_method', 'PUT');
            }

            const res = await fetch(url, {
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
            setEditingDrawing(null);
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
                            <span className="pcm-note">Buka folder proyek untuk mengelola dan mengunggah berkas drawing</span>
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
                                Belum ada folder proyek yang terdaftar. Folder proyek dibuat dan dikelola melalui modul Project Manager atau Admin.
                            </p>
                        </div>
                    )}

                    {(filteredFolders.length > 0 || unassignedDrawings.length > 0) && (
                        <div className="row g-3">
                            {filteredFolders.map((folder) => (
                                <div className="col-12 col-md-6 col-xl-4 d-flex" key={folder.id}>
                                    <button
                                        type="button"
                                        className="pcm-folder-card h-100"
                                        onClick={() => setSelectedProjectId(folder.id)}
                                    >
                                        {/* Bagian Atas: Icon & Judul Proyek di Atas */}
                                        <div className="pcm-folder-card__header">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <span className="pcm-folder-card__icon">
                                                    <IconFolder size="sm" />
                                                </span>
                                                <div className="flex-grow-1 min-w-0">
                                                    <h3 className="pcm-folder-card__name text-truncate" title={folder.name}>
                                                        {folder.name}
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Job No dan Client Sejajar Berdampingan di Bawah Judul */}
                                            <div className="pcm-folder-card__tags-row">
                                                <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                    JOB NO: {folder.job_no || '-'}
                                                </span>
                                                <span className="pcm-chip pcm-chip--primary">
                                                    <IconBuilding size="sm" />
                                                    <span className="text-truncate" style={{ maxWidth: '160px' }}>
                                                        {folder.client || 'General Client'}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Spesifikasi / Metrics Realistis Dashboard Profesional */}
                                        <div className="pcm-folder-card__metrics">
                                            <div className="pcm-folder-card__metric">
                                                <span className="pcm-folder-card__metric-label">Jumlah Drawing</span>
                                                <strong className="pcm-folder-card__metric-val">{folder.drawings_count || 0} berkas</strong>
                                            </div>
                                            <div className="pcm-folder-card__metric">
                                                <span className="pcm-folder-card__metric-label">Total Diameter Inch</span>
                                                <strong className="pcm-folder-card__metric-val pcm-code">
                                                    {(folder.total_dia_inch || 0).toFixed(2)} DI
                                                </strong>
                                            </div>
                                            <div className="pcm-folder-card__metric">
                                                <span className="pcm-folder-card__metric-label">Estimasi Total Joint</span>
                                                <strong className="pcm-folder-card__metric-val">{folder.total_joints || 0} joint</strong>
                                            </div>
                                        </div>

                                        {/* Footer Aksi */}
                                        <div className="pcm-folder-card__cta">
                                            <span>Buka Folder Drawing</span>
                                            <IconChevronRight size="sm" />
                                        </div>
                                    </button>
                                </div>
                            ))}

                            {unassignedDrawings.length > 0 && (
                                <div className="col-12 col-md-6 col-xl-4 d-flex">
                                    <button
                                        type="button"
                                        className="pcm-folder-card pcm-folder-card--warning h-100"
                                        onClick={() => setSelectedProjectId('unassigned')}
                                    >
                                        {/* Bagian Atas: Icon & Judul Drawing Umum */}
                                        <div className="pcm-folder-card__header">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <span className="pcm-folder-card__icon">
                                                    <IconFolder size="sm" />
                                                </span>
                                                <div className="flex-grow-1 min-w-0">
                                                    <h3 className="pcm-folder-card__name text-truncate">
                                                        Drawing Tanpa Folder / Umum
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Status & Job Sejajar Berdampingan di Bawah Judul */}
                                            <div className="pcm-folder-card__tags-row">
                                                <span className="pcm-chip pcm-chip--warning">
                                                    STATUS: BELUM DIPLOT
                                                </span>
                                                <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                    JOB: N/A
                                                </span>
                                            </div>
                                        </div>

                                        {/* Metrics Alokasi */}
                                        <div className="pcm-folder-card__metrics">
                                            <div className="pcm-folder-card__metric">
                                                <span className="pcm-folder-card__metric-label">Jumlah Drawing</span>
                                                <strong className="pcm-folder-card__metric-val">{unassignedDrawings.length} berkas</strong>
                                            </div>
                                            <div className="pcm-folder-card__metric">
                                                <span className="pcm-folder-card__metric-label">Status Alokasi</span>
                                                <strong className="pcm-folder-card__metric-val text-warning">Perlu Diplot ke Project</strong>
                                            </div>
                                        </div>

                                        {/* Footer Aksi */}
                                        <div className="pcm-folder-card__cta">
                                            <span>Buka Berkas Unassigned</span>
                                            <IconChevronRight size="sm" />
                                        </div>
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
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-2 fw-bold"
                            style={{ color: '#1e40af', fontSize: '1rem' }}
                            onClick={() => setSelectedProjectId(null)}
                        >
                            <IconArrowLeft size="sm" />
                            <span>Back to Projects</span>
                        </button>

                        {canEdit && selectedProjectId !== 'unassigned' && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold d-inline-flex align-items-center gap-1.5"
                                style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                                onClick={() => handleOpenCreateDrawing(selectedProjectId)}
                            >
                                <IconPlus size="sm" />
                                <span>Add Isometric Drawing</span>
                            </button>
                        )}
                    </div>

                    <div className="pcm-page-head mb-4">
                        <div className="pcm-page-head__text">
                            <h1 className="pcm-page-head__title mb-2">{activeProject.name}</h1>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.8125rem', padding: '0.25rem 0.65rem' }}>
                                    JOB NO: {activeProject.job_no || '-'}
                                </span>
                                <span className="pcm-chip pcm-chip--primary" style={{ fontSize: '0.8125rem', padding: '0.25rem 0.65rem' }}>
                                    <IconBuilding size="sm" />
                                    <span>Client: {activeProject.client || 'General Client'}</span>
                                </span>
                            </div>
                        </div>
                        <div className="pcm-page-head__aside">
                            <span className="pcm-stat">
                                <span className="pcm-stat__label">Total Drawings</span>
                                <strong className="pcm-stat__value">{activeProject.drawings_count || 0}</strong>
                            </span>
                            <span className="pcm-stat">
                                <span className="pcm-stat__label">Total DI</span>
                                <strong className="pcm-stat__value pcm-code">
                                    {(activeProject.total_dia_inch || 0).toFixed(2)}
                                </strong>
                            </span>
                            <span className="pcm-stat">
                                <span className="pcm-stat__label">Total Joints</span>
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
                                    placeholder="Search by drawing no, line no, area, title..."
                                    aria-label="Search drawings in this project"
                                    value={searchDrawing}
                                    onChange={(e) => setSearchDrawing(e.target.value)}
                                />
                            </div>
                        </div>
                        <span className="pcm-count">
                            Showing <strong>{activeFolderDrawings.length}</strong> of{' '}
                            {activeProject.drawings_count || 0} drawings in this project
                        </span>
                    </div>

                    <div className="pcm-card">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle pcm-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col" className="text-center" style={{ width: '85px' }}>Revision</th>
                                        <th scope="col" className="text-center" style={{ minWidth: '180px' }}>Drawing Number</th>
                                        <th scope="col" className="text-center" style={{ minWidth: '170px' }}>Line No &amp; Service</th>
                                        <th scope="col" className="text-center" style={{ minWidth: '150px' }}>Fit-Up Specs</th>
                                        <th scope="col" className="text-center" style={{ minWidth: '110px' }}>DI &amp; Joints</th>
                                        <th scope="col" className="text-center" style={{ width: '110px' }}>CAD / PDF</th>
                                        <th scope="col" className="text-center" style={{ width: '100px' }}>Status</th>
                                        {canEdit && <th scope="col" className="text-center" style={{ minWidth: '170px' }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeFolderDrawings.length === 0 ? (
                                        <tr>
                                            <td colSpan={canEdit ? 8 : 7} className="py-5 text-center">
                                                <div className="pcm-state border-0 bg-transparent py-4">
                                                    <span className="pcm-state__icon"><IconFile size="lg" /></span>
                                                    <p className="pcm-state__title">No drawings in this project folder yet</p>
                                                    <p className="pcm-state__text">
                                                        Use the button above to add the first isometric drawing to this folder.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        activeFolderDrawings.map((d, idx) => {
                                            let specs = [];
                                            if (Array.isArray(d.fitup_specs)) specs = d.fitup_specs;
                                            else if (typeof d.fitup_specs === 'string') {
                                                try { specs = JSON.parse(d.fitup_specs); } catch (e) { specs = []; }
                                            }
                                            const specCount = specs.length;

                                            return (
                                                <tr
                                                    key={d.id || idx}
                                                    onClick={() => setSelectedDrawing(d)}
                                                    style={{ cursor: 'pointer' }}
                                                    title="Click row to view full specifications"
                                                >
                                                    <td className="text-center">
                                                        <span className="pcm-chip pcm-chip--primary pcm-code">REV-{d.rev || 0}</span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="d-block pcm-cell-id">{d.drawing_no}</span>
                                                        <span className="d-block pcm-cell-sub">{d.sheet || 'Sheet 1 of 1'}</span>
                                                        {d.title && (
                                                            <span className="d-block pcm-cell-sub pcm-cell-clip mx-auto">{d.title}</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="d-block pcm-code pcm-cell-strong">{d.line_no || '-'}</span>
                                                        {d.line_service && (
                                                            <span className="d-block pcm-cell-sub">{d.line_service}</span>
                                                        )}
                                                        <span className="d-block pcm-cell-sub">{d.area || 'MPP Area'}</span>
                                                    </td>
                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${specCount > 0 ? 'btn-primary' : 'btn-outline-primary'} fw-bold px-2.5 py-1`}
                                                            style={{
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: specCount > 0 ? '#1e40af' : 'transparent',
                                                                borderColor: '#1e40af',
                                                                color: specCount > 0 ? '#ffffff' : '#1e40af'
                                                            }}
                                                            onClick={() => handleOpenFitupModal(d)}
                                                            title="Kelola Fit-Up Specifications untuk drawing ini"
                                                        >
                                                            {specCount > 0 ? `Fit-Up Specs (${specCount})` : '+ Input Fit-Up'}
                                                        </button>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="d-block pcm-code pcm-cell-strong">
                                                            {d.total_dia_inch ? `${parseFloat(d.total_dia_inch).toFixed(2)} DI` : '-'}
                                                        </span>
                                                        <span className="d-block pcm-cell-sub pcm-code">
                                                            {d.total_joints ? `${d.total_joints} JTS` : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        {d.scan_path ? (
                                                            <a
                                                                href={d.scan_path}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-outline-primary btn-sm px-2 py-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <IconFile size="sm" />
                                                                <span>CAD/PDF</span>
                                                            </a>
                                                        ) : (
                                                            <span className="pcm-cell-sub">No file</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`pcm-chip ${d.status === 'active' ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                            {d.status || 'active'}
                                                        </span>
                                                    </td>
                                                    {canEdit && (
                                                        <td className="text-center text-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <div className="d-inline-flex align-items-center justify-content-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm px-3 py-1.5 fw-bold"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenEditDrawing(d);
                                                                    }}
                                                                    title="Edit Drawing"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm px-3 py-1.5 fw-bold"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDrawing(d.id);
                                                                    }}
                                                                    title="Delete Drawing"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
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
                </>
            )}

            {/* ============================================================
                MODUL 2: Line Service (ENG-001 / ENG-008)
                ============================================================ */}
            {activeEngTab === 'line_service' && (
                <LineServiceSection user={user} projects={projects} activeProject={activeProject} activeProjectId={selectedProjectId} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 3: Welding Map (ENG-002 / ENG-009)
                ============================================================ */}
            {activeEngTab === 'welding_map' && (
                <WeldingMapSection user={user} projects={projects} drawings={drawings} activeProject={activeProject} activeProjectId={selectedProjectId} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 4: Bill of Quantity / BOQ (ENG-003 / ENG-010)
                ============================================================ */}
            {activeEngTab === 'boq' && (
                <BoqSection user={user} projects={projects} drawings={drawings} activeProject={activeProject} activeProjectId={selectedProjectId} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 5: Bill of Material / BOM / MTO (ENG-004 / ENG-011)
                ============================================================ */}
            {activeEngTab === 'bom' && (
                <BomSection user={user} projects={projects} drawings={drawings} activeProject={activeProject} activeProjectId={selectedProjectId} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 6: Material Standart (ENG-005 / ENG-012)
                ============================================================ */}
            {activeEngTab === 'material_standard' && (
                <MaterialStandardSection user={user} onToast={onReload} />
            )}

            {/* ============================================================
                MODUL 7: Document Control (ENG-006 / ENG-013)
                ============================================================ */}
            {activeEngTab === 'document_control' && (
                <DocumentControlSection user={user} projects={projects} drawings={drawings} activeProject={activeProject} activeProjectId={selectedProjectId} onToast={onReload} />
            )}

            {/* ============================================================
                MODAL 2: input / edit drawing isometrik
                ============================================================ */}
            {showDrawingModal && (
                <div
                    className="modal show d-block pcm-modal"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pcm-drawing-modal-title"
                    onMouseDown={closeOnBackdrop(setShowDrawingModal)}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <form className="modal-content border-0" onSubmit={handleSaveDrawing}>
                            <div className="modal-header">
                                    <div>
                                        <h2 className="modal-title" id="pcm-drawing-modal-title">
                                            {editingDrawing ? 'Edit Isometrik Drawing Pipa' : 'Input Isometrik Drawing Pipa'}
                                        </h2>
                                        <span className="pcm-modal__sub">
                                            {editingDrawing ? 'Perbarui data spesifikasi atau berkas drawing CAD/PDF' : 'Spesifikasi drawing dan berkas CAD/PDF'}
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

                                    <div className="pcm-form-section mb-3">
                                        <label className="form-label pcm-form-label" htmlFor="pcm-dwg-project">
                                            Folder Proyek Client <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            id="pcm-dwg-project"
                                            className="form-select form-select-sm"
                                            required
                                            value={targetProjectId}
                                            onChange={(e) => setTargetProjectId(e.target.value)}
                                        >
                                            <option value="">-- Pilih Folder Proyek --</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.client ? `[${p.client}] ` : ''}{p.job_no ? `(JOB: ${p.job_no}) ` : ''}{p.name}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="pcm-hint">
                                            Drawing akan dikaitkan ke folder proyek client yang dipilih.
                                        </span>
                                    </div>

                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">1. Data Pokok Drawing</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-service">
                                                    Line Service (Master Data)
                                                </label>
                                                <select
                                                    id="pcm-dwg-service"
                                                    className="form-select form-select-sm"
                                                    value={drawingForm.line_service_id || ''}
                                                    onChange={(e) => {
                                                        const sId = e.target.value;
                                                        const chosen = lineServices.find((s) => String(s.id) === String(sId));
                                                        setDrawingForm({
                                                            ...drawingForm,
                                                            line_service_id: sId,
                                                            line_service: chosen ? chosen.service_name : drawingForm.line_service,
                                                            line_no: chosen ? chosen.line_no : drawingForm.line_no
                                                        });
                                                    }}
                                                >
                                                    <option value="">-- Pilih Line Service --</option>
                                                    {lineServices
                                                        .filter((s) => !targetProjectId || String(s.project_id) === String(targetProjectId))
                                                        .map((s) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.line_no} — {s.service_name} {s.fluid_code ? `(${s.fluid_code})` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                                <span className="pcm-hint">Pilih dari katalog line service untuk otomatis mengisi Line No.</span>
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
                                                    placeholder="Contoh: 15-MPP-AB"
                                                    value={drawingForm.line_no}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, line_no: e.target.value })}
                                                />
                                            </div>

                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-no">
                                                    Isometric Drawing No <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-no"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm pcm-code"
                                                    placeholder="Contoh: 2428-M-15-MPP-AB-SHT1"
                                                    value={drawingForm.drawing_no}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, drawing_no: e.target.value })}
                                                />
                                            </div>

                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label">
                                                    Sheet of Berapa <span className="text-danger">*</span>
                                                </label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="form-control form-control-sm text-center"
                                                        style={{ width: '85px' }}
                                                        value={drawingForm.sheet_num || 1}
                                                        onChange={(e) => {
                                                            const n = parseInt(e.target.value, 10) || 1;
                                                            setDrawingForm({
                                                                ...drawingForm,
                                                                sheet_num: n,
                                                                sheet: `Sheet ${n} of ${drawingForm.sheet_total || 1}`
                                                            });
                                                        }}
                                                    />
                                                    <span className="pcm-cell-sub fw-bold">of</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="form-control form-control-sm text-center"
                                                        style={{ width: '85px' }}
                                                        value={drawingForm.sheet_total || 1}
                                                        onChange={(e) => {
                                                            const tot = parseInt(e.target.value, 10) || 1;
                                                            setDrawingForm({
                                                                ...drawingForm,
                                                                sheet_total: tot,
                                                                sheet: `Sheet ${drawingForm.sheet_num || 1} of ${tot}`
                                                            });
                                                        }}
                                                    />
                                                    <span className="pcm-cell-sub pcm-code ms-1 font-monospace">{drawingForm.sheet}</span>
                                                </div>
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
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-area">
                                                    Area <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="pcm-dwg-area"
                                                    type="text"
                                                    required
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: MPP Area"
                                                    value={drawingForm.area}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, area: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Estimasi Volume & Sambungan */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">2. Estimasi Sambungan &amp; Total Volume DI</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-sm-6">
                                                <label className="form-label pcm-form-label" htmlFor="pcm-dwg-joints">
                                                    Estimasi Total Joint (Titik Las)
                                                </label>
                                                <input
                                                    id="pcm-dwg-joints"
                                                    type="number"
                                                    min="0"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: 18"
                                                    value={drawingForm.total_joints}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, total_joints: e.target.value })}
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
                                                    min="0"
                                                    className="form-control form-control-sm pcm-code"
                                                    placeholder="Contoh: 72.00"
                                                    value={drawingForm.total_dia_inch}
                                                    onChange={(e) => setDrawingForm({ ...drawingForm, total_dia_inch: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Berkas Software Engineer */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">3. Berkas Software Engineer</span>
                                        <label className="form-label pcm-form-label" htmlFor="pcm-dwg-file">
                                            File Drawing (CAD / PDF / Image) <span className="pcm-cell-sub fw-normal">(Opsional)</span>
                                        </label>
                                        <input
                                            id="pcm-dwg-file"
                                            type="file"
                                            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.zip"
                                            className="form-control form-control-sm"
                                            onChange={(e) => setDrawingFile(e.target.files[0])}
                                        />
                                        <span className="pcm-hint">
                                            {editingDrawing && editingDrawing.scan_path ? (
                                                <span>
                                                    Berkas aktif saat ini: <strong>{editingDrawing.scan_path.split('/').pop()}</strong>. Unggah file baru bila ingin mengganti.
                                                </span>
                                            ) : (
                                                'Format didukung: PDF, AutoCAD (DWG/DXF), ZIP, PNG, JPG (opsional).'
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDrawingModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={drawingLoading}>
                                        {drawingLoading ? 'Menyimpan...' : (editingDrawing ? 'Perbarui Drawing' : 'Simpan Drawing')}
                                    </button>
                                </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================
                MODAL 2B: Kelola Fit-Up Specifications (Terpisah & Spesifik)
                ============================================================ */}
            {fitupModalDrawing && (
                <div
                    className="modal show d-block pcm-modal"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === event.currentTarget) setFitupModalDrawing(null);
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style={{ maxWidth: '820px' }}>
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <div>
                                    <h4 className="modal-title fw-bold text-dark mb-0">
                                        Kelola Fit-Up Specs — <span className="pcm-code" style={{ color: '#1e40af' }}>{fitupModalDrawing.drawing_no}</span>
                                    </h4>
                                    <span className="pcm-modal__sub">
                                        Line No: <strong>{fitupModalDrawing.line_no || '-'}</strong> • Sheet: <strong>{fitupModalDrawing.sheet || 'Sheet 1 of 1'}</strong>
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"
                                    onClick={() => setFitupModalDrawing(null)}
                                />
                            </div>

                            <div className="modal-body">
                                {fitupError && (
                                    <div className="alert alert-danger py-2 small mb-3">{fitupError}</div>
                                )}

                                {/* Daftar Fit-Up Terdaftar */}
                                <div className="mb-4">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="fw-bold small text-uppercase" style={{ color: '#0f172a' }}>
                                            Daftar Spesifikasi Pipa Terdaftar ({fitupList.length})
                                        </span>
                                    </div>

                                    {fitupList.length === 0 ? (
                                        <div className="p-4 text-center border rounded bg-light">
                                            <p className="pcm-cell-sub mb-0">
                                                Belum ada fit-up spec untuk drawing ini. Silakan input spesifikasi material pipa di formulir bawah ini.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive border rounded">
                                            <table className="table table-sm align-middle pcm-table mb-0">
                                                <thead>
                                                    <tr>
                                                        <th className="text-center" style={{ width: '50px' }}>No</th>
                                                        <th>Spec Material Pipa</th>
                                                        <th className="text-center" style={{ width: '130px' }}>Size (NPS)</th>
                                                        <th className="text-center" style={{ width: '150px' }}>Schedule / Rating</th>
                                                        <th className="text-center" style={{ width: '80px' }}>Hapus</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fitupList.map((sp, idx) => (
                                                        <tr key={idx}>
                                                            <td className="text-center pcm-cell-sub">{idx + 1}</td>
                                                            <td className="pcm-cell-strong">{sp.material_spec || '-'}</td>
                                                            <td className="text-center pcm-code fw-bold" style={{ color: '#1e40af' }}>{sp.size}</td>
                                                            <td className="text-center pcm-code">{sp.schedule}</td>
                                                            <td className="text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger btn-sm p-1"
                                                                    onClick={() => handleRemoveFitupRow(idx)}
                                                                    title="Hapus baris spesifikasi ini"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Form Input Tambah Fit-Up Spec Baru */}
                                <div className="p-3 border rounded bg-light">
                                    <h6 className="fw-bold small text-uppercase mb-2" style={{ color: '#0f172a' }}>
                                        + Tambah Spesifikasi Pipa Baru
                                    </h6>
                                    <form onSubmit={handleAddFitupRow}>
                                        <div className="row g-2 align-items-end">
                                            <div className="col-12 col-md-5">
                                                <label className="form-label small fw-bold">Material Specification *</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: ASTM A106 Gr. B"
                                                    value={fitupForm.material_spec}
                                                    onChange={(e) => setFitupForm({ ...fitupForm, material_spec: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label className="form-label small fw-bold">Size (NPS) *</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm pcm-code"
                                                    placeholder='Contoh: 4", 2"'
                                                    value={fitupForm.size}
                                                    onChange={(e) => setFitupForm({ ...fitupForm, size: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Schedule *</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: Sch 40"
                                                    value={fitupForm.schedule}
                                                    onChange={(e) => setFitupForm({ ...fitupForm, schedule: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-2">
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary btn-sm fw-bold w-100"
                                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                >
                                                    + Tambah
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div className="modal-footer d-flex justify-content-between">
                                <span className="pcm-cell-sub">
                                    Spesifikasi yang disimpan akan otomatis menjadi pilihan komponen Material A &amp; B pada Welding Map.
                                </span>
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFitupModalDrawing(null)}>
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm fw-bold px-3"
                                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                        onClick={handleSaveFitupModal}
                                        disabled={fitupSaving}
                                    >
                                        {fitupSaving ? 'Menyimpan...' : 'Simpan Fit-Up Specs'}
                                    </button>
                                </div>
                            </div>
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
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style={{ maxWidth: '840px' }}>
                        <div className="modal-content border-0">
                            <div className="modal-header">
                                <h2 className="modal-title" id="pcm-spec-modal-title">
                                    Drawing Specifications: <span className="pcm-code">{selectedDrawing.drawing_no}</span>
                                </h2>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={() => setSelectedDrawing(null)}
                                />
                            </div>

                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Project / Client</span>
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
                                            <span className="pcm-spec__label">Line Number</span>
                                            <span className="pcm-spec__value pcm-code">{selectedDrawing.line_no || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Plant Area</span>
                                            <span className="pcm-spec__value">{selectedDrawing.area || 'MPP Area'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Material Specification</span>
                                            <span className="pcm-spec__value">{selectedDrawing.material_spec || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Size Range &amp; Schedule</span>
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
                                            <span className="pcm-spec__label">Total Joint Count</span>
                                            <span className="pcm-spec__value">{selectedDrawing.total_joints || 0} joints</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Distribution Target</span>
                                            <span className="pcm-spec__value">{selectedDrawing.distributed_to || 'Workshop Spool Fabrication'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Fit-Up Specifications Table */}
                                {(() => {
                                    let vSpecs = [];
                                    if (Array.isArray(selectedDrawing.fitup_specs)) {
                                        vSpecs = selectedDrawing.fitup_specs;
                                    } else if (typeof selectedDrawing.fitup_specs === 'string') {
                                        try { vSpecs = JSON.parse(selectedDrawing.fitup_specs); } catch (e) { vSpecs = []; }
                                    }
                                    if (vSpecs.length === 0 && (selectedDrawing.material_spec || selectedDrawing.size_range)) {
                                        vSpecs = [{ size: selectedDrawing.size_range || '-', schedule: '-', material_spec: selectedDrawing.material_spec || '-' }];
                                    }
                                    if (vSpecs.length === 0) return null;
                                    return (
                                        <div className="mt-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="pcm-form-section__title mb-0">Fit-Up Specifications</span>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                                        onClick={() => {
                                                            const d = selectedDrawing;
                                                            setSelectedDrawing(null);
                                                            handleOpenFitupModal(d);
                                                        }}
                                                    >
                                                        + Kelola Fit-Up Specs
                                                    </button>
                                                )}
                                            </div>
                                            <div className="table-responsive border rounded">
                                                <table className="table table-sm align-middle pcm-table mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '45px' }} className="text-center">No</th>
                                                            <th>Material Specification</th>
                                                            <th className="text-center" style={{ width: '120px' }}>Size (NPS)</th>
                                                            <th className="text-center" style={{ width: '140px' }}>Schedule</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {vSpecs.map((sp, idx) => (
                                                            <tr key={idx}>
                                                                <td className="text-center pcm-cell-sub">{idx + 1}</td>
                                                                <td className="pcm-cell-strong">{sp.material_spec || '-'}</td>
                                                                <td className="text-center pcm-code fw-bold" style={{ color: '#1e40af' }}>{sp.size || '-'}</td>
                                                                <td className="text-center pcm-code">{sp.schedule || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="pcm-file-box mt-3">
                                    <div>
                                        <span className="pcm-form-label d-block">Drawing Software File</span>
                                        <small className="pcm-cell-sub">
                                            {selectedDrawing.scan_path
                                                ? selectedDrawing.scan_path.split('/').pop()
                                                : 'No CAD/PDF file uploaded'}
                                        </small>
                                    </div>
                                    {selectedDrawing.scan_path && (
                                        <a
                                            href={selectedDrawing.scan_path}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                                            style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                        >
                                            Open CAD/PDF File
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer d-flex justify-content-between">
                                <div>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm px-3 py-1.5 fw-bold"
                                            onClick={() => handleDeleteDrawing(selectedDrawing.id)}
                                        >
                                            Delete Drawing
                                        </button>
                                    )}
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-secondary btn-sm px-3 py-1.5" onClick={() => setSelectedDrawing(null)}>
                                        Close
                                    </button>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                                            style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                            onClick={() => {
                                                const dwg = selectedDrawing;
                                                setSelectedDrawing(null);
                                                handleOpenEditDrawing(dwg);
                                            }}
                                        >
                                            Edit Drawing
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
