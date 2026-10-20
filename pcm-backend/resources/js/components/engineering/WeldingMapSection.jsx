import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function WeldingMapSection({ user, projects = [], drawings = [], onToast }) {
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterLocation, setFilterLocation] = useState('ALL');
    const [filterSpool, setFilterSpool] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        line_no: '15-MPP-AB',
        iso_drawing_no: '2428-M-15-MPP-AB-SHT1',
        sheet: 'Sheet 1 of 1',
        spool_no: 'SP-01',
        joint_no: '',
        joint_type: 'BW',
        size: '4"',
        dia_inch: 4.0,
        thickness: 'Sch 40 (6.02 mm)',
        location: 'Shop',
        wps_no: 'WPS-PCM-01-GTAW/SMAW',
        mat_a_item: 'Pipe',
        mat_a_spec: 'ASTM A106 Gr. B',
        mat_a_size: '4"',
        mat_a_sch: 'Sch 40',
        mat_b_item: 'Elbow 90 LR',
        mat_b_spec: 'ASTM A234 WPB',
        mat_b_size: '4"',
        mat_b_sch: 'Sch 40',
        status: 'PLANNED',
        drawing_id: '',
        project_id: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/welding-maps');
            setMaps(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load welding maps:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const spoolOptions = useMemo(() => {
        return Array.from(new Set(maps.map(m => m.spool_no).filter(Boolean))).sort();
    }, [maps]);

    const stats = useMemo(() => {
        const total = maps.length;
        const totalDia = maps.reduce((acc, m) => acc + (parseFloat(m.dia_inch) || 0), 0);
        const shopCount = maps.filter(m => m.location === 'Shop').length;
        const fieldCount = maps.filter(m => m.location === 'Field').length;
        const spools = new Set(maps.map(m => m.spool_no).filter(Boolean)).size;
        return { total, totalDia, shopCount, fieldCount, spools };
    }, [maps]);

    const filteredMaps = useMemo(() => {
        const q = search.toLowerCase();
        return maps.filter(m => {
            const matchLoc = filterLocation === 'ALL' || m.location === filterLocation;
            const matchSpool = filterSpool === 'ALL' || m.spool_no === filterSpool;
            const matchSearch = !q ||
                (m.joint_no || '').toLowerCase().includes(q) ||
                (m.spool_no || '').toLowerCase().includes(q) ||
                (m.iso_drawing_no || '').toLowerCase().includes(q) ||
                (m.line_no || '').toLowerCase().includes(q) ||
                (m.wps_no || '').toLowerCase().includes(q);
            return matchLoc && matchSpool && matchSearch;
        });
    }, [maps, search, filterLocation, filterSpool]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                line_no: item.line_no || '15-MPP-AB',
                iso_drawing_no: item.iso_drawing_no || '',
                sheet: item.sheet || 'Sheet 1 of 1',
                spool_no: item.spool_no || 'SP-01',
                joint_no: item.joint_no || '',
                joint_type: item.joint_type || 'BW',
                size: item.size || '4"',
                dia_inch: item.dia_inch || 4.0,
                thickness: item.thickness || 'Sch 40',
                location: item.location || 'Shop',
                wps_no: item.wps_no || 'WPS-PCM-01',
                mat_a_item: item.mat_a_item || 'Pipe',
                mat_a_spec: item.mat_a_spec || 'ASTM A106 Gr. B',
                mat_a_size: item.mat_a_size || '4"',
                mat_a_sch: item.mat_a_sch || 'Sch 40',
                mat_b_item: item.mat_b_item || 'Elbow 90 LR',
                mat_b_spec: item.mat_b_spec || 'ASTM A234 WPB',
                mat_b_size: item.mat_b_size || '4"',
                mat_b_sch: item.mat_b_sch || 'Sch 40',
                status: item.status || 'PLANNED',
                drawing_id: item.drawing_id || '',
                project_id: item.project_id || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                line_no: '15-MPP-AB',
                iso_drawing_no: drawings[0]?.drawing_no || '2428-M-15-MPP-AB-SHT1',
                sheet: 'Sheet 1 of 1',
                spool_no: 'SP-01',
                joint_no: `W-${String(maps.length + 1).padStart(3, '0')}`,
                joint_type: 'BW',
                size: '4"',
                dia_inch: 4.0,
                thickness: 'Sch 40 (6.02 mm)',
                location: 'Shop',
                wps_no: 'WPS-PCM-01-GTAW/SMAW',
                mat_a_item: 'Pipe',
                mat_a_spec: 'ASTM A106 Gr. B',
                mat_a_size: '4"',
                mat_a_sch: 'Sch 40',
                mat_b_item: 'Elbow 90 LR',
                mat_b_spec: 'ASTM A234 WPB',
                mat_b_size: '4"',
                mat_b_sch: 'Sch 40',
                status: 'PLANNED',
                drawing_id: drawings[0]?.id || '',
                project_id: projects[0]?.id || ''
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
            if (editingItem) {
                await api.put(`/welding-maps/${editingItem.id}`, form);
                if (onToast) onToast('Welding Map Joint berhasil diperbarui.');
            } else {
                await api.post('/welding-maps', form);
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
        if (!window.confirm('Yakin ingin menghapus titik joint dari Welding Map ini?')) return;
        try {
            await api.delete(`/welding-maps/${id}`);
            if (onToast) onToast('Joint berhasil dihapus dari Welding Map.');
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
                    <h2 className="h4 fw-bold text-dark mb-1">Welding Map &amp; Spool Generation</h2>
                    <p className="text-muted small mb-0">
                        Pemetaan sambungan las (Weld Mapping), pembagian spool fabrikasi, dan spesifikasi sambungan Material A &amp; B.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Joint Mapping
                    </button>
                )}
            </div>

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Joint Pipa</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.total}</strong>
                        <span className="text-muted ms-1 small">titik sambungan</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Dia-Inch</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.totalDia.toFixed(1)}</strong>
                        <span className="text-muted ms-1 small">diameter inch</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Jumlah Spool</span>
                        <strong className="h3 fw-bold text-dark mb-0">{stats.spools}</strong>
                        <span className="text-muted ms-1 small">spool terbagi</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Alokasi Lokasi</span>
                        <div className="d-flex gap-2 mt-1">
                            <span className="badge bg-primary">{stats.shopCount} Shop</span>
                            <span className="badge bg-warning text-dark">{stats.fieldCount} Field</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Joint No, Spool, Drawing, Line, WPS..."
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
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    style={{ width: 'auto', borderRadius: '6px' }}
                >
                    <option value="ALL">Semua Lokasi</option>
                    <option value="Shop">Shop (Workshop)</option>
                    <option value="Field">Field (Lapangan)</option>
                </select>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Joint No</th>
                                <th className="py-3">Spool No</th>
                                <th className="py-3">Iso Drawing No</th>
                                <th className="py-3">Size / Thk</th>
                                <th className="py-3">Dia-Inch</th>
                                <th className="py-3">Type / Loc</th>
                                <th className="py-3">Material A (Item - Spec)</th>
                                <th className="py-3">Material B (Item - Spec)</th>
                                <th className="py-3">WPS No</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Memuat data Welding Map...
                                    </td>
                                </tr>
                            ) : filteredMaps.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Tidak ada data titik joint yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredMaps.map((m) => (
                                    <tr key={m.id}>
                                        <td className="ps-3 fw-bold text-primary font-monospace">{m.joint_no}</td>
                                        <td><span className="badge bg-light text-dark border font-monospace">{m.spool_no}</span></td>
                                        <td className="font-monospace small">{m.iso_drawing_no}</td>
                                        <td>{m.size} - {m.thickness}</td>
                                        <td className="fw-bold">{parseFloat(m.dia_inch).toFixed(1)}</td>
                                        <td>
                                            <span className="badge bg-secondary me-1">{m.joint_type}</span>
                                            <span className={`badge ${m.location === 'Shop' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                                {m.location}
                                            </span>
                                        </td>
                                        <td className="small">{m.mat_a_item || 'Pipe'} ({m.mat_a_spec || 'A106-B'})</td>
                                        <td className="small">{m.mat_b_item || 'Pipe'} ({m.mat_b_spec || 'A106-B'})</td>
                                        <td className="font-monospace small">{m.wps_no}</td>
                                        {canEdit && (
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm me-1 px-2 py-1"
                                                    onClick={() => handleOpenModal(m)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    onClick={() => handleDelete(m.id)}
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

            {/* Modal Add / Edit Joint */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
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
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Nomor Joint *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: W-001"
                                                value={form.joint_no}
                                                onChange={(e) => setForm({ ...form, joint_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Nomor Spool *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: SP-01"
                                                value={form.spool_no}
                                                onChange={(e) => setForm({ ...form, spool_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Iso Drawing No</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.iso_drawing_no}
                                                onChange={(e) => setForm({ ...form, iso_drawing_no: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Ukuran Pipa (Size)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder='4"'
                                                value={form.size}
                                                onChange={(e) => {
                                                    const sz = e.target.value;
                                                    const num = parseFloat(sz) || 0;
                                                    setForm({ ...form, size: sz, dia_inch: num });
                                                }}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Dia-Inch (DI)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={form.dia_inch}
                                                onChange={(e) => setForm({ ...form, dia_inch: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Ketebalan / Sch</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Sch 40"
                                                value={form.thickness}
                                                onChange={(e) => setForm({ ...form, thickness: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Lokasi Las</label>
                                            <select
                                                className="form-select"
                                                value={form.location}
                                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                            >
                                                <option value="Shop">Shop (Workshop)</option>
                                                <option value="Field">Field (Erection)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Tipe Joint &amp; WPS</label>
                                            <div className="input-group">
                                                <select
                                                    className="form-select"
                                                    value={form.joint_type}
                                                    onChange={(e) => setForm({ ...form, joint_type: e.target.value })}
                                                    style={{ maxWidth: '120px' }}
                                                >
                                                    <option value="BW">BW</option>
                                                    <option value="SW">SW</option>
                                                    <option value="FW">FW</option>
                                                    <option value="THD">THD</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="WPS-PCM-01"
                                                    value={form.wps_no}
                                                    onChange={(e) => setForm({ ...form, wps_no: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Line Number</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="15-MPP-AB"
                                                value={form.line_no}
                                                onChange={(e) => setForm({ ...form, line_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 mt-3">
                                            <h6 className="fw-bold border-bottom pb-1 text-muted small text-uppercase">Spesifikasi Material Sambungan</h6>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Material A (Item &amp; Spec)</label>
                                            <input
                                                type="text"
                                                className="form-control mb-1"
                                                placeholder="Item: Pipe"
                                                value={form.mat_a_item}
                                                onChange={(e) => setForm({ ...form, mat_a_item: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Spec: ASTM A106 Gr. B"
                                                value={form.mat_a_spec}
                                                onChange={(e) => setForm({ ...form, mat_a_spec: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Material B (Item &amp; Spec)</label>
                                            <input
                                                type="text"
                                                className="form-control mb-1"
                                                placeholder="Item: Elbow 90 LR"
                                                value={form.mat_b_item}
                                                onChange={(e) => setForm({ ...form, mat_b_item: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Spec: ASTM A234 WPB"
                                                value={form.mat_b_spec}
                                                onChange={(e) => setForm({ ...form, mat_b_spec: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Joint Mapping'}
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
