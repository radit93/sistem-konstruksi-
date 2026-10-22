import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';

export function BomSection({ user, projects = [], drawings = [], activeProjectId = '', onToast }) {
    const [bomList, setBomList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const [filterSpool, setFilterSpool] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
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
        setFilterSpool('ALL');
        setFilterType('ALL');
    }, [activeProjectId]);

    const scopedBom = useMemo(
        () => scopeRows(bomList, activeProjectId, filterProject),
        [bomList, activeProjectId, filterProject]
    );

    const scopedDrawings = useMemo(
        () => scopeRows(drawings, activeProjectId, filterProject),
        [drawings, activeProjectId, filterProject]
    );

    const spoolOptions = useMemo(() => {
        return Array.from(new Set(scopedBom.map(b => b.spool_no).filter(Boolean))).sort();
    }, [scopedBom]);

    const typeOptions = useMemo(() => {
        return Array.from(new Set(scopedBom.map(b => b.component_type).filter(Boolean))).sort();
    }, [scopedBom]);

    const stats = useMemo(() => {
        const totalItems = scopedBom.length;
        const totalPipe = scopedBom
            .filter(b => (b.component_type || '').toLowerCase().includes('pipe'))
            .reduce((acc, b) => acc + (parseFloat(b.qty) || 0), 0);
        const totalFittings = scopedBom
            .filter(b => ['elbow', 'tee', 'reducer', 'flange'].some(t => (b.component_type || '').toLowerCase().includes(t)))
            .reduce((acc, b) => acc + (parseFloat(b.qty) || 0), 0);
        const totalValves = scopedBom
            .filter(b => (b.component_type || '').toLowerCase().includes('valve'))
            .reduce((acc, b) => acc + (parseFloat(b.qty) || 0), 0);
        return { totalItems, totalPipe, totalFittings, totalValves };
    }, [scopedBom]);

    const filteredBom = useMemo(() => {
        const q = search.toLowerCase();
        return scopedBom.filter(b => {
            const matchSpool = filterSpool === 'ALL' || b.spool_no === filterSpool;
            const matchType = filterType === 'ALL' || b.component_type === filterType;
            const matchSearch = !q ||
                (b.description || '').toLowerCase().includes(q) ||
                (b.component_type || '').toLowerCase().includes(q) ||
                (b.material_spec || '').toLowerCase().includes(q) ||
                (b.spool_no || '').toLowerCase().includes(q) ||
                (b.tag_number || '').toLowerCase().includes(q);
            return matchSpool && matchType && matchSearch;
        });
    }, [scopedBom, search, filterSpool, filterType]);

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
                qty: 6.0,
                unit: 'meter',
                tag_number: '',
                drawing_id: scopedDrawings[0]?.id || '',
                project_id: defaultProjectId(activeProjectId, filterProject, projects)
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.description.trim() || !form.component_type.trim()) {
            setFormError('Deskripsi komponen dan Tipe komponen wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/bill-of-materials/${editingItem.id}`, form);
                if (onToast) onToast('Item BOM / MTO berhasil diperbarui.');
            } else {
                await api.post('/bill-of-materials', form);
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
        if (!(await confirmDelete('Yakin ingin menghapus item material ini dari BOM?'))) return;
        try {
            await api.delete(`/bill-of-materials/${id}`);
            if (onToast) onToast('Item BOM berhasil dihapus.');
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Bill of Material (BOM / MTO)</h2>
                    <p className="pcm-cell-sub mb-0">
                        Daftar rincian kebutuhan material (Material Take Off) per spool dan isometrik: pipa, fitting, flange, valve, baut, dan gasket.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Item BOM
                    </button>
                )}
            </div>

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Part BOM</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">{stats.totalItems}</strong>
                        <span className="pcm-tile__unit">item terdaftar</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Panjang Pipa</span>
                        <strong className="pcm-tile__value text-success">{stats.totalPipe.toFixed(1)}</strong>
                        <span className="pcm-tile__unit">meter</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Fitting &amp; Flange</span>
                        <strong className="pcm-tile__value">{stats.totalFittings}</strong>
                        <span className="pcm-tile__unit">buah</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Valve &amp; Aksesoris</span>
                        <strong className="pcm-tile__value text-dark">{stats.totalValves}</strong>
                        <span className="pcm-tile__unit">unit</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="pcm-filter-bar">
                <div className="pcm-filter-search">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Komponen, Deskripsi, Spesifikasi, Tag Number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {!isProjectLocked(activeProjectId) && (
                    <select
                        className="form-select form-select-sm"
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="ALL">Semua Proyek ({projects.length})</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.client ? `[${p.client}] ` : ''}{p.name} (JOB: {p.job_no || '-'})
                            </option>
                        ))}
                    </select>
                )}
                <select
                    className="form-select form-select-sm"
                    value={filterSpool}
                    onChange={(e) => setFilterSpool(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="ALL">Semua Spool ({spoolOptions.length})</option>
                    {spoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    className="form-select form-select-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="ALL">Semua Jenis Komponen ({typeOptions.length})</option>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="pcm-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle pcm-table">
                        <thead>
                            <tr>
                                <th className="ps-3">No</th>
                                <th>Spool</th>
                                <th>Tipe</th>
                                <th>Deskripsi Komponen</th>
                                <th>Size</th>
                                <th>Sch / Rating</th>
                                <th>Material Spec</th>
                                <th>Qty</th>
                                <th>Tag No</th>
                                {canEdit && <th className="text-end pe-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 pcm-cell-sub">
                                        Memuat data Bill of Material...
                                    </td>
                                </tr>
                            ) : filteredBom.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 pcm-cell-sub">
                                        Tidak ada item BOM yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredBom.map((b) => (
                                    <tr key={b.id}>
                                        <td className="ps-3 pcm-code text-secondary">{b.item_no}</td>
                                        <td><span className="pcm-chip pcm-chip--neutral pcm-code">{b.spool_no || '—'}</span></td>
                                        <td><span className="pcm-chip pcm-chip--neutral">{b.component_type}</span></td>
                                        <td className="pcm-cell-strong">{b.description}</td>
                                        <td className="pcm-code">{b.size}</td>
                                        <td>{b.rating_sch || '—'}</td>
                                        <td className="small pcm-cell-sub">{b.material_spec}</td>
                                        <td className="fw-bold text-primary pcm-code">{parseFloat(b.qty).toFixed(1)} {b.unit}</td>
                                        <td className="pcm-code small">{b.tag_number || '—'}</td>
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
                                                    className="btn btn-danger btn-sm px-2 py-1"
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
