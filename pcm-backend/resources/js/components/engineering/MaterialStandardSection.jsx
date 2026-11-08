import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { PcmSelect } from '../SearchSelect';

const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
});

/* Konversi NPS campuran (2", 1-1/2", 1/2") ke angka agar urutan tabel wajar. */
const npsValue = (value) => {
    const text = String(value || '').replace(/["']/g, '').trim().replace(/-/g, ' ');
    if (!text) return Number.POSITIVE_INFINITY;
    const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return Number(mixed[1]) + (Number(mixed[2]) / Number(mixed[3]));
    if (text.includes('/')) {
        const [num, den] = text.split('/');
        return (Number(num) / Number(den)) || Number.POSITIVE_INFINITY;
    }
    const n = parseFloat(text);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
};

const scheduleRank = (value) => {
    const text = String(value || '').trim().toUpperCase();
    if (text === 'STD') return 900;
    if (text === 'XS') return 901;
    if (text === 'XXS') return 902;
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 999;
};

const stickWeightOf = (row) => {
    if (!row) return null;
    if (row.weight_kg_stick !== null && row.weight_kg_stick !== undefined && row.weight_kg_stick !== '') {
        const stored = Number(row.weight_kg_stick);
        if (Number.isFinite(stored)) return stored;
    }
    const perMeter = Number(row.weight_kg_m);
    const length = Number(row.standard_length_m) || 6;
    return Number.isFinite(perMeter) && perMeter > 0 ? perMeter * length : null;
};

const computedStickWeight = (perMeter, length) => {
    const w = Number(perMeter);
    const l = Number(length);
    if (!Number.isFinite(w) || !Number.isFinite(l) || w <= 0 || l <= 0) return '';
    return (w * l).toFixed(2);
};

/* Warna solid prima ber-kontras tinggi, tidak neon & berbeda jelas (R-01, R-29) */
const getMaterialGroupBadgeStyle = (group) => {
    switch (group) {
        case 'Carbon Steel':
            return { backgroundColor: '#1e293b', borderColor: '#0f172a', color: '#ffffff' }; // Solid Dark Charcoal / Hitam Baja
        case 'Stainless Steel':
            return { backgroundColor: '#1d4ed8', borderColor: '#1e40af', color: '#ffffff' }; // Solid Royal Blue / Biru Prima
        case 'Alloy Steel':
            return { backgroundColor: '#b91c1c', borderColor: '#991b1b', color: '#ffffff' }; // Solid Crimson Red / Merah Prima
        default:
            return { backgroundColor: '#334155', borderColor: '#1e293b', color: '#ffffff' }; // Solid Slate
    }
};

/* Warna solid prima untuk 6 Kategori Material - Berbeda jelas satu sama lain, tidak terlalu cerah/neon */
const getCategoryBadgeStyle = (cat) => {
    switch (cat) {
        case 'Pipe':
            return { backgroundColor: '#1e40af', borderColor: '#1e3a8a', color: '#ffffff' }; // Solid Deep Navy Blue
        case 'Fitting':
            return { backgroundColor: '#b45309', borderColor: '#92400e', color: '#ffffff' }; // Solid Warm Amber Gold
        case 'Flange':
            return { backgroundColor: '#0f766e', borderColor: '#115e59', color: '#ffffff' }; // Solid Deep Teal Ocean
        case 'Valve':
            return { backgroundColor: '#15803d', borderColor: '#166534', color: '#ffffff' }; // Solid Forest Green
        case 'Bolt':
            return { backgroundColor: '#475569', borderColor: '#334155', color: '#ffffff' }; // Solid Steel Slate Gray
        case 'Gasket':
            return { backgroundColor: '#6b21a8', borderColor: '#581c87', color: '#ffffff' }; // Solid Rich Purple / Ungu Prima
        default:
            return { backgroundColor: '#334155', borderColor: '#1e293b', color: '#ffffff' };
    }
};

/* Label tampilan untuk tab kategori — nilai data (id) tetap utuh agar filter tidak rusak */
const CATEGORY_TAB_LABELS = {
    ALL: 'Semua Kategori',
    Pipe: 'Pipe',
    Fitting: 'Fitting',
    'Elbow Long Radius': 'Elbow LR',
    'Elbow Short Radius': 'Elbow SR',
    Tee: 'Tee Equal',
    'Tee Reducer': 'Tee Reducing',
    Reducer: 'Reducer',
    'Reducer Concentric': 'Reducer Concentric',
    'Reducer Eccentric': 'Reducer Eccentric',
    Weldolet: 'Weld-o-let',
    Flange: 'Flange',
    Valve: 'Valve',
    Gasket: 'Gasket',
    Fastener: 'Fastener'
};

/* Parser untuk memisahkan Rating Tekanan (#) dan Pressure Class bila ada data gabungan lama */
const parseRatingClass = (val) => {
    if (!val || val === 'N/A' || val === '—' || val === '-') {
        return { rating: '—', classVal: '—' };
    }
    const s = String(val).trim();
    const ratingMatches = s.match(/\d+#/g);
    if (ratingMatches && ratingMatches.length > 0) {
        const ratingStr = ratingMatches.join(' / ');
        const nums = ratingMatches.map(r => r.replace('#', ''));
        const classStr = 'Class ' + nums.join(' / ');
        return { rating: ratingStr, classVal: classStr };
    }
    if (/class/i.test(s)) {
        return { rating: '—', classVal: s };
    }
    return { rating: s, classVal: '—' };
};

/* Helper untuk mengambil nilai Pressure Class yang bersih dan baku */
const getPressureClassDisplay = (item) => {
    if (item.class && item.class !== 'N/A' && item.class !== '—') {
        return item.class;
    }
    if (item.rating && item.rating !== 'N/A' && item.rating !== '—') {
        return item.rating.includes('Class') ? item.rating : `Class ${item.rating.replace('#', '')}`;
    }
    if (item.rating_class && item.rating_class !== 'N/A' && item.rating_class !== '—') {
        const parsed = parseRatingClass(item.rating_class);
        if (parsed.classVal !== '—') return parsed.classVal;
        if (parsed.rating !== '—') return parsed.rating;
        return item.rating_class;
    }
    return '—';
};

/* Render Schedule: Selalu 1 baris (nowrap, no wrap). Ukuran chip & teks otomatis mengecil jika banyak */
const renderDynamicSchedule = (schedule) => {
    if (!schedule || schedule === 'N/A' || schedule === '—' || schedule === '-') {
        return <span className="pcm-cell-sub">—</span>;
    }
    const items = String(schedule)
        .split('/')
        .map(it => it.trim())
        .filter(Boolean);

    if (items.length === 0) return <span className="pcm-cell-sub">—</span>;

    // 1 item: ukuran normal
    if (items.length === 1) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ whiteSpace: 'nowrap' }}>
                <span
                    className="pcm-chip pcm-chip--neutral pcm-code"
                    style={{ fontSize: '0.8125rem', padding: '0.15rem 0.55rem', whiteSpace: 'nowrap' }}
                >
                    {items[0]}
                </span>
            </div>
        );
    }

    // 2 item: tetap 1 baris, font & padding agak mengecil
    if (items.length === 2) {
        return (
            <div className="d-flex align-items-center justify-content-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                {items.map((it, idx) => (
                    <span
                        key={idx}
                        className="pcm-chip pcm-chip--neutral pcm-code"
                        style={{ fontSize: '0.71875rem', padding: '0.12rem 0.4rem', whiteSpace: 'nowrap' }}
                    >
                        {it}
                    </span>
                ))}
            </div>
        );
    }

    // 3 item ke atas: tetap mutlak 1 baris horizontal, font & padding ultra-kompak
    return (
        <div className="d-flex align-items-center justify-content-center gap-1" style={{ whiteSpace: 'nowrap' }}>
            {items.map((it, idx) => (
                <span
                    key={idx}
                    className="pcm-chip pcm-chip--neutral pcm-code"
                    style={{
                        fontSize: items.length >= 4 ? '0.625rem' : '0.65625rem',
                        padding: '0.08rem 0.3rem',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.15
                    }}
                >
                    {it}
                </span>
            ))}
        </div>
    );
};

const PAGE_SIZE = 10;

/* Komponen Pagination Navigasi: Hanya Icon Arrow Hitam Maju dan Mundur (Ukuran sama dengan Reload: 36x36px, SVG 20px) */
function ModernPagination({ currentPage, totalPages, totalItems, itemName = 'data', onPageChange }) {
    if (totalItems === 0) return null;

    const startIdx = (currentPage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(currentPage * PAGE_SIZE, totalItems);

    return (
        <div
            className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-top bg-light"
            style={{
                borderBottomLeftRadius: 'var(--pcm-radius-card)',
                borderBottomRightRadius: 'var(--pcm-radius-card)'
            }}
        >
            <div className="pcm-cell-sub" style={{ fontSize: '0.8125rem', color: '#1e293b' }}>
                Menampilkan <strong>{startIdx}</strong> &ndash; <strong>{endIdx}</strong> dari <strong>{totalItems}</strong> {itemName}
                <span className="ms-2 text-muted fw-normal">(Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>)</span>
            </div>

            <div className="d-flex align-items-center gap-1.5">
                {/* Arrow Hitam Kiri / Mundur — Icon saja tanpa background/border biru */}
                <button
                    type="button"
                    className="pcm-page-nav-btn d-inline-flex align-items-center justify-content-center"
                    disabled={currentPage <= 1}
                    onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) onPageChange(currentPage - 1);
                    }}
                    title="Mundur (Halaman Sebelumnya)"
                    aria-label="Mundur"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
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

                {/* Arrow Hitam Kanan / Maju — Icon saja tanpa background/border biru */}
                <button
                    type="button"
                    className="pcm-page-nav-btn d-inline-flex align-items-center justify-content-center"
                    disabled={currentPage >= totalPages}
                    onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) onPageChange(currentPage + 1);
                    }}
                    title="Maju (Halaman Selanjutnya)"
                    aria-label="Maju"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export function MaterialStandardSection({ user, onToast, initialView = 'material', activeSection }) {
    const [activeStandardView, setActiveStandardView] = useState(initialView);

    /* Scope halaman: 'pipe' = hanya tabel pipa, 'fitting' = hanya tabel fitting,
       'all' = keduanya dalam satu halaman (perilaku lama). Ditentukan oleh menu sidebar. */
    const scope = activeSection === 'pipe_table'
        ? 'pipe'
        : activeSection === 'fitting_table'
            ? 'fitting'
            : 'all';

    /* Scope untuk halaman Material Standart (menu punya 3 anak). */
    const materialScope = activeSection === 'material_pipe'
        ? 'pipe'
        : activeSection === 'material_fitting'
            ? 'fitting'
            : activeSection === 'material_additional'
                ? 'additional'
                : 'all';

    // 1. Material Standards State
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const emptyMaterialForm = () => ({
        code: '',
        category: 'Pipe',
        specification: '',
        material_group: 'Carbon Steel',
        pressure_class: '',
        schedule: '',
        size_range: '',
        description: ''
    });

    const [form, setForm] = useState(emptyMaterialForm);

    // 2. Pipe Standards (Diameter & Thickness) State
    const [pipeStandards, setPipeStandards] = useState([]);
    const [fittingStandards, setFittingStandards] = useState([]);
    const [pipeLoading, setPipeLoading] = useState(false);
    const [pipeSearch, setPipeSearch] = useState('');
    const [showPipeModal, setShowPipeModal] = useState(false);
    const [editingPipeItem, setEditingPipeItem] = useState(null);
    const [pipeFormLoading, setPipeFormLoading] = useState(false);
    const [pipeFormError, setPipeFormError] = useState('');

    const emptyPipeForm = () => ({
        nps: '',
        dn: '',
        schedule: '',
        wall_thickness_mm: '',
        outer_diameter_mm: '',
        weight_kg_m: '',
        standard_length_m: '6',
        weight_kg_stick: ''
    });

    const [pipeForm, setPipeForm] = useState(emptyPipeForm());
    const [fittingCategory, setFittingCategory] = useState(scope === 'fitting' ? 'Elbow Long Radius' : 'Pipe');
    const [fittingSearch, setFittingSearch] = useState('');
    const [fittingPage, setFittingPage] = useState(1);

    /* Reset halaman fitting ketika search / kategori berubah */
    useEffect(() => {
        setFittingPage(1);
    }, [fittingSearch, fittingCategory]);

    /* Filter + sort + pagination untuk tabel fitting (tidak ada slice(0,100)) */
    const filteredFittings = useMemo(() => {
        const q = fittingSearch.toLowerCase();
        /* Set kategori aktif — hanya matching baris yang sesuai kategori */
        const activeCat = fittingCategory;
        return fittingStandards
            .filter((row) => {
                const type = (row.fitting_type || '').toLowerCase();
                const cat = (row.category || '').toLowerCase();
                /* Filter kategori — matching ketat berdasarkan kategori atau fitting_type */
                let catMatch = true;
                if (activeCat === 'Elbow Long Radius') catMatch = type.includes('long radius') || type.includes('return bend') || cat.includes('elbow');
                else if (activeCat === 'Elbow Short Radius') catMatch = type.includes('short radius') || cat.includes('short');
                else if (activeCat === 'Tee') catMatch = type.includes('equal tee') || type === 'tee' || cat.includes('tee (percabangan)') && !type.includes('reducing');
                else if (activeCat === 'Tee Reducer') catMatch = type.includes('reducing tee') || type.includes('tee reducer');
                else if (activeCat === 'Reducer Concentric') catMatch = type.includes('concentric reducer') || cat.includes('concentric');
                else if (activeCat === 'Reducer Eccentric') catMatch = type.includes('eccentric reducer') || cat.includes('eccentric');
                else if (activeCat !== 'Pipe') catMatch = true;

                /* Search */
                const matchSearch = !q ||
                    (row.item_code || '').toLowerCase().includes(q) ||
                    (row.fitting_type || '').toLowerCase().includes(q) ||
                    (row.material_cs || '').toLowerCase().includes(q) ||
                    (row.schedule_class || '').toLowerCase().includes(q) ||
                    (row.nps_main || '').toLowerCase().includes(q);
                return catMatch && matchSearch;
            })
            .sort((a, b) =>
                (npsValue(a.nps_main) - npsValue(b.nps_main)) ||
                (scheduleRank(a.schedule_class) - scheduleRank(b.schedule_class)) ||
                naturalCompare(a.item_code, b.item_code)
            );
    }, [fittingStandards, fittingSearch, fittingCategory]);

    const paginatedFittings = useMemo(() => {
        const start = (fittingPage - 1) * PAGE_SIZE;
        return filteredFittings.slice(start, start + PAGE_SIZE);
    }, [filteredFittings, fittingPage]);

    const handleDeleteFitting = async (id) => {
        if (!(await confirmDelete('Yakin ingin menghapus fitting ini dari master data?'))) return;
        try {
            await api.delete(`/fitting-standards/${id}`);
            if (onToast) onToast('Master fitting berhasil dihapus.');
            loadFittingData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus fitting.');
        }
    };

    /* Selaraskan view & tab aktif setiap kali menu sidebar berganti.
       Diletakkan setelah deklarasi state agar tidak kena temporal dead zone. */
    useEffect(() => {
        if (activeSection === 'pipe_table') {
            setActiveStandardView('pipe');
            setFittingCategory('Pipe');
        } else if (activeSection === 'fitting_table') {
            setActiveStandardView('pipe');
            setFittingCategory((prev) => (prev === 'Pipe' ? 'Elbow Long Radius' : prev));
        } else if (activeSection === 'pipe_standard' || activeSection === 'pipe_schedule') {
            setActiveStandardView('pipe');
        } else if (activeSection === 'material_standard') {
            setActiveStandardView('material');
        } else if (activeSection === 'material_pipe' || activeSection === 'material_fitting' || activeSection === 'material_additional') {
            setActiveStandardView('material');
            setFilterCategory('ALL');
        }
    }, [activeSection]);

    const fittingCategories = [
        { id: 'Pipe', label: 'Pipe' },
        { id: 'Elbow Long Radius', label: 'Elbow LR' },
        { id: 'Elbow Short Radius', label: 'Elbow SR' },
        { id: 'Tee', label: 'Tee Equal' },
        { id: 'Tee Reducer', label: 'Tee Reducing' },
        { id: 'Reducer Concentric', label: 'Reducer Concentric' },
        { id: 'Reducer Eccentric', label: 'Reducer Eccentric' },
        { id: 'Weldolet', label: 'Weld-o-let' },
    ];

    /* Saat halaman dibuka dari menu "Tabel Fitting", tab Pipe disembunyikan
       karena pipa punya halaman sendiri. */
    const visibleFittingCategories = scope === 'fitting'
        ? fittingCategories.filter((f) => f.id !== 'Pipe')
        : fittingCategories;

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/material-standards');
            setStandards(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load material standards:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadFittingData = useCallback(async () => {
        try {
            const data = await api.get('/fitting-standards');
            setFittingStandards(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load fitting standards:', err);
        }
    }, []);

    const loadPipeData = useCallback(async () => {
        setPipeLoading(true);
        try {
            const data = await api.get('/pipe-standards');
            setPipeStandards(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load pipe standards:', err);
        } finally {
            setPipeLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadPipeData();
        loadFittingData();
    }, [loadData, loadPipeData, loadFittingData]);

    const categories = [
        'ALL',
        'Pipe',
        'Fitting',
        'Elbow Long Radius',
        'Elbow Short Radius',
        'Tee',
        'Tee Reducer',
        'Reducer Concentric',
        'Reducer Eccentric',
        'Weldolet',
        'Flange',
        'Valve',
        'Gasket',
        'Fastener',
    ];

    /* Pengelompokan kategori untuk 3 anak menu Material Standart. */
    const MATERIAL_SCOPE_CATEGORIES = {
        pipe: ['Pipe'],
        fitting: ['Fitting', 'Elbow Long Radius', 'Elbow Short Radius', 'Tee', 'Tee Reducer', 'Reducer Concentric', 'Reducer Eccentric', 'Weldolet'],
        additional: ['Flange', 'Valve', 'Gasket', 'Fastener']
    };

    const visibleCategories = materialScope === 'all'
        ? categories
        : ['ALL', ...(MATERIAL_SCOPE_CATEGORIES[materialScope] || [])];

    const materialScopeSet = materialScope === 'all'
        ? null
        : new Set(MATERIAL_SCOPE_CATEGORIES[materialScope] || []);

    /* Tab bar tidak perlu tampil bila hanya ada satu kategori di dalam scope. */
    const showCategoryTabs = materialScope === 'all'
        || (MATERIAL_SCOPE_CATEGORIES[materialScope] || []).length > 1;

    const filteredStandards = useMemo(() => {
        const q = search.toLowerCase();
        const rows = standards.filter(s => {
            const matchCat = filterCategory === 'ALL' || s.category === filterCategory;
            const matchScope = !materialScopeSet || materialScopeSet.has(s.category);
            const matchSearch = !q ||
                (s.code || '').toLowerCase().includes(q) ||
                (s.specification || '').toLowerCase().includes(q) ||
                (s.material_group || '').toLowerCase().includes(q) ||
                (s.schedule || '').toLowerCase().includes(q);
            return matchCat && matchScope && matchSearch;
        });
        return rows.sort((a, b) => naturalCompare(a.code, b.code));
    }, [standards, search, filterCategory, materialScope]);

    const filteredPipes = useMemo(() => {
        const q = pipeSearch.toLowerCase();
        const rows = !q
            ? pipeStandards
            : pipeStandards.filter(p =>
                (p.nps || '').toLowerCase().includes(q) ||
                (p.dn || '').toLowerCase().includes(q) ||
                (p.schedule || '').toLowerCase().includes(q)
            );
        return [...rows].sort((a, b) => (
            (npsValue(a.nps) - npsValue(b.nps))
            || (scheduleRank(a.schedule) - scheduleRank(b.schedule))
            || naturalCompare(a.schedule, b.schedule)
        ));
    }, [pipeStandards, pipeSearch]);

    // Pagination: Maksimal 10 baris per halaman (lebih ringkas & pas di layar)
    const [currentPage, setCurrentPage] = useState(1);
    const [pipeCurrentPage, setPipeCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterCategory]);

    useEffect(() => {
        setPipeCurrentPage(1);
    }, [pipeSearch]);

    const totalStandardPages = Math.ceil(filteredStandards.length / PAGE_SIZE) || 1;
    const paginatedStandards = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredStandards.slice(start, start + PAGE_SIZE);
    }, [filteredStandards, currentPage]);

    const totalPipePages = Math.ceil(filteredPipes.length / PAGE_SIZE) || 1;
    const paginatedPipes = useMemo(() => {
        const start = (pipeCurrentPage - 1) * PAGE_SIZE;
        return filteredPipes.slice(start, start + PAGE_SIZE);
    }, [filteredPipes, pipeCurrentPage]);

    // Material Standards Handlers
    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            const pClass = item.class && item.class !== 'N/A' && item.class !== '—'
                ? item.class
                : (item.rating && item.rating !== 'N/A' && item.rating !== '—'
                    ? (item.rating.includes('Class') ? item.rating : `Class ${item.rating.replace('#', '')}`)
                    : (item.rating_class && item.rating_class !== 'N/A' ? item.rating_class : ''));

            setForm({
                code: item.code || '',
                category: item.category || 'Pipe',
                specification: item.specification || '',
                material_group: item.material_group || 'Carbon Steel',
                pressure_class: pClass,
                schedule: item.schedule || '',
                size_range: item.size_range || '',
                description: item.description || ''
            });
        } else {
            setEditingItem(null);
            setForm(emptyMaterialForm());
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.code.trim() || !form.specification.trim()) {
            setFormError('Kode Standar dan Spesifikasi Lengkap wajib diisi.');
            return;
        }

        const pClassVal = form.pressure_class && form.pressure_class.trim() ? form.pressure_class.trim() : 'N/A';
        // Ekstrak angka pound untuk sinkronisasi kompatibilitas
        const nums = pClassVal.match(/\d+/g);
        const ratingVal = nums ? nums.map(n => `${n}#`).join(' / ') : (pClassVal === 'N/A' ? 'N/A' : pClassVal);

        const payload = {
            ...form,
            class: pClassVal,
            rating: ratingVal,
            rating_class: pClassVal
        };

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/material-standards/${editingItem.id}`, payload);
                if (onToast) onToast('Standar Material berhasil diperbarui.');
            } else {
                await api.post('/material-standards', payload);
                if (onToast) onToast('Standar Material baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan Standar Material.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirmDelete('Yakin ingin menghapus Standar Material ini?'))) return;
        try {
            await api.delete(`/material-standards/${id}`);
            if (onToast) onToast('Standar Material berhasil dihapus.');
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    // Pipe Standards Handlers
    const handleOpenPipeModal = (item = null) => {
        setPipeFormError('');
        if (item) {
            setEditingPipeItem(item);
            setPipeForm({
                nps: item.nps || '',
                dn: item.dn || '',
                schedule: item.schedule || '',
                wall_thickness_mm: item.wall_thickness_mm || '',
                outer_diameter_mm: item.outer_diameter_mm || '',
                weight_kg_m: item.weight_kg_m ?? '',
                standard_length_m: item.standard_length_m ?? '6',
                weight_kg_stick: item.weight_kg_stick ?? computedStickWeight(item.weight_kg_m, item.standard_length_m ?? 6)
            });
        } else {
            setEditingPipeItem(null);
            setPipeForm(emptyPipeForm());
        }
        setShowPipeModal(true);
    };

    const handleSavePipe = async (e) => {
        e.preventDefault();
        setPipeFormError('');
        if (!pipeForm.nps.trim() || !pipeForm.schedule.trim()) {
            setPipeFormError('Nominal Pipe Size (NPS) and Schedule / Wall Thickness are required.');
            return;
        }

        const standardLength = pipeForm.standard_length_m === '' ? '6' : pipeForm.standard_length_m;
        const weightStick = pipeForm.weight_kg_stick !== ''
            ? pipeForm.weight_kg_stick
            : computedStickWeight(pipeForm.weight_kg_m, standardLength);
        const nullableNumber = (value) => (value === '' || value === null || value === undefined ? null : value);
        const payload = {
            ...pipeForm,
            wall_thickness_mm: nullableNumber(pipeForm.wall_thickness_mm),
            outer_diameter_mm: nullableNumber(pipeForm.outer_diameter_mm),
            weight_kg_m: nullableNumber(pipeForm.weight_kg_m),
            standard_length_m: standardLength,
            weight_kg_stick: nullableNumber(weightStick)
        };

        setPipeFormLoading(true);
        try {
            if (editingPipeItem) {
                await api.put(`/pipe-standards/${editingPipeItem.id}`, payload);
                if (onToast) onToast('Master pipa berhasil diperbarui.');
            } else {
                await api.post('/pipe-standards', payload);
                if (onToast) onToast('Master pipa baru berhasil ditambahkan.');
            }
            setShowPipeModal(false);
            loadPipeData();
        } catch (err) {
            setPipeFormError(err.message || 'Gagal menyimpan data master pipa.');
        } finally {
            setPipeFormLoading(false);
        }
    };

    const handleDeletePipe = async (id) => {
        if (!(await confirmDelete('Yakin ingin menghapus ukuran pipa ini dari master data?'))) return;
        try {
            await api.delete(`/pipe-standards/${id}`);
            if (onToast) onToast('Ukuran pipa berhasil dihapus.');
            loadPipeData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    return (
        <div>
            {/* Header Toolbar */}
            <div className="mb-4">
                <h2 className="h3 fw-bolder text-dark mb-0" style={{ letterSpacing: '-0.02em' }}>
                    {activeStandardView === 'material'
                        ? (materialScope === 'pipe'
                            ? 'Standart Material — Pipe'
                            : materialScope === 'fitting'
                                ? 'Standart Material — Fitting'
                                : materialScope === 'additional'
                                    ? 'Standart Material — Additional'
                                    : 'Katalog Standar Material ASTM')
                        : scope === 'pipe'
                            ? 'Pipe Dimension & Wall Thickness ASME B36.10M'
                            : scope === 'fitting'
                                ? 'Dimensi & Berat Fitting ASME B16.9 / MSS SP-97'
                                : 'Master Diameter & Ketebalan'}
                </h2>
            </div>

            {/* VIEW 1: Standar Material ASTM */}
            {activeStandardView === 'material' && (
                <>
                    {/* Kategori Berada di Atas Search */}
                    {showCategoryTabs && (
                    <div className="mb-3">
                        <div className="pcm-tabbar" role="tablist" aria-label="Filter Kategori Material">
                            {visibleCategories.map(cat => {
                                const isSel = filterCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSel}
                                        className={`pcm-tabbar__item${isSel ? ' is-active' : ''}`}
                                        onClick={() => setFilterCategory(cat)}
                                    >
                                        {CATEGORY_TAB_LABELS[cat] || cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    )}

                    {/* Search di Kiri & Tambah Standar Material di Kanan Sejajar dengan Cari */}
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="flex-grow-1">
                            <input
                                type="text"
                                className="form-control form-control-sm pcm-filter-input w-100"
                                placeholder="Cari Kode, Spesifikasi ASTM, Group..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-2 text-nowrap"
                                style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                onClick={() => handleOpenModal()}
                            >
                                + Tambah Standar Material
                            </button>
                        )}
                    </div>

                    {/* Table Material Standards */}
                    <div className="pcm-card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                        <div className="table-responsive flex-grow-1" style={{ minHeight: '440px' }}>
                            <table className="table table-hover align-middle pcm-table mb-0" style={{ tableLayout: 'fixed', minWidth: '1170px', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '160px' }} />
                                    <col style={{ width: '130px' }} />
                                    <col style={{ width: '220px' }} />
                                    <col style={{ width: '140px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '130px' }} />
                                    <col style={{ width: '130px' }} />
                                    {canEdit && <col style={{ width: '140px' }} />}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                            <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Kode Standar</span>
                                        </th>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                             <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Kategori</span>
                                        </th>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                             <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Spesifikasi Material</span>
                                        </th>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                             <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Material Group</span>
                                        </th>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                             <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Pressure Class</span>
                                        </th>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                             <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Schedule</span>
                                        </th>
                                        <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                             <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Rentang Ukuran</span>
                                        </th>
                                        {canEdit && (
                                            <th className="text-center pe-3 text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Aksi</span>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={canEdit ? 8 : 7} className="text-center py-4 pcm-cell-sub">
                                                Memuat data Standar Material...
                                            </td>
                                        </tr>
                                    ) : filteredStandards.length === 0 ? (
                                        <tr>
                                            <td colSpan={canEdit ? 8 : 7} className="text-center py-4 pcm-cell-sub">
                                                Belum ada standar material yang terdaftar. Silakan tambahkan data baru.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedStandards.map((s) => {
                                            const pressureClassDisplay = getPressureClassDisplay(s);
                                            const isSpecLong = (s.specification || '').length > 22;

                                            return (
                                                <tr key={s.id}>
                                                    <td className="ps-3 text-start fw-bold pcm-code text-nowrap" style={{ color: '#0f172a', verticalAlign: 'middle', padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }} title={s.code}>
                                                        {s.code}
                                                    </td>
                                                    <td className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        <span
                                                            className="pcm-chip"
                                                            style={{
                                                                ...getCategoryBadgeStyle(s.category),
                                                                fontSize: '0.72rem',
                                                                padding: '0.15rem 0.45rem',
                                                                display: 'inline-block',
                                                                maxWidth: '125px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            title={s.category}
                                                        >
                                                            {s.category}
                                                        </span>
                                                    </td>
                                                    <td className="text-start pcm-cell-strong text-nowrap" style={{ verticalAlign: 'middle', padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.specification}>
                                                        {s.specification}
                                                    </td>
                                                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                                                        <span className="pcm-chip" style={getMaterialGroupBadgeStyle(s.material_group)}>
                                                            {s.material_group}
                                                        </span>
                                                    </td>
                                                    <td className="text-center pcm-code font-monospace" style={{ fontSize: '0.8125rem' }}>
                                                        {pressureClassDisplay && pressureClassDisplay !== '—' && pressureClassDisplay !== 'N/A' ? (
                                                            <span className="pcm-chip pcm-chip--neutral pcm-code" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', whiteSpace: 'nowrap' }}>
                                                                {pressureClassDisplay}
                                                            </span>
                                                        ) : (
                                                            <span className="pcm-cell-sub">—</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                        {renderDynamicSchedule(s.schedule)}
                                                    </td>
                                                    <td className="text-center pcm-code font-monospace" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                                        {s.size_range && s.size_range !== 'N/A' && s.size_range !== '—' ? (
                                                            s.size_range
                                                        ) : (
                                                            <span className="pcm-cell-sub">—</span>
                                                        )}
                                                    </td>
                                                    {canEdit && (
                                                        <td className="text-center pe-2 text-nowrap">
                                                            <div className="d-inline-flex align-items-center justify-content-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm px-2 py-0.5 fw-bold"
                                                                    style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff', fontSize: '0.75rem' }}
                                                                    onClick={() => handleOpenModal(s)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm px-2 py-0.5 fw-bold"
                                                                    style={{ fontSize: '0.75rem' }}
                                                                    onClick={() => handleDelete(s.id)}
                                                                >
                                                                    Hapus
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                    {/* Empty rows spacer to fix table height precisely at 10 rows */}
                                    {!loading && paginatedStandards.length > 0 && paginatedStandards.length < PAGE_SIZE && (
                                        Array.from({ length: PAGE_SIZE - paginatedStandards.length }).map((_, idx) => (
                                            <tr key={`empty-std-${idx}`} style={{ height: '39px' }} aria-hidden="true">
                                                <td colSpan={canEdit ? 8 : 7} style={{ borderBottom: '1px solid #f1f5f9', background: 'transparent' }}>&nbsp;</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar Standar Material */}
                        {filteredStandards.length > 0 && (
                            <ModernPagination
                                currentPage={currentPage}
                                totalPages={totalStandardPages}
                                totalItems={filteredStandards.length}
                                itemName="data standar"
                                onPageChange={(p) => setCurrentPage(p)}
                            />
                        )}
                    </div>
                </>
            )}

            {/* VIEW 2: Master Diameter & Ketebalan Pipa (Pipe Standards) */}
            {activeStandardView === 'pipe' && (
                <>
                    {scope !== 'pipe' && (
                    <div className="mb-3">
                        <div className="pcm-tabbar" role="tablist" aria-label="Filter komponen master diameter">
                            {visibleFittingCategories.map((item) => {
                                const isSel = fittingCategory === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSel}
                                        className={`pcm-tabbar__item${isSel ? ' is-active' : ''}`}
                                        onClick={() => setFittingCategory(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    )}
                    {fittingCategory !== 'Pipe' && (
                        <div className="pcm-card mb-4">
                            {/* Toolbar Fitting: Search kiri, Tambah kanan */}
                            <div className="d-flex align-items-center gap-3 p-3 border-bottom bg-light">
                                <div className="flex-grow-1">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm pcm-filter-input w-100"
                                        placeholder="Cari item_code, fitting_type, material_cs, schedule..."
                                        value={fittingSearch}
                                        onChange={(e) => setFittingSearch(e.target.value)}
                                    />
                                </div>
                                <span className="pcm-cell-sub text-nowrap small">
                                    {filteredFittings.length} fitting · page {fittingPage}/{Math.ceil(filteredFittings.length / PAGE_SIZE) || 1}
                                </span>
                            </div>
                            <div className="table-responsive flex-grow-1" style={{ minHeight: '440px' }}>
                                <table className="table table-hover align-middle pcm-table mb-0" style={{ tableLayout: 'fixed', minWidth: '1080px', width: '100%' }}>
                                    <colgroup>
                                        <col style={{ width: '140px' }} />
                                        <col style={{ width: '125px' }} />
                                        <col style={{ width: '100px' }} />
                                        <col style={{ width: '130px' }} />
                                        <col style={{ width: '90px' }} />
                                        <col style={{ width: '120px' }} />
                                        <col style={{ width: '130px' }} />
                                        <col style={{ width: '100px' }} />
                                        {canEdit && <col style={{ width: '145px' }} />}
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Item Code</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Kategori / Tipe</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Standar ASME</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Koneksi</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Ukuran (NPS)</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Schedule / Class</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Material CS</span>
                                            </th>
                                            <th className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Berat (kg)</span>
                                            </th>
                                            {canEdit && (
                                                <th className="text-center pe-3 text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                    <span className="pcm-th-title" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Aksi</span>
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredFittings.length === 0 ? (
                                            <tr>
                                                <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                                    {fittingSearch ? 'Tidak ada fitting yang cocok dengan pencarian.' : 'Belum ada fitting yang terdaftar.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedFittings.map((row) => {
                                                const pressureClassDisplay = row.schedule_class && (row.item_code || '').startsWith('FG-')
                                                    ? row.schedule_class
                                                    : null;
                                                return (
                                                    <tr key={row.id}>
                                                        <td className="ps-3 pe-2 text-start fw-bold pcm-code text-nowrap" style={{ color: '#0f172a', verticalAlign: 'middle', padding: '0.45rem 0.5rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }} title={row.item_code}>
                                                            {row.item_code}
                                                        </td>
                                                        <td className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            <span
                                                                className="pcm-chip"
                                                                style={{
                                                                    ...getCategoryBadgeStyle(row.category || 'Fitting'),
                                                                    fontSize: '0.72rem',
                                                                    padding: '0.15rem 0.45rem',
                                                                    display: 'inline-block',
                                                                    maxWidth: '135px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                                title={row.category}
                                                            >
                                                                {row.category}
                                                            </span>
                                                        </td>
                                                        <td className="text-center pcm-code font-monospace text-nowrap" style={{ fontSize: '0.78rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {row.asme_standard || '—'}
                                                        </td>
                                                        <td className="text-center pcm-cell-sub text-nowrap" style={{ fontSize: '0.76rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }} title={row.connection}>
                                                            {row.connection || '—'}
                                                        </td>
                                                        <td className="text-center pcm-code fw-semibold text-nowrap" style={{ fontSize: '0.8rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {row.nps_main || '—'}
                                                            {row.nps_secondary ? ` × ${row.nps_secondary}` : ''}
                                                        </td>
                                                        <td className="text-center text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {renderDynamicSchedule(row.schedule_class)}
                                                        </td>
                                                        <td className="text-center pcm-cell-sub text-nowrap" style={{ fontSize: '0.76rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }} title={row.material_cs}>
                                                            {row.material_cs || '—'}
                                                        </td>
                                                        <td className="text-center pcm-code fw-semibold text-nowrap" style={{ fontSize: '0.8rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {row.weight_cs_kg != null && row.weight_cs_kg !== '' ? `${parseFloat(row.weight_cs_kg).toFixed(3)} kg` : '—'}
                                                        </td>
                                                        {canEdit && (
                                                            <td className="text-center pe-2 text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                                <div className="d-inline-flex align-items-center justify-content-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary btn-sm px-2 py-0.5 fw-bold"
                                                                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff', fontSize: '0.72rem' }}
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-danger btn-sm px-2 py-0.5 fw-bold"
                                                                        style={{ fontSize: '0.72rem' }}
                                                                        onClick={() => handleDeleteFitting(row.id)}
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        )}
                                        {/* Empty rows spacer */}
                                        {!loading && paginatedFittings.length > 0 && paginatedFittings.length < PAGE_SIZE && (
                                            Array.from({ length: PAGE_SIZE - paginatedFittings.length }).map((_, idx) => (
                                                <tr key={`empty-fit-${idx}`} style={{ height: '39px' }} aria-hidden="true">
                                                    <td colSpan={canEdit ? 9 : 8} style={{ borderBottom: '1px solid #f1f5f9', background: 'transparent' }}>&nbsp;</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Bar Fitting */}
                            {filteredFittings.length > 0 && (
                                <ModernPagination
                                    currentPage={fittingPage}
                                    totalPages={Math.ceil(filteredFittings.length / PAGE_SIZE)}
                                    totalItems={filteredFittings.length}
                                    itemName="fitting"
                                    onPageChange={(p) => setFittingPage(p)}
                                />
                            )}
                        </div>
                    )}
                    {fittingCategory === 'Pipe' && (
                    <>
                    {/* Search di Kiri & Tambah Ukuran Pipa di Kanan Sejajar */}
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="flex-grow-1">
                            <input
                                type="text"
                                className="form-control form-control-sm pcm-filter-input w-100"
                                placeholder="Search diameter (NPS), DN, or schedule..."
                                value={pipeSearch}
                                onChange={(e) => setPipeSearch(e.target.value)}
                            />
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-2 text-nowrap"
                                style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                onClick={() => handleOpenPipeModal()}
                            >
                                + Add Pipe Size
                            </button>
                        )}
                    </div>

                    <div className="pcm-card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                        <div className="table-responsive flex-grow-1" style={{ minHeight: '440px' }}>
                            <table className="table table-hover align-middle pcm-table mb-0" style={{ tableLayout: 'fixed', minWidth: '1080px', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '110px' }} />
                                    <col style={{ width: '90px' }} />
                                    <col style={{ width: '100px' }} />
                                    <col style={{ width: '125px' }} />
                                    <col style={{ width: '130px' }} />
                                    <col style={{ width: '130px' }} />
                                    <col style={{ width: '105px' }} />
                                    <col style={{ width: '145px' }} />
                                    {canEdit && <col style={{ width: '145px' }} />}
                                </colgroup>
                                <thead>
                                     <tr>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Nominal Size</span>
                                             <span className="pcm-th-unit">NPS (inch)</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Metric</span>
                                             <span className="pcm-th-unit">DN (mm)</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Schedule</span>
                                             <span className="pcm-th-unit">SCH</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Wall Thickness</span>
                                             <span className="pcm-th-unit">mm</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Outside Diameter</span>
                                             <span className="pcm-th-unit">OD (mm)</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Nominal Weight</span>
                                             <span className="pcm-th-unit">kg/m</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Pipe Length</span>
                                             <span className="pcm-th-unit">m</span>
                                         </th>
                                         <th className="text-center">
                                             <span className="pcm-th-title">Pipe Weight</span>
                                             <span className="pcm-th-unit">kg</span>
                                         </th>
                                         {canEdit && (
                                             <th className="text-center pe-3">
                                                <span className="pcm-th-title">Action</span>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pipeLoading ? (
                                        <tr>
                                            <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                                Loading pipe master data...
                                            </td>
                                        </tr>
                                    ) : filteredPipes.length === 0 ? (
                                        <tr>
                                            <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                                No pipe master data registered yet. Add a new pipe size to begin.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedPipes.map((p) => (
                                            <tr key={p.id}>
                                                <td className="text-center fw-bold pcm-code" style={{ fontSize: '0.9375rem', color: '#0f172a' }}>
                                                    {p.nps}
                                                </td>
                                                <td className="text-center pcm-cell-sub font-monospace">{p.dn || '—'}</td>
                                                <td className="text-center">
                                                    <span className="pcm-chip pcm-chip--neutral pcm-code">{p.schedule}</span>
                                                </td>
                                                <td className="text-center pcm-code fw-semibold">{p.wall_thickness_mm ? `${parseFloat(p.wall_thickness_mm).toFixed(2)} mm` : '—'}</td>
                                                <td className="text-center pcm-code">{p.outer_diameter_mm ? `${parseFloat(p.outer_diameter_mm).toFixed(2)} mm` : '—'}</td>
                                                <td className="text-center pcm-code">{p.weight_kg_m ? `${parseFloat(p.weight_kg_m).toFixed(2)} kg/m` : '—'}</td>
                                                <td className="text-center pcm-code">{p.standard_length_m ? `${parseFloat(p.standard_length_m).toFixed(2)} m` : '6.00 m'}</td>
                                                <td className="text-center pcm-code fw-semibold">{stickWeightOf(p) != null ? `${stickWeightOf(p).toFixed(2)} kg` : '—'}</td>
                                                {canEdit && (
                                                    <td className="text-center pe-2 text-nowrap" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        <div className="d-inline-flex align-items-center justify-content-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm px-2 py-0.5 fw-bold"
                                                                style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff', fontSize: '0.72rem' }}
                                                                onClick={() => handleOpenPipeModal(p)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm px-2 py-0.5 fw-bold"
                                                                style={{ fontSize: '0.72rem' }}
                                                                onClick={() => handleDeletePipe(p.id)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    {/* Empty rows spacer to fix table height precisely at 10 rows */}
                                    {!pipeLoading && paginatedPipes.length > 0 && paginatedPipes.length < PAGE_SIZE && (
                                        Array.from({ length: PAGE_SIZE - paginatedPipes.length }).map((_, idx) => (
                                            <tr key={`empty-pipe-${idx}`} style={{ height: '39px' }} aria-hidden="true">
                                                <td colSpan={canEdit ? 9 : 8} style={{ borderBottom: '1px solid #f1f5f9', background: 'transparent' }}>&nbsp;</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar Pipe Standards */}
                        {filteredPipes.length > 0 && (
                            <ModernPagination
                                currentPage={pipeCurrentPage}
                                totalPages={totalPipePages}
                                totalItems={filteredPipes.length}
                                itemName="pipe sizes"
                                onPageChange={(p) => setPipeCurrentPage(p)}
                            />
                        )}
                    </div>
                    </>
                    )}
                </>
            )}

            {/* Modal Add / Edit Standar Material */}
            {showModal && (
                <div className="modal fade show d-block pcm-modal" style={{ zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Standar Material' : 'Tambah Standar Material Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                         <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                     )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kode Standar *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: STD-A106-B"
                                                value={form.code}
                                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Kategori Komponen *</label>
                                            <PcmSelect
                                                
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="Pipe">Pipe</option>
                                                <option value="Fitting">Fitting</option>
                                                <option value="Flange">Flange</option>
                                                <option value="Valve">Valve</option>
                                                <option value="Gasket">Gasket</option>
                                                <option value="Fastener">Fastener (Bolt &amp; Nut)</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Material Group *</label>
                                            <PcmSelect
                                                
                                                value={form.material_group}
                                                onChange={(e) => setForm({ ...form, material_group: e.target.value })}
                                            >
                                                <option value="Carbon Steel">Carbon Steel</option>
                                                <option value="Stainless Steel">Stainless Steel</option>
                                                <option value="Alloy Steel">Alloy Steel</option>
                                                <option value="Duplex Steel">Duplex Steel</option>
                                                <option value="Structural Steel">Structural Steel</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Spesifikasi Lengkap *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: ASTM A106 Gr. B Seamless Steel Pipe"
                                                value={form.specification}
                                                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Pressure Class</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: Class 150, Class 300, atau N/A"
                                                value={form.pressure_class || ''}
                                                onChange={(e) => setForm({ ...form, pressure_class: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Schedule / Ketebalan</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: Sch 40, Sch 80, STD"
                                                value={form.schedule}
                                                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Rentang Ukuran</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder='Contoh: 1/2" - 24"'
                                                value={form.size_range}
                                                onChange={(e) => setForm({ ...form, size_range: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Deskripsi Tambahan</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Catatan acuan teknis standar material..."
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : (editingItem ? 'Perbarui Standar' : 'Simpan Standar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add / Edit Master Pipa (Pipe Standard) */}
            {showPipeModal && (
                <div className="modal fade show d-block pcm-modal" style={{ zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSavePipe}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingPipeItem ? 'Edit Pipe Size' : 'Add New Pipe Size'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowPipeModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {pipeFormError && (
                                        <div className="alert alert-danger py-2 small mb-3">{pipeFormError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nominal Pipe Size (NPS) *</label>
                                            <input
                                                type="text"
                                                className="form-control pcm-code"
                                                placeholder='e.g. 4", 2", 1/2"'
                                                value={pipeForm.nps}
                                                onChange={(e) => setPipeForm({ ...pipeForm, nps: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nominal Diameter (DN, metric)</label>
                                            <input
                                                type="text"
                                                className="form-control pcm-code"
                                                placeholder="e.g. DN 100, DN 50"
                                                value={pipeForm.dn}
                                                onChange={(e) => setPipeForm({ ...pipeForm, dn: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Schedule / Wall Thickness *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. Sch 40, Sch 80, STD"
                                                value={pipeForm.schedule}
                                                onChange={(e) => setPipeForm({ ...pipeForm, schedule: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Wall Thickness (mm)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="e.g. 6.02"
                                                value={pipeForm.wall_thickness_mm}
                                                onChange={(e) => setPipeForm({ ...pipeForm, wall_thickness_mm: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Outside Diameter (OD mm)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="e.g. 114.30"
                                                value={pipeForm.outer_diameter_mm}
                                                onChange={(e) => setPipeForm({ ...pipeForm, outer_diameter_mm: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Nominal Weight (kg/m)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="e.g. 16.07"
                                                value={pipeForm.weight_kg_m}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setPipeForm((prev) => ({
                                                        ...prev,
                                                        weight_kg_m: value,
                                                        weight_kg_stick: computedStickWeight(value, prev.standard_length_m)
                                                    }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold">Length per Piece (m)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="6"
                                                value={pipeForm.standard_length_m}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setPipeForm((prev) => ({
                                                        ...prev,
                                                        standard_length_m: value,
                                                        weight_kg_stick: computedStickWeight(prev.weight_kg_m, value)
                                                    }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold">Weight per Piece (kg)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="Auto"
                                                value={pipeForm.weight_kg_stick}
                                                onChange={(e) => setPipeForm({ ...pipeForm, weight_kg_stick: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <p className="pcm-cell-sub small mt-3 mb-0">
                                        Weight per piece is calculated automatically from kg/m × length per piece.
                                        Adjust it manually when company standard data differs.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPipeModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={pipeFormLoading}>
                                        {pipeFormLoading ? 'Saving...' : (editingPipeItem ? 'Update Pipe Size' : 'Save Pipe Size')}
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
