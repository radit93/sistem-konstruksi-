import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { MaterialReportModal } from './MaterialReportModal';
import { scopeRows } from '../engineering/projectScope';

export function OpenYardSection({
    user,
    onToast,
    activeProjectId = '',
    filterProject = 'ALL',
}) {
    const [storings, setStorings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [reportType, setReportType] = useState(null);

    const canEdit = can(user, 'stock.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/material-storings');
            // Filter strictly to OPEN_YARD storage type
            const yardItems = (Array.isArray(data) ? data : []).filter(
                item => item.storage_type === 'OPEN_YARD'
            );
            setStorings(yardItems);
        } catch (err) {
            console.error('Failed to load open yard data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const scoped = useMemo(
        () => scopeRows(storings, activeProjectId, filterProject),
        [storings, activeProjectId, filterProject]
    );

    const stats = useMemo(() => {
        const total = scoped.length;
        const totalMeterIn = scoped.reduce((acc, s) => acc + (parseFloat(s.stock_in) || 0), 0);
        const totalMeterOut = scoped.reduce((acc, s) => acc + (parseFloat(s.stock_out) || 0), 0);
        const totalMeterBalance = scoped.reduce((acc, s) => acc + (parseFloat(s.balance) || 0), 0);
        return { total, totalMeterIn, totalMeterOut, totalMeterBalance };
    }, [scoped]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return scoped.filter(item => {
            return !q ||
                (item.item_code || '').toLowerCase().includes(q) ||
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.specification || '').toLowerCase().includes(q) ||
                (item.location_detail || '').toLowerCase().includes(q);
        });
    }, [scoped, search]);

    return (
        <div className="section-openyard">
            {/* Header Title & Subtitle */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Open Yard Storage (Laydown Area)
                    </h2>
                    <p className="text-muted small mb-0">
                        Kode WBS 26-00-MAT-004 (FE) / MAT-010 (BE) — Manajemen area terbuka (Laydown Yard): Khusus penyimpanan pipa batangan (*Raw Pipe Lengths* CS & SS), balok penyangga (*dunnage*), dan struktur baja pemipaan.
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
                    <div className="badge bg-primary px-3 py-2 fs-6">
                        SOP Yard: Elevasi Dunnage &gt; 150mm &amp; Bevel Cap Terpasang
                    </div>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Jenis Pipa / Profil</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.total}</span>
                                <span className="text-muted small">Kelompok Pipa</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Total Masuk ke Yard</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-success">{stats.totalMeterIn.toFixed(1)}</span>
                                <span className="text-muted small">Meter Pipa</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Telah Keluar ke Spool Fab</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-warning">{stats.totalMeterOut.toFixed(1)}</span>
                                <span className="text-muted small">Meter Dipotong</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #0284c7' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Sisa Saldo Pipa Laydown</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-primary">{stats.totalMeterBalance.toFixed(1)}</span>
                                <span className="text-muted small">Meter Tersedia</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zone Map Guide */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body py-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-bold text-dark">Laydown Bay 01: Carbon Steel (CS) Area</span>
                                <span className="badge bg-secondary">ASTM A106 / API 5L</span>
                            </div>
                            <p className="text-muted small mb-0">
                                Diletakkan di atas balok kayu meranti bertingkat maksimal 3 susun. Dilengkapi baji pengunci pipa (*wooden wedges*) untuk mencegah pergeseran lateral.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body py-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-bold text-dark">Laydown Bay 02: Stainless Steel (SS) Area</span>
                                <span className="badge bg-info text-dark">ASTM A312 TP304/316</span>
                            </div>
                            <p className="text-muted small mb-0">
                                Terpisah dari area CS untuk mencegah kontaminasi karbon ferit. Alas menggunakan karet atau kayu terlindung terpal kanvas kedap air.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-8">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari Kode Item, Spesifikasi Pipa, atau Bay Laydown Yard..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-4 text-md-end text-muted small">
                            {filtered.length} dari {scoped.length} jenis pipa outdoor
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
                                    <th className="py-3">Deskripsi Pipa Batangan</th>
                                    <th className="py-3">Spesifikasi ASTM</th>
                                    <th className="py-3">Ukuran & Sch</th>
                                    <th className="py-3">Lokasi Laydown Bay</th>
                                    <th className="py-3 text-end text-success">Total Tiba (m)</th>
                                    <th className="py-3 text-end text-warning">Dipotong Fab (m)</th>
                                    <th className="py-3 text-end fw-bold">Sisa Panjang (m)</th>
                                    <th className="py-3 text-center">Proteksi Bevel</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-4 text-muted">
                                            Memuat inventaris open yard...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-4 text-muted">
                                            Tidak ada item pipa outdoor yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => {
                                        const bal = parseFloat(item.balance) || 0;
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
                                                        {item.specification}
                                                    </span>
                                                </td>
                                                <td className="text-nowrap">
                                                    {item.size} {item.schedule_rating ? `(${item.schedule_rating})` : ''}
                                                </td>
                                                <td className="text-nowrap">
                                                    <span className="badge bg-primary">
                                                        {item.location_detail}
                                                    </span>
                                                </td>
                                                <td className="text-end text-success text-nowrap">
                                                    {parseFloat(item.stock_in).toFixed(2)} m
                                                </td>
                                                <td className="text-end text-warning text-nowrap">
                                                    {parseFloat(item.stock_out).toFixed(2)} m
                                                </td>
                                                <td className="text-end text-nowrap fw-bold text-dark">
                                                    {bal.toFixed(2)} m
                                                </td>
                                                <td className="text-center text-nowrap">
                                                    <span className="badge bg-success">
                                                        End Cap OK
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
                    ? { storage_type: 'OPEN_YARD', search }
                    : { storage_type: 'OPEN_YARD', search }}
                onClose={() => setReportType(null)}
            />
        </div>
    );
}
