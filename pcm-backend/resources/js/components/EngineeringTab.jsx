/* Hallmark · macrostructure: Workbench · theme: Acorn-Blue · tone: utilitarian
 * module: Engineering · tokens: public/css/main.css (--pcm-*)
 * direction: DESIGN.md · dials: ENERGY 1 · RHYTHM 1 · MOTION 1
 * disciplines: honest-copy · locked-tokens · mobile-responsive · keyboard-a11y
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { confirmDelete } from '../confirm';
import { LineServiceSection } from './engineering/LineServiceSection';
import { WeldingMapSection } from './engineering/WeldingMapSection';
import { BoqSection } from './engineering/BoqSection';
import { BomSection } from './engineering/BomSection';
import { MaterialStandardSection } from './engineering/MaterialStandardSection';
import { PipeScheduleSection } from './engineering/PipeScheduleSection';
import { DocumentControlSection } from './engineering/DocumentControlSection';
import {
    buildAttributeLabels,
    buildMaterialIndex,
    naturalCompare,
    parseInch,
    resolveAttributeLabel,
    sizeWithinRange
} from './engineering/materialCascade';
import { getComponentBadgeStyle } from './engineering/BomSection';
import { SearchSelect, PcmSelect } from './SearchSelect';

const strcasecmp_clean = (str) => String(str || '').trim().toLowerCase();

export const ENG_SUB_TABS = [
    { id: 'project_list', label: 'List Project' },
    { id: 'isometric', label: 'Isometric Drawing' },
    { id: 'welding_map', label: 'Welding Map' },
    { id: 'line_service', label: 'Line Service' },
    { id: 'boq', label: 'Bill of Quantity' },
    { id: 'bom', label: 'Bill of Material' },
    { id: 'material_standard', label: 'Material Standart' },
    { id: 'pipe_schedule', label: 'Master Diameter & Ketebalan' },
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
const defaultSpoolRow = (index = 1) => ({
    spool_no: `SP-${String(index).padStart(2, '0')}`,
    joints_count: 1
});

const emptyDrawingForm = () => ({
    drawing_no: '',
    title: '',
    line_no: '',
    line_service: '',
    line_service_id: '',
    area: '',
    sheet_num: 1,
    sheet_total: 1,
    sheet: 'Sheet 1 of 1',
    rev: '',
    total_dia_inch: '',
    total_joints: 1,
    total_spools: 1,
    spool_data: [defaultSpoolRow(1)],
    fitup_specs: [],
    distributed_to: '',
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
    onSelectTab,
    user,
    onReload,
    loading = false,
    error = ''
}) {
    // Navigasi: persistensi folder aktif ke localStorage agar tahan hard reload
    const [selectedProjectId, setSelectedProjectIdState] = useState(() => {
        return activeProjectId || localStorage.getItem('pcm_active_project_id') || localStorage.getItem('pcm_selected_folder_id') || null;
    });
    const activeEngTab = currentSection === 'engineering' ? 'isometric' : currentSection;

    const setSelectedProjectId = (id) => {
        const val = id && id !== 'unassigned' ? String(id) : (id === 'unassigned' ? 'unassigned' : null);
        setSelectedProjectIdState(val);
        if (val) {
            localStorage.setItem('pcm_selected_folder_id', val);
        } else {
            localStorage.removeItem('pcm_selected_folder_id');
        }
        if (onSetActiveProject) {
            onSetActiveProject(val && val !== 'unassigned' ? val : '');
        }
    };

    useEffect(() => {
        if (activeProjectId && activeProjectId !== selectedProjectId) {
            setSelectedProjectIdState(activeProjectId);
            localStorage.setItem('pcm_selected_folder_id', activeProjectId);
        }
    }, [activeProjectId]);

    const [lineServices, setLineServices] = useState([]);
    const [materialStandards, setMaterialStandards] = useState([]);
    const [pipeStandards, setPipeStandards] = useState([]);
    const [systemParameters, setSystemParameters] = useState([]);

    const lineServiceOptions = useMemo(() => {
        return (lineServices || []).map((s) => ({
            value: String(s.id),
            label: `${s.line_no} — ${s.service_name}${s.fluid_code ? ` (${s.fluid_code})` : ''}${s.piping_class ? ` · Class: ${s.piping_class}` : ''}`,
            line_no: s.line_no,
            service_name: s.service_name
        }));
    }, [lineServices]);

    const plantAreaOptions = useMemo(() => {
        const active = (systemParameters || []).filter(
            (p) => p.category === 'plant_area' && p.is_active !== false
        );
        return active
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((p) => ({ value: p.name, label: p.description ? `${p.name} — ${p.description}` : p.name }));
    }, [systemParameters]);

    const distributionTargetOptions = useMemo(() => {
        const active = (systemParameters || []).filter(
            (p) => p.category === 'distribution_target' && p.is_active !== false
        );
        return active
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((p) => ({ value: p.name, label: p.description ? `${p.name} — ${p.description}` : p.name }));
    }, [systemParameters]);

    useEffect(() => {
        api.get('/line-services').then(res => {
            setLineServices(Array.isArray(res) ? res : []);
        }).catch(() => {});

        api.get('/system-parameters').then(res => {
            setSystemParameters(Array.isArray(res) ? res : []);
        }).catch(() => {});

        Promise.all([
            api.get('/material-standards').catch(() => []),
            api.get('/pipe-standards').catch(() => [])
        ]).then(([matRes, pipeRes]) => {
            setMaterialStandards(Array.isArray(matRes) ? matRes : []);
            setPipeStandards(Array.isArray(pipeRes) ? pipeRes : []);
        });
    }, []);

    // Quick fit-up spec states for adding/editing drawing
    const [quickCompType, setQuickCompType] = useState('Pipe');
    const [quickMatSpec, setQuickMatSpec] = useState('');
    const [quickNps, setQuickNps] = useState('');
    const [quickSchedule, setQuickSchedule] = useState('');

    const materialIndex = useMemo(() => buildMaterialIndex(materialStandards), [materialStandards]);

    const attributeLabels = useMemo(() => buildAttributeLabels(systemParameters), [systemParameters]);

    // Opsi Jenis Komponen murni dari Master Material
    const componentTypeOptions = useMemo(() => {
        const types = Array.from(new Set(materialStandards.map((std) => std.category).filter(Boolean)));
        return types.sort(naturalCompare).map((cat) => ({ value: cat, label: cat }));
    }, [materialStandards]);

    // Opsi Spesifikasi Material difilter berdasarkan Jenis Komponen yang dipilih
    const materialSpecOptions = useMemo(() => {
        const filtered = materialStandards.filter((std) =>
            !quickCompType || strcasecmp_clean(std.category) === strcasecmp_clean(quickCompType)
        );
        const seen = new Map();
        filtered.forEach((std) => {
            const spec = std.specification || std.code || '';
            if (!spec || seen.has(spec)) return;
            const hint = [std.material_group, std.size_range ? `Size ${std.size_range}` : '']
                .filter(Boolean)
                .join(' · ');
            seen.set(spec, { value: spec, label: spec, hint });
        });
        return Array.from(seen.values()).sort((a, b) => naturalCompare(a.label, b.label));
    }, [materialStandards, quickCompType]);

    // Opsi Size NPS difilter berdasarkan Jenis Komponen & Spec yang dipilih
    const npsSelectOptions = useMemo(() => {
        const matchingStandards = materialStandards.filter((std) => {
            const matchCat = !quickCompType || strcasecmp_clean(std.category) === strcasecmp_clean(quickCompType);
            const matchSpec = !quickMatSpec || std.specification === quickMatSpec || std.code === quickMatSpec;
            return matchCat && matchSpec;
        });

        const indexPool = buildMaterialIndex(matchingStandards.length ? matchingStandards : materialStandards);

        const seenNps = new Map();
        (pipeStandards || []).forEach((row) => {
            if (!row.nps || seenNps.has(row.nps)) return;
            const inch = parseInch(row.nps);
            if (!indexPool.some((r) => sizeWithinRange(inch, r))) return;
            const hint = [row.dn, row.outer_diameter_mm ? `OD ${row.outer_diameter_mm}mm` : '']
                .filter(Boolean)
                .join(' · ');
            seenNps.set(row.nps, { value: row.nps, label: row.nps, hint });
        });

        return Array.from(seenNps.values()).sort((a, b) => (
            (parseInch(a.value) - parseInch(b.value)) || naturalCompare(a.value, b.value)
        ));
    }, [materialStandards, pipeStandards, quickCompType, quickMatSpec]);

    // Opsi Schedule difilter berdasarkan Size & Spec yang dipilih
    const availableSchedulesFor = useCallback((npsVal, compType, specVal) => {
        if (!npsVal && !compType && !specVal) {
            const set = new Set();
            pipeStandards.forEach((p) => { if (p.schedule) set.add(p.schedule.trim()); });
            return Array.from(set).map((v) => ({ value: v, label: v }));
        }

        const matchingStandards = materialStandards.filter((std) => {
            const matchCat = !compType || strcasecmp_clean(std.category) === strcasecmp_clean(compType);
            const matchSpec = !specVal || std.specification === specVal || std.code === specVal;
            return matchCat && matchSpec;
        });

        const schedulesFromStd = new Set();
        matchingStandards.forEach((std) => {
            if (std.schedule) {
                std.schedule.split('/').forEach((s) => {
                    const clean = s.trim();
                    if (clean && clean !== 'N/A') schedulesFromStd.add(clean);
                });
            }
        });

        const filteredPipes = pipeStandards.filter((p) => (p.nps || '').trim() === (npsVal || '').trim());
        const schedulesFromPipe = new Set();
        filteredPipes.forEach((p) => { if (p.schedule) schedulesFromPipe.add(p.schedule.trim()); });

        const combined = Array.from(new Set([...schedulesFromStd, ...schedulesFromPipe])).filter(Boolean);
        return combined.sort(naturalCompare).map((s) => ({ value: s, label: s }));
    }, [materialStandards, pipeStandards]);

    const handleAddQuickSpec = () => {
        if (!quickNps && !quickMatSpec) return;
        const currentSpecs = Array.isArray(drawingForm.fitup_specs) ? [...drawingForm.fitup_specs] : [];
        currentSpecs.push({
            component_type: quickCompType || 'Pipe',
            size: quickNps || '',
            schedule: quickSchedule || '',
            material_spec: quickMatSpec || ''
        });
        setDrawingForm({ ...drawingForm, fitup_specs: currentSpecs });
        setQuickMatSpec('');
        setQuickNps('');
        setQuickSchedule('');
        setQuickCompType('Pipe');
    };

    const handleRemoveQuickSpec = (index) => {
        const currentSpecs = Array.isArray(drawingForm.fitup_specs) ? [...drawingForm.fitup_specs] : [];
        currentSpecs.splice(index, 1);
        setDrawingForm({ ...drawingForm, fitup_specs: currentSpecs });
    };

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
    const [fitupForm, setFitupForm] = useState({ component_type: 'Pipe', size: '', schedule: '', material_spec: '' });
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
        setFitupForm({ component_type: 'Pipe', size: '', schedule: '', material_spec: '' });
        setFitupError('');
    };

    const handleAddFitupRow = (e) => {
        e.preventDefault();
        if (!fitupForm.size.trim() || !fitupForm.schedule.trim()) {
            setFitupError('Ukuran Size (NPS) dan Schedule / Rating wajib diisi.');
            return;
        }
        setFitupError('');
        setFitupList([...fitupList, { ...fitupForm, component_type: fitupForm.component_type || 'Pipe' }]);
        setFitupForm({ component_type: 'Pipe', size: '', schedule: '', material_spec: '' });
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
    const { folderList, unassignedDrawings, clientOptions, projectMap } = useMemo(() => {
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

        const pMap = {};
        pList.forEach(p => { pMap[p.id] = p; });

        return { folderList: enrichedProjects, unassignedDrawings: unassigned, clientOptions: clients, projectMap: pMap };
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
        const list = !selectedProjectId
            ? (drawings || [])
            : (selectedProjectId === 'unassigned'
                ? unassignedDrawings
                : (drawings || []).filter((d) => Number(d.project_id) === Number(selectedProjectId)));

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

    const [autoGenerateRemainingSheets, setAutoGenerateRemainingSheets] = useState(true);

    // Buka modal untuk input drawing baru
    const handleOpenCreateDrawing = (projectId = null) => {
        setEditingDrawing(null);
        setDrawingForm(emptyDrawingForm());
        setDrawingFile(null);
        setDrawingError('');
        setAutoGenerateRemainingSheets(true);
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

        let rawSpoolData = drawing.spool_data;
        if (typeof rawSpoolData === 'string') {
            try { rawSpoolData = JSON.parse(rawSpoolData); } catch (e) { rawSpoolData = []; }
        }
        if (!Array.isArray(rawSpoolData) || rawSpoolData.length === 0) {
            rawSpoolData = [
                {
                    spool_no: 'SP-01',
                    joints_count: Math.max(parseInt(drawing.total_joints, 10) || 1, 1)
                }
            ];
        }

        const calculatedTotalJoints = rawSpoolData.reduce((acc, sp) => acc + (parseInt(sp.joints_count, 10) || 0), 0);

        setDrawingForm({
            drawing_no: drawing.drawing_no || '',
            title: drawing.title || '',
            line_no: drawing.line_no || '',
            line_service: drawing.line_service || '',
            line_service_id: matchedService ? String(matchedService.id) : '',
            area: drawing.area || '',
            sheet_num: sNum,
            sheet_total: sTot,
            sheet: drawing.sheet || `Sheet ${sNum} of ${sTot}`,
            rev: drawing.rev || '0',
            material_spec: drawing.material_spec || '',
            size_range: drawing.size_range || '',
            total_dia_inch: drawing.total_dia_inch || '',
            total_joints: calculatedTotalJoints || drawing.total_joints || 1,
            total_spools: rawSpoolData.length,
            spool_data: rawSpoolData,
            fitup_specs: specs,
            distributed_to: drawing.distributed_to || '',
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
                } else if (key === 'spool_data') {
                    const spList = Array.isArray(drawingForm.spool_data) && drawingForm.spool_data.length > 0
                        ? drawingForm.spool_data
                        : [defaultSpoolRow(1)];
                    data.append('spool_data', JSON.stringify(spList));
                    data.append('total_spools', String(spList.length));
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

            // Automasi Opsi B: Buat lembar berikutnya (Sheet 2..N) sebagai draft bersih jika checkbox aktif
            if (!editingDrawing && autoGenerateRemainingSheets && Number(drawingForm.sheet_num) === 1 && Number(drawingForm.sheet_total) > 1) {
                const totalSheets = Number(drawingForm.sheet_total);
                const baseDrawingNo = drawingForm.drawing_no.trim();

                const deriveSheetDrawingNo = (base, sheetNum) => {
                    // Jika berakhiran SHT1, SHT-1, SHEET-1, SH1
                    if (/(?:-|_)SHT\s*1$/i.test(base)) {
                        return base.replace(/(?:-|_)SHT\s*1$/i, `-SHT${sheetNum}`);
                    }
                    if (/(?:-|_)SHEET\s*1$/i.test(base)) {
                        return base.replace(/(?:-|_)SHEET\s*1$/i, `-SHEET${sheetNum}`);
                    }
                    if (/(?:-|_)SH\s*1$/i.test(base)) {
                        return base.replace(/(?:-|_)SH\s*1$/i, `-SH${sheetNum}`);
                    }
                    return `${base}-SHT${sheetNum}`;
                };

                for (let s = 2; s <= totalSheets; s++) {
                    const sheetData = new FormData();
                    sheetData.append('project_id', targetProjectId);
                    sheetData.append('drawing_no', deriveSheetDrawingNo(baseDrawingNo, s));
                    sheetData.append('line_no', drawingForm.line_no || '');
                    sheetData.append('line_service', drawingForm.line_service || '');
                    if (drawingForm.line_service_id) {
                        sheetData.append('line_service_id', drawingForm.line_service_id);
                    }
                    sheetData.append('area', drawingForm.area || 'MPP Area');
                    sheetData.append('sheet', `Sheet ${s} of ${totalSheets}`);
                    sheetData.append('rev', drawingForm.rev || '0');
                    sheetData.append('title', `${drawingForm.title || 'Isometric Drawing'} (Sheet ${s})`);
                    sheetData.append('distributed_to', drawingForm.distributed_to || 'Workshop Spool Fabrication');
                    sheetData.append('distribution_date', drawingForm.distribution_date || new Date().toISOString().split('T')[0]);
                    sheetData.append('status', drawingForm.status || 'active');

                    // Sesuai Opsi B: Spesifikasi material, total_joints, total_dia_inch, dan berkas file dikosongkan
                    sheetData.append('fitup_specs', JSON.stringify([]));
                    sheetData.append('material_spec', '');
                    sheetData.append('size_range', '');
                    sheetData.append('total_dia_inch', '0');
                    sheetData.append('total_joints', '1');
                    sheetData.append('total_spools', '1');
                    sheetData.append('spool_data', JSON.stringify([defaultSpoolRow(1)]));

                    await fetch('/api/drawings', {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: sheetData
                    }).catch(err => console.error(`Failed auto-generating sheet ${s}:`, err));
                }
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
                MODUL 0: List Project (Direktori Folder Proyek Persegi 4)
                ============================================================ */}
            {activeEngTab === 'project_list' && (
                <div>
                    <div className="mb-4">
                        <h2 className="h3 fw-bolder text-dark mb-0" style={{ letterSpacing: '-0.02em' }}>
                            Direktori List Project
                        </h2>
                    </div>

                    {/* Empat hitungan dari satu kumpulan data, diperlakukan setara (R-14) */}
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

                    {/* Search Bar Tunggal & Bersih */}
                    <div className="mb-4">
                        <div className="pcm-search w-100" style={{ maxWidth: '100%' }}>
                            <span className="pcm-search__icon"><IconSearch size="sm" /></span>
                            <input
                                type="text"
                                className="form-control form-control-sm pcm-filter-input w-100"
                                placeholder="Cari nama folder proyek, client, job no..."
                                aria-label="Cari folder proyek"
                                value={searchFolder}
                                onChange={(e) => setSearchFolder(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading && folderList.length === 0 && (
                        <div className="pcm-state" role="status" aria-live="polite">
                            <span className="spinner-border spinner-border-sm text-primary mb-2" aria-hidden="true" />
                            <p className="pcm-state__title">Memuat data folder proyek</p>
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
                                <div className="col-12 col-sm-6 col-lg-4 col-xl-3 d-flex" key={folder.id}>
                                    <button
                                        type="button"
                                        className="pcm-folder-square-card h-100 w-100"
                                        onClick={() => {
                                            setSelectedProjectId(folder.id);
                                            if (onSelectTab) onSelectTab('engineering');
                                        }}
                                    >
                                        <div className="d-flex align-items-center justify-content-between mb-3 w-100">
                                            <span className="pcm-folder-square-card__icon">
                                                <IconFolder size="sm" />
                                            </span>
                                            <span className="pcm-folder-square-card__arrow text-muted">
                                                <IconChevronRight size="sm" />
                                            </span>
                                        </div>

                                        <div className="flex-grow-1 d-flex flex-column justify-content-center min-w-0 w-100 my-1">
                                            <h3 className="pcm-folder-square-card__name text-truncate mb-2" title={folder.name}>
                                                {folder.name}
                                            </h3>
                                            <div className="d-flex align-items-center gap-1.5 text-truncate">
                                                <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>
                                                    {folder.job_no || 'NO JOB'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pcm-folder-square-card__footer mt-3 pt-2 w-100 border-top">
                                            <span className="fw-bold small text-truncate d-block" style={{ color: '#0f172a' }} title={folder.client || 'General Client'}>
                                                {folder.client || 'General Client'}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            ))}

                            {unassignedDrawings.length > 0 && (
                                <div className="col-12 col-sm-6 col-lg-4 col-xl-3 d-flex">
                                    <button
                                        type="button"
                                        className="pcm-folder-square-card pcm-folder-square-card--warning h-100 w-100"
                                        onClick={() => {
                                            setSelectedProjectId('unassigned');
                                            if (onSelectTab) onSelectTab('engineering');
                                        }}
                                    >
                                        <div className="d-flex align-items-center justify-content-between mb-3 w-100">
                                            <span className="pcm-folder-square-card__icon">
                                                <IconFolder size="sm" />
                                            </span>
                                            <span className="pcm-folder-square-card__arrow text-muted">
                                                <IconChevronRight size="sm" />
                                            </span>
                                        </div>

                                        <div className="flex-grow-1 d-flex flex-column justify-content-center min-w-0 w-100 my-1">
                                            <h3 className="pcm-folder-square-card__name text-truncate mb-2">
                                                Drawing Tanpa Folder
                                            </h3>
                                            <div>
                                                <span className="pcm-chip pcm-chip--warning" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>
                                                    BELUM DIPLOT
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pcm-folder-square-card__footer mt-3 pt-2 w-100 border-top">
                                            <span className="text-muted small">
                                                {unassignedDrawings.length} berkas drawing
                                            </span>
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
                MODUL 1: Isometric Drawing Register (Table View)
                ============================================================ */}
            {activeEngTab === 'isometric' && (
                <div>
                    {/* Header Banner: Tergantung apakah Project Terkunci (Strict) atau Mode Global */}
                    {selectedProjectId && activeProject ? (
                        <div className="bg-white border rounded p-4 mb-4 shadow-sm">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div className="d-flex align-items-center gap-3 min-w-0">
                                    <button
                                        type="button"
                                        className="pcm-page-nav-btn d-inline-flex align-items-center justify-content-center flex-shrink-0"
                                        onClick={() => {
                                            setSelectedProjectId(null);
                                            if (onSelectTab) onSelectTab('project_list');
                                        }}
                                        title="Kembali ke Direktori List Project"
                                        aria-label="Kembali ke Direktori List Project"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            width="22"
                                            height="22"
                                            fill="none"
                                            stroke="#000000"
                                            strokeWidth="2.4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                    </button>
                                    <div className="min-w-0">
                                        <h1 className="h3 fw-bolder text-dark mb-1 text-truncate" style={{ letterSpacing: '-0.02em' }}>
                                            {activeProject.name}
                                        </h1>
                                        <div className="d-flex flex-wrap align-items-center gap-2 small">
                                            <span className="fw-bold text-dark pcm-code bg-light px-2 py-0.5 rounded border">
                                                JOB NO: {activeProject.job_no || '-'}
                                            </span>
                                            <span className="text-muted">&bull;</span>
                                            <span className="fw-bold" style={{ color: '#0f172a' }}>
                                                Client: {activeProject.client || 'General Client'}
                                            </span>
                                            <span className="badge bg-primary text-white ms-1" style={{ fontSize: '0.6875rem' }}>
                                                STRICT PROJECT
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2 Box Metrik Kompak & Simetris */}
                                <div className="d-flex align-items-center gap-2">
                                    <div className="px-3 py-2 bg-light rounded border text-center" style={{ minWidth: '95px' }}>
                                        <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '0.6875rem' }}>Drawing</span>
                                        <strong className="h5 fw-bolder text-dark mb-0">{activeProject.drawings_count || 0}</strong>
                                    </div>
                                    <div className="px-3 py-2 bg-light rounded border text-center" style={{ minWidth: '95px' }}>
                                        <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '0.6875rem' }}>Joints</span>
                                        <strong className="h5 fw-bolder text-dark mb-0">{activeProject.total_joints || 0}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border rounded p-4 mb-4 shadow-sm">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="h3 fw-bolder text-dark mb-1 text-truncate" style={{ letterSpacing: '-0.02em' }}>
                                        Isometric Drawing Register
                                    </h1>
                                    <p className="text-muted small mb-0">
                                        Menampilkan seluruh gambar isometrik. Pilih proyek di menu <strong>List Project</strong> atau dropdown untuk mengunci ke mode kerja ketat (*strict mode*).
                                    </p>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm fw-bold px-3 py-2"
                                        style={{ borderRadius: '6px' }}
                                        onClick={() => { if (onSelectTab) onSelectTab('project_list'); }}
                                    >
                                        Buka List Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toolbar: Search, Kunci Proyek (jika belum strict), dan Tambah Drawing */}
                    <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
                        <div className="flex-grow-1 min-w-0" style={{ minWidth: '220px' }}>
                            <div className="pcm-search w-100" style={{ maxWidth: '100%' }}>
                                <span className="pcm-search__icon"><IconSearch size="sm" /></span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm pcm-filter-input w-100"
                                    placeholder="Cari nomor drawing, line no, area, judul..."
                                    aria-label="Cari drawing"
                                    value={searchDrawing}
                                    onChange={(e) => setSearchDrawing(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Jika belum strict, sediakan dropdown kunci proyek langsung di baris search */}
                        {!selectedProjectId && (
                            <PcmSelect
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setSelectedProjectId(e.target.value);
                                    }
                                }}
                                style={{ width: 'auto', minWidth: '220px' }}
                                aria-label="Kunci Proyek"
                            >
                                <option value="">-- Kunci ke Proyek Tertentu --</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.client ? `[${p.client}] ` : ''}{p.name} ({p.job_no || 'NO JOB'})
                                    </option>
                                ))}
                            </PcmSelect>
                        )}

                        {canEdit && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-2 text-nowrap d-inline-flex align-items-center gap-1.5"
                                style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                                onClick={() => handleOpenCreateDrawing(selectedProjectId)}
                            >
                                <IconPlus size="sm" />
                                <span>+ Tambah Drawing</span>
                            </button>
                        )}
                    </div>

                    <div className="pcm-card">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle pcm-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col" className="text-center" style={{ width: '85px' }}>
                                            <span className="pcm-th-title">Revision</span>
                                        </th>
                                        <th scope="col" className="text-center" style={{ minWidth: '180px' }}>
                                            <span className="pcm-th-title">Drawing Number</span>
                                        </th>
                                        <th scope="col" className="text-center" style={{ minWidth: '170px' }}>
                                            <span className="pcm-th-title">Line No &amp; Service</span>
                                        </th>
                                        <th scope="col" className="text-center" style={{ minWidth: '150px' }}>
                                            <span className="pcm-th-title">Fit-Up Specs</span>
                                        </th>
                                        <th scope="col" className="text-center" style={{ width: '90px' }}>
                                            <span className="pcm-th-title">Joints</span>
                                        </th>
                                        <th scope="col" className="text-center" style={{ width: '110px' }}>
                                            <span className="pcm-th-title">CAD / PDF</span>
                                        </th>
                                        <th scope="col" className="text-center" style={{ width: '100px' }}>
                                            <span className="pcm-th-title">Status</span>
                                        </th>
                                        {canEdit && (
                                            <th scope="col" className="text-center" style={{ minWidth: '170px' }}>
                                                <span className="pcm-th-title">Actions</span>
                                            </th>
                                        )}
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
                                                    title="Klik baris untuk melihat spesifikasi lengkap"
                                                >
                                                    <td className="text-center font-monospace">
                                                        <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>
                                                            {d.rev != null ? `Rev ${d.rev}` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="pcm-table-cell-2line fw-bold pcm-code text-center mx-auto" style={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                                                            {d.drawing_no}
                                                        </div>
                                                        <div className="pcm-cell-sub small text-muted">
                                                            {d.sheet || 'Sheet 1 of 1'}
                                                        </div>
                                                        {!selectedProjectId && (
                                                            <div className="mt-1">
                                                                <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
                                                                    {projectMap[d.project_id]?.name || (d.project_id ? `Project #${d.project_id}` : 'Unassigned')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="pcm-code fw-bold text-dark" style={{ fontSize: '0.8125rem' }}>
                                                            {d.line_no || '—'}
                                                        </div>
                                                        {d.line_service && (
                                                            <div className="pcm-cell-sub small text-truncate mx-auto" style={{ maxWidth: '180px' }} title={d.line_service}>
                                                                {d.line_service}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm px-2.5 py-1"
                                                            style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                                                            onClick={() => handleOpenFitupModal(d)}
                                                            title="Kelola Fit-Up Specifications untuk drawing ini"
                                                        >
                                                            {specCount > 0 ? `${specCount} Specs` : '+ Input Fit-Up'}
                                                        </button>
                                                    </td>
                                                    <td className="text-center font-monospace" style={{ fontSize: '0.8125rem' }}>
                                                        <span className="fw-bold text-dark">
                                                            {d.total_joints ? `${d.total_joints} J` : '—'}
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
                                                                    className="btn btn-primary btn-sm px-3 py-1.5 fw-bold"
                                                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
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
            {(activeEngTab === 'material_standard' || activeEngTab === 'material_pipe' || activeEngTab === 'material_fitting' || activeEngTab === 'material_additional' || activeEngTab === 'pipe_standard' || activeEngTab === 'pipe_schedule' || activeEngTab === 'pipe_table' || activeEngTab === 'fitting_table') && (
                <MaterialStandardSection
                    user={user}
                    onToast={onReload}
                    initialView={['material_standard', 'material_pipe', 'material_fitting', 'material_additional'].includes(activeEngTab) ? 'material' : 'pipe'}
                    activeSection={activeEngTab}
                />
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
                    <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" style={{ maxWidth: '1140px', width: '92vw' }}>
                        <form className="modal-content border-0" onSubmit={handleSaveDrawing}>
                            <div className="modal-header py-3 px-4">
                                <div>
                                    <h2 className="h4 fw-bold text-dark mb-0" id="pcm-drawing-modal-title">
                                        {editingDrawing ? 'Edit Isometric Drawing' : 'Tambah Isometric Drawing Baru'}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"
                                    onClick={() => setShowDrawingModal(false)}
                                />
                            </div>

                            <div className="modal-body p-4">
                                {drawingError && (
                                    <div className="alert alert-danger py-2 mb-3" role="alert">{drawingError}</div>
                                )}

                                {/* Bagian 1: Referensi Line Service (Terkunci Sesuai Proyek Aktif) */}
                                <div className="pcm-form-section mb-4">
                                    <div className="pcm-form-section__title mb-2">1. Referensi Jalur Pipa (Line Service)</div>
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-service">
                                                Line Service (Master Acuan)
                                            </label>
                                            <SearchSelect
                                                value={drawingForm.line_service_id || ''}
                                                onChange={(val) => {
                                                    const sId = val;
                                                    const chosen = lineServices.find((s) => String(s.id) === String(sId));
                                                    let autoDrawingNo = drawingForm.drawing_no;
                                                    if (!autoDrawingNo && chosen && activeProject) {
                                                        const cleanJob = (activeProject.job_no || 'PROJ').trim();
                                                        autoDrawingNo = `${cleanJob}-ISO-${chosen.line_no}-SHT1`;
                                                    }
                                                    setDrawingForm({
                                                        ...drawingForm,
                                                        line_service_id: sId,
                                                        line_service: chosen ? chosen.service_name : drawingForm.line_service,
                                                        line_no: chosen ? chosen.line_no : drawingForm.line_no,
                                                        drawing_no: autoDrawingNo || drawingForm.drawing_no
                                                    });
                                                }}
                                                options={lineServiceOptions}
                                                placeholder="Cari & pilih Line Service..."
                                                allowCustom={false}
                                                ariaLabel="Line Service Master Acuan"
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-line">
                                                Line Number <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                id="pcm-dwg-line"
                                                type="text"
                                                required
                                                className="form-control form-control-sm pcm-code"
                                                placeholder="Pilih dari Master Line Service di atas atau ketik manual"
                                                value={drawingForm.line_no}
                                                onChange={(e) => setDrawingForm({ ...drawingForm, line_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bagian 2: Identitas Gambar & Distribusi (3 Kolom x 2 Baris) */}
                                <div className="pcm-form-section mb-4">
                                    <div className="pcm-form-section__title mb-2">2. Identitas Drawing &amp; Area</div>
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
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

                                        <div className="col-12 col-md-4">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-sheet-num">
                                                Sheet (Halaman) <span className="text-danger">*</span>
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">Sheet</span>
                                                <input
                                                    id="pcm-dwg-sheet-num"
                                                    type="number"
                                                    min="1"
                                                    className="form-control form-control-sm text-center"
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
                                                <span className="input-group-text">of</span>
                                                <input
                                                    id="pcm-dwg-sheet-tot"
                                                    type="number"
                                                    min="1"
                                                    className="form-control form-control-sm text-center"
                                                    value={drawingForm.sheet_total || 1}
                                                    onChange={(e) => {
                                                        const tot = Math.max(parseInt(e.target.value, 10) || 1, 1);
                                                        setDrawingForm({
                                                            ...drawingForm,
                                                            sheet_total: tot,
                                                            sheet: `Sheet ${drawingForm.sheet_num || 1} of ${tot}`
                                                        });
                                                    }}
                                                />
                                            </div>
                                            {!editingDrawing && (drawingForm.sheet_total || 1) > 1 && (drawingForm.sheet_num || 1) === 1 && (
                                                <div className="form-check mt-1">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        id="pcm-auto-gen-sheets"
                                                        checked={autoGenerateRemainingSheets}
                                                        onChange={(e) => setAutoGenerateRemainingSheets(e.target.checked)}
                                                    />
                                                    <label className="form-check-label small fw-bold text-dark cursor-pointer text-nowrap" htmlFor="pcm-auto-gen-sheets">
                                                        Terbitkan otomatis Sheet 2 s/d {drawingForm.sheet_total} (Draft)
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-rev">
                                                Revision No <span className="text-danger">*</span>
                                            </label>
                                            <PcmSelect
                                                id="pcm-dwg-rev"
                                                
                                                value={drawingForm.rev}
                                                onChange={(e) => setDrawingForm({ ...drawingForm, rev: e.target.value })}
                                            >
                                                <option value="0">Rev 0 (Issued For Construction)</option>
                                                <option value="A">Rev A (Internal Review)</option>
                                                <option value="B">Rev B (Client Review)</option>
                                                <option value="1">Rev 1</option>
                                                <option value="2">Rev 2 (As-Built)</option>
                                            </PcmSelect>
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-title">
                                                Judul / Title <span className="text-danger">*</span>
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

                                        <div className="col-12 col-md-4">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-area">
                                                Plant Area <span className="text-danger">*</span>
                                            </label>
                                            <SearchSelect
                                                value={drawingForm.area || ''}
                                                onChange={(val) => setDrawingForm({ ...drawingForm, area: val })}
                                                options={plantAreaOptions}
                                                placeholder="Pilih Plant Area..."
                                                allowCustom
                                                ariaLabel="Plant Area"
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label pcm-form-label" htmlFor="pcm-dwg-dist">
                                                Target Distribusi
                                            </label>
                                            <SearchSelect
                                                value={drawingForm.distributed_to || ''}
                                                onChange={(val) => setDrawingForm({ ...drawingForm, distributed_to: val })}
                                                options={distributionTargetOptions}
                                                placeholder="Pilih Target Distribusi..."
                                                allowCustom
                                                ariaLabel="Target Distribusi"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bagian 3: Estimasi Spool, Joint & Berkas CAD/PDF */}
                                <div className="pcm-form-section mb-4">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                        <div className="pcm-form-section__title mb-0">3. Estimasi Spool, Joint &amp; Berkas CAD/PDF</div>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge bg-light text-dark border pcm-code" style={{ fontSize: '0.75rem' }}>
                                                Total: {drawingForm.spool_data?.length || 1} Spool &bull; {drawingForm.total_joints || 0} Joint
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm fw-bold px-2.5 py-0.5"
                                                style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                                                onClick={() => {
                                                    const cur = Array.isArray(drawingForm.spool_data) ? [...drawingForm.spool_data] : [];
                                                    const nextIdx = cur.length + 1;
                                                    const updated = [...cur, defaultSpoolRow(nextIdx)];
                                                    const sumJoints = updated.reduce((acc, s) => acc + (parseInt(s.joints_count, 10) || 0), 0);
                                                    setDrawingForm({
                                                        ...drawingForm,
                                                        spool_data: updated,
                                                        total_spools: updated.length,
                                                        total_joints: sumJoints
                                                    });
                                                }}
                                            >
                                                + Tambah Spool
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grid Rincian Spool */}
                                    <div className="p-3 border rounded bg-light mb-3">
                                        <div className="row g-2">
                                            {(drawingForm.spool_data || [defaultSpoolRow(1)]).map((sp, sIdx) => (
                                                <div className="col-12 col-md-6 col-lg-4" key={sIdx}>
                                                    <div className="p-2.5 bg-white border rounded shadow-sm">
                                                        <div className="d-flex align-items-center justify-content-between mb-1.5">
                                                            <span className="fw-bold small text-dark pcm-code">
                                                                Spool #{sIdx + 1}
                                                            </span>
                                                            {(drawingForm.spool_data || []).length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link text-danger p-0 text-decoration-none small fw-bold"
                                                                    style={{ fontSize: '0.75rem', lineHeight: 1 }}
                                                                    onClick={() => {
                                                                        const updated = drawingForm.spool_data.filter((_, idx) => idx !== sIdx);
                                                                        const sumJoints = updated.reduce((acc, s) => acc + (parseInt(s.joints_count, 10) || 0), 0);
                                                                        setDrawingForm({
                                                                            ...drawingForm,
                                                                            spool_data: updated,
                                                                            total_spools: updated.length,
                                                                            total_joints: sumJoints
                                                                        });
                                                                    }}
                                                                    title="Hapus Spool Ini"
                                                                >
                                                                    Hapus
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="row g-1.5">
                                                            <div className="col-6">
                                                                <label className="form-label small text-muted mb-0" style={{ fontSize: '0.6875rem' }}>No Spool</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm pcm-code fw-bold text-dark"
                                                                    value={sp.spool_no}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const updated = [...drawingForm.spool_data];
                                                                        updated[sIdx] = { ...updated[sIdx], spool_no: val };
                                                                        setDrawingForm({ ...drawingForm, spool_data: updated });
                                                                    }}
                                                                    placeholder="SP-01"
                                                                />
                                                            </div>
                                                            <div className="col-6">
                                                                <label className="form-label small text-muted mb-0" style={{ fontSize: '0.6875rem' }}>Estimasi Joint</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="form-control form-control-sm text-center fw-bold"
                                                                    value={sp.joints_count || 1}
                                                                    onChange={(e) => {
                                                                        const count = Math.max(parseInt(e.target.value, 10) || 1, 1);
                                                                        const updated = [...drawingForm.spool_data];
                                                                        updated[sIdx] = { ...updated[sIdx], joints_count: count };
                                                                        const sumJoints = updated.reduce((acc, s) => acc + (parseInt(s.joints_count, 10) || 0), 0);
                                                                        setDrawingForm({
                                                                            ...drawingForm,
                                                                            spool_data: updated,
                                                                            total_joints: sumJoints
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Upload Berkas Drawing CAD / PDF */}
                                    <div>
                                        <label className="form-label pcm-form-label mb-1" htmlFor="pcm-dwg-file">
                                            Berkas Drawing (CAD / PDF)
                                        </label>
                                        <input
                                            id="pcm-dwg-file"
                                            type="file"
                                            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.zip"
                                            className="form-control form-control-sm"
                                            onChange={(e) => setDrawingFile(e.target.files[0])}
                                        />
                                        {editingDrawing && editingDrawing.scan_path && (
                                            <small className="text-muted d-block mt-1 text-truncate">
                                                File aktif: <strong>{editingDrawing.scan_path.split('/').pop()}</strong>
                                            </small>
                                        )}
                                    </div>
                                </div>

                                {/* Bagian 4: Spesifikasi Pipa & Fit-Up Specs (Terhubung Langsung ke Master Material & Master Diameter) */}
                                <div className="pcm-form-section">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="pcm-form-section__title mb-0">4. Spesifikasi Material &amp; Diameter Pipa</div>
                                        <span className="badge" style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                                            {(drawingForm.fitup_specs || []).length} Spec Terpilih
                                        </span>
                                    </div>

                                    {/* Picker Master Data */}
                                    <div className="p-3 border rounded bg-light mb-3">
                                        <div className="row g-2 align-items-end">
                                            <div className="col-12 col-md-3">
                                                <label className="form-label small fw-bold mb-1">Jenis Komponen (Master)</label>
                                                <SearchSelect
                                                    value={quickCompType}
                                                    onChange={(val) => {
                                                        setQuickCompType(val || 'Pipe');
                                                        setQuickMatSpec('');
                                                        setQuickNps('');
                                                        setQuickSchedule('');
                                                    }}
                                                    options={componentTypeOptions}
                                                    placeholder="Pilih jenis..."
                                                    allowCustom={false}
                                                    ariaLabel="Jenis Komponen"
                                                />
                                            </div>
                                            <div className="col-12 col-md-3">
                                                <label className="form-label small fw-bold mb-1">Spesifikasi Material</label>
                                                <SearchSelect
                                                    value={quickMatSpec}
                                                    onChange={(val) => {
                                                        setQuickMatSpec(val);
                                                        setQuickNps('');
                                                        setQuickSchedule('');
                                                    }}
                                                    options={materialSpecOptions}
                                                    placeholder="Pilih spesifikasi..."
                                                    allowCustom={false}
                                                    ariaLabel="Spesifikasi Material"
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold mb-1">Size (NPS)</label>
                                                <SearchSelect
                                                    value={quickNps}
                                                    onChange={(val) => {
                                                        setQuickNps(val);
                                                        setQuickSchedule('');
                                                    }}
                                                    options={npsSelectOptions}
                                                    placeholder="Pilih size..."
                                                    allowCustom={false}
                                                    ariaLabel="Nominal Size NPS"
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold mb-1">Schedule / Rating</label>
                                                <SearchSelect
                                                    value={quickSchedule}
                                                    onChange={(val) => setQuickSchedule(val)}
                                                    options={availableSchedulesFor(quickNps, quickCompType, quickMatSpec)}
                                                    placeholder="Pilih schedule..."
                                                    allowCustom={false}
                                                    ariaLabel="Schedule Pipa"
                                                />
                                            </div>
                                            <div className="col-12 col-md-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm fw-bold w-100"
                                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                    onClick={handleAddQuickSpec}
                                                    disabled={!quickNps && !quickMatSpec}
                                                >
                                                    + Tambah
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabel Ringkas Spec Drawing Terpilih */}
                                    {(drawingForm.fitup_specs || []).length > 0 && (
                                        <div className="table-responsive border rounded bg-white">
                                            <table className="table table-sm align-middle pcm-table mb-0">
                                                <thead>
                                                    <tr>
                                                        <th className="ps-3 text-start" style={{ width: '140px' }}>Jenis</th>
                                                        <th className="text-start">Spesifikasi Material</th>
                                                        <th className="text-center" style={{ width: '110px' }}>Size (NPS)</th>
                                                        <th className="text-center" style={{ width: '120px' }}>Schedule</th>
                                                        <th className="text-center" style={{ width: '70px' }}>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(drawingForm.fitup_specs || []).map((spec, idx) => (
                                                        <tr key={idx}>
                                                            <td className="ps-3">
                                                                <span
                                                                    className="pcm-chip fw-bold border"
                                                                    style={{ ...getComponentBadgeStyle(spec.component_type || 'Pipe'), fontSize: '0.6875rem', padding: '0.15rem 0.5rem' }}
                                                                >
                                                                    {spec.component_type || 'Pipe'}
                                                                </span>
                                                            </td>
                                                            <td className="fw-semibold pcm-code text-dark">{spec.material_spec || '—'}</td>
                                                            <td className="text-center pcm-code fw-bold text-dark">{spec.size || '—'}</td>
                                                            <td className="text-center pcm-code text-dark">{spec.schedule || '—'}</td>
                                                            <td className="text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link text-danger p-0 fw-bold fs-6"
                                                                    onClick={() => handleRemoveQuickSpec(idx)}
                                                                    title="Hapus spec ini"
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
                            </div>

                            <div className="modal-footer d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm px-3 py-1.5 fw-bold"
                                    style={{ backgroundColor: '#475569', borderColor: '#334155', color: '#ffffff' }}
                                    onClick={() => setShowDrawingModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                    disabled={drawingLoading}
                                >
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
                                        Kelola Fit-Up Specs — <span className="pcm-code text-dark">{fitupModalDrawing.drawing_no}</span>
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
                                                Belum ada fit-up spec untuk drawing ini. Silakan input spesifikasi komponen perpipaan di formulir bawah ini.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive border rounded">
                                            <table className="table table-sm align-middle pcm-table mb-0">
                                                <thead>
                                                    <tr>
                                                        <th className="text-center" style={{ width: '45px' }}>No</th>
                                                        <th style={{ width: '130px' }}>Jenis</th>
                                                        <th>Spec Material</th>
                                                        <th className="text-center" style={{ width: '120px' }}>Size (NPS)</th>
                                                        <th className="text-center" style={{ width: '130px' }}>Schedule / Rating</th>
                                                        <th className="text-center" style={{ width: '70px' }}>Hapus</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fitupList.map((sp, idx) => (
                                                        <tr key={idx}>
                                                            <td className="text-center pcm-cell-sub">{idx + 1}</td>
                                                            <td>
                                                                <span
                                                                    className="pcm-chip fw-bold border"
                                                                    style={{ ...getComponentBadgeStyle(sp.component_type || 'Pipe'), fontSize: '0.6875rem', padding: '0.15rem 0.5rem' }}
                                                                >
                                                                    {sp.component_type || 'Pipe'}
                                                                </span>
                                                            </td>
                                                            <td className="pcm-cell-strong">{sp.material_spec || '-'}</td>
                                                            <td className="text-center pcm-code fw-bold text-dark">{sp.size}</td>
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
                                        + Tambah Spesifikasi Komponen (Master Data)
                                    </h6>
                                    <form onSubmit={handleAddFitupRow}>
                                        <div className="row g-2 align-items-end">
                                            <div className="col-12 col-md-3">
                                                <label className="form-label small fw-bold">Jenis Komponen *</label>
                                                <SearchSelect
                                                    value={fitupForm.component_type}
                                                    onChange={(val) => {
                                                        setFitupForm({
                                                            ...fitupForm,
                                                            component_type: val || 'Pipe',
                                                            material_spec: '',
                                                            size: '',
                                                            schedule: ''
                                                        });
                                                    }}
                                                    options={componentTypeOptions}
                                                    placeholder="Pilih jenis..."
                                                    allowCustom={false}
                                                    ariaLabel="Jenis Komponen"
                                                />
                                            </div>
                                            <div className="col-12 col-md-3">
                                                <label className="form-label small fw-bold">Spesifikasi Material *</label>
                                                <SearchSelect
                                                    value={fitupForm.material_spec}
                                                    onChange={(val) => {
                                                        setFitupForm({
                                                            ...fitupForm,
                                                            material_spec: val,
                                                            size: '',
                                                            schedule: ''
                                                        });
                                                    }}
                                                    options={materialStandards
                                                        .filter((std) => !fitupForm.component_type || strcasecmp_clean(std.category) === strcasecmp_clean(fitupForm.component_type))
                                                        .map((std) => ({ value: std.specification || std.code, label: std.specification || std.code }))
                                                    }
                                                    placeholder="Pilih spesifikasi..."
                                                    allowCustom={false}
                                                    ariaLabel="Spesifikasi Material"
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Size (NPS) *</label>
                                                <SearchSelect
                                                    value={fitupForm.size}
                                                    onChange={(val) => setFitupForm({ ...fitupForm, size: val, schedule: '' })}
                                                    options={npsSelectOptions}
                                                    placeholder="Pilih size..."
                                                    allowCustom={false}
                                                    ariaLabel="Size NPS"
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Schedule / Rating *</label>
                                                <SearchSelect
                                                    value={fitupForm.schedule}
                                                    onChange={(val) => setFitupForm({ ...fitupForm, schedule: val })}
                                                    options={availableSchedulesFor(fitupForm.size, fitupForm.component_type, fitupForm.material_spec)}
                                                    placeholder="Pilih schedule..."
                                                    allowCustom={false}
                                                    ariaLabel="Schedule Pipa"
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

                            <div className="modal-footer d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm px-3 py-1.5 fw-bold"
                                    style={{ backgroundColor: '#475569', borderColor: '#334155', color: '#ffffff' }}
                                    onClick={() => setFitupModalDrawing(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
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
                    <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" style={{ maxWidth: '1140px', width: '92vw' }}>
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
                                    {/* Baris 1: Identitas Pokok & Lokasi (3 Kolom) */}
                                    <div className="col-12 col-md-4">
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
                                    <div className="col-12 col-md-4">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Line Number</span>
                                            <span className="pcm-spec__value pcm-code">{selectedDrawing.line_no || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Plant Area</span>
                                            <span className="pcm-spec__value">{selectedDrawing.area || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Baris 2: Revisi, Distribusi, & Material (3 Kolom) */}
                                    <div className="col-12 col-md-4">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Revision &amp; Sheet</span>
                                            <span className="pcm-spec__value pcm-code">
                                                REV-{selectedDrawing.rev || 0} &middot; {selectedDrawing.sheet || 'Sheet 1 of 1'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Distribution Target</span>
                                            <span className="pcm-spec__value">{selectedDrawing.distributed_to || 'Workshop Spool Fabrication'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Material Specification</span>
                                            <span className="pcm-spec__value">{selectedDrawing.material_spec || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Baris 3: Ukuran & Volume Pekerjaan (3 Kolom) */}
                                    <div className="col-12 col-md-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Size Range &amp; Schedule</span>
                                            <span className="pcm-spec__value">{selectedDrawing.size_range || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="pcm-spec">
                                            <span className="pcm-spec__label">Total Joint Count</span>
                                            <span className="pcm-spec__value">{selectedDrawing.total_joints || 0} joints</span>
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
                                                                <td className="text-center pcm-code fw-bold text-dark">{sp.size || '-'}</td>
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
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm px-3 py-1.5 fw-bold"
                                        style={{ backgroundColor: '#475569', borderColor: '#334155', color: '#ffffff' }}
                                        onClick={() => setSelectedDrawing(null)}
                                    >
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
