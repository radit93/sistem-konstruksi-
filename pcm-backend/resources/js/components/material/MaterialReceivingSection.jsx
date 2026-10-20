import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function MaterialReceivingSection({ user, onToast }) {
    const [receivings, setReceivings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterStorage, setFilterStorage] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        arrival_date: new Date().toISOString().split('T')[0],
        shipment_no: '',
        po_no: '',
        vendor: '',
        item_name: '',
        description: '',
        specification: 'ASTM A106 Gr. B',
        size: '4"',
        schedule_rating: 'Sch 40',
        heat_no: '',
        mtc_no: '',
        qty: 1,
        unit: 'meter',
        storage_type: 'OPEN_YARD',
        storage_location: 'Laydown Yard Bay 01',
        status: 'RECEIVED',
        remarks: ''
    });

    const canEdit = can(user, 'stock.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/material-receivings');
            setReceivings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load material receivings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const total = receivings.length;
        const accepted = receivings.filter(r => r.status === 'ACCEPTED').length;
        const pending = receivings.filter(r => r.status === 'RECEIVED' || r.status === 'INSPECTED').length;
        const openYardCount = receivings.filter(r => r.storage_type === 'OPEN_YARD').length;
        const warehouseCount = receivings.filter(r => r.storage_type === 'WAREHOUSE').length;
        return { total, accepted, pending, openYardCount, warehouseCount };
    }, [receivings]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return receivings.filter(r => {
            const matchSearch = !q ||
                (r.shipment_no || '').toLowerCase().includes(q) ||
                (r.po_no || '').toLowerCase().includes(q) ||
                (r.vendor || '').toLowerCase().includes(q) ||
                (r.item_name || '').toLowerCase().includes(q) ||
                (r.specification || '').toLowerCase().includes(q) ||
                (r.heat_no || '').toLowerCase().includes(q) ||
                (r.mtc_no || '').toLowerCase().includes(q);

            const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
            const matchStorage = filterStorage === 'ALL' || r.storage_type === filterStorage;
            return matchSearch && matchStatus && matchStorage;
        });
    }, [receivings, search, filterStatus, filterStorage]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                arrival_date: item.arrival_date || '',
                shipment_no: item.shipment_no || '',
                po_no: item.po_no || '',
                vendor: item.vendor || '',
                item_name: item.item_name || '',
                description: item.description || '',
                specification: item.specification || '',
                size: item.size || '',
                schedule_rating: item.schedule_rating || '',
                heat_no: item.heat_no || '',
                mtc_no: item.mtc_no || '',
                qty: item.qty || 1,
                unit: item.unit || 'meter',
                storage_type: item.storage_type || 'OPEN_YARD',
                storage_location: item.storage_location || '',
                status: item.status || 'RECEIVED',
                remarks: item.remarks || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                arrival_date: new Date().toISOString().split('T')[0],
                shipment_no: `SJ-${Date.now().toString().slice(-4)}`,
                po_no: 'PO-2428-MAT-001',
                vendor: '',
                item_name: '',
                description: '',
                specification: 'ASTM A106 Gr. B',
                size: '4"',
                schedule_rating: 'Sch 40',
                heat_no: '',
                mtc_no: '',
                qty: 1,
                unit: 'meter',
                storage_type: 'OPEN_YARD',
                storage_location: 'Laydown Yard Bay 01',
                status: 'RECEIVED',
                remarks: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            if (editingItem) {
                await api.put(`/material-receivings/${editingItem.id}`, form);
            } else {
                await api.post('/material-receivings', form);
            }
            handleCloseModal();
            loadData();
            if (onToast) onToast();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan data penerimaan material.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus pencatatan penerimaan material ini?')) return;
        try {
            await api.del(`/material-receivings/${id}`);
            loadData();
            if (onToast) onToast();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    };

    return (
        <div className="section-material-receiving">
            {/* Header Title & Subtitle */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Material Receiving Report
                    </h2>
                    <p className="text-muted small mb-0">
                        Kode WBS 26-00-MAT-000 (FE) / MAT-006 (BE) — Penerimaan material dari vendor, verifikasi Surat Jalan, Packing List, Heat Number, dan Mill Test Certificate (MTC).
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary px-3 py-2"
                        onClick={() => handleOpenModal()}
                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', fontWeight: 600 }}
                    >
                        + Catat Material Masuk
                    </button>
                )}
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Total Batch Masuk</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.total}</span>
                                <span className="text-muted small">Surat Jalan / Shipment</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Lolos QC (Accepted)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-success">{stats.accepted}</span>
                                <span className="text-muted small">Batch siap pakai</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Pending QC / Karantina</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-warning">{stats.pending}</span>
                                <span className="text-muted small">Perlu inspeksi</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #64748b' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Distribusi Penyimpanan</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h5 mb-0 fw-bold text-dark">{stats.openYardCount}</span>
                                <span className="text-muted small">Yard /</span>
                                <span className="h5 mb-0 fw-bold text-dark">{stats.warehouseCount}</span>
                                <span className="text-muted small">Warehouse</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-5">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari Surat Jalan, PO, Vendor, Item, Heat No, atau MTC..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-6 col-md-3">
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="ALL">Semua Status QC</option>
                                <option value="ACCEPTED">ACCEPTED (Lolos)</option>
                                <option value="RECEIVED">RECEIVED (Baru Tiba)</option>
                                <option value="INSPECTED">INSPECTED (Proses)</option>
                                <option value="REJECTED">REJECTED (NCR)</option>
                            </select>
                        </div>
                        <div className="col-6 col-md-2">
                            <select
                                className="form-select"
                                value={filterStorage}
                                onChange={(e) => setFilterStorage(e.target.value)}
                            >
                                <option value="ALL">Semua Lokasi</option>
                                <option value="OPEN_YARD">Open Yard</option>
                                <option value="WAREHOUSE">Warehouse</option>
                            </select>
                        </div>
                        <div className="col-12 col-md-2 text-md-end text-muted small">
                            {filtered.length} dari {receivings.length} batch
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.92rem' }}>
                            <thead className="table-light text-muted text-uppercase" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>
                                <tr>
                                    <th className="px-3 py-3">Tgl Tiba</th>
                                    <th className="py-3">No. Shipment / PO</th>
                                    <th className="py-3">Vendor</th>
                                    <th className="py-3">Item & Deskripsi</th>
                                    <th className="py-3">Spec / ASTM</th>
                                    <th className="py-3">Ukuran / Rating</th>
                                    <th className="py-3 text-center">Heat No / MTC</th>
                                    <th className="py-3 text-end">Qty Diterima</th>
                                    <th className="py-3">Lokasi Simpan</th>
                                    <th className="py-3 text-center">Status</th>
                                    {canEdit && <th className="px-3 py-3 text-end">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Memuat data material receiving...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Tidak ada data penerimaan material yang sesuai kriteria pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-3 text-nowrap fw-semibold text-secondary">
                                                {item.arrival_date}
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{item.shipment_no}</div>
                                                <div className="text-muted small">{item.po_no}</div>
                                            </td>
                                            <td className="text-nowrap">{item.vendor}</td>
                                            <td>
                                                <div className="fw-semibold text-dark">{item.item_name}</div>
                                                <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }} title={item.description}>
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {item.specification}
                                                </span>
                                            </td>
                                            <td className="text-nowrap">
                                                {item.size} {item.schedule_rating ? `(${item.schedule_rating})` : ''}
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary font-monospace">
                                                    {item.heat_no}
                                                </span>
                                                {item.mtc_no && (
                                                    <div className="text-muted small font-monospace mt-1">
                                                        {item.mtc_no}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-end text-nowrap fw-bold text-dark">
                                                {parseFloat(item.qty).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {item.unit}
                                            </td>
                                            <td className="text-nowrap">
                                                <span className={`badge ${item.storage_type === 'OPEN_YARD' ? 'bg-primary' : 'bg-info text-dark'}`}>
                                                    {item.storage_type === 'OPEN_YARD' ? 'Open Yard' : 'Warehouse'}
                                                </span>
                                                <div className="text-muted small mt-1">{item.storage_location}</div>
                                            </td>
                                            <td className="text-center text-nowrap">
                                                <span className={`badge ${
                                                    item.status === 'ACCEPTED' ? 'bg-success' :
                                                    item.status === 'REJECTED' ? 'bg-danger' :
                                                    item.status === 'INSPECTED' ? 'bg-info text-dark' : 'bg-warning text-dark'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="px-3 text-end text-nowrap">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary me-1 py-1 px-2"
                                                        onClick={() => handleOpenModal(item)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger py-1 px-2"
                                                        onClick={() => handleDelete(item.id)}
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
            </div>

            {/* Modal Input/Edit Form */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    {editingItem ? 'Edit Penerimaan Material' : 'Catat Penerimaan Material Baru'}
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    {formError && (
                                        <div className="alert alert-danger py-2 mb-3 small">
                                            {formError}
                                        </div>
                                    )}

                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Tanggal Tiba</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                value={form.arrival_date}
                                                onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">No. Surat Jalan / Shipment</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="SJ-XXXX-001"
                                                value={form.shipment_no}
                                                onChange={(e) => setForm({ ...form, shipment_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Nomor PO Proyek</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="PO-2428-MAT-XXX"
                                                value={form.po_no}
                                                onChange={(e) => setForm({ ...form, po_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Vendor / Supplier</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Nama PT / Pemasok"
                                                value={form.vendor}
                                                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nama Item Material</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Contoh: Pipe Seamless CS 4"
                                                value={form.item_name}
                                                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Deskripsi Lengkap Item</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Spesifikasi detil, tipe end (BE/BW/RF/NPT), dll"
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Spesifikasi Material (ASTM)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="ASTM A106 Gr. B / A234 WPB"
                                                value={form.specification}
                                                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Ukuran Nominal (NPS)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder='4", 2", 1/2", dll'
                                                value={form.size}
                                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Rating / Schedule</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Sch 40, Sch 80, 150# RF, dll"
                                                value={form.schedule_rating}
                                                onChange={(e) => setForm({ ...form, schedule_rating: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nomor Heat (Heat No)</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                required
                                                placeholder="HT-XXXXXX"
                                                value={form.heat_no}
                                                onChange={(e) => setForm({ ...form, heat_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nomor Sertifikat Pabrik (MTC No)</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                placeholder="MTC-XXXX-XXX"
                                                value={form.mtc_no}
                                                onChange={(e) => setForm({ ...form, mtc_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Kuantitas Masuk</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                required
                                                value={form.qty}
                                                onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Satuan</label>
                                            <select
                                                className="form-select"
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            >
                                                <option value="meter">meter</option>
                                                <option value="pcs">pcs</option>
                                                <option value="set">set</option>
                                                <option value="kg">kg</option>
                                                <option value="drum">drum</option>
                                                <option value="box">box</option>
                                            </select>
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Jenis Penyimpanan</label>
                                            <select
                                                className="form-select"
                                                value={form.storage_type}
                                                onChange={(e) => setForm({ ...form, storage_type: e.target.value })}
                                            >
                                                <option value="OPEN_YARD">Open Yard (Luar Ruangan)</option>
                                                <option value="WAREHOUSE">Warehouse (Dalam Ruangan)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Lokasi Detil Simpan</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Laydown Bay 01 / Rack A-02"
                                                value={form.storage_location}
                                                onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Status QC</label>
                                            <select
                                                className="form-select"
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option value="RECEIVED">RECEIVED (Baru Tiba)</option>
                                                <option value="INSPECTED">INSPECTED (Sedang Diperiksa)</option>
                                                <option value="ACCEPTED">ACCEPTED (Lolos QC)</option>
                                                <option value="REJECTED">REJECTED (Karantina / NCR)</option>
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Catatan / Remarks</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Kondisi bevel, kemasan, proteksi, dll"
                                                value={form.remarks}
                                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={formLoading}
                                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' }}
                                    >
                                        {formLoading ? 'Menyimpan...' : 'Simpan Data Penerimaan'}
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
