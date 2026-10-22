import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';

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

export function MaterialStandardSection({ user, onToast }) {
    const [activeStandardView, setActiveStandardView] = useState('material'); // 'material' | 'pipe'

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
        rating_class: '',
        schedule: '',
        size_range: '',
        description: ''
    });

    const [form, setForm] = useState(emptyMaterialForm);

    // 2. Pipe Standards (Diameter & Thickness) State
    const [pipeStandards, setPipeStandards] = useState([]);
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

    const [pipeForm, setPipeForm] = useState(emptyPipeForm);

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
    }, [loadData, loadPipeData]);

    const categories = ['ALL', 'Pipe', 'Fitting', 'Flange', 'Valve', 'Gasket', 'Fastener'];

    const filteredStandards = useMemo(() => {
        const q = search.toLowerCase();
        const rows = standards.filter(s => {
            const matchCat = filterCategory === 'ALL' || s.category === filterCategory;
            const matchSearch = !q ||
                (s.code || '').toLowerCase().includes(q) ||
                (s.specification || '').toLowerCase().includes(q) ||
                (s.material_group || '').toLowerCase().includes(q) ||
                (s.schedule || '').toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
        return rows.sort((a, b) => naturalCompare(a.code, b.code));
    }, [standards, search, filterCategory]);

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

    // Material Standards Handlers
    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                code: item.code || '',
                category: item.category || 'Pipe',
                specification: item.specification || '',
                material_group: item.material_group || 'Carbon Steel',
                rating_class: item.rating_class || '',
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

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/material-standards/${editingItem.id}`, form);
                if (onToast) onToast('Standar Material berhasil diperbarui.');
            } else {
                await api.post('/material-standards', form);
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
            setPipeFormError('Diameter Nominal (NPS) dan Schedule / Ketebalan wajib diisi.');
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
            {/* Header Toolbar & View Toggle */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Pustaka &amp; Master Standar Engineering</h2>
                    <p className="pcm-cell-sub mb-0">
                        Katalog acuan spesifikasi material ASTM, kelompok logam, serta master diameter pipa, ketebalan,
                        berat nominal, dan berat per batang.
                    </p>
                    <p className="pcm-cell-sub small mb-0 mt-1">
                        Sumber data pipa: ASME B36.10M (VAN LEEUWEN 2015); material: ASTM umum.
                        Data masih interim dan siap diganti dengan standar perusahaan. Master ini dapat dibaca seluruh departemen.
                    </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    {/* View Switcher Button Group */}
                    <div className="btn-group" role="group">
                        <button
                            type="button"
                            className={`btn btn-sm fw-bold ${activeStandardView === 'material' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setActiveStandardView('material')}
                        >
                            1. Standar Material ASTM
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm fw-bold ${activeStandardView === 'pipe' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setActiveStandardView('pipe')}
                        >
                            2. Master Diameter &amp; Ketebalan Pipa
                        </button>
                    </div>

                    {canEdit && (
                        activeStandardView === 'material' ? (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-2"
                                onClick={() => handleOpenModal()}
                            >
                                + Tambah Standar Material
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-2"
                                onClick={() => handleOpenPipeModal()}
                            >
                                + Tambah Ukuran Pipa
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* VIEW 1: Standar Material ASTM */}
            {activeStandardView === 'material' && (
                <>
                    {/* Category Filter & Search */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                        <div className="btn-group" role="group">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`btn btn-sm ${filterCategory === cat ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterCategory(cat)}
                                >
                                    {cat === 'ALL' ? 'Semua Kategori' : cat}
                                </button>
                            ))}
                        </div>
                        <div style={{ minWidth: '260px' }}>
                            <input
                                type="text"
                                className="form-control form-control-sm pcm-filter-input"
                                placeholder="Cari Kode, Spesifikasi ASTM, Group..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table Material Standards */}
                    <div className="pcm-card">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle pcm-table mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-3" style={{ width: '130px' }}>Kode Standar</th>
                                        <th style={{ width: '100px' }}>Kategori</th>
                                        <th style={{ minWidth: '220px' }}>Spesifikasi Material</th>
                                        <th style={{ minWidth: '150px' }}>Material Group</th>
                                        <th style={{ width: '120px' }}>Rating / Class</th>
                                        <th style={{ width: '130px' }}>Schedule</th>
                                        <th style={{ width: '130px' }}>Rentang Ukuran</th>
                                        {canEdit && <th className="text-end pe-3" style={{ width: '160px' }}>Aksi</th>}
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
                                        filteredStandards.map((s) => (
                                            <tr key={s.id}>
                                                <td className="ps-3 fw-bold pcm-code" style={{ color: '#1e40af' }}>
                                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                                        <span>{s.code}</span>
                                                        {s.is_interim && <span className="pcm-chip pcm-chip--neutral">Interim</span>}
                                                    </div>
                                                </td>
                                                <td><span className="pcm-chip pcm-chip--neutral">{s.category}</span></td>
                                                <td className="pcm-cell-strong">{s.specification}</td>
                                                <td>
                                                    <span className={`pcm-chip ${s.material_group === 'Stainless Steel' ? 'pcm-chip--primary' : s.material_group === 'Alloy Steel' ? 'pcm-chip--warning' : 'pcm-chip--dark'}`}>
                                                        {s.material_group}
                                                    </span>
                                                </td>
                                                <td>{s.rating_class || 'N/A'}</td>
                                                <td><span className="pcm-chip pcm-chip--neutral pcm-code">{s.schedule || '—'}</span></td>
                                                <td className="small pcm-cell-sub">{s.size_range || '—'}</td>
                                                {canEdit && (
                                                    <td className="text-end pe-3 text-nowrap">
                                                        <div className="d-inline-flex align-items-center justify-content-end gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm px-3 py-1.5 fw-bold"
                                                                onClick={() => handleOpenModal(s)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm px-3 py-1.5 fw-bold"
                                                                onClick={() => handleDelete(s.id)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* VIEW 2: Master Diameter & Ketebalan Pipa (Pipe Standards) */}
            {activeStandardView === 'pipe' && (
                <>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                        <div className="d-flex align-items-center gap-2">
                            <span className="pcm-cell-sub">
                                Master ukuran nominal diameter (NPS/DN), tebal dinding pipa (Schedule/mm), berat plain end (kg/m),
                                dan berat per batang standar 6 m (kg/batang). STD = Standard, XS = Extra Strong,
                                XXS = Double Extra Strong.
                            </span>
                        </div>
                        <div style={{ minWidth: '260px' }}>
                            <input
                                type="text"
                                className="form-control form-control-sm pcm-filter-input"
                                placeholder="Cari Diameter (NPS), DN, Schedule..."
                                value={pipeSearch}
                                onChange={(e) => setPipeSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pcm-card">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle pcm-table mb-0">
                                <thead>
                                    <tr>
                                        <th className="ps-3 text-center" style={{ width: '130px' }}>Nominal Size (NPS)</th>
                                        <th className="text-center" style={{ width: '110px' }}>Metric Size (DN)</th>
                                        <th className="text-center" style={{ width: '130px' }}>Schedule / Tebal</th>
                                        <th className="text-center" style={{ width: '140px' }}>Wall Thickness (mm)</th>
                                        <th className="text-center" style={{ width: '150px' }}>Outer Diameter (mm)</th>
                                        <th className="text-center" style={{ width: '140px' }}>Nominal Weight (kg/m)</th>
                                        <th className="text-center" style={{ width: '125px' }}>Panjang Batang (m)</th>
                                        <th className="text-center" style={{ width: '150px' }}>Berat per Batang (kg)</th>
                                        {canEdit && <th className="text-center" style={{ width: '160px' }}>Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pipeLoading ? (
                                        <tr>
                                            <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                                Memuat data Master Diameter Pipa...
                                            </td>
                                        </tr>
                                    ) : filteredPipes.length === 0 ? (
                                        <tr>
                                            <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                                Belum ada master diameter pipa yang terdaftar. Silakan tambahkan ukuran pipa baru.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPipes.map((p) => (
                                            <tr key={p.id}>
                                                <td className="ps-3 text-center fw-bold pcm-code" style={{ fontSize: '1rem', color: '#1e40af' }}>
                                                    {p.nps}
                                                </td>
                                                <td className="text-center pcm-cell-sub font-monospace">{p.dn || '—'}</td>
                                                <td className="text-center">
                                                    <div className="d-inline-flex flex-wrap align-items-center justify-content-center gap-2">
                                                        <span className="pcm-chip pcm-chip--neutral pcm-code">{p.schedule}</span>
                                                        {p.is_interim && <span className="pcm-chip pcm-chip--neutral">Interim</span>}
                                                    </div>
                                                </td>
                                                <td className="text-center pcm-code fw-semibold">{p.wall_thickness_mm ? `${parseFloat(p.wall_thickness_mm).toFixed(2)} mm` : '—'}</td>
                                                <td className="text-center pcm-code">{p.outer_diameter_mm ? `${parseFloat(p.outer_diameter_mm).toFixed(2)} mm` : '—'}</td>
                                                <td className="text-center pcm-code">{p.weight_kg_m ? `${parseFloat(p.weight_kg_m).toFixed(2)} kg/m` : '—'}</td>
                                                <td className="text-center pcm-code">{p.standard_length_m ? `${parseFloat(p.standard_length_m).toFixed(2)} m` : '6.00 m'}</td>
                                                <td className="text-center pcm-code fw-semibold">{stickWeightOf(p) != null ? `${stickWeightOf(p).toFixed(2)} kg` : '—'}</td>
                                                {canEdit && (
                                                    <td className="text-center text-nowrap">
                                                        <div className="d-inline-flex align-items-center justify-content-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm px-3 py-1.5 fw-bold"
                                                                onClick={() => handleOpenPipeModal(p)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm px-3 py-1.5 fw-bold"
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
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                                            <select
                                                className="form-select"
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="Pipe">Pipe</option>
                                                <option value="Fitting">Fitting</option>
                                                <option value="Flange">Flange</option>
                                                <option value="Valve">Valve</option>
                                                <option value="Gasket">Gasket</option>
                                                <option value="Fastener">Fastener (Bolt &amp; Nut)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Material Group *</label>
                                            <select
                                                className="form-select"
                                                value={form.material_group}
                                                onChange={(e) => setForm({ ...form, material_group: e.target.value })}
                                            >
                                                <option value="Carbon Steel">Carbon Steel</option>
                                                <option value="Stainless Steel">Stainless Steel</option>
                                                <option value="Alloy Steel">Alloy Steel</option>
                                                <option value="Duplex Steel">Duplex Steel</option>
                                                <option value="Structural Steel">Structural Steel</option>
                                            </select>
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
                                            <label className="form-label small fw-bold">Rating / Class Tekanan</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: 150#, 300#, Class 800"
                                                value={form.rating_class}
                                                onChange={(e) => setForm({ ...form, rating_class: e.target.value })}
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
                                        {editingPipeItem ? 'Edit Master Ukuran Pipa' : 'Tambah Master Ukuran Pipa Baru'}
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
                                                placeholder='Contoh: 4", 2", 1/2"'
                                                value={pipeForm.nps}
                                                onChange={(e) => setPipeForm({ ...pipeForm, nps: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Diameter Nominal (DN Metric)</label>
                                            <input
                                                type="text"
                                                className="form-control pcm-code"
                                                placeholder="Contoh: DN 100, DN 50"
                                                value={pipeForm.dn}
                                                onChange={(e) => setPipeForm({ ...pipeForm, dn: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Schedule / Ketebalan *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: Sch 40, Sch 80, Sch STD"
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
                                                placeholder="Contoh: 6.02"
                                                value={pipeForm.wall_thickness_mm}
                                                onChange={(e) => setPipeForm({ ...pipeForm, wall_thickness_mm: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Outer Diameter (OD mm)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="Contoh: 114.30"
                                                value={pipeForm.outer_diameter_mm}
                                                onChange={(e) => setPipeForm({ ...pipeForm, outer_diameter_mm: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Berat Nominal Pipa (kg/m)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="Contoh: 16.07"
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
                                            <label className="form-label small fw-bold">Panjang Batang (m)</label>
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
                                            <label className="form-label small fw-bold">Berat per Batang (kg)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="form-control pcm-code"
                                                placeholder="Otomatis"
                                                value={pipeForm.weight_kg_stick}
                                                onChange={(e) => setPipeForm({ ...pipeForm, weight_kg_stick: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <p className="pcm-cell-sub small mt-3 mb-0">
                                        Berat per batang dihitung otomatis dari berat kg/m × panjang batang. Nilai dapat
                                        disesuaikan bila data standar perusahaan berbeda.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPipeModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={pipeFormLoading}>
                                        {pipeFormLoading ? 'Menyimpan...' : (editingPipeItem ? 'Perbarui Ukuran Pipa' : 'Simpan Ukuran Pipa')}
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
