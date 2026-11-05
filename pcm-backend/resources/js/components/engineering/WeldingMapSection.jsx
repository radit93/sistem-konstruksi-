import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { SearchSelect, PcmSelect } from '../SearchSelect';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';
import {
    buildAttributeLabels,
    buildMaterialIndex,
    buildMaterialOptions,
    naturalCompare,
    normSize,
    normSchedule,
    parseInch,
    resolveAttributeLabel,
    sizeWithinRange
} from './materialCascade';

/* --------------------------------------------------------------------------
 * Helper: parsing & format
 * ----------------------------------------------------------------------- */

const autoCalculateDI = (sizeA, sizeB) => {
    const inchA = parseInch(sizeA);
    const inchB = parseInch(sizeB);
    if (!inchA && !inchB) return 0;
    if (inchA && inchB) return Math.max(inchA, inchB);
    return inchA || inchB;
};

const parseThicknessText = (val) => {
    const match = String(val || '').match(/([\d.]+)\s*mm/i);
    return match ? parseFloat(match[1]) : null;
};

const fmt = (val, digits = 2) => {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(digits) : '—';
};

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

function MaterialCard({ label, info, attributeLabel = 'Class / Sch' }) {
    return (
        <div className="wm-mat">
            <div className="wm-mat__head">
                <span className="wm-mat__title">{label}</span>
                {info.std
                    ? <span className="pcm-chip pcm-chip--success">Master</span>
                    : <span className="pcm-chip pcm-chip--neutral">Manual</span>}
            </div>
            <dl className="wm-spec">
                <dt>Group</dt><dd>{info.group || '—'}</dd>
                <dt>Kategori</dt><dd>{info.category || '—'}</dd>
                <dt>Spec</dt><dd>{info.spec || '—'}</dd>
                <dt>Size</dt><dd>{info.size || '—'}</dd>
                <dt>{attributeLabel}</dt><dd>{info.sch || '—'}</dd>
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
    const [systemParameters, setSystemParameters] = useState([]);
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
        mat_a_group: '',
        mat_a_category: '',
        mat_a_spec: '',
        mat_a_size: '',
        mat_a_sch: '',
        mat_b_item: '',
        mat_b_group: '',
        mat_b_category: '',
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
            const [mapData, pipeData, materialData, paramData] = await Promise.all([
                api.get('/welding-maps'),
                api.get('/pipe-standards').catch((err) => {
                    console.error('Failed to load pipe standards:', err);
                    return [];
                }),
                api.get('/material-standards').catch((err) => {
                    console.error('Failed to load material standards:', err);
                    return [];
                }),
                api.get('/system-parameters').catch((err) => {
                    console.error('Failed to load system parameters:', err);
                    return [];
                }),
            ]);
            setMaps(Array.isArray(mapData) ? mapData : []);
            setPipeStandards(Array.isArray(pipeData) ? pipeData : []);
            setMaterialStandards(Array.isArray(materialData) ? materialData : []);
            setSystemParameters(Array.isArray(paramData) ? paramData : []);
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
            group: map[`mat_${key}_group`] || '',
            category: map[`mat_${key}_category`] || '',
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

    /* --- Cascade Material A/B ------------------------------------------
       Urutan produksi: Material Group -> Kategori -> Size -> Sch -> Spesifikasi.
       Logika murni ada di materialCascade.js supaya bisa diuji terpisah. */

    const materialIndex = useMemo(() => buildMaterialIndex(materialStandards), [materialStandards]);

    const attributeLabels = useMemo(() => buildAttributeLabels(systemParameters), [systemParameters]);

    const attributeLabelFor = useCallback(
        (category) => resolveAttributeLabel(attributeLabels, category),
        [attributeLabels]
    );

    const optionsA = useMemo(
        () => buildMaterialOptions({
            materialIndex,
            pipeStandards,
            group: form.mat_a_group,
            category: form.mat_a_category,
            size: form.mat_a_size,
            sch: form.mat_a_sch
        }),
        [materialIndex, pipeStandards, form.mat_a_group, form.mat_a_category, form.mat_a_size, form.mat_a_sch]
    );
    const optionsB = useMemo(
        () => buildMaterialOptions({
            materialIndex,
            pipeStandards,
            group: form.mat_b_group,
            category: form.mat_b_category,
            size: form.mat_b_size,
            sch: form.mat_b_sch
        }),
        [materialIndex, pipeStandards, form.mat_b_group, form.mat_b_category, form.mat_b_size, form.mat_b_sch]
    );

    const attributeLabelA = attributeLabelFor(form.mat_a_category);
    const attributeLabelB = attributeLabelFor(form.mat_b_category);

    /* Length hanya relevan bila Material A adalah pipa. Untuk data lama yang
       belum punya kategori, field tetap tampil selama sudah ada nilainya
       supaya angka lama masih bisa diperbaiki. */
    const showLengthA = form.mat_a_category === 'Pipe'
        || (!form.mat_a_category && form.length_mm !== '' && form.length_mm != null);

    const modalStandard = findStandard(form.mat_a_size, form.mat_a_sch);
    const modalStandardB = findStandard(form.mat_b_size, form.mat_b_sch);

    const stickLengthA = parseFloat(modalStandard?.standard_length_m) || 6;
    const stickWeightA = modalStandard?.weight_kg_stick != null
        ? parseFloat(modalStandard.weight_kg_stick)
        : (modalStandard?.weight_kg_m ? parseFloat(modalStandard.weight_kg_m) * stickLengthA : null);
    const stickLengthB = parseFloat(modalStandardB?.standard_length_m) || 6;
    const stickWeightB = modalStandardB?.weight_kg_stick != null
        ? parseFloat(modalStandardB.weight_kg_stick)
        : (modalStandardB?.weight_kg_m ? parseFloat(modalStandardB.weight_kg_m) * stickLengthB : null);

    /* Penerapan pilihan Material A/B.
       Reset berantai: memilih tingkat N mengosongkan tingkat di bawahnya,
       sehingga tidak pernah ada kombinasi usang. Back-fill: memilih
       Spesifikasi langsung mengisi Group & Kategori dari master. */
    const applyMaterial = (which, field, value) => {
        setForm((prev) => {
            const key = (f) => `mat_${which}_${f}`;
            const next = { ...prev, [key(field)]: value };

            if (field === 'group') {
                next[key('category')] = '';
                next[key('size')] = '';
                next[key('sch')] = '';
                next[key('spec')] = '';
                next[key('item')] = '';
                if (which === 'a') next.length_mm = '';
            } else if (field === 'category') {
                next[key('size')] = '';
                next[key('sch')] = '';
                next[key('spec')] = '';
                next[key('item')] = value;
                /* Length hanya relevan saat Material A adalah pipa. */
                if (which === 'a' && value !== 'Pipe') next.length_mm = '';
            } else if (field === 'size') {
                next[key('sch')] = '';
                next[key('spec')] = '';
            } else if (field === 'sch') {
                next[key('spec')] = '';
            } else if (field === 'spec') {
                const row = materialIndex.find((r) => r.spec === value);
                if (row) {
                    next[key('group')] = row.group;
                    next[key('category')] = row.category;
                    next[key('item')] = row.category;
                    if (which === 'a' && row.category !== 'Pipe') next.length_mm = '';

                    /* Pertahankan Size/Sch hanya bila masih valid untuk baris ini. */
                    const currentSize = next[key('size')];
                    const currentSch = next[key('sch')];
                    const sizeOk = !currentSize
                        || sizeWithinRange(parseInch(currentSize), row);
                    if (!sizeOk) {
                        next[key('size')] = '';
                        next[key('sch')] = '';
                    } else if (currentSch && !row.schedules.includes(currentSch)) {
                        next[key('sch')] = '';
                    }
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
            const specValue = spec.material_spec || prev[`mat_${which}_spec`];
            const next = {
                ...prev,
                [`mat_${which}_spec`]: specValue,
                [`mat_${which}_size`]: spec.size || prev[`mat_${which}_size`],
                [`mat_${which}_sch`]: spec.schedule || prev[`mat_${which}_sch`],
            };

            /* Fit-up spec hanya membawa spesifikasi; Group & Kategori
               diturunkan dari master agar form tetap konsisten. */
            const row = materialIndex.find((r) => r.spec === specValue);
            if (row) {
                next[`mat_${which}_group`] = row.group;
                next[`mat_${which}_category`] = row.category;
                next[`mat_${which}_item`] = row.category;
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
                mat_a_group: item.mat_a_group || '',
                mat_a_category: item.mat_a_category || '',
                mat_a_spec: item.mat_a_spec || '',
                mat_a_size: item.mat_a_size || item.size || '',
                mat_a_sch: item.mat_a_sch || '',
                mat_b_item: item.mat_b_item || '',
                mat_b_group: item.mat_b_group || '',
                mat_b_category: item.mat_b_category || '',
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

    const availableDrawingOptions = useMemo(() => {
        return (availableDrawings || []).map((d) => {
            const sheetInfo = d.sheet ? `(${d.sheet})` : '';
            return {
                value: String(d.id),
                label: `${d.drawing_no} ${sheetInfo} ${d.line_no ? `· Line: ${d.line_no}` : ''}`
            };
        });
    }, [availableDrawings]);

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
                <PcmSelect
                    value={filterSpool}
                    onChange={(e) => setFilterSpool(e.target.value)}
                    aria-label="Filter Spool"
                >
                    <option value="ALL">Semua Spool ({spoolOptions.length})</option>
                    {spoolOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </PcmSelect>

                {/* 4. Dropdown Lokasi */}
                <PcmSelect
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    aria-label="Filter Lokasi"
                >
                    <option value="ALL">Semua Lokasi</option>
                    <option value="Shop">Shop (Workshop)</option>
                    <option value="Field">Field (Lapangan)</option>
                </PcmSelect>
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
                                                                                        <MaterialCard label="Material A" info={materialA} attributeLabel={attributeLabelFor(m.mat_a_category)} />
                                                                                        <MaterialCard label="Material B" info={materialB} attributeLabel={attributeLabelFor(m.mat_b_category)} />
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
                                                                                                    Isi Length (mm) di bagian Material A (muncul bila Kategori = Pipe)
                                                                                                    dan pastikan master pipa tersedia agar berat dihitung otomatis.
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
                                                <SearchSelect
                                                    value={form.drawing_id ? String(form.drawing_id) : ''}
                                                    onChange={(val) => {
                                                        const dId = val;
                                                        const dwg = drawings.find((d) => String(d.id) === String(dId));
                                                        let nextSpoolNo = form.spool_no;
                                                        let nextJointNo = '';
                                                        if (dwg) {
                                                            let sps = dwg.spool_data;
                                                            if (typeof sps === 'string') {
                                                                try { sps = JSON.parse(sps); } catch (err) { sps = []; }
                                                            }
                                                            if (Array.isArray(sps) && sps.length > 0 && sps[0].spool_no) {
                                                                nextSpoolNo = sps[0].spool_no;
                                                                nextJointNo = 'J-01';
                                                            }
                                                        }
                                                        setForm({
                                                            ...form,
                                                            drawing_id: dId,
                                                            iso_drawing_no: dwg ? dwg.drawing_no : '',
                                                            line_no: dwg ? dwg.line_no : form.line_no,
                                                            project_id: dwg?.project_id ? String(dwg.project_id) : form.project_id,
                                                            sheet: dwg ? getDrawingSheet(dwg) : '',
                                                            spool_no: nextSpoolNo,
                                                            joint_no: nextJointNo
                                                        });
                                                    }}
                                                    options={availableDrawingOptions}
                                                    placeholder="Cari & pilih nomor drawing / sheet..."
                                                    allowCustom={false}
                                                    ariaLabel="Pilih Isometric Drawing"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Spool No *</label>
                                                {selectedDrawingSpools.length > 0 ? (
                                                    <PcmSelect
                                                        className="pcm-code fw-bold text-dark"
                                                        value={form.spool_no || ''}
                                                        onChange={(e) => {
                                                            const newSpool = e.target.value;
                                                            setForm({ ...form, spool_no: newSpool, joint_no: 'J-01' });
                                                        }}
                                                        required
                                                    >
                                                        <option value="">-- Pilih Spool --</option>
                                                        {selectedDrawingSpools.map((sp, idx) => (
                                                            <option key={idx} value={sp.spool_no}>
                                                                {sp.spool_no} (Estimasi: {sp.joints_count || 1} Joint)
                                                            </option>
                                                        ))}
                                                    </PcmSelect>
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

                                                    // Jika drawing memiliki data spool, jadikan DROPDOWN langsung
                                                    if (maxJoints != null) {
                                                        const jointOptions = Array.from({ length: maxJoints }, (_, i) => {
                                                            const num = String(i + 1).padStart(2, '0');
                                                            return { val: `J-${num}`, label: `J-${num} (Joint ${i + 1} of ${maxJoints})` };
                                                        });

                                                        return (
                                                            <PcmSelect
                                                                className="pcm-code fw-bold text-dark"
                                                                value={form.joint_no || ''}
                                                                onChange={(e) => setForm({ ...form, joint_no: e.target.value })}
                                                                required
                                                            >
                                                                <option value="">-- Pilih Joint No ({form.spool_no}) --</option>
                                                                {jointOptions.map(opt => (
                                                                    <option key={opt.val} value={opt.val}>
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </PcmSelect>
                                                        );
                                                    }

                                                    // Fallback input teks jika manual tanpa spool_data
                                                    return (
                                                        <div className="input-group wm-prefix-group">
                                                            <span className="input-group-text">J-</span>
                                                            <input
                                                                type="text"
                                                                className="form-control pcm-code"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                placeholder="01"
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
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Tipe Sambungan</label>
                                                <PcmSelect
                                                    
                                                    value={form.joint_type}
                                                    onChange={(e) => setForm({ ...form, joint_type: e.target.value })}
                                                >
                                                    <option value="BW">Butt Weld (BW)</option>
                                                    <option value="SW">Socket Weld (SW)</option>
                                                    <option value="FW">Fillet Weld (FW)</option>
                                                    <option value="THD">Threaded (THD)</option>
                                                </PcmSelect>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Sheet</label>
                                                    <PcmSelect
                                                    
                                                    value={form.sheet}
                                                    onChange={(e) => setForm({ ...form, sheet: e.target.value })}
                                                >
                                                    {sheetOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </PcmSelect>
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
                                        <div className="wm-form-grid wm-form-grid--5">
                                            <div>
                                                <label className="form-label small fw-bold">Material Group</label>
                                                <SearchSelect
                                                    value={form.mat_a_group}
                                                    onChange={(value) => applyMaterial('a', 'group', value)}
                                                    options={optionsA.groupOpts}
                                                    placeholder="Pilih group..."
                                                    ariaLabel="Material Group A"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Kategori</label>
                                                <SearchSelect
                                                    value={form.mat_a_category}
                                                    onChange={(value) => applyMaterial('a', 'category', value)}
                                                    options={optionsA.categoryOpts}
                                                    placeholder="Pilih kategori..."
                                                    ariaLabel="Kategori Material A"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Size (NPS)</label>
                                                <SearchSelect
                                                    value={form.mat_a_size}
                                                    onChange={(value) => applyMaterial('a', 'size', value)}
                                                    options={optionsA.sizeOpts}
                                                    placeholder="Pilih size..."
                                                    ariaLabel="Size Material A"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">{attributeLabelA}</label>
                                                <SearchSelect
                                                    value={form.mat_a_sch}
                                                    onChange={(value) => applyMaterial('a', 'sch', value)}
                                                    options={optionsA.schOpts}
                                                    placeholder={`Pilih ${attributeLabelA}...`}
                                                    ariaLabel={`${attributeLabelA} Material A`}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Spesifikasi Material</label>
                                                <SearchSelect
                                                    value={form.mat_a_spec}
                                                    onChange={(value) => applyMaterial('a', 'spec', value)}
                                                    options={optionsA.specOpts}
                                                    placeholder="Pilih spesifikasi..."
                                                    ariaLabel="Spesifikasi Material A"
                                                />
                                            </div>
                                            {showLengthA && (
                                                <div>
                                                    <label className="form-label small fw-bold" htmlFor="wm-len-a">Length (mm)</label>
                                                    <input
                                                        id="wm-len-a"
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        className="form-control pcm-code"
                                                        placeholder="1200"
                                                        value={form.length_mm}
                                                        onChange={(e) => setForm({ ...form, length_mm: e.target.value })}
                                                    />
                                                </div>
                                            )}
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
                                        <div className="wm-form-grid wm-form-grid--5">
                                            <div>
                                                <label className="form-label small fw-bold">Material Group</label>
                                                <SearchSelect
                                                    value={form.mat_b_group}
                                                    onChange={(value) => applyMaterial('b', 'group', value)}
                                                    options={optionsB.groupOpts}
                                                    placeholder="Pilih group..."
                                                    ariaLabel="Material Group B"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Kategori</label>
                                                <SearchSelect
                                                    value={form.mat_b_category}
                                                    onChange={(value) => applyMaterial('b', 'category', value)}
                                                    options={optionsB.categoryOpts}
                                                    placeholder="Pilih kategori..."
                                                    ariaLabel="Kategori Material B"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Size (NPS)</label>
                                                <SearchSelect
                                                    value={form.mat_b_size}
                                                    onChange={(value) => applyMaterial('b', 'size', value)}
                                                    options={optionsB.sizeOpts}
                                                    placeholder="Pilih size..."
                                                    ariaLabel="Size Material B"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">{attributeLabelB}</label>
                                                <SearchSelect
                                                    value={form.mat_b_sch}
                                                    onChange={(value) => applyMaterial('b', 'sch', value)}
                                                    options={optionsB.schOpts}
                                                    placeholder={`Pilih ${attributeLabelB}...`}
                                                    ariaLabel={`${attributeLabelB} Material B`}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Spesifikasi Material</label>
                                                <SearchSelect
                                                    value={form.mat_b_spec}
                                                    onChange={(value) => applyMaterial('b', 'spec', value)}
                                                    options={optionsB.specOpts}
                                                    placeholder="Pilih spesifikasi..."
                                                    ariaLabel="Spesifikasi Material B"
                                                />
                                            </div>
                                        </div>
                                        <div className="wm-form-meta">
                                            {modalStandardB
                                                ? `Master: ${fmt(modalStandardB.wall_thickness_mm)} mm · ${fmt(modalStandardB.weight_kg_m)} kg/m${stickWeightB != null ? ` · ${fmt(stickWeightB)} kg/batang (${fmt(stickLengthB, 0)} m)` : ''}`
                                                : 'Kombinasi size & schedule ini belum ada di master pipa.'}
                                        </div>
                                    </div>

                                    {/* Fabrikasi & Status */}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Fabrikasi &amp; Status</span>
                                        <div className="wm-form-grid">
                                            <div>
                                                <label className="form-label small fw-bold">Lokasi Las</label>
                                                <PcmSelect
                                                    
                                                    value={form.location}
                                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                                >
                                                    <option value="Shop">Shop (Workshop)</option>
                                                    <option value="Field">Field (Lapangan)</option>
                                                </PcmSelect>
                                            </div>
                                            <div>
                                                <label className="form-label small fw-bold">Status</label>
                                                    <PcmSelect
                                                    
                                                    value={form.status}
                                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </PcmSelect>
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
