import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { MaterialReportModal } from './MaterialReportModal';
import { PcmSelect } from '../SearchSelect';

export function WarehousingSection({ user, onToast }) {
    const [storings, setStorings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [reportType, setReportType] = useState(null);

    const canEdit = can(user, 'stock.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/material-storings');
            // Filter strictly to WAREHOUSE storage type
            const warehouseItems = (Array.isArray(data) ? data : []).filter(
                item => item.storage_type === 'WAREHOUSE'
            );
            setStorings(warehouseItems);
        } catch (err) {
            console.error('Failed to load warehousing data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const total = storings.length;
        const valves = storings.filter(s => s.category === 'VALVE').length;
        const fittingsFlanges = storings.filter(s => s.category === 'FITTING' || s.category === 'FLANGE').length;
        const fastenersGaskets = storings.filter(s => s.category === 'FASTENER' || s.category === 'GASKET').length;
        return { total, valves, fittingsFlanges, fastenersGaskets };
    }, [storings]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return storings.filter(item => {
            const matchSearch = !q ||
                (item.item_code || '').toLowerCase().includes(q) ||
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.specification || '').toLowerCase().includes(q) ||
                (item.location_detail || '').toLowerCase().includes(q);

            const matchCat = filterCategory === 'ALL' || item.category === filterCategory;
            return matchSearch && matchCat;
        });
    }, [storings, search, filterCategory]);

    return (
        <div className="section-warehousing">
            {/* Header Title & Subtitle */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Warehousing (Indoor Storage)
                    </h2>
                    <p className="text-muted small mb-0">
                        Kode WBS 26-00-MAT-003 (FE) / MAT-009 (BE) — Manajemen penyimpanan tertutup di dalam gudang: Khusus katup (*Valve*), *Flange*, *Fitting*, baut (*Fasteners*), dan paking (*Gaskets*) dengan proteksi cuaca.
                    </p>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm px-3"
                        onClick={() => setReportType('stock')}
                    >
                        Cetak Stock List
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-3"
                        onClick={() => setReportType('location-map')}
                    >
                        Mapping Lokasi
                    </button>
                    <div className="badge bg-success px-3 py-2 fs-6">
                        SOP Indoor: Kelembaban &lt; 65% Terkendali
                    </div>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Total Item Indoor</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.total}</span>
                                <span className="text-muted small">Komponen presisi</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Katup (Valves Bay C)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-success">{stats.valves}</span>
                                <span className="text-muted small">Gate / Globe / Check</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Fittings & Flanges (Rack A/B)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-warning">{stats.fittingsFlanges}</span>
                                <span className="text-muted small">Elbow & WNRF Flange</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #64748b' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Fasteners & Gaskets (Bin D/E)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.fastenersGaskets}</span>
                                <span className="text-muted small">Baut & Spiral Wound</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warehouse SOP Specification Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body py-3">
                            <div className="fw-bold text-dark mb-1">Zona Rak A & B: Fittings & Flanges</div>
                            <p className="text-muted small mb-0">
                                Disimpan per nomor heat & rating. Flange face dilapisi rust preventative dan penutup kayu lapis/plastik pelindung spiral serration.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body py-3">
                            <div className="fw-bold text-dark mb-1">Zona Bay C: Katup & Instrumentasi</div>
                            <p className="text-muted small mb-0">
                                Disimpan dalam posisi tertutup penuh (*fully closed*), end-flange blind cap terpasang, serta stem berpelumas anti-debu.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body py-3">
                            <div className="fw-bold text-dark mb-1">Zona Bin D & E: Fastener & Gasket</div>
                            <p className="text-muted small mb-0">
                                Baut B7/2H tersimpan di kompartemen kering. Gasket spiral wound diletakkan mendatar (*flat*) tanpa tekanan tumpuk berlebih.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-6">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari Kode Item, Nama Barang, Spesifikasi, atau Rak/Bin..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-6 col-md-4">
                            <PcmSelect
                                
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="ALL">Semua Kategori Gudang Indoor</option>
                                <option value="FITTING">FITTING</option>
                                <option value="FLANGE">FLANGE</option>
                                <option value="VALVE">VALVE</option>
                                <option value="FASTENER">FASTENER</option>
                                <option value="GASKET">GASKET</option>
                            </PcmSelect>
                        </div>
                        <div className="col-6 col-md-2 text-md-end text-muted small">
                            {filtered.length} dari {storings.length} item
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
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
                                    <th className="py-3">Lokasi Rak / Bin</th>
                                    <th className="py-3 text-end text-success">Total Masuk</th>
                                    <th className="py-3 text-end text-warning">Total Keluar</th>
                                    <th className="py-3 text-end fw-bold">Saldo Gudang</th>
                                    <th className="py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4 text-muted">
                                            Memuat inventaris gudang indoor...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4 text-muted">
                                            Tidak ada item gudang indoor yang sesuai kriteria pencarian.
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
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-secondary small">{item.specification}</span>
                                                </td>
                                                <td className="text-nowrap">
                                                    {item.size} {item.schedule_rating ? `(${item.schedule_rating})` : ''}
                                                </td>
                                                <td className="text-nowrap">
                                                    <span className="badge bg-info text-dark font-monospace">
                                                        {item.location_detail}
                                                    </span>
                                                </td>
                                                <td className="text-end text-success text-nowrap">
                                                    {parseFloat(item.stock_in).toLocaleString('id-ID')}
                                                </td>
                                                <td className="text-end text-warning text-nowrap">
                                                    {parseFloat(item.stock_out).toLocaleString('id-ID')}
                                                </td>
                                                <td className="text-end text-nowrap fw-bold text-dark">
                                                    {bal.toLocaleString('id-ID')} {item.unit}
                                                </td>
                                                <td className="text-center text-nowrap">
                                                    <span className={`badge ${isLow ? 'bg-danger' : 'bg-success'}`}>
                                                        {isLow ? 'Stok Tipis' : 'Tersedia'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <MaterialReportModal
                open={Boolean(reportType)}
                reportType={reportType || 'stock'}
                initialFilters={reportType === 'location-map'
                    ? { storage_type: 'WAREHOUSE', search }
                    : { storage_type: 'WAREHOUSE', search, category: filterCategory }}
                onClose={() => setReportType(null)}
            />
        </div>
    );
}
