import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { SearchSelect } from '../SearchSelect';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';

/* --------------------------------------------------------------------------
 * Helper: parsing & format
 * ----------------------------------------------------------------------- */

const parseInch = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/["']/g, '').trim().replace(/-/g, ' ');
    if (clean.includes('/')) {
        const parts = clean.split(' ');
        if (parts.length === 2) {
            const [num, den] = parts[1].split('/');
            return parseFloat(parts[0]) + ((parseFloat(num) / parseFloat(den)) || 0);
        }
        const [num, den] = clean.split('/');
        return (parseFloat(num) / parseFloat(den)) || 0;
    }
    return parseFloat(clean) || 0;
};

const autoCalculateDI = (sizeA, sizeB) => {
    const inchA = parseInch(sizeA);
    const inchB = parseInch(sizeB);
    if (!inchA && !inchB) return 0;
    if (inchA && inchB) return Math.max(inchA, inchB);
    return inchA || inchB;
};

const normSize = (val) => String(val || '')
    .replace(/["']/g, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .toLowerCase();

const normSchedule = (val) => String(val || '')
    .toLowerCase()
    .replace(/schedule/g, '')
    .replace(/sch/g, '')
    .replace(/[\s.]/g, '');

const parseThicknessText = (val) => {
    const match = String(val || '').match(/([\d.]+)\s*mm/i);
    return match ? parseFloat(match[1]) : null;
};

const fmt = (val, digits = 2) => {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(digits) : '—';
};

const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
});

/* Jumlah sheet mengikuti data ISO, mis. "Sheet 1 of 4" -> 4. */
const sheetTotalOf = (drawing) => {
    if (!drawing) return 1;
    const raw = String(drawing?.sheet || '').trim();
    const matchOf = raw.match(/\bof\s+(\d+)/i);
    if (matchOf) {
        return Math.max(Number.parseInt(matchOf[1], 10) || 1, 1);
    }
    const matchSheet = raw.match(/sheet\s+(\d+)/i) || raw.match(/^(\d+)$/);
    if (matchSheet) {
        return Math.max(Number.parseInt(matchSheet[1], 10) || 1, 1);
    }
    const explicit = Number.parseInt(drawing?.sheet_total, 10);
    return Math.max(explicit || 1, 1);
};

const getDrawingSheet = (drawing) => {
    if (!drawing) return 'Sheet 1 of 1';
    if (drawing.sheet && String(drawing.sheet).trim()) {
        const raw = String(drawing.sheet).trim();
        if (/^sheet/i.test(raw)) return raw;
        if (/^\d+$/.test(raw)) return `Sheet ${raw}`;
        return raw;
    }
    const total = sheetTotalOf(drawing);
    return `Sheet 1 of ${total}`;
};

const defaultSheetOf = (drawing) => {
    return getDrawingSheet(drawing);
};

/* Samakan nilai sheet dengan drawing ISO yang dipilih */
const normalizeSheetFor = (sheet, drawing) => {
    if (sheet && String(sheet).trim()) return String(sheet).trim();
    return getDrawingSheet(drawing);
};

/* Prefix SP-/J- tetap terlihat; user cukup mengetik angka urutnya. */
const stripSequence = (value, prefix) => {
    const text = String(value || '').trim();
    const match = text.match(new RegExp(`^${prefix}[-_ ]?(.*)$`, 'i'));
    return match ? match[1] : text;
};

const withSequencePrefix = (value, prefix) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits ? `${prefix}-${digits}` : '';
};

const formatSequence = (value, prefix) => {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(new RegExp(`^${prefix}[-_ ]?(.*)$`, 'i'));
    if (match) {
        const digits = match[1].replace(/\D/g, '');
        return digits ? `${prefix}-${digits.padStart(2, '0')}` : text;
    }
    if (/^\d+$/.test(text)) return `${prefix}-${text.padStart(2, '0')}`;
    return text;
};


const statusChip = (status) => ({
    PLANNED: 'pcm-chip--neutral',
    FITUP_OK: 'pcm-chip--warning',
    WELDED: 'pcm-chip--success',
    INSPECTED: 'pcm-chip--primary',
    COMPLETED: 'pcm-chip--dark',
    HOLD: 'pcm-chip--danger',
}[status] || 'pcm-chip--neutral');

const STATUS_OPTIONS = ['PLANNED', 'FITUP_OK', 'WELDED', 'INSPECTED', 'COMPLETED', 'HOLD'];

/* --------------------------------------------------------------------------
 * Detail material (accordion)
 * ----------------------------------------------------------------------- */

function MaterialCard({ label, info }) {
    return (
        <div className="wm-mat">
            <div className="wm-mat__head">
                <span className="wm-mat__title">{label}</span>
                {info.std
                    ? <span className="pcm-chip pcm-chip--success">Master</span>
                    : <span className="pcm-chip pcm-chip--neutral">Manual</span>}
            </div>
            <dl className="wm-spec">
                <dt>Item</dt><dd>{info.item || '—'}</dd>
                <dt>Spec</dt><dd>{info.spec || '—'}</dd>
                <dt>Size</dt><dd>{info.size || '—'}</dd>
                <dt>Schedule</dt><dd>{info.sch || '—'}</dd>
                <dt>Thickness</dt><dd>{info.thickness ? `${fmt(info.thickness)} mm` : '—'}</dd>
                <dt>OD</dt><dd>{info.od ? `${fmt(info.od)} mm` : '—'}</dd>
                <dt>DN</dt><dd>{info.dn || '—'}</dd>
                <dt>Berat</dt><dd>{info.weightPerM ? `${fmt(info.weightPerM)} kg/m` : '—'}</dd>
                <dt>Per Batang</dt><dd>{info.stickWeight != null ? `${fmt(info.stickWeight)} kg` : '—'}</dd>
            </dl>
            {!info.std && (
                <p className="wm-mat__note">
                    Master pipa belum memiliki kombinasi size &amp; schedule ini.
                </p>
            )}
        </div>
    );
}

/* --------------------------------------------------------------------------
 * Section
 * ----------------------------------------------------------------------- */

export function WeldingMapSection({ user, projects = [], drawings = [], activeProjectId = '', onToast }) {
    const [maps, setMaps] = useState([]);
    const [pipeStandards, setPipeStandards] = useState([]);
    const [materialStandards, setMaterialStandards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const [filterLocation, setFilterLocation] = useState('ALL');
    const [filterSpool, setFilterSpool] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

    const emptyForm = useCallback(() => ({
        line_no: '',
        iso_drawing_no: '',
        sheet: 'Sheet 1 of 1',
        spool_no: '',
        joint_no: '',
        joint_type: 'BW',
        size: '',
        dia_inch: 0,
        thickness: '',
        length_mm: '',
        location: 'Shop',
        mat_a_item: '',
        mat_a_spec: '',
        mat_a_size: '',
        mat_a_sch: '',
        mat_b_item: '',
        mat_b_spec: '',
        mat_b_size: '',
        mat_b_sch: '',
        status: 'PLANNED',
        drawing_id: '',
        project_id: defaultProjectId(activeProjectId, filterProject, projects),
    }), [activeProjectId, filterProject, projects]);

    const [form, setForm] = useState(emptyForm);

    const canEdit = can(user, 'drawing.write');

    useEffect(() => {
        setFilterSpool('ALL');
    }, [activeProjectId]);

    /* ---------------------------------------------------------------- data */

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [mapData, pipeData, materialData] = await Promise.all([
                api.get('/welding-maps'),
                api.get('/pipe-standards').catch((err) => {
                    console.error('Failed to load pipe standards:', err);
                    return [];
                }),
                api.get('/material-standards').catch((err) => {
                    console.error('Failed to load material standards:', err);
                    return [];
                }),
            ]);
            setMaps(Array.isArray(mapData) ? mapData : []);
            setPipeStandards(Array.isArray(pipeData) ? pipeData : []);
            setMaterialStandards(Array.isArray(materialData) ? materialData : []);
        } catch (err) {
            console.error('Failed to load welding maps:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const findStandard = useCallback((size, schedule) => {
        const nps = normSize(size);
        if (!nps) return null;
        const candidates = pipeStandards.filter((row) => normSize(row.nps) === nps);
        if (candidates.length === 0) return null;

        const sch = normSchedule(schedule);
        if (sch) {
            const exact = candidates.find((row) => normSchedule(row.schedule) === sch);
            if (exact) return exact;
        }
        return candidates.length === 1 ? candidates[0] : null;
    }, [pipeStandards]);

    const readMaterial = useCallback((map, key) => {
        const size = map[`mat_${key}_size`] || map.size || '';
        const sch = map[`mat_${key}_sch`] || '';
        const std = findStandard(size, sch);
        const stickLength = parseFloat(std?.standard_length_m) || 6;
        const weightPerM = std?.weight_kg_m ?? null;
        const stickWeight = std?.weight_kg_stick != null
            ? parseFloat(std.weight_kg_stick)
            : (weightPerM != null ? parseFloat(weightPerM) * stickLength : null);
        return {
            item: map[`mat_${key}_item`] || '',
            spec: map[`mat_${key}_spec`] || '',
            size,
            sch,
            std,
            thickness: std?.wall_thickness_mm ?? parseThicknessText(map.thickness),
            od: std?.outer_diameter_mm ?? null,
            dn: std?.dn ?? null,
            weightPerM,
            stickLength,
            stickWeight,
        };
    }, [findStandard]);

    const jointWeight = useCallback((map) => {
        const material = readMaterial(map, 'a');
        const length = parseFloat(map.length_mm) || 0;
        const perMeter = parseFloat(material.weightPerM) || 0;
        if (!perMeter || !length) return null;
        return (perMeter * length) / 1000;
    }, [readMaterial]);

    /* ------------------------------------------------------------ derived */

    const scopedMaps = useMemo(
        () => scopeRows(maps, activeProjectId, filterProject),
        [maps, activeProjectId, filterProject]
    );

    const spoolOptions = useMemo(
        () => Array.from(new Set(scopedMaps.map((m) => m.spool_no).filter(Boolean))).sort(naturalCompare),
        [scopedMaps]
    );

    const stats = useMemo(() => {
        const total = scopedMaps.length;
        const totalDia = scopedMaps.reduce((acc, m) => acc + (parseFloat(m.dia_inch) || 0), 0);
        const shopCount = scopedMaps.filter((m) => m.location === 'Shop').length;
        const fieldCount = scopedMaps.filter((m) => m.location === 'Field').length;
        const spools = new Set(scopedMaps.map((m) => m.spool_no).filter(Boolean)).size;
        const isoCount = new Set(scopedMaps.map((m) => m.iso_drawing_no).filter(Boolean)).size;
        return { total, totalDia, shopCount, fieldCount, spools, isoCount };
    }, [scopedMaps]);

    const filteredMaps = useMemo(() => {
        const q = search.trim().toLowerCase();
        return scopedMaps.filter((m) => {
            const matchLoc = filterLocation === 'ALL' || m.location === filterLocation;
            const matchSpool = filterSpool === 'ALL' || m.spool_no === filterSpool;
            const matchSearch = !q
                || (m.joint_no || '').toLowerCase().includes(q)
                || (m.spool_no || '').toLowerCase().includes(q)
                || (m.iso_drawing_no || '').toLowerCase().includes(q)
                || (m.line_no || '').toLowerCase().includes(q)
                || (m.mat_a_spec || '').toLowerCase().includes(q)
                || (m.mat_b_spec || '').toLowerCase().includes(q)
                || (m.status || '').toLowerCase().includes(q);
            return matchLoc && matchSpool && matchSearch;
        });
    }, [scopedMaps, search, filterLocation, filterSpool]);

    const grouped = useMemo(() => {
        const isoMap = new Map();

        filteredMaps.forEach((m) => {
            const isoKey = m.iso_drawing_no || 'Tanpa ISO';
            const spoolKey = m.spool_no || 'Tanpa Spool';

            if (!isoMap.has(isoKey)) {
                isoMap.set(isoKey, {
                    iso: isoKey,
                    line: m.line_no || '',
                    spools: new Map(),
                    count: 0,
                    di: 0,
                });
            }
            const iso = isoMap.get(isoKey);
            iso.count += 1;
            iso.di += parseFloat(m.dia_inch) || 0;
            if (!iso.line && m.line_no) iso.line = m.line_no;

            if (!iso.spools.has(spoolKey)) {
                iso.spools.set(spoolKey, { spool: spoolKey, joints: [], count: 0, di: 0 });
            }
            const spool = iso.spools.get(spoolKey);
            spool.joints.push(m);
            spool.count += 1;
            spool.di += parseFloat(m.dia_inch) || 0;
        });

        return Array.from(isoMap.values())
            .sort((a, b) => naturalCompare(a.iso, b.iso))
            .map((iso) => ({
                ...iso,
                spools: Array.from(iso.spools.values())
                    .sort((a, b) => naturalCompare(a.spool, b.spool))
                    .map((spool) => ({
                        ...spool,
                        joints: spool.joints.sort((a, b) => naturalCompare(a.joint_no, b.joint_no)),
                    })),
            }));
    }, [filteredMaps]);

    const filteredSpools = useMemo(
        () => new Set(filteredMaps.map((m) => m.spool_no).filter(Boolean)).size,
        [filteredMaps]
    );

    const filteredWeight = useMemo(
        () => filteredMaps.reduce((acc, m) => {
            const weight = jointWeight(m);
            return weight ? acc + weight : acc;
        }, 0),
        [filteredMaps, jointWeight]
    );

    const allGroupKeys = useMemo(
        () => grouped.flatMap((iso) => [
            `iso:${iso.iso}`,
            ...iso.spools.map((spool) => `spool:${iso.iso}::${spool.spool}`),
        ]),
        [grouped]
    );

    const allCollapsed = allGroupKeys.length > 0 && allGroupKeys.every((key) => collapsedGroups.has(key));

    const toggleGroup = (key) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleAllGroups = () => {
        setCollapsedGroups(allCollapsed ? new Set() : new Set(allGroupKeys));
    };

    /* ------------------------------------------------------------- modal */

    const sizeOptions = useMemo(() => {
        const seen = new Map();
        pipeStandards.forEach((row) => {
            if (!row.nps || seen.has(row.nps)) return;
            const hint = [row.dn, row.outer_diameter_mm ? `OD ${fmt(row.outer_diameter_mm)}` : '']
                .filter(Boolean)
                .join(' · ');
            seen.set(row.nps, { value: row.nps, label: row.nps, hint });
        });
        return Array.from(seen.values()).sort((a, b) => (
            (parseInch(a.value) - parseInch(b.value)) || naturalCompare(a.value, b.value)
        ));
    }, [pipeStandards]);

    const scheduleOptionsFor = useCallback((size) => {
        const nps = normSize(size);
        const rows = nps
            ? pipeStandards.filter((row) => normSize(row.nps) === nps)
            : pipeStandards;
        const seen = new Map();
        rows.forEach((row) => {
            if (!row.schedule || seen.has(row.schedule)) return;
            seen.set(row.schedule, {
                value: row.schedule,
                label: row.schedule,
                hint: row.wall_thickness_mm ? `${fmt(row.wall_thickness_mm)} mm` : '',
                thickness: parseFloat(row.wall_thickness_mm) || 0,
            });
        });
        return Array.from(seen.values()).sort((a, b) => (
            (a.thickness - b.thickness) || naturalCompare(a.value, b.value)
        ));
    }, [pipeStandards]);

    const scheduleOptionsA = useMemo(
        () => scheduleOptionsFor(form.mat_a_size),
        [scheduleOptionsFor, form.mat_a_size]
    );
    const scheduleOptionsB = useMemo(
        () => scheduleOptionsFor(form.mat_b_size),
        [scheduleOptionsFor, form.mat_b_size]
    );

    const materialSpecOptions = useMemo(() => {
        const seen = new Map();
        materialStandards.forEach((std) => {
            const spec = std.specification || std.code || '';
            if (!spec || seen.has(spec)) return;
            seen.set(spec, { value: spec, label: spec });
        });
        return Array.from(seen.values()).sort((a, b) => naturalCompare(a.label, b.label));
    }, [materialStandards]);

    const modalStandard = findStandard(form.mat_a_size, form.mat_a_sch);
    const modalStandardB = findStandard(form.mat_b_size, form.mat_b_sch);
    const modalLength = parseFloat(form.length_mm) || 0;
    const modalWeight = modalStandard?.weight_kg_m && modalLength
        ? (parseFloat(modalStandard.weight_kg_m) * modalLength) / 1000
        : null;

    const stickLengthA = parseFloat(modalStandard?.standard_length_m) || 6;
    const stickWeightA = modalStandard?.weight_kg_stick != null
        ? parseFloat(modalStandard.weight_kg_stick)
        : (modalStandard?.weight_kg_m ? parseFloat(modalStandard.weight_kg_m) * stickLengthA : null);
    const stickLengthB = parseFloat(modalStandardB?.standard_length_m) || 6;
    const stickWeightB = modalStandardB?.weight_kg_stick != null
        ? parseFloat(modalStandardB.weight_kg_stick)
        : (modalStandardB?.weight_kg_m ? parseFloat(modalStandardB.weight_kg_m) * stickLengthB : null);

    const applyMaterialField = (which, field, value) => {
        setForm((prev) => {
            const next = { ...prev, [`mat_${which}_${field}`]: value };

            if (field === 'size') {
                const available = scheduleOptionsFor(value).map((opt) => opt.value);
                const currentSch = next[`mat_${which}_sch`];
                if (currentSch && available.length > 0 && !available.includes(currentSch)) {
                    next[`mat_${which}_sch`] = '';
                }
            }

            if (which === 'a') {
                const std = findStandard(next.mat_a_size, next.mat_a_sch);
                if (std?.wall_thickness_mm) {
                    next.thickness = `${next.mat_a_sch || std.schedule || ''} (${fmt(std.wall_thickness_mm)} mm)`.trim();
                }
            }

            next.dia_inch = autoCalculateDI(next.mat_a_size, next.mat_b_size);
            const a = next.mat_a_size;
            const b = next.mat_b_size;
            next.size = a && b && a !== b ? `${a} x ${b}` : (a || b || next.size);
            return next;
        });
    };

    const applyFitup = (which, spec) => {
        setForm((prev) => {
            const next = {
                ...prev,
                [`mat_${which}_spec`]: spec.material_spec || prev[`mat_${which}_spec`],
                [`mat_${which}_size`]: spec.size || prev[`mat_${which}_size`],
                [`mat_${which}_sch`]: spec.schedule || prev[`mat_${which}_sch`],
            };
            if (which === 'a') {
                const std = findStandard(next.mat_a_size, next.mat_a_sch);
                if (std?.wall_thickness_mm) {
                    next.thickness = `${next.mat_a_sch || std.schedule || ''} (${fmt(std.wall_thickness_mm)} mm)`.trim();
                }
            }
            next.dia_inch = autoCalculateDI(next.mat_a_size, next.mat_b_size);
            const a = next.mat_a_size;
            const b = next.mat_b_size;
            next.size = a && b && a !== b ? `${a} x ${b}` : (a || b || next.size);
            return next;
        });
    };

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            const matchedDrawing = drawings.find((d) => String(d.id) === String(item.drawing_id))
                || drawings.find((d) => d.drawing_no === item.iso_drawing_no);
            setEditingItem(item);
            setForm({
                line_no: item.line_no || '',
                iso_drawing_no: item.iso_drawing_no || matchedDrawing?.drawing_no || '',
                sheet: normalizeSheetFor(item.sheet, matchedDrawing),
                spool_no: item.spool_no || '',
                joint_no: item.joint_no || '',
                joint_type: item.joint_type || 'BW',
                size: item.size || item.mat_a_size || '',
                dia_inch: parseFloat(item.dia_inch) || 0,
                thickness: item.thickness || '',
                length_mm: item.length_mm ?? '',
                location: item.location || 'Shop',
                mat_a_item: item.mat_a_item || '',
                mat_a_spec: item.mat_a_spec || '',
                mat_a_size: item.mat_a_size || item.size || '',
                mat_a_sch: item.mat_a_sch || '',
                mat_b_item: item.mat_b_item || '',
                mat_b_spec: item.mat_b_spec || '',
                mat_b_size: item.mat_b_size || item.size || '',
                mat_b_sch: item.mat_b_sch || '',
                status: item.status || 'PLANNED',
                drawing_id: matchedDrawing ? String(matchedDrawing.id) : '',
                project_id: item.project_id || (projects[0]?.id ? String(projects[0].id) : ''),
            });
        } else {
            setEditingItem(null);
            const base = emptyForm();
            const drawing = drawings.find((d) => !base.project_id
                || base.project_id === 'ALL'
                || String(d.project_id) === String(base.project_id)) || drawings[0];
            setForm({
                ...base,
                iso_drawing_no: drawing?.drawing_no || '',
                drawing_id: drawing?.id ? String(drawing.id) : '',
                line_no: drawing?.line_no || base.line_no,
                project_id: drawing?.project_id ? String(drawing.project_id) : base.project_id,
                sheet: drawing ? getDrawingSheet(drawing) : '',
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.joint_no.trim() || !form.spool_no.trim()) {
            setFormError('Nomor Joint dan Nomor Spool wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            const payload = {
                ...form,
                spool_no: formatSequence(form.spool_no, 'SP'),
                joint_no: formatSequence(form.joint_no, 'J'),
                length_mm: form.length_mm === '' ? null : form.length_mm,
                drawing_id: form.drawing_id || null,
                project_id: form.project_id || null,
            };
            if (editingItem) {
                await api.put(`/welding-maps/${editingItem.id}`, payload);
                if (onToast) onToast('Welding Map Joint berhasil diperbarui.');
            } else {
                await api.post('/welding-maps', payload);
                if (onToast) onToast('Welding Map Joint baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan Welding Map.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirmDelete('Yakin ingin menghapus titik joint dari Welding Map ini?'))) return;
        try {
            await api.delete(`/welding-maps/${id}`);
            if (onToast) onToast('Joint berhasil dihapus dari Welding Map.');
            if (expandedId === id) setExpandedId(null);
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    /* -------------------------------------------------------------- render */

    const colSpan = canEdit ? 7 : 6;
    const selectedDrawing = drawings.find(
        (d) => String(d.id) === String(form.drawing_id) || d.drawing_no === form.iso_drawing_no
    );

    const availableDrawings = useMemo(() => {
        if (isProjectLocked(activeProjectId)) {
            const scope = String(activeProjectId);
            return drawings.filter((d) => (scope === 'unassigned'
                ? !d.project_id
                : String(d.project_id) === scope));
        }
        return drawings.filter((d) => !form.project_id
            || form.project_id === 'ALL'
            || String(d.project_id) === String(form.project_id));
    }, [drawings, activeProjectId, form.project_id]);

    const drawingSpecs = useMemo(() => {
        let specs = [];
        if (Array.isArray(selectedDrawing?.fitup_specs)) specs = selectedDrawing.fitup_specs;
        else if (typeof selectedDrawing?.fitup_specs === 'string') {
            try { specs = JSON.parse(selectedDrawing.fitup_specs) || []; } catch (err) { specs = []; }
        }
        const seen = new Map();
        specs.forEach((spec) => {
            const key = `${spec.size || ''}|${spec.schedule || ''}|${spec.material_spec || ''}`;
            if (!seen.has(key)) seen.set(key, spec);
        });
        return Array.from(seen.values());
    }, [selectedDrawing]);

    const sheetTotal = sheetTotalOf(selectedDrawing);
    const sheetOptions = useMemo(() => {
        const total = sheetTotalOf(selectedDrawing);
        const options = [];
        for (let index = 0; index < total; index++) {
            const label = `Sheet ${index + 1} of ${total}`;
            options.push({ value: label, label });
        }
        if (selectedDrawing?.sheet && !options.some((option) => option.value === selectedDrawing.sheet)) {
            options.push({ value: selectedDrawing.sheet, label: selectedDrawing.sheet });
        }
        if (form.sheet && !options.some((option) => option.value === form.sheet)) {
            options.push({ value: form.sheet, label: form.sheet });
        }
        return options;
    }, [selectedDrawing, form.sheet]);

    const drawingSpoolOptions = useMemo(() => {
        // Prioritas 1: Ambil langsung dari spool_data drawing terpilih jika sudah diinput di drawing
        if (selectedDrawing) {
            let raw = selectedDrawing.spool_data;
            if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch (e) { raw = []; }
            }
            if (Array.isArray(raw) && raw.length > 0) {
                const spoolsFromDrawing = raw.map(s => (s.spool_no || '').trim()).filter(Boolean);
                if (spoolsFromDrawing.length > 0) {
                    return Array.from(new Set(spoolsFromDrawing)).sort(naturalCompare);
                }
            }
        }

        const source = selectedDrawing
            ? scopedMaps.filter((m) => String(m.drawing_id) === String(selectedDrawing.id)
                || (m.iso_drawing_no && m.iso_drawing_no === selectedDrawing.drawing_no))
            : scopedMaps;
        return Array.from(new Set(source.map((m) => (m.spool_no || '').trim()).filter(Boolean)))
            .sort(naturalCompare);
    }, [scopedMaps, selectedDrawing]);

    // Data spool detail lengkap (termasuk kapasitas joints_count) dari drawing terpilih
    const selectedDrawingSpools = useMemo(() => {
        if (!selectedDrawing) return [];
        let raw = selectedDrawing.spool_data;
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (e) { raw = []; }
        }
        if (Array.isArray(raw) && raw.length > 0) {
            return raw;
        }
        return [];
    }, [selectedDrawing]);

    const spoolSequenceOptions = useMemo(() => Array.from(new Set(
        drawingSpoolOptions
            .map((spool) => stripSequence(spool, 'SP'))
            .filter((sequence) => /^\d+$/.test(sequence))
    )).sort(naturalCompare), [drawingSpoolOptions]);

    const currentProject = projects.find(p => String(p.id) === String(activeProjectId)) || null;

    return (
        <div>
            {/* Header Banner Terpadu: Judul Project, Client & Summary Metric */}
            <div className="bg-white border rounded p-4 mb-4 shadow-sm">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="min-w-0">
                        <h1 className="h3 fw-bolder text-dark mb-1 text-truncate" style={{ letterSpacing: '-0.02em' }}>
                            {currentProject ? currentProject.name : 'Welding Map & Joint Register'}
                        </h1>
                        <div className="d-flex flex-wrap align-items-center gap-2 small">
                            {currentProject ? (
                                <>
                                    <span className="fw-bold text-dark pcm-code bg-light px-2 py-0.5 rounded border">
                                        JOB NO: {currentProject.job_no || '-'}
                                    </span>
                                    <span className="text-muted">&bull;</span>
                                    <span className="fw-bold" style={{ color: '#0f172a' }}>
                                        Client: {currentProject.client || 'General Client'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-muted">
                                    Pemetaan detail sambungan las, spool fabrication, dan penomoran joint
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 4 Box Metrik Kompak Simetris */}
                    <div className="d-flex align-items-center gap-2">
                        <div className="px-3 py-2 bg-light rounded border text-center" style={{ minWidth: '95px' }}>
                            <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '0.6875rem' }}>Total Joint</span>
                            <strong className="h5 fw-bolder text-dark mb-0">{stats.total}</strong>
                        </div>
                        <div className="px-3 py-2 bg-light rounded border text-center" style={{ minWidth: '95px' }}>
                            <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '0.6875rem' }}>Total DI</span>
                            <strong className="h5 fw-bolder text-dark mb-0 pcm-code">{stats.totalDia.toFixed(1)}</strong>
                        </div>
                        <div className="px-3 py-2 bg-light rounded border text-center" style={{ minWidth: '95px' }}>
                            <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '0.6875rem' }}>ISO / Spool</span>
                            <strong className="h5 fw-bolder text-dark mb-0">{stats.isoCount} / {stats.spools}</strong>
                        </div>
                        <div className="px-3 py-2 bg-light rounded border text-center" style={{ minWidth: '95px' }}>
                            <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '0.6875rem' }}>Shop / Field</span>
                            <strong className="h5 fw-bolder text-dark mb-0">{stats.shopCount} / {stats.fieldCount}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar Sejajar: Search, Tambah, Spool, Lokasi, dan Tombol Arrow Buka/Tutup */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
                {/* 1. Search */}
                <div className="flex-grow-1 min-w-0" style={{ minWidth: '220px' }}>
                    <div className="pcm-search w-100" style={{ maxWidth: '100%' }}>
                        <span className="pcm-search__icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <input
                            type="text"
                            className="form-control form-control-sm pcm-filter-input w-100"
                            placeholder="Cari Joint No, Spool, Drawing, Line..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. Tambah Joint Mapping */}
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2 text-nowrap d-inline-flex align-items-center gap-1.5"
                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                        onClick={() => handleOpenModal()}
                    >
                        <span>+ Tambah Joint</span>
                    </button>
                )}

                {/* 3. Dropdown Spool */}
                <select
                    className="form-select form-select-sm pcm-select-theme"
                    value={filterSpool}
                    onChange={(e) => setFilterSpool(e.target.value)}
                    aria-label="Filter Spool"
                >
                    <option value="ALL">Semua Spool ({spoolOptions.length})</option>
                    {spoolOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* 4. Dropdown Lokasi */}
                <select
                    className="form-select form-select-sm pcm-select-theme"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    aria-label="Filter Lokasi"
                >
                    <option value="ALL">Semua Lokasi</option>
                    <option value="Shop">Shop (Workshop)</option>
                    <option value="Field">Field (Lapangan)</option>
                </select>
            </div>

            {/* Accordion grid: ISO > Spool > Joint */}
            <div className="pcm-card">
                {loading ? (
                    <div className="wm-empty">Memuat data Welding Map...</div>
                ) : filteredMaps.length === 0 ? (
                    <div className="wm-empty">Tidak ada data titik joint yang sesuai.</div>
                ) : (
                    <>
                        <div className="wm-scroll">
                            <table className="wm-table">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '190px' }}>
                                            <span className="pcm-th-title">Joint / Tipe</span>
                                        </th>
                                        <th className="text-center" style={{ width: '86px' }}>
                                            <span className="pcm-th-title">Size</span>
                                        </th>
                                        <th className="text-center" style={{ width: '86px' }}>
                                            <span className="pcm-th-title">DI</span>
                                        </th>
                                        <th className="text-center" style={{ width: '120px' }}>
                                            <span className="pcm-th-title">Status</span>
                                        </th>
                                        <th className="text-center" style={{ width: '120px' }}>
                                            <span className="pcm-th-title">Lokasi</span>
                                        </th>
                                        {canEdit && (
                                            <th className="text-center" style={{ width: '140px' }}>
                                                <span className="pcm-th-title">Aksi</span>
                                            </th>
                                        )}
                                        <th className="text-center pe-3" style={{ width: '70px' }}>
                                            <div className="d-inline-flex align-items-center gap-1 justify-content-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className="pcm-page-nav-btn"
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '4px'
                                                    }}
                                                    onClick={() => { if (allCollapsed) toggleAllGroups(); }}
                                                    disabled={grouped.length === 0}
                                                    title="Buka Semua Group (Expand All)"
                                                    aria-label="Buka Semua Group"
                                                >
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pcm-page-nav-btn"
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '4px'
                                                    }}
                                                    onClick={() => { if (!allCollapsed) toggleAllGroups(); }}
                                                    disabled={grouped.length === 0}
                                                    title="Tutup Semua Group (Collapse All)"
                                                    aria-label="Tutup Semua Group"
                                                >
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="18 15 12 9 6 15" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grouped.map((iso) => {
                                        const isoKey = `iso:${iso.iso}`;
                                        const isoCollapsed = collapsedGroups.has(isoKey);

                                        return (
                                            <React.Fragment key={isoKey}>
                                                <tr className="wm-group wm-group--iso">
                                                    <td colSpan={colSpan}>
                                                        <button
                                                            type="button"
                                                            className="wm-group__btn d-flex align-items-center"
                                                            onClick={() => toggleGroup(isoKey)}
                                                            aria-expanded={!isoCollapsed}
                                                        >
                                                            <span className={`wm-chevron${isoCollapsed ? '' : ' wm-chevron--open'}`}>&#9656;</span>
                                                            <span className="wm-group__label me-2">ISO {iso.iso}</span>
                                                            {iso.line && (
                                                                <span className="pcm-chip pcm-chip--neutral pcm-code me-2" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                                                                    {iso.line}
                                                                </span>
                                                            )}
                                                            {/* Badge Metrik Rapi Menempel di Samping Judul ISO */}
                                                            <div className="d-inline-flex align-items-center gap-1.5 ms-1">
                                                                <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                                                                    {iso.spools.length} Spool
                                                                </span>
                                                                <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                                                                    {iso.count} Joint
                                                                </span>
                                                                <span className="pcm-chip pcm-chip--neutral pcm-code fw-bold text-dark" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                                                                    {iso.di.toFixed(1)} DI
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </td>
                                                </tr>

                                                {!isoCollapsed && iso.spools.map((spool) => {
                                                    const spoolKey = `spool:${iso.iso}::${spool.spool}`;
                                                    const spoolCollapsed = collapsedGroups.has(spoolKey);

                                                    return (
                                                        <React.Fragment key={spoolKey}>
                                                            <tr className="wm-group wm-group--spool">
                                                                <td colSpan={colSpan}>
                                                                    <button
                                                                        type="button"
                                                                        className="wm-group__btn d-flex align-items-center"
                                                                        onClick={() => toggleGroup(spoolKey)}
                                                                        aria-expanded={!spoolCollapsed}
                                                                    >
                                                                        <span className={`wm-chevron${spoolCollapsed ? '' : ' wm-chevron--open'}`}>&#9656;</span>
                                                                        <span className="wm-group__label me-2">Spool {spool.spool}</span>
                                                                        
                                                                        {/* Badge Metrik Rapi Menempel di Samping Judul Spool */}
                                                                        <div className="d-inline-flex align-items-center gap-1.5 ms-1">
                                                                            <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                                                                                {spool.count} Joint
                                                                            </span>
                                                                            <span className="pcm-chip pcm-chip--neutral pcm-code fw-bold text-dark" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                                                                                {spool.di.toFixed(1)} DI
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {!spoolCollapsed && spool.joints.map((m) => {
                                                                const isOpen = expandedId === m.id;
                                                                const inchA = parseInch(m.mat_a_size);
                                                                const inchB = parseInch(m.mat_b_size);
                                                                const isReducer = inchA > 0 && inchB > 0 && inchA !== inchB;
                                                                const materialA = isOpen ? readMaterial(m, 'a') : null;
                                                                const materialB = isOpen ? readMaterial(m, 'b') : null;
                                                                const weight = isOpen ? jointWeight(m) : null;
                                                                const length = parseFloat(m.length_mm) || 0;

                                                                return (
                                                                    <React.Fragment key={m.id}>
                                                                        <tr
                                                                            className={`wm-row${isOpen ? ' wm-row--open' : ''}`}
                                                                            onClick={() => setExpandedId(isOpen ? null : m.id)}
                                                                        >
                                                                            <td>
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="wm-toggle"
                                                                                        aria-expanded={isOpen}
                                                                                        aria-controls={`wm-detail-${m.id}`}
                                                                                        title="Tampilkan detail material"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setExpandedId(isOpen ? null : m.id);
                                                                                        }}
                                                                                    >
                                                                                        <span className={`wm-chevron${isOpen ? ' wm-chevron--open' : ''}`}>&#9656;</span>
                                                                                    </button>
                                                                                    <span className="pcm-code wm-joint">{m.joint_no}</span>
                                                                                    <span className="pcm-chip pcm-chip--neutral">{m.joint_type || 'BW'}</span>
                                                                                    {isReducer && <span className="pcm-chip pcm-chip--warning">Reducer</span>}
                                                                                </div>
                                                                            </td>
                                                                            <td className="text-center">
                                                                                <span className="wm-size">{m.mat_a_size || m.size || '—'}</span>
                                                                            </td>
                                                                            <td className="text-center">
                                                                                <span className="pcm-code wm-di">{fmt(m.dia_inch, 1)}</span>
                                                                            </td>
                                                                            <td className="text-center">
                                                                                <span className={`pcm-chip ${statusChip(m.status)}`}>{m.status || 'PLANNED'}</span>
                                                                            </td>
                                                                            <td className="text-center" style={{ width: '120px' }}>
                                                                                <span
                                                                                    className={`pcm-chip ${m.location === 'Shop' ? 'pcm-chip--primary' : 'pcm-chip--warning'}`}
                                                                                    style={{ padding: '.25rem .7rem', fontSize: '.8125rem' }}
                                                                                >
                                                                                    {m.location || 'Shop'}
                                                                                </span>
                                                                            </td>
                                                                            {canEdit && (
                                                                                <td className="text-center" style={{ width: '140px' }} onClick={(e) => e.stopPropagation()}>
                                                                                    <div className="d-inline-flex gap-1.5 justify-content-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            className="pcm-chip fw-bold border-0"
                                                                                            style={{
                                                                                                backgroundColor: '#1e40af',
                                                                                                color: '#ffffff',
                                                                                                cursor: 'pointer',
                                                                                                lineHeight: 1.4,
                                                                                                padding: '.25rem .7rem',
                                                                                                fontSize: '.8125rem'
                                                                                            }}
                                                                                            onClick={() => handleOpenModal(m)}
                                                                                        >
                                                                                            Edit
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="pcm-chip fw-bold border-0"
                                                                                            style={{
                                                                                                backgroundColor: '#dc2626',
                                                                                                color: '#ffffff',
                                                                                                cursor: 'pointer',
                                                                                                lineHeight: 1.4,
                                                                                                padding: '.25rem .7rem',
                                                                                                fontSize: '.8125rem'
                                                                                            }}
                                                                                            onClick={() => handleDelete(m.id)}
                                                                                        >
                                                                                            Hapus
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            )}
                                                                            <td className="text-center" style={{ width: '70px' }}>&nbsp;</td>
                                                                        </tr>

                                                                        {isOpen && (
                                                                            <tr className="wm-detail" id={`wm-detail-${m.id}`}>
                                                                                <td colSpan={colSpan}>
                                                                                    <div className="wm-detail__inner">
                                                                                        <MaterialCard label="Material A" info={materialA} />
                                                                                        <MaterialCard label="Material B" info={materialB} />
                                                                                        <div className="wm-calc">
                                                                                            <div className="wm-calc__head">Perhitungan</div>
                                                                                            <div className="wm-calc__row">
                                                                                                <span>Panjang</span>
                                                                                                <strong>{length ? `${fmt(length, 0)} mm` : '—'}</strong>
                                                                                            </div>
                                                                                            <div className="wm-calc__row">
                                                                                                <span>Thickness (A)</span>
                                                                                                <strong>{materialA.thickness ? `${fmt(materialA.thickness)} mm` : '—'}</strong>
                                                                                            </div>
                                                                                            <div className="wm-calc__row">
                                                                                                <span>Berat A</span>
                                                                                                <strong className="wm-calc__value">
                                                                                                    {weight != null ? `${fmt(weight, 3)} kg` : '—'}
                                                                                                </strong>
                                                                                            </div>
                                                                                            <div className="wm-calc__row">
                                                                                                <span>Sheet</span>
                                                                                                <span>{m.sheet || '—'}</span>
                                                                                            </div>
                                                                                            <div className="wm-calc__row">
                                                                                                <span>Line</span>
                                                                                                <span>{m.line_no || '—'}</span>
                                                                                            </div>
                                                                                            {weight == null && (
                                                                                                <p className="wm-calc__note">
                                                                                                    Isi Length (mm) lewat tombol Edit dan pastikan master pipa
                                                                                                    tersedia agar berat dihitung otomatis.
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="wm-foot">
                            <span>
                                {filteredMaps.length} joint · {grouped.length} ISO · {filteredSpools} spool
                            </span>
                            <span>
                                Total berat Material A: <strong>{filteredWeight > 0 ? `${fmt(filteredWeight, 2)} kg` : '—'}</strong>
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Add / Edit Joint */}
            {showModal && (
                <div className="modal fade show d-block pcm-modal" style={{ zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable wm-joint-modal">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Joint Mapping' : 'Tambah Joint Mapping Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}

                                    {/* Identitas Spool & Joint */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Identitas Spool &amp; Joint</span>
                                        <div className="wm-form-grid">
                                            <div className="wm-form-grid__full">
                                                <label className="form-label small fw-bold">Isometric Drawing *</label>
                                                <select
                                                    className="form-select"
                                                    value={form.drawing_id || ''}
                                                    onChange={(e) => {
                                                        const dId = e.target.value;
                                                        const dwg = drawings.find((d) => String(d.id) === String(dId));
                                                        let nextSpoolNo = form.spool_no;
                                                        if (dwg) {
                                                            let sps = dwg.spool_data;
                                                            if (typeof sps === 'string') {
                                                                try { sps = JSON.parse(sps); } catch (err) { sps = []; }
                                                            }
                                                            if (Array.isArray(sps) && sps.length > 0 && sps[0].spool_no) {
                                                                nextSpoolNo = sps[0].spool_no;
                                                            }
                                                        }
                                                        setForm({
                                                            ...form,
                                                            drawing_id: dId,
                                                            iso_drawing_no: dwg ? dwg.drawing_no : '',
                                                            line_no: dwg ? dwg.line_no : form.line_no,
                                                            project_id: dwg?.project_id ? String(dwg.project_id) : form.project_id,
                                                            sheet: dwg ? getDrawingSheet(dwg) : '',
                                                            spool_no: nextSpoolNo
                                                        });
                                                    }}
                                                    required
                                                >
                                                    <option value="">-- Pilih Isometric Drawing --</option>
                                                    {availableDrawings.map((d) => {
                                                        const sheetInfo = d.sheet ? `(${d.sheet})` : '';
                                                        return (
                                                            <option key={d.id} value={d.id}>
                                                                {d.drawing_no} {sheetInfo} {d.line_no ? `· Line: ${d.line_no}` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Spool No *</label>
                                                {selectedDrawingSpools.length > 0 ? (
                                                    <select
                                                        className="form-select pcm-code fw-bold text-dark"
                                                        value={form.spool_no || ''}
                                                        onChange={(e) => setForm({ ...form, spool_no: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Pilih Spool --</option>
                                                        {selectedDrawingSpools.map((sp, idx) => (
                                                            <option key={idx} value={sp.spool_no}>
                                                                {sp.spool_no} (Estimasi: {sp.joints_count || 1} Joint)
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="input-group wm-prefix-group">
                                                        <span className="input-group-text">SP-</span>
                                                        <input
                                                            type="text"
                                                            className="form-control pcm-code"
                                                            list="wm-spool-options"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            placeholder="01"
                                                            value={stripSequence(form.spool_no, 'SP')}
                                                            onChange={(e) => {
                                                                const next = withSequencePrefix(e.target.value, 'SP');
                                                                setForm((prev) => ({ ...prev, spool_no: next }));
                                                            }}
                                                            onBlur={(e) => {
                                                                const next = formatSequence(e.target.value, 'SP');
                                                                setForm((prev) => ({ ...prev, spool_no: next }));
                                                            }}
                                                            required
                                                        />
                                                    </div>
                                                )}
                                                <datalist id="wm-spool-options">
                                                    {spoolSequenceOptions.map((sequence) => (
                                                        <option key={sequence} value={sequence} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Joint No *</label>
                                                {(() => {
                                                    const currentSpoolObj = selectedDrawingSpools.find(s => s.spool_no === form.spool_no);
                                                    const maxJoints = currentSpoolObj ? parseInt(currentSpoolObj.joints_count, 10) || 1 : null;

                                                    return (
                                                        <>
                                                            <div className="input-group wm-prefix-group">
                                                                <span className="input-group-text">J-</span>
                                                                <input
                                                                    type="text"
                                                                    className="form-control pcm-code"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    placeholder="01"
                                                                    list="wm-joint-quick-options"
                                                                    value={stripSequence(form.joint_no, 'J')}
                                                                    onChange={(e) => {
                                                                        const next = withSequencePrefix(e.target.value, 'J');
                                                                        setForm((prev) => ({ ...prev, joint_no: next }));
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const next = formatSequence(e.target.value, 'J');
                                                                        setForm((prev) => ({ ...prev, joint_no: next }));
                                                                    }}
                                                                    required
                                                                />
                                                            </div>
                                                            {maxJoints != null && (
                                                                <datalist id="wm-joint-quick-options">
                                                                    {Array.from({ length: maxJoints }, (_, i) => String(i + 1).padStart(2, '0')).map(num => (
                                                                        <option key={num} value={num} label={`Joint ${num} (${form.spool_no})`} />
                                                                    ))}
                                                                </datalist>
                                                            )}
                                                            {maxJoints != null && (
                                                                <div className="text-muted small mt-1" style={{ fontSize: '0.6875rem' }}>
                                                                    Rekomendasi urutan: J-01 s/d J-{String(maxJoints).padStart(2, '0')}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Tipe Sambungan</label>
                                                <select
                                                    className="form-select"
                                                    value={form.joint_type}
                                                    onChange={(e) => setForm({ ...form, joint_type: e.target.value })}
                                                >
                                                    <option value="BW">Butt Weld (BW)</option>
                                                    <option value="SW">Socket Weld (SW)</option>
                                                    <option value="FW">Fillet Weld (FW)</option>
                                                    <option value="THD">Threaded (THD)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Sheet</label>
                                                <select
                                                    className="form-select"
                                                    value={form.sheet}
                                                    onChange={(e) => setForm({ ...form, sheet: e.target.value })}
                                                >
                                                    {sheetOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="wm-form-meta">
                                            Urutan: ISO → Spool → Joint. Satu spool dapat memiliki banyak joint.
                                        </div>
                                    </div>

                                    {/* Pilihan cepat Fit-Up */}
                                    {drawingSpecs.length > 0 && (
                                        <div className="pcm-form-section">
                                            <span className="pcm-form-section__title">Pilihan Cepat Fit-Up Spec</span>
                                            <div className="d-flex flex-wrap gap-2">
                                                {drawingSpecs.map((spec, idx) => (
                                                    <div key={idx} className="wm-fitup">
                                                        <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                            {spec.size || '—'} {spec.schedule || ''}
                                                        </span>
                                                        {spec.material_spec && (
                                                            <span className="wm-fitup__spec" title={spec.material_spec}>
                                                                {spec.material_spec}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm wm-fitup__btn"
                                                            onClick={() => applyFitup('a', spec)}
                                                        >
                                                            Set A
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm wm-fitup__btn"
                                                            onClick={() => applyFitup('b', spec)}
                                                        >
                                                            Set B
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Material A */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Material A</span>
                                        <div className="wm-form-grid">
                                            <div>
                                                <label className="form-label small fw-bold">Item</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder=""
                                                    value={form.mat_a_item}
                                                    onChange={(e) => setForm({ ...form, mat_a_item: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Material Spec</label>
                                                <SearchSelect
                                                    value={form.mat_a_spec}
                                                    onChange={(value) => setForm({ ...form, mat_a_spec: value })}
                                                    options={materialSpecOptions}
                                                    placeholder="Cari spesifikasi ASTM..."
                                                    allowCustom
                                                    ariaLabel="Spesifikasi Material A"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Size (NPS)</label>
                                                <SearchSelect
                                                    value={form.mat_a_size}
                                                    onChange={(value) => applyMaterialField('a', 'size', value)}
                                                    options={sizeOptions}
                                                    placeholder="Cari NPS..."
                                                    allowCustom
                                                    ariaLabel="Size Material A"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Schedule</label>
                                                <SearchSelect
                                                    value={form.mat_a_sch}
                                                    onChange={(value) => applyMaterialField('a', 'sch', value)}
                                                    options={scheduleOptionsA}
                                                    placeholder="Cari schedule..."
                                                    allowCustom
                                                    ariaLabel="Schedule Material A"
                                                />
                                            </div>
                                        </div>
                                        <div className="wm-form-meta">
                                            {modalStandard
                                                ? `Master: ${fmt(modalStandard.wall_thickness_mm)} mm · ${fmt(modalStandard.weight_kg_m)} kg/m${stickWeightA != null ? ` · ${fmt(stickWeightA)} kg/batang (${fmt(stickLengthA, 0)} m)` : ''}${modalStandard.dn ? ` · ${modalStandard.dn}` : ''}`
                                                : 'Kombinasi size & schedule ini belum ada di master pipa.'}
                                        </div>
                                    </div>

                                    {/* Material B */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Material B</span>
                                        <div className="wm-form-grid">
                                            <div>
                                                <label className="form-label small fw-bold">Item</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder=""
                                                    value={form.mat_b_item}
                                                    onChange={(e) => setForm({ ...form, mat_b_item: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Material Spec</label>
                                                <SearchSelect
                                                    value={form.mat_b_spec}
                                                    onChange={(value) => setForm({ ...form, mat_b_spec: value })}
                                                    options={materialSpecOptions}
                                                    placeholder="Cari spesifikasi ASTM..."
                                                    allowCustom
                                                    ariaLabel="Spesifikasi Material B"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Size (NPS)</label>
                                                <SearchSelect
                                                    value={form.mat_b_size}
                                                    onChange={(value) => applyMaterialField('b', 'size', value)}
                                                    options={sizeOptions}
                                                    placeholder="Cari NPS..."
                                                    allowCustom
                                                    ariaLabel="Size Material B"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Schedule</label>
                                                <SearchSelect
                                                    value={form.mat_b_sch}
                                                    onChange={(value) => applyMaterialField('b', 'sch', value)}
                                                    options={scheduleOptionsB}
                                                    placeholder="Cari schedule..."
                                                    allowCustom
                                                    ariaLabel="Schedule Material B"
                                                />
                                            </div>
                                        </div>
                                        <div className="wm-form-meta">
                                            {modalStandardB
                                                ? `Master: ${fmt(modalStandardB.wall_thickness_mm)} mm · ${fmt(modalStandardB.weight_kg_m)} kg/m${stickWeightB != null ? ` · ${fmt(stickWeightB)} kg/batang (${fmt(stickLengthB, 0)} m)` : ''}`
                                                : 'Kombinasi size & schedule ini belum ada di master pipa.'}
                                        </div>
                                    </div>

                                    {/* Dimensi & Perhitungan */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Dimensi &amp; Perhitungan</span>
                                        <div className="wm-form-grid">
                                            <div>
                                                <label className="form-label small fw-bold">Length (mm)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="form-control pcm-code"
                                                    placeholder="1200"
                                                    value={form.length_mm}
                                                    onChange={(e) => setForm({ ...form, length_mm: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Thickness (auto)</label>
                                                <input
                                                    type="text"
                                                    className="form-control pcm-code"
                                                    placeholder="Sch 40 (6.02 mm)"
                                                    value={form.thickness}
                                                    onChange={(e) => setForm({ ...form, thickness: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Diameter-Inch (auto)</label>
                                                <div className="form-control bg-light pcm-code fw-bold d-flex align-items-center">
                                                    {fmt(form.dia_inch, 1)} DI
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Berat (auto)</label>
                                                <div className="form-control bg-light pcm-code fw-bold d-flex align-items-center">
                                                    {modalWeight != null ? `${fmt(modalWeight, 3)} kg` : '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="wm-form-meta">
                                            {(() => {
                                                const iA = parseInch(form.mat_a_size);
                                                const iB = parseInch(form.mat_b_size);
                                                if (iA > 0 && iB > 0 && iA !== iB) {
                                                    return `Reducer ${form.mat_a_size} × ${form.mat_b_size} — DI memakai ukuran terbesar (${fmt(form.dia_inch, 1)} DI).`;
                                                }
                                                if (iA > 0 || iB > 0) {
                                                    return `Sambungan seukuran ${form.mat_a_size || form.mat_b_size} — ${fmt(form.dia_inch, 1)} DI.`;
                                                }
                                                return 'Pilih Size Material A & B untuk menghitung DI otomatis.';
                                            })()}
                                            {modalWeight != null && ' Berat = berat/m master × panjang ÷ 1000.'}
                                        </div>
                                    </div>

                                    {/* Fabrikasi & Status */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Fabrikasi &amp; Status</span>
                                        <div className="wm-form-grid">
                                            <div>
                                                <label className="form-label small fw-bold">Lokasi Las</label>
                                                <select
                                                    className="form-select"
                                                    value={form.location}
                                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                                >
                                                    <option value="Shop">Shop (Workshop)</option>
                                                    <option value="Field">Field (Lapangan)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Status</label>
                                                <select
                                                    className="form-select"
                                                    value={form.status}
                                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Line Number</label>
                                                <input
                                                    type="text"
                                                    className="form-control pcm-code"
                                                    placeholder="15-MPP-AB"
                                                    value={form.line_no}
                                                    onChange={(e) => setForm({ ...form, line_no: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-sm wm-cancel-btn" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : (editingItem ? 'Perbarui Joint Mapping' : 'Simpan Joint Mapping')}
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
