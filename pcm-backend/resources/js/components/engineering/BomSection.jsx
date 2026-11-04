import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function BomSection({ user, projects = [], drawings = [], onToast }) {
    const [bomList, setBomList] = useState([]);
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSpool, setFilterSpool] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [selectedGenDrawingId, setSelectedGenDrawingId] = useState('');
    const [showGenModal, setShowGenModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templateError, setTemplateError] = useState('');
    const [templateForm, setTemplateForm] = useState({
        piping_class: 'A1A',
        component_type: 'Pipe',
        description: '',
        default_rating_sch: '',
        material_spec: '',
        material_standard_id: '',
        unit: 'buah',
        ratio_formula: 1,
        basis: 'PER_JOINT',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        spool_no: 'SP-01',
        item_no: '1',
        component_type: 'Pipe',
        description: 'Pipe Seamless BE ASTM A106 Gr. B',
        size: '4"',
        rating_sch: 'Sch 40',
        material_spec: 'ASTM A106 Gr. B',
        material_standard_id: '',
        qty: 6.0,
        unit: 'meter',
        tag_number: '',
        drawing_id: '',
        project_id: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/bill-of-materials');
            setBomList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load BOM:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        let active = true;

        api.get('/material-standards')
            .then((data) => {
                if (active) setStandards(Array.isArray(data) ? data : []);
            })
            .catch((err) => console.error('Failed to load material standards:', err));

        return () => {
            active = false;
        };
    }, []);

    const spoolOptions = useMemo(() => {
        return Array.from(new Set(bomList.map(b => b.spool_no).filter(Boolean))).sort();
    }, [bomList]);

    const typeOptions = useMemo(() => {
        return Array.from(new Set(bomList.map(b => b.component_type).filter(Boolean))).sort();
    }, [bomList]);

    const bomDrawingOptions = useMemo(() => {
        if (!form.project_id) return drawings;

        return drawings.filter((drawing) => String(drawing.project_id) === String(form.project_id));
    }, [drawings, form.project_id]);

    const stats = useMemo(() => {
        const totalItems = bomList.length;
        const totalPipe = bomList
            .filter(b => (b.component_type || '').toLowerCase().includes('pipe'))
            .reduce((acc, b) => acc + (parseFloat(b.qty) || 0), 0);
        const totalFittings = bomList
            .filter(b => ['elbow', 'tee', 'reducer', 'flange'].some(t => (b.component_type || '').toLowerCase().includes(t)))
            .reduce((acc, b) => acc + (parseFloat(b.qty) || 0), 0);
        const totalValves = bomList
            .filter(b => (b.component_type || '').toLowerCase().includes('valve'))
            .reduce((acc, b) => acc + (parseFloat(b.qty) || 0), 0);
        return { totalItems, totalPipe, totalFittings, totalValves };
    }, [bomList]);

    const filteredBom = useMemo(() => {
        const q = search.toLowerCase();
        return bomList.filter(b => {
            const matchSpool = filterSpool === 'ALL' || b.spool_no === filterSpool;
            const matchType = filterType === 'ALL' || b.component_type === filterType;
            const matchSearch = !q ||
                (b.description || '').toLowerCase().includes(q) ||
                (b.component_type || '').toLowerCase().includes(q) ||
                (b.material_spec || '').toLowerCase().includes(q) ||
                (b.material_standard?.code || '').toLowerCase().includes(q) ||
                (b.spool_no || '').toLowerCase().includes(q) ||
                (b.tag_number || '').toLowerCase().includes(q);
            return matchSpool && matchType && matchSearch;
        });
    }, [bomList, search, filterSpool, filterType]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                spool_no: item.spool_no || 'SP-01',
                item_no: item.item_no || '1',
                component_type: item.component_type || 'Pipe',
                description: item.description || '',
                size: item.size || '4"',
                rating_sch: item.rating_sch || 'Sch 40',
                material_spec: item.material_spec || 'ASTM A106 Gr. B',
                material_standard_id: item.material_standard_id || '',
                qty: item.qty || 1,
                unit: item.unit || 'meter',
                tag_number: item.tag_number || '',
                drawing_id: item.drawing_id || '',
                project_id: item.project_id || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                spool_no: 'SP-01',
                item_no: String(bomList.length + 1),
                component_type: 'Pipe',
                description: 'Pipe Seamless BE ASTM A106 Gr. B',
                size: '4"',
                rating_sch: 'Sch 40',
                material_spec: 'ASTM A106 Gr. B',
                material_standard_id: '',
                qty: 6.0,
                unit: 'meter',
                tag_number: '',
                drawing_id: drawings[0]?.id || '',
                project_id: projects[0]?.id || ''
            });
        }
        setShowModal(true);
    };

    const handleStandardChange = (standardId) => {
        const standard = standards.find((item) => String(item.id) === String(standardId));

        if (!standard) {
            setForm((prev) => ({ ...prev, material_standard_id: '' }));
            return;
        }

        setForm((prev) => ({
            ...prev,
            material_standard_id: standard.id,
            material_spec: standard.specification || prev.material_spec,
            rating_sch: standard.schedule && !standard.schedule.includes('/')
                ? standard.schedule
                : prev.rating_sch,
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.description.trim() || !form.component_type.trim()) {
            setFormError('Deskripsi komponen dan Tipe komponen wajib diisi.');
            return;
        }

        const payload = {
            ...form,
            material_standard_id: form.material_standard_id || null,
            drawing_id: form.drawing_id || null,
            project_id: form.project_id || null,
        };

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/bill-of-materials/${editingItem.id}`, payload);
                if (onToast) onToast('Item BOM / MTO berhasil diperbarui.');
            } else {
                await api.post('/bill-of-materials', payload);
                if (onToast) onToast('Item BOM / MTO baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan data BOM.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus item material ini dari BOM?')) return;
        try {
            await api.del(`/bill-of-materials/${id}`);
            if (onToast) onToast('Item BOM berhasil dihapus.');
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    const handleGenerateBom = async (e) => {
        e.preventDefault();
        if (!selectedGenDrawingId) {
            alert('Pilih isometrik drawing terlebih dahulu.');
            return;
        }
        setGenerating(true);
        try {
            const res = await api.post(`/drawings/${selectedGenDrawingId}/generate-bom`, {});
            if (onToast) onToast(res.message || 'BOM berhasil digenerate otomatis.');
            setShowGenModal(false);
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal generate BOM otomatis.');
        } finally {
            setGenerating(false);
        }
    };

    const loadTemplates = useCallback(async () => {
        setTemplateLoading(true);
        try {
            const data = await api.get('/piping-class-templates');
            setTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load piping class templates:', err);
        } finally {
            setTemplateLoading(false);
        }
    }, []);

    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        setTemplateError('');

        if (!templateForm.piping_class.trim() || !templateForm.component_type.trim() || !templateForm.description.trim()) {
            setTemplateError('Piping class, tipe komponen, dan deskripsi wajib diisi.');
            return;
        }

        try {
            await api.post('/piping-class-templates', {
                ...templateForm,
                material_standard_id: templateForm.material_standard_id || null,
                ratio_formula: parseFloat(templateForm.ratio_formula) || 0,
            });
            if (onToast) onToast('Template komponen piping class berhasil ditambahkan.');
            setTemplateForm((prev) => ({ ...prev, description: '', material_spec: '', default_rating_sch: '' }));
            loadTemplates();
        } catch (err) {
            setTemplateError(err.message || 'Gagal menyimpan template komponen.');
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('Hapus template komponen ini dari piping class?')) return;
        try {
            await api.del(`/piping-class-templates/${id}`);
            if (onToast) onToast('Template komponen berhasil dihapus.');
            loadTemplates();
        } catch (err) {
            alert(err.message || 'Gagal menghapus template komponen.');
        }
    };

    const handleOpenClassModal = () => {
        setTemplateError('');
        setShowClassModal(true);
        loadTemplates();
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Bill of Material (BOM / MTO)</h2>
                    <p className="text-muted small mb-0">
                        Daftar rincian kebutuhan material (Material Take Off) per spool dan isometrik: pipa, fitting, flange, valve, baut, dan gasket.
                    </p>
                </div>
                {canEdit && (
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm fw-bold px-3 py-2"
                            style={{ borderRadius: '6px' }}
                            onClick={handleOpenClassModal}
                        >
                            Master Piping Class
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-success btn-sm fw-bold px-3 py-2"
                            style={{ borderRadius: '6px' }}
                            onClick={() => {
                                setSelectedGenDrawingId(drawings[0]?.id || '');
                                setShowGenModal(true);
                            }}
                        >
                            ⚡ Generate BOM Otomatis
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm fw-bold px-3 py-2"
                            style={{ borderRadius: '6px' }}
                            onClick={() => handleOpenModal()}
                        >
                            + Tambah Item BOM
                        </button>
                    </div>
                )}
            </div>

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Part BOM</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.totalItems}</strong>
                        <span className="text-muted ms-1 small">item terdaftar</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Panjang Pipa</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.totalPipe.toFixed(1)}</strong>
                        <span className="text-muted ms-1 small">meter</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Fitting &amp; Flange</span>
                        <strong className="h3 fw-bold text-dark mb-0">{stats.totalFittings}</strong>
                        <span className="text-muted ms-1 small">buah</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Valve &amp; Aksesoris</span>
                        <strong className="h3 fw-bold text-warning text-dark mb-0">{stats.totalValves}</strong>
                        <span className="text-muted ms-1 small">unit</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Komponen, Deskripsi, Spesifikasi, Tag Number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.5rem 0.75rem' }}
                    />
                </div>
                <select
                    className="form-select form-select-sm"
                    value={filterSpool}
                    onChange={(e) => setFilterSpool(e.target.value)}
                    style={{ width: 'auto', borderRadius: '6px' }}
                >
                    <option value="ALL">Semua Spool ({spoolOptions.length})</option>
                    {spoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    className="form-select form-select-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ width: 'auto', borderRadius: '6px' }}
                >
                    <option value="ALL">Semua Jenis Komponen ({typeOptions.length})</option>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">No</th>
                                <th className="py-3">Spool</th>
                                <th className="py-3">Tipe</th>
                                <th className="py-3">Deskripsi Komponen</th>
                                <th className="py-3">Size</th>
                                <th className="py-3">Sch / Rating</th>
                                <th className="py-3">Material Spec</th>
                                <th className="py-3">Kode Std</th>
                                <th className="py-3">Qty</th>
                                <th className="py-3">Berat</th>
                                <th className="py-3">Tag No</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 12 : 11} className="text-center py-4 text-muted">
                                        Memuat data Bill of Material...
                                    </td>
                                </tr>
                            ) : filteredBom.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 12 : 11} className="text-center py-4 text-muted">
                                        Tidak ada item BOM yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredBom.map((b) => (
                                    <tr key={b.id}>
                                        <td className="ps-3 font-monospace text-muted">{b.item_no}</td>
                                        <td>
                                            <span className="badge bg-light text-dark border font-monospace">{b.spool_no || '—'}</span>
                                            {b.drawing?.drawing_no && (
                                                <div className="text-muted small font-monospace mt-1">{b.drawing.drawing_no}</div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="badge bg-secondary">{b.component_type}</span>
                                            {b.source === 'GENERATED' && (
                                                <span className="badge bg-info text-dark ms-1" title="Dihasilkan otomatis dari piping class">
                                                    Auto
                                                </span>
                                            )}
                                        </td>
                                        <td className="fw-semibold">{b.description}</td>
                                        <td className="font-monospace">{b.size}</td>
                                        <td>{b.rating_sch || '—'}</td>
                                        <td className="small">{b.material_spec}</td>
                                        <td>
                                            {b.material_standard?.code ? (
                                                <span className="badge bg-light text-dark border font-monospace">{b.material_standard.code}</span>
                                            ) : (
                                                <span className="text-muted small">—</span>
                                            )}
                                        </td>
                                        <td className="fw-bold text-primary">{parseFloat(b.qty).toFixed(1)} {b.unit}</td>
                                        <td className="text-nowrap">
                                            {b.weight_kg != null ? (
                                                <>
                                                    <span className="fw-semibold">{parseFloat(b.weight_kg).toFixed(2)} kg</span>
                                                    {b.od_mm != null && b.wall_mm != null && (
                                                        <div className="text-muted small font-monospace">
                                                            Ø{b.od_mm} × {b.wall_mm} mm
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-muted small">—</span>
                                            )}
                                        </td>
                                        <td className="font-monospace small">{b.tag_number || '—'}</td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm me-1 px-2 py-1"
                                                    onClick={() => handleOpenModal(b)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    onClick={() => handleDelete(b.id)}
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Master Piping Class */}
            {showClassModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <div>
                                    <h5 className="modal-title fw-bold">Master Komponen Piping Class</h5>
                                    <div className="text-muted small">
                                        Template ini menjadi dasar perhitungan otomatis BOM/MTO dari isometrik drawing.
                                    </div>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setShowClassModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {templateError && (
                                    <div className="alert alert-danger py-2 small mb-3">{templateError}</div>
                                )}

                                <form onSubmit={handleSaveTemplate} className="row g-2 align-items-end mb-4">
                                    <div className="col-6 col-md-2">
                                        <label className="form-label small fw-bold mb-1">Piping Class *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="A1A"
                                            value={templateForm.piping_class}
                                            onChange={(e) => setTemplateForm({ ...templateForm, piping_class: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <label className="form-label small fw-bold mb-1">Tipe Komponen *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Elbow 90 LR"
                                            value={templateForm.component_type}
                                            onChange={(e) => setTemplateForm({ ...templateForm, component_type: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label small fw-bold mb-1">Deskripsi *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Elbow 90 Deg Long Radius BW ASTM A234 WPB"
                                            value={templateForm.description}
                                            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="form-label small fw-bold mb-1">Rating / Sch</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Sch 40"
                                            value={templateForm.default_rating_sch}
                                            onChange={(e) => setTemplateForm({ ...templateForm, default_rating_sch: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <label className="form-label small fw-bold mb-1">Material Spec</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="ASTM A234 WPB"
                                            value={templateForm.material_spec}
                                            onChange={(e) => setTemplateForm({ ...templateForm, material_spec: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <label className="form-label small fw-bold mb-1">Kode Standar Material</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={templateForm.material_standard_id}
                                            onChange={(e) => setTemplateForm({ ...templateForm, material_standard_id: e.target.value })}
                                        >
                                            <option value="">Tanpa kode standar</option>
                                            {standards.map((standard) => (
                                                <option key={standard.id} value={standard.id}>
                                                    {standard.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="form-label small fw-bold mb-1">Satuan</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={templateForm.unit}
                                            onChange={(e) => setTemplateForm({ ...templateForm, unit: e.target.value })}
                                        >
                                            <option value="meter">meter</option>
                                            <option value="buah">buah</option>
                                            <option value="set">set</option>
                                            <option value="kg">kg</option>
                                        </select>
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="form-label small fw-bold mb-1">Basis Hitung</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={templateForm.basis}
                                            onChange={(e) => setTemplateForm({ ...templateForm, basis: e.target.value })}
                                        >
                                            <option value="PER_JOINT">Per Joint</option>
                                            <option value="PER_DI">Per Dia-Inch</option>
                                            <option value="FIXED">Fixed</option>
                                        </select>
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="form-label small fw-bold mb-1">Rasio</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="form-control form-control-sm"
                                            value={templateForm.ratio_formula}
                                            onChange={(e) => setTemplateForm({ ...templateForm, ratio_formula: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <button type="submit" className="btn btn-primary btn-sm fw-bold w-100">
                                            + Tambah
                                        </button>
                                    </div>
                                </form>

                                <div className="table-responsive" style={{ maxHeight: '320px' }}>
                                    <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.7rem' }}>
                                            <tr>
                                                <th>Class</th>
                                                <th>Komponen</th>
                                                <th>Deskripsi</th>
                                                <th>Sch / Rating</th>
                                                <th>Material</th>
                                                <th>Unit</th>
                                                <th>Basis</th>
                                                <th>Rasio</th>
                                                <th className="text-end">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {templateLoading ? (
                                                <tr>
                                                    <td colSpan={9} className="text-center py-3 text-muted">Memuat template...</td>
                                                </tr>
                                            ) : templates.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="text-center py-3 text-muted">
                                                        Belum ada template. Tambahkan komponen di atas agar generate BOM memakai master ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                templates.map((template) => (
                                                    <tr key={template.id}>
                                                        <td className="font-monospace fw-semibold">{template.piping_class}</td>
                                                        <td>{template.component_type}</td>
                                                        <td className="small">{template.description}</td>
                                                        <td className="small">{template.default_rating_sch || '—'}</td>
                                                        <td className="small">{template.material_spec || '—'}</td>
                                                        <td>{template.unit}</td>
                                                        <td className="small">{template.basis}</td>
                                                        <td>{parseFloat(template.ratio_formula).toFixed(2)}</td>
                                                        <td className="text-end">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm px-2 py-1"
                                                                onClick={() => handleDeleteTemplate(template.id)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowClassModal(false)}>
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Generate BOM Otomatis */}
            {showGenModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleGenerateBom}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">Generate BOM Otomatis dari Drawing</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowGenModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted small">
                                        Sistem akan membaca nomor line dan piping class dari isometrik drawing yang dipilih, lalu menghitung kuantitas material (MTO) berdasarkan spesifikasi kelas pipa dan ukuran drawing.
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Pilih Isometrik Drawing *</label>
                                        <select
                                            className="form-select"
                                            value={selectedGenDrawingId}
                                            onChange={(e) => setSelectedGenDrawingId(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Pilih Drawing --</option>
                                            {drawings.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.drawing_no} ({d.line_no || 'Tanpa Line'} - {d.size_range || 'Size N/A'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowGenModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-success btn-sm fw-bold" disabled={generating}>
                                        {generating ? 'Memproses MTO...' : 'Generate MTO Sekarang'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add / Edit */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Item BOM' : 'Tambah Item BOM Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Project</label>
                                            <select
                                                className="form-select"
                                                value={form.project_id}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    project_id: e.target.value,
                                                    drawing_id: '',
                                                })}
                                            >
                                                <option value="">Tanpa project</option>
                                                {projects.map((project) => (
                                                    <option key={project.id} value={project.id}>{project.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Drawing Isometrik</label>
                                            <select
                                                className="form-select"
                                                value={form.drawing_id}
                                                onChange={(e) => setForm({ ...form, drawing_id: e.target.value })}
                                            >
                                                <option value="">Tanpa drawing</option>
                                                {bomDrawingOptions.map((drawing) => (
                                                    <option key={drawing.id} value={drawing.id}>
                                                        {drawing.drawing_no} — {drawing.line_no || drawing.title || 'Tanpa line'}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="form-text">
                                                Drawing ini menjadi kunci rekonsiliasi BOM vs issuing.
                                            </div>
                                        </div>

                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold">Item No *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.item_no}
                                                onChange={(e) => setForm({ ...form, item_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold">Nomor Spool</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="SP-01"
                                                value={form.spool_no}
                                                onChange={(e) => setForm({ ...form, spool_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Tipe Komponen *</label>
                                            <select
                                                className="form-select"
                                                value={form.component_type}
                                                onChange={(e) => setForm({ ...form, component_type: e.target.value })}
                                            >
                                                <option value="Pipe">Pipe (Pipa Lurus)</option>
                                                <option value="Elbow 90 LR">Elbow 90° LR</option>
                                                <option value="Elbow 45">Elbow 45°</option>
                                                <option value="Tee Straight">Tee Straight</option>
                                                <option value="Reducer Con">Reducer Concentric</option>
                                                <option value="Flange WN">Flange Weld Neck</option>
                                                <option value="Flange SO">Flange Slip-On</option>
                                                <option value="Gate Valve">Gate Valve</option>
                                                <option value="Check Valve">Check Valve</option>
                                                <option value="Gasket">Gasket (Spiral Wound)</option>
                                                <option value="Stud Bolt">Stud Bolt &amp; Nuts</option>
                                            </select>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Deskripsi Komponen Lengkap *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Size</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.size}
                                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Rating / Sch</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.rating_sch}
                                                onChange={(e) => setForm({ ...form, rating_sch: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Material Spec</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.material_spec}
                                                onChange={(e) => setForm({ ...form, material_spec: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Kode Standar Material</label>
                                            <select
                                                className="form-select"
                                                value={form.material_standard_id}
                                                onChange={(e) => handleStandardChange(e.target.value)}
                                            >
                                                <option value="">Tanpa kode standar (cocokkan via teks)</option>
                                                {standards.map((standard) => (
                                                    <option key={standard.id} value={standard.id}>
                                                        {standard.code} — {standard.specification}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="form-text">
                                                Kode ini menghubungkan BOM ke receiving, stok, issuing, dan dashboard kebutuhan material.
                                            </div>
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label className="form-label small fw-bold">Quantity *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={form.qty}
                                                onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label className="form-label small fw-bold">Satuan (Unit)</label>
                                            <select
                                                className="form-select"
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            >
                                                <option value="meter">meter</option>
                                                <option value="buah">buah (pcs)</option>
                                                <option value="set">set</option>
                                                <option value="kg">kg</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Tag Number (Opsional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: V-101"
                                                value={form.tag_number}
                                                onChange={(e) => setForm({ ...form, tag_number: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Item BOM'}
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
