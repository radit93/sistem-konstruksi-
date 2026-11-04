import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { MaterialDocumentsModal } from './MaterialDocumentsModal';
import { MaterialReportModal } from './MaterialReportModal';

export function MaterialStoringSection({ user, onToast }) {
    const [storings, setStorings] = useState([]);
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStockStatus, setFilterStockStatus] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [documentSubject, setDocumentSubject] = useState(null);
    const [reportType, setReportType] = useState(null);

    const [form, setForm] = useState({
        item_code: '',
        item_name: '',
        category: 'PIPE',
        material_standard_id: '',
        specification: 'ASTM A106 Gr. B',
        size: '4"',
        schedule_rating: 'Sch 40',
        storage_type: 'OPEN_YARD',
        location_detail: 'Laydown Yard Bay 01',
        stock_in: 0,
        stock_out: 0,
        balance: 0,
        unit: 'meter',
        min_stock_alert: 10
    });

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferItem, setTransferItem] = useState(null);
    const [transferForm, setTransferForm] = useState({
        storage_type: 'OPEN_YARD',
        location_detail: '',
        notes: ''
    });
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferError, setTransferError] = useState('');

    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [ledgerItem, setLedgerItem] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    const canEdit = can(user, 'stock.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/material-storings');
            setStorings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load material storing data:', err);
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

    const stats = useMemo(() => {
        const totalItems = storings.length;
        const totalIn = storings.reduce((acc, s) => acc + (parseFloat(s.stock_in) || 0), 0);
        const totalOut = storings.reduce((acc, s) => acc + (parseFloat(s.stock_out) || 0), 0);
        const lowStock = storings.filter(s => {
            const bal = parseFloat(s.balance) || 0;
            const min = parseFloat(s.min_stock_alert) || 0;
            return bal <= min;
        }).length;
        return { totalItems, totalIn, totalOut, lowStock };
    }, [storings]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return storings.filter(item => {
            const matchSearch = !q ||
                (item.item_code || '').toLowerCase().includes(q) ||
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.specification || '').toLowerCase().includes(q) ||
                (item.material_standard?.code || '').toLowerCase().includes(q) ||
                (item.location_detail || '').toLowerCase().includes(q);

            const matchCat = filterCategory === 'ALL' || item.category === filterCategory;

            const isLow = (parseFloat(item.balance) || 0) <= (parseFloat(item.min_stock_alert) || 0);
            const matchStock = filterStockStatus === 'ALL' ||
                (filterStockStatus === 'LOW' && isLow) ||
                (filterStockStatus === 'OK' && !isLow);

            return matchSearch && matchCat && matchStock;
        });
    }, [storings, search, filterCategory, filterStockStatus]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                item_code: item.item_code || '',
                item_name: item.item_name || '',
                category: item.category || 'PIPE',
                material_standard_id: item.material_standard_id || '',
                specification: item.specification || '',
                size: item.size || '',
                schedule_rating: item.schedule_rating || '',
                storage_type: item.storage_type || 'OPEN_YARD',
                location_detail: item.location_detail || '',
                stock_in: item.stock_in || 0,
                stock_out: item.stock_out || 0,
                balance: item.balance || 0,
                unit: item.unit || 'meter',
                min_stock_alert: item.min_stock_alert || 5
            });
        } else {
            setEditingItem(null);
            setForm({
                item_code: `MAT-STK-${(storings.length + 1).toString().padStart(3, '0')}`,
                item_name: '',
                category: 'PIPE',
                material_standard_id: '',
                specification: 'ASTM A106 Gr. B',
                size: '4"',
                schedule_rating: 'Sch 40',
                storage_type: 'OPEN_YARD',
                location_detail: 'Laydown Yard Bay 01',
                stock_in: 0,
                stock_out: 0,
                balance: 0,
                unit: 'meter',
                min_stock_alert: 5
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
        setFormError('');
    };

    const handleStandardChange = (standardId) => {
        const standard = standards.find((item) => String(item.id) === String(standardId));

        if (!standard) {
            setForm((prev) => ({ ...prev, material_standard_id: '' }));
            return;
        }

        const isPipe = (standard.category || '').toLowerCase() === 'pipe';

        setForm((prev) => ({
            ...prev,
            material_standard_id: standard.id,
            category: (standard.category || prev.category).toUpperCase(),
            specification: standard.specification || prev.specification,
            schedule_rating: standard.schedule && !standard.schedule.includes('/')
                ? standard.schedule
                : prev.schedule_rating,
            unit: isPipe ? 'meter' : (prev.unit === 'meter' ? 'pcs' : prev.unit),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        const payload = {
            ...form,
            material_standard_id: form.material_standard_id || null,
            balance: (parseFloat(form.stock_in) || 0) - (parseFloat(form.stock_out) || 0)
        };

        try {
            if (editingItem) {
                await api.put(`/material-storings/${editingItem.id}`, payload);
            } else {
                await api.post('/material-storings', payload);
            }
            handleCloseModal();
            loadData();
            if (onToast) onToast();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan data stok.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus item inventaris ini?')) return;
        try {
            await api.del(`/material-storings/${id}`);
            loadData();
            if (onToast) onToast();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    };

    const handleOpenTransfer = (item) => {
        setTransferItem(item);
        setTransferForm({
            storage_type: item.storage_type || 'OPEN_YARD',
            location_detail: item.location_detail || '',
            notes: ''
        });
        setTransferError('');
        setShowTransferModal(true);
    };

    const handleCloseTransfer = () => {
        setShowTransferModal(false);
        setTransferItem(null);
        setTransferError('');
    };

    const handleSubmitTransfer = async (e) => {
        e.preventDefault();
        setTransferLoading(true);
        setTransferError('');

        try {
            await api.post(`/material-storings/${transferItem.id}/transfer`, transferForm);
            handleCloseTransfer();
            loadData();
            if (onToast) onToast();
        } catch (err) {
            setTransferError(err.message || 'Gagal memindahkan stok.');
        } finally {
            setTransferLoading(false);
        }
    };

    const handleOpenLedger = async (item) => {
        setShowLedgerModal(true);
        setLedgerLoading(true);
        setLedgerItem(item);

        try {
            const detail = await api.get(`/material-storings/${item.id}`);
            setLedgerItem(detail);
        } catch (err) {
            alert('Gagal memuat riwayat stok: ' + err.message);
            setShowLedgerModal(false);
        } finally {
            setLedgerLoading(false);
        }
    };

    const handleCloseLedger = () => {
        setShowLedgerModal(false);
        setLedgerItem(null);
    };

    return (
        <div className="section-material-storing">
            {/* Header Title & Subtitle */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Material Storing & Saldo Stok Terpusat
                    </h2>
                    <p className="text-muted small mb-0">
                        Kode WBS 26-00-MAT-002 (FE) / MAT-008 (BE) — Rekapitulasi mutasi stok material terpadu, batas minimum stok (Safety Stock), dan lampiran denah lokasi penyimpanan (Mapping Material Location).
                    </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary px-3 py-2"
                        onClick={() => setReportType('stock')}
                    >
                        Cetak Stock List
                    </button>
                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-primary px-3 py-2"
                            onClick={() => handleOpenModal()}
                            style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', fontWeight: 600 }}
                        >
                            + Tambah Item Inventaris
                        </button>
                    )}
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Total Jenis Item</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.totalItems}</span>
                                <span className="text-muted small">Katalog Aktif</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Akumulasi Masuk (IN)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-success">{stats.totalIn.toLocaleString('id-ID')}</span>
                                <span className="text-muted small">Unit kumulatif</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Akumulasi Keluar (OUT)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-warning">{stats.totalOut.toLocaleString('id-ID')}</span>
                                <span className="text-muted small">Distribusi Fabrikasi</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b91c1c' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Peringatan Stok Rendah</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-danger">{stats.lowStock}</span>
                                <span className="text-muted small">Perlu restock</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Document & SOP Banner */}
            <div className="card border-0 shadow-sm mb-4 bg-light">
                <div className="card-body py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <div className="fw-bold text-dark">Mapping Material Location & Standar Penyimpanan (SOP)</div>
                        <div className="text-muted small">
                            Pemisahan ketat antara Laydown Open Yard (Pipa CS/SS berpenyangga balok kayu) dan Indoor Warehouse ber-AC/kering (Valve, Flange, Gasket, Fastener).
                        </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setReportType('stock')}
                        >
                            Cetak Stock List
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setReportType('location-map')}
                        >
                            Mapping Lokasi (PDF)
                        </button>
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
                                placeholder="Cari Kode Item, Nama Barang, Spesifikasi, atau Lokasi..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-6 col-md-3">
                            <select
                                className="form-select"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="ALL">Semua Kategori</option>
                                <option value="PIPE">PIPE (Pipa Batangan)</option>
                                <option value="FITTING">FITTING (Elbow, Tee, Reducer)</option>
                                <option value="FLANGE">FLANGE (WNRF, Blind, Slip-on)</option>
                                <option value="VALVE">VALVE (Gate, Globe, Check, Ball)</option>
                                <option value="FASTENER">FASTENER (Stud Bolt & Nuts)</option>
                                <option value="GASKET">GASKET (Spiral Wound / Sheet)</option>
                            </select>
                        </div>
                        <div className="col-6 col-md-2">
                            <select
                                className="form-select"
                                value={filterStockStatus}
                                onChange={(e) => setFilterStockStatus(e.target.value)}
                            >
                                <option value="ALL">Semua Level Stok</option>
                                <option value="OK">Aman (Normal)</option>
                                <option value="LOW">Stok Kritis / Rendah</option>
                            </select>
                        </div>
                        <div className="col-12 col-md-2 text-md-end text-muted small">
                            {filtered.length} dari {storings.length} item
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
                                    <th className="px-3 py-3">Kode Item</th>
                                    <th className="py-3">Nama Material</th>
                                    <th className="py-3">Kategori</th>
                                    <th className="py-3">Spesifikasi ASTM</th>
                                    <th className="py-3">Ukuran & Rating</th>
                                    <th className="py-3">Lokasi Penyimpanan</th>
                                    <th className="py-3 text-end text-success">Masuk (IN)</th>
                                    <th className="py-3 text-end text-warning">Keluar (OUT)</th>
                                    <th className="py-3 text-end fw-bold">Saldo Akhir</th>
                                    <th className="py-3 text-center">Status Stok</th>
                                    {canEdit && <th className="px-3 py-3 text-end">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Memuat data material storing...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Tidak ada data inventaris material yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => {
                                        const bal = parseFloat(item.balance) || 0;
                                        const minAlert = parseFloat(item.min_stock_alert) || 0;
                                        const isLow = bal <= minAlert;

                                        return (
                                            <tr key={item.id}>
                                                <td className="px-3 text-nowrap fw-bold text-dark font-monospace">
                                                    {item.item_code}
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-dark">{item.item_name}</div>
                                                    <div className="text-muted small">
                                                        {item.line_no ? `Line ${item.line_no}` : 'Tanpa line'}
                                                        {item.heat_no ? ` • Heat ${item.heat_no}` : ''}
                                                    </div>
                                                    {item.receiving && (
                                                        <div className="text-muted small">
                                                            Receiving: {item.receiving.shipment_no} / {item.receiving.po_no}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-secondary small">{item.specification}</span>
                                                    {item.material_standard?.code && (
                                                        <div className="text-muted small font-monospace mt-1">
                                                            {item.material_standard.code}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-nowrap">
                                                    {item.size} {item.schedule_rating ? `(${item.schedule_rating})` : ''}
                                                </td>
                                                <td className="text-nowrap">
                                                    <div className="fw-semibold text-dark small">{item.location_detail}</div>
                                                    <span className={`badge ${item.storage_type === 'OPEN_YARD' ? 'bg-primary' : 'bg-info text-dark'}`} style={{ fontSize: '0.7rem' }}>
                                                        {item.storage_type === 'OPEN_YARD' ? 'Open Yard' : 'Indoor Warehouse'}
                                                    </span>
                                                </td>
                                                <td className="text-end text-success text-nowrap">
                                                    +{parseFloat(item.stock_in).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="text-end text-warning text-nowrap">
                                                    -{parseFloat(item.stock_out).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="text-end text-nowrap fw-bold text-dark">
                                                    {bal.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {item.unit}
                                                </td>
                                                <td className="text-center text-nowrap">
                                                    <span className={`badge ${isLow ? 'bg-danger' : 'bg-success'}`}>
                                                        {isLow ? 'Stok Kritis' : 'Normal'}
                                                    </span>
                                                    {isLow && (
                                                        <div className="text-danger small mt-1" style={{ fontSize: '0.72rem' }}>
                                                            Min: {minAlert} {item.unit}
                                                        </div>
                                                    )}
                                                </td>
                                                {canEdit && (
                                                    <td className="px-3 text-end text-nowrap">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary me-1 py-1 px-2"
                                                            onClick={() => handleOpenTransfer(item)}
                                                        >
                                                            Transfer
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-info me-1 py-1 px-2"
                                                            onClick={() => handleOpenLedger(item)}
                                                        >
                                                            Riwayat
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary me-1 py-1 px-2"
                                                            onClick={() => setDocumentSubject(item)}
                                                        >
                                                            Dokumen {item.documents?.length ? `(${item.documents.length})` : ''}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary me-1 py-1 px-2"
                                                            onClick={() => handleOpenModal(item)}
                                                        >
                                                            Edit
                                                        </button>
                                                        {!item.receiving_id && (parseFloat(item.stock_out) || 0) <= 0 && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger py-1 px-2"
                                                                onClick={() => handleDelete(item.id)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        )}
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

            {/* Modal Input/Edit Form */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    {editingItem ? 'Edit Item Inventaris' : 'Tambah Master Item Material Storing'}
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
                                    {editingItem && (
                                        <div className="alert alert-info py-2 mb-3 small">
                                            Qty stok tidak dapat diubah manual. Gunakan tombol Transfer untuk memindahkan lokasi
                                            dan proses Issuing untuk pengeluaran material.
                                        </div>
                                    )}

                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Kode Item</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                required
                                                disabled={Boolean(editingItem)}
                                                value={form.item_code}
                                                onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Kategori Komponen</label>
                                            <select
                                                className="form-select"
                                                disabled={Boolean(editingItem?.receiving_id)}
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="PIPE">PIPE</option>
                                                <option value="FITTING">FITTING</option>
                                                <option value="FLANGE">FLANGE</option>
                                                <option value="VALVE">VALVE</option>
                                                <option value="FASTENER">FASTENER</option>
                                                <option value="GASKET">GASKET</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Tipe Fasilitas</label>
                                            <select
                                                className="form-select"
                                                value={form.storage_type}
                                                onChange={(e) => setForm({ ...form, storage_type: e.target.value })}
                                            >
                                                <option value="OPEN_YARD">Open Yard (Luar Ruangan)</option>
                                                <option value="WAREHOUSE">Warehouse (Dalam Ruangan)</option>
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Kode Standar Material</label>
                                            <select
                                                className="form-select"
                                                value={form.material_standard_id}
                                                onChange={(e) => handleStandardChange(e.target.value)}
                                                disabled={Boolean(editingItem?.receiving_id) || (parseFloat(editingItem?.stock_out) || 0) > 0}
                                            >
                                                <option value="">Tanpa kode standar (cocokkan via teks)</option>
                                                {standards.map((standard) => (
                                                    <option key={standard.id} value={standard.id}>
                                                        {standard.code} — {standard.specification} ({standard.category})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="form-text">
                                                Stok dari receiving otomatis mengikuti kode standar receiving. Untuk stok manual, pilih kode agar ikut rekonsiliasi BOM.
                                            </div>
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nama Material</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                disabled={Boolean(editingItem?.receiving_id)}
                                                value={form.item_name}
                                                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Lokasi Detil Simpan</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Contoh: Laydown Bay 01 (Rack P-01) / Rack A-02"
                                                value={form.location_detail}
                                                onChange={(e) => setForm({ ...form, location_detail: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Spesifikasi ASTM</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                disabled={Boolean(editingItem?.receiving_id)}
                                                value={form.specification}
                                                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Ukuran Nominal</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                disabled={Boolean(editingItem?.receiving_id)}
                                                value={form.size}
                                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Rating / Sch</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                disabled={Boolean(editingItem?.receiving_id)}
                                                value={form.schedule_rating}
                                                onChange={(e) => setForm({ ...form, schedule_rating: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-semibold text-secondary">Stok Masuk (IN)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                required
                                                disabled={Boolean(editingItem)}
                                                value={form.stock_in}
                                                onChange={(e) => setForm({ ...form, stock_in: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-semibold text-secondary">Stok Keluar (OUT)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                required
                                                disabled={Boolean(editingItem)}
                                                value={form.stock_out}
                                                onChange={(e) => setForm({ ...form, stock_out: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-semibold text-secondary">Satuan</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                disabled={Boolean(editingItem?.receiving_id)}
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-semibold text-secondary">Safety Stock Alert</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                required
                                                value={form.min_stock_alert}
                                                onChange={(e) => setForm({ ...form, min_stock_alert: parseFloat(e.target.value) || 0 })}
                                            />
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
                                        {formLoading ? 'Menyimpan...' : 'Simpan Inventaris'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Transfer Lokasi Stok */}
            {showTransferModal && transferItem && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">Transfer Lokasi Stok</h5>
                                <button type="button" className="btn-close" onClick={handleCloseTransfer}></button>
                            </div>
                            <form onSubmit={handleSubmitTransfer}>
                                <div className="modal-body p-4">
                                    {transferError && (
                                        <div className="alert alert-danger py-2 mb-3 small">
                                            {transferError}
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <div className="fw-semibold text-dark">
                                            {transferItem.item_code} — {transferItem.item_name}
                                        </div>
                                        <div className="text-muted small">
                                            Lokasi saat ini: {transferItem.location_detail} (
                                            {transferItem.storage_type === 'OPEN_YARD' ? 'Open Yard' : 'Indoor Warehouse'})
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Tipe Fasilitas Tujuan</label>
                                        <select
                                            className="form-select"
                                            value={transferForm.storage_type}
                                            onChange={(e) => setTransferForm({ ...transferForm, storage_type: e.target.value })}
                                        >
                                            <option value="OPEN_YARD">Open Yard (Luar Ruangan)</option>
                                            <option value="WAREHOUSE">Warehouse (Dalam Ruangan)</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Lokasi Tujuan</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            placeholder="Contoh: Laydown Yard Bay 02 / Rack B-01"
                                            value={transferForm.location_detail}
                                            onChange={(e) => setTransferForm({ ...transferForm, location_detail: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label small fw-semibold text-secondary">Catatan Transfer</label>
                                        <textarea
                                            className="form-control"
                                            rows={2}
                                            placeholder="Alasan pemindahan, kondisi material, dll."
                                            value={transferForm.notes}
                                            onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCloseTransfer}>
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={transferLoading}
                                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' }}
                                    >
                                        {transferLoading ? 'Memproses...' : 'Transfer Stok'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Riwayat Pergerakan Stok */}
            {showLedgerModal && ledgerItem && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark">Riwayat Pergerakan Stok</h5>
                                    <div className="text-muted small">
                                        {ledgerItem.item_code} — {ledgerItem.item_name}
                                    </div>
                                </div>
                                <button type="button" className="btn-close" onClick={handleCloseLedger}></button>
                            </div>
                            <div className="modal-body p-0">
                                {ledgerLoading ? (
                                    <div className="text-center py-4 text-muted">Memuat riwayat stok...</div>
                                ) : (ledgerItem.movements || []).length === 0 ? (
                                    <div className="text-center py-4 text-muted">Belum ada pergerakan stok untuk lot ini.</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
                                            <thead className="table-light text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                                                <tr>
                                                    <th className="px-3 py-2">Tanggal</th>
                                                    <th className="py-2">Tipe</th>
                                                    <th className="py-2 text-end">Qty</th>
                                                    <th className="py-2 text-end">Saldo</th>
                                                    <th className="py-2">Referensi</th>
                                                    <th className="py-2">Catatan</th>
                                                    <th className="py-2">Oleh</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(ledgerItem.movements || [])
                                                    .slice()
                                                    .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
                                                    .map((movement) => (
                                                        <tr key={movement.id}>
                                                            <td className="px-3 text-nowrap">
                                                                {movement.occurred_at
                                                                    ? new Date(movement.occurred_at).toLocaleString('id-ID')
                                                                    : '-'}
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    movement.type === 'IN' ? 'bg-success' :
                                                                    movement.type === 'OUT' ? 'bg-warning text-dark' :
                                                                    movement.type === 'TRANSFER' ? 'bg-info text-dark' : 'bg-secondary'
                                                                }`}>
                                                                    {movement.type}
                                                                </span>
                                                            </td>
                                                            <td className={`text-end text-nowrap ${
                                                                movement.type === 'IN' ? 'text-success' :
                                                                movement.type === 'OUT' ? 'text-warning' : 'text-dark'
                                                            }`}>
                                                                {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                                                                {parseFloat(movement.qty || 0).toLocaleString('id-ID')} {movement.unit}
                                                            </td>
                                                            <td className="text-end text-nowrap fw-semibold">
                                                                {parseFloat(movement.balance_after || 0).toLocaleString('id-ID')} {movement.unit}
                                                            </td>
                                                            <td className="text-nowrap">
                                                                {movement.reference_type || '-'}
                                                                {movement.reference_id ? ` #${movement.reference_id}` : ''}
                                                            </td>
                                                            <td className="text-muted small">{movement.notes || '-'}</td>
                                                            <td className="text-nowrap">{movement.creator?.name || '-'}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-top bg-light">
                                <button type="button" className="btn btn-outline-secondary" onClick={handleCloseLedger}>
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MaterialDocumentsModal
                open={Boolean(documentSubject)}
                subjectType="storing"
                subject={documentSubject}
                canEdit={canEdit}
                onClose={() => setDocumentSubject(null)}
                onChanged={loadData}
            />

            <MaterialReportModal
                open={Boolean(reportType)}
                reportType={reportType || 'stock'}
                initialFilters={reportType === 'location-map'
                    ? { search }
                    : {
                        search,
                        category: filterCategory,
                        stock_status: filterStockStatus === 'OK' ? 'NORMAL' : filterStockStatus,
                    }}
                onClose={() => setReportType(null)}
            />
        </div>
    );
}
