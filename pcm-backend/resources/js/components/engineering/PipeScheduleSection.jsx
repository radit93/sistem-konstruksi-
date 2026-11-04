import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

const SCHEDULE_ORDER = [
    'Sch 10', 'Sch 20', 'Sch 30', 'STD', 'Sch 40', 'Sch 60',
    'XS', 'Sch 80', 'Sch 100', 'Sch 120', 'Sch 140', 'Sch 160', 'XXS',
];

export function PipeScheduleSection() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [schedule, setSchedule] = useState('ALL');

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

    const schedules = useMemo(() => {
        const present = new Set(rows.map((row) => row.schedule));
        const ordered = SCHEDULE_ORDER.filter((item) => present.has(item));
        const extras = [...present].filter((item) => !SCHEDULE_ORDER.includes(item));

        return [...ordered, ...extras];
    }, [rows]);

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

    const sizeCount = useMemo(
        () => new Set(rows.map((row) => row.nominal_size)).size,
        [rows]
    );

    return (
        <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Master Pipe Schedule (ASME B36.10)</h2>
                    <p className="text-muted small mb-0">
                        Diameter luar, wall thickness, dan berat pipa per meter dari katalog Van Leeuwen 2015-A5-C.
                        Data ini dipakai otomatis saat BOM pipa dihitung.
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <span className="badge bg-dark align-self-center px-3 py-2">{rows.length} varian</span>
                    <span className="badge bg-secondary align-self-center px-3 py-2">{sizeCount} ukuran</span>
                </div>
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="btn-group flex-wrap" role="group">
                    <button
                        type="button"
                        className={`btn btn-sm ${schedule === 'ALL' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                        onClick={() => setSchedule('ALL')}
                    >
                        Semua Schedule
                    </button>
                    {schedules.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={`btn btn-sm ${schedule === item ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                            onClick={() => setSchedule(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
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

            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Size (inch)</th>
                                <th className="py-3">NPS (mm)</th>
                                <th className="py-3">OD (mm)</th>
                                <th className="py-3">Schedule</th>
                                <th className="py-3">Wall (mm)</th>
                                <th className="py-3">Berat (kg/m)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-muted">
                                        Memuat master pipe schedule...
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-muted">
                                        Tidak ada data pipe schedule yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="ps-3 fw-bold font-monospace text-primary">{row.nominal_size}&quot;</td>
                                        <td>{row.nps_mm}</td>
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
            </div>

            <p className="text-muted small mt-3 mb-0">
                Sumber: Pipe Schedules 2015-A5-C Van Leeuwen. Nilai berat adalah teoretis per meter; berat aktual dapat berbeda
                tergantung toleransi pabrikan.
            </p>
        </div>
    );
}
