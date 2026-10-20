import React, { useMemo } from 'react';

export function SCurveSection({ scopes = [], user }) {
    // Simulasi data Kurva S 12 Minggu berdasarkan 18 scopes & bobot realisasi
    const scheduleWeeks = useMemo(() => {
        const totalContractDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0) || 151018;

        const totalActualDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.cumulative_qty) || 0), 0);

        const currentActualPct = Math.min(100, (totalActualDI / totalContractDI) * 100);

        // Target kumulatif kurva S standar (S-Shape distribution)
        const plannedSeries = [2, 5, 10, 18, 30, 48, 68, 82, 92, 97, 99, 100];

        // Minggu berjalan saat ini (asumsi Minggu ke-3 dalam siklus proyek)
        const currentWeekIndex = 2; // Minggu 3 (target 10%)

        return plannedSeries.map((planned, idx) => {
            const weekNo = idx + 1;
            let actual = null;
            if (idx === 0) actual = 3.2;
            else if (idx === 1) actual = 6.8;
            else if (idx === 2) actual = Math.max(8.5, currentActualPct);

            return {
                week: `Minggu ${weekNo}`,
                weekDate: `W${weekNo} - 2026`,
                planned,
                actual,
                variance: actual !== null ? (actual - planned).toFixed(1) : null
            };
        });
    }, [scopes]);

    const latestActual = scheduleWeeks.filter(w => w.actual !== null).slice(-1)[0] || { planned: 10, actual: 8.5, variance: '-1.5' };
    const isBehind = parseFloat(latestActual.variance) < 0;

    return (
        <div>
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">S-Curve &amp; Schedule Monitoring</h2>
                    <p className="text-muted small mb-0">
                        Visualisasi kurva S progres kumulatif rencana (Planned) vs realisasi lapangan (Actual), deviasi jadwal, dan milestone mingguan.
                    </p>
                </div>
                <div>
                    <span className={`badge ${isBehind ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 fw-bold`} style={{ fontSize: '0.85rem' }}>
                        Status Jadwal: {isBehind ? `Terlambat ${Math.abs(latestActual.variance)}% (Behind Schedule)` : 'Tepat Waktu (On Schedule)'}
                    </span>
                </div>
            </div>

            {/* Metric Summary Tiles */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Target Rencana (W3)</span>
                        <strong className="h3 fw-bold text-primary mb-0">{latestActual.planned}%</strong>
                        <span className="text-muted ms-1 small">kumulatif</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Realisasi Aktual (W3)</span>
                        <strong className="h3 fw-bold text-success mb-0">{latestActual.actual}%</strong>
                        <span className="text-muted ms-1 small">kumulatif</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Varians Jadwal</span>
                        <strong className={`h3 fw-bold mb-0 ${isBehind ? 'text-danger' : 'text-success'}`}>
                            {latestActual.variance}%
                        </strong>
                        <span className="text-muted ms-1 small">deviasi</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Durasi Proyek</span>
                        <strong className="h3 fw-bold text-dark mb-0">12</strong>
                        <span className="text-muted ms-1 small">minggu kerja</span>
                    </div>
                </div>
            </div>

            {/* S-Curve Graphic (SVG Workbench Chart) */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark mb-0">Grafik Kurva S Kumulatif (% Progres)</h6>
                    <div className="d-flex gap-3 small">
                        <span className="d-flex align-items-center gap-1">
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '2px' }}></span>
                            <span className="text-muted">Target Rencana (Baseline)</span>
                        </span>
                        <span className="d-flex align-items-center gap-1">
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#1d4ed8', borderRadius: '2px' }}></span>
                            <span className="fw-bold text-primary">Realisasi Aktual</span>
                        </span>
                    </div>
                </div>
                <div className="card-body p-4">
                    {/* Visual S-Curve using responsive SVG line */}
                    <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                        <svg viewBox="0 0 1000 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            {/* Grid Horizontal Lines */}
                            {[0, 25, 50, 75, 100].map((val) => {
                                const y = 220 - (val * 2);
                                return (
                                    <g key={val}>
                                        <line x1="40" y1={y} x2="980" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                        <text x="30" y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">{val}%</text>
                                    </g>
                                );
                            })}

                            {/* Baseline Planned S-Curve Path */}
                            <path
                                d="M 60,216 Q 300,200 500,124 T 960,20"
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="3"
                                strokeDasharray="5,5"
                            />

                            {/* Actual Progress Path (Up to Week 3) */}
                            <path
                                d="M 60,214 L 142,206 L 224,203"
                                fill="none"
                                stroke="#1d4ed8"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />

                            {/* Actual Data Points */}
                            <circle cx="60" cy="214" r="5" fill="#1d4ed8" />
                            <circle cx="142" cy="206" r="5" fill="#1d4ed8" />
                            <circle cx="224" cy="203" r="6" fill="#15803d" stroke="#ffffff" strokeWidth="2" />
                            <text x="224" y="190" fill="#15803d" fontSize="11" fontWeight="bold" textAnchor="middle">8.5%</text>

                            {/* X-Axis Week Labels */}
                            {scheduleWeeks.map((w, idx) => {
                                const x = 60 + (idx * 82);
                                return (
                                    <text key={w.week} x={x} y="235" fill="#64748b" fontSize="10" textAnchor="middle">
                                        W{idx + 1}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Weekly Breakdown Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3">
                    <h6 className="fw-bold text-dark mb-0">Rincian Progres Per Periode Mingguan</h6>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Periode</th>
                                <th className="py-3">Minggu Kerja</th>
                                <th className="py-3 text-end">Target Rencana (Plan)</th>
                                <th className="py-3 text-end">Realisasi Aktual</th>
                                <th className="py-3 text-end">Varians Kumulatif</th>
                                <th className="py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scheduleWeeks.map((w) => {
                                const isPassed = w.actual !== null;
                                const isDevNegative = w.variance && parseFloat(w.variance) < 0;
                                return (
                                    <tr key={w.week}>
                                        <td className="ps-3 fw-bold text-dark">{w.week}</td>
                                        <td className="text-muted font-monospace">{w.weekDate}</td>
                                        <td className="text-end font-monospace">{w.planned}%</td>
                                        <td className="text-end font-monospace fw-bold">
                                            {isPassed ? `${w.actual}%` : '—'}
                                        </td>
                                        <td className="text-end font-monospace">
                                            {w.variance ? (
                                                <span className={isDevNegative ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                                    {isDevNegative ? '' : '+'}{w.variance}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="text-center">
                                            {isPassed ? (
                                                <span className={`badge ${isDevNegative ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                    {isDevNegative ? 'Behind' : 'Achieved'}
                                                </span>
                                            ) : (
                                                <span className="badge bg-light text-muted border">Planned</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
