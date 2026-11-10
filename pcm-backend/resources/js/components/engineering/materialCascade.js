/**
 * Logika murni untuk cascade Material A/B pada form Welding Map.
 *
 * Dipisah dari komponen supaya bisa diuji langsung terhadap data master
 * (material_standards + pipe_standards) tanpa perlu merender React.
 *
 * Urutan produksi: Material Group -> Kategori -> Size -> Sch -> Spesifikasi.
 *   - Group, Kategori, Sch, Spesifikasi : material_standards
 *   - Size                              : pipe_standards (NPS diskrit)
 *
 * material_standards hanya menyimpan size_range (mis. 1/2" - 24") dan
 * schedule gabungan (mis. "Sch 40 / Sch 80"), sehingga Size diambil dari
 * pipe_standards dan disaring oleh size_range tersebut.
 */

export const parseInch = (val) => {
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

export const normSize = (val) => String(val || '')
    .replace(/["']/g, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .toLowerCase();

export const normSchedule = (val) => String(val || '')
    .toLowerCase()
    .replace(/schedule/g, '')
    .replace(/sch/g, '')
    .replace(/\b(rf|ff|rtj)\b/g, '')   // buang facing flange: "sch 40 rf" -> "40"
    .replace(/(?<=\d)s\b/g, '')        // buang S hanya bila didahului angka: 10S -> 10, XS tetap XS
    .replace(/[\s.]/g, '');

export const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base'
});

const fmtNumber = (val, digits = 2) => {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(digits) : '—';
};

/** "1/2\" - 2-1/2\"" -> { min: 0.5, max: 2.5 } */
export const parseSizeRange = (text) => {
    const parts = String(text || '').split(/"\s*-\s*/);
    if (parts.length !== 2) return { min: 0, max: 0 };
    return { min: parseInch(parts[0]), max: parseInch(parts[1]) };
};

/** "Sch 40 / Sch 80" -> ["Sch 40", "Sch 80"] */
export const splitScheduleList = (text) => String(text || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

export const sizeWithinRange = (inch, row) => {
    if (!row.sizeMin && !row.sizeMax) return true;
    return inch >= row.sizeMin - 0.001 && inch <= row.sizeMax + 0.001;
};

const uniqStrings = (list) => Array.from(new Set(list.filter(Boolean)));

/** Indeks ringkas material_standards untuk keperluan cascade. */
export const buildMaterialIndex = (materialStandards) => (materialStandards || []).map((std) => {
    const range = parseSizeRange(std.size_range);
    return {
        code: std.code || '',
        group: std.material_group || '',
        category: std.category || '',
        spec: std.specification || std.code || '',
        schedules: splitScheduleList(std.schedule),
        sizeMin: range.min,
        sizeMax: range.max
    };
});

/**
 * Semua opsi untuk satu sisi (Material A atau B).
 * Setiap tingkat menyempitkan tingkat berikutnya sehingga pilihan yang
 * tidak valid tidak pernah muncul dan dropdown tidak pernah kosong.
 */
export const buildMaterialOptions = ({ materialIndex = [], pipeStandards = [], group = '', category = '', size = '', sch = '' }) => {
    const rowsOf = (g, c) => materialIndex.filter(
        (r) => (!g || r.group === g) && (!c || r.category === c)
    );

    const groupOpts = uniqStrings(materialIndex.map((r) => r.group))
        .map((v) => ({ value: v, label: v }));

    const categoryOpts = uniqStrings(rowsOf(group, null).map((r) => r.category))
        .map((v) => ({ value: v, label: v }));

    const base = rowsOf(group, category);
    const pool = base.length ? base : rowsOf(group, null);

    const seenNps = new Map();
    (pipeStandards || []).forEach((row) => {
        if (!row.nps || seenNps.has(row.nps)) return;
        const inch = parseInch(row.nps);
        if (!pool.some((r) => sizeWithinRange(inch, r))) return;
        const hint = [row.dn, row.outer_diameter_mm ? `OD ${fmtNumber(row.outer_diameter_mm)}` : '']
            .filter(Boolean)
            .join(' · ');
        seenNps.set(row.nps, { value: row.nps, label: row.nps, hint });
    });
    const sizeOpts = Array.from(seenNps.values()).sort((a, b) => (
        (parseInch(a.value) - parseInch(b.value)) || naturalCompare(a.value, b.value)
    ));

    const rowsForSize = size ? pool.filter((r) => sizeWithinRange(parseInch(size), r)) : pool;
    const schRows = rowsForSize.length ? rowsForSize : pool;
    const schOpts = uniqStrings(schRows.flatMap((r) => r.schedules))
        .map((v) => ({ value: v, label: v }));

    const specRows = schRows.filter((r) => !sch || r.schedules.includes(sch));
    const specPool = specRows.length ? specRows : schRows;
    const specOpts = uniqStrings(specPool.map((r) => r.spec))
        .map((v) => ({ value: v, label: v }))
        .sort((a, b) => naturalCompare(a.label, b.label));

    return { groupOpts, categoryOpts, sizeOpts, schOpts, specOpts };
};

/** Peta label kolom ke-4 per kategori, berasal dari Master Parameter. */
export const buildAttributeLabels = (systemParameters) => {
    const map = new Map();
    (systemParameters || [])
        .filter((p) => p.category === 'material_attribute' && p.is_active !== false)
        .forEach((p) => map.set(String(p.code || '').toLowerCase(), p.name));
    return map;
};

/**
 * Label bawaan supaya judul kolom sudah benar sejak render pertama,
 * sebelum /system-parameters selesai dimuat. Nilai dari Master Parameter
 * selalu menang bila tersedia.
 */
const DEFAULT_ATTRIBUTE_LABELS = {
    pipe: 'Sch',
    fitting: 'Sch',
    flange: 'Sch & Facing',
    valve: 'End Connection',
    gasket: 'Gasket Type',
    fastener: 'Thread & Head'
};

export const resolveAttributeLabel = (labelMap, category) => {
    const key = String(category || '').toLowerCase();
    const fromMaster = labelMap && labelMap.get(key);
    if (fromMaster) return fromMaster;
    return DEFAULT_ATTRIBUTE_LABELS[key] || 'Class / Sch';
};
