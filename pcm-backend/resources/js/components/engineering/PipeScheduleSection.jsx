import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

const COMMON_SCHEDULES = ['STD', 'Sch 40', 'XS', 'Sch 80', 'XXS'];
const ITEMS_PER_PAGE = 15;

const CATEGORIES = [
    { id: 'PIPE', label: 'Pipe (Pipa)' },
    { id: 'ELBOW', label: 'Elbow (LR & SR)' },
    { id: 'REDUCER', label: 'Reducer (Con. & Ecc.)' },
    { id: 'TEE', label: 'Tee & Tee Reducer' },
    { id: 'WELDOLET', label: 'Weldolet / Branch' },
];

export function PipeScheduleSection() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('PIPE');
    const [schedule, setSchedule] = useState('ALL');
    const [showAllSchedules, setShowAllSchedules] = useState(false);
    const [page, setPage] = useState(1);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/pipe-schedules');
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load pipe schedules:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        setPage(1);
    }, [search, category, schedule]);

    const schedules = useMemo(() => {
        const present = new Set(rows.map((row) => row.schedule));
        const allList = [...present];
        const prioritized = COMMON_SCHEDULES.filter((item) => present.has(item));
        const others = allList.filter((item) => !prioritized.includes(item));
        return [...prioritized, ...others];
    }, [rows]);

    const displayedSchedules = useMemo(() => {
        if (showAllSchedules) return schedules;
        return schedules.slice(0, 5);
    }, [schedules, showAllSchedules]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();

        return rows.filter((row) => {
            const matchSchedule = schedule === 'ALL' || row.schedule === schedule;
            const matchSearch = !query
                || String(row.nominal_size).toLowerCase().includes(query)
                || String(row.schedule).toLowerCase().includes(query)
                || String(row.od_mm).includes(query)
                || String(row.wall_mm).includes(query);

            return matchSchedule && matchSearch;
        });
    }, [rows, schedule, search]);

    const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE) || 1;

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredRows.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredRows, page]);

    const sizeCount = useMemo(
        () => new Set(rows.map((row) => row.nominal_size)).size,
        [rows]
    );

    return (
        <div>
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Master Diameter & Ketebalan Komponen</h2>
                    <p className="text-muted small mb-0">
                        Standar dimensi diameter luar, ketebalan dinding (*wall thickness*), dan berat untuk Pipa (ASME B36.10) serta Fitting perpipaan.
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <span className="badge bg-dark align-self-center px-3 py-2">{rows.length} varian pipa</span>
                    <span className="badge bg-secondary align-self-center px-3 py-2">{sizeCount} ukuran NPS</span>
                </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '8px' }}>
                <div className="card-body py-2 px-3">
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                        <span className="text-muted small fw-bold me-2">Kategori:</span>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`btn btn-sm ${category === cat.id ? 'btn-primary fw-bold px-3' : 'btn-outline-secondary px-3'}`}
                                onClick={() => setCategory(cat.id)}
                                style={{ borderRadius: '6px' }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sub-filter & Search */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                {category === 'PIPE' ? (
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <div className="btn-group flex-wrap" role="group">
                            <button
                                type="button"
                                className={`btn btn-sm ${schedule === 'ALL' ? 'btn-dark fw-bold' : 'btn-outline-secondary'}`}
                                onClick={() => setSchedule('ALL')}
                            >
                                Semua Schedule
                            </button>
                            {displayedSchedules.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className={`btn btn-sm ${schedule === item ? 'btn-dark fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => setSchedule(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                        {schedules.length > 5 && (
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                                onClick={() => setShowAllSchedules(!showAllSchedules)}
                                style={{ borderRadius: '6px', fontSize: '0.8rem' }}
                            >
                                <span>{showAllSchedules ? 'Sembunyikan' : `Lainnya (${schedules.length - 5})`}</span>
                                <svg
                                    viewBox="0 0 24 24"
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ transform: showAllSchedules ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-muted small">
                        Menampilkan tabel master untuk kategori <strong className="text-dark">{CATEGORIES.find(c => c.id === category)?.label}</strong>.
                    </div>
                )}
                <div style={{ minWidth: '260px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari ukuran, schedule, OD, wall..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        style={{ borderRadius: '6px', padding: '0.5rem 0.75rem' }}
                    />
                </div>
            </div>

            {/* Table Content for PIPE (Both NPS and Pipe Length included) */}
            {category === 'PIPE' && (
                <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle text-center mb-0" style={{ fontSize: '0.875rem' }}>
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                                <tr>
                                    <th className="py-3">Size (inch)</th>
                                    <th className="py-3">NPS</th>
                                    <th className="py-3">Pipe Length</th>
                                    <th className="py-3">OD (mm)</th>
                                    <th className="py-3">Schedule</th>
                                    <th className="py-3">Wall (mm)</th>
                                    <th className="py-3">Berat (kg/m)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted">
                                            Memuat master pipe schedule...
                                        </td>
                                    </tr>
                                ) : paginatedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted">
                                            Tidak ada data pipe schedule yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="fw-bold font-monospace text-primary">{row.nominal_size}&quot;</td>
                                            <td className="font-monospace">{row.nps_mm}</td>
                                            <td className="font-monospace">6.0 Mtr</td>
                                            <td className="font-monospace">{parseFloat(row.od_mm).toFixed(2)}</td>
                                            <td>
                                                <span className={`badge ${row.schedule === 'STD' || row.schedule === 'XS' || row.schedule === 'XXS' ? 'bg-dark' : 'bg-light text-dark border'} font-monospace`}>
                                                    {row.schedule}
                                                </span>
                                            </td>
                                            <td className="font-monospace">{parseFloat(row.wall_mm).toFixed(2)}</td>
                                            <td className="fw-semibold text-primary">{parseFloat(row.weight_kg_m).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && filteredRows.length > 0 && (
                        <div className="d-flex flex-wrap justify-content-between align-items-center p-3 bg-light border-top">
                            <span className="text-muted small">
                                Menampilkan {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredRows.length)} dari {filteredRows.length} data
                            </span>
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-3"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    style={{ borderRadius: '6px' }}
                                >
                                    Previous
                                </button>
                                <span className="small fw-semibold text-dark px-2">
                                    Hal {page} dari {totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-3"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                    style={{ borderRadius: '6px' }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Table Content for ELBOW */}
            {category === 'ELBOW' && (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle text-center mb-0" style={{ fontSize: '0.875rem' }}>
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                                <tr>
                                    <th className="py-3">Size (inch)</th>
                                    <th className="py-3">Tipe Elbow</th>
                                    <th className="py-3">Sudut</th>
                                    <th className="py-3">Radius Center-to-End (mm)</th>
                                    <th className="py-3">Ketebalan / Sch</th>
                                    <th className="py-3">Berat (kg/pcs)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-muted">
                                        Data dimensi Elbow LR & SR belum tersedia.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Table Content for REDUCER */}
            {category === 'REDUCER' && (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle text-center mb-0" style={{ fontSize: '0.875rem' }}>
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                                <tr>
                                    <th className="py-3">Ukuran (Large x Small)</th>
                                    <th className="py-3">Tipe Reducer</th>
                                    <th className="py-3">Panjang / End-to-End (mm)</th>
                                    <th className="py-3">Ketebalan</th>
                                    <th className="py-3">Berat (kg/pcs)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        Data dimensi Reducer belum tersedia.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Table Content for TEE */}
            {category === 'TEE' && (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle text-center mb-0" style={{ fontSize: '0.875rem' }}>
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                                <tr>
                                    <th className="py-3">Ukuran (Run x Branch)</th>
                                    <th className="py-3">Jenis Tee</th>
                                    <th className="py-3">Center-to-End Run (mm)</th>
                                    <th className="py-3">Center-to-End Branch (mm)</th>
                                    <th className="py-3">Schedule / Wall</th>
                                    <th className="py-3">Berat (kg/pcs)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-muted">
                                        Data dimensi Tee & Tee Reducer belum tersedia.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Table Content for WELDOLET */}
            {category === 'WELDOLET' && (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle text-center mb-0" style={{ fontSize: '0.875rem' }}>
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                                <tr>
                                    <th className="py-3">Run Size Range</th>
                                    <th className="py-3">Outlet Size</th>
                                    <th className="py-3">Tipe Olet</th>
                                    <th className="py-3">Rating / Class</th>
                                    <th className="py-3">Berat (kg/pcs)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        Data dimensi Weldolet belum tersedia.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <p className="text-muted small mt-3 mb-0">
                Sumber: Pipe Schedules ASME B36.10M Van Leeuwen.
            </p>
        </div>
    );
}
