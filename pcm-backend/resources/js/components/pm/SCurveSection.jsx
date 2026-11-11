import React, { useState, useMemo } from 'react';

export function SCurveSection({ scopes = [], joints = [], dailyLogs = [], project }) {
    const [basisMode, setBasisMode] = useState('CONTRACT'); // 'CONTRACT' | 'JOINTS'

    const schedule = useMemo(() => {
        const totalContractDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0);

        const scopeActualDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.cumulative_qty) || 0), 0);

        const doneStatuses = new Set(['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED']);
        const weldedJoints = (joints || []).filter(j => doneStatuses.has((j.status || '').toUpperCase()));
        const jointActualDI = weldedJoints.reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);
        const jointRegisteredTotalDI = (joints || []).reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);

        // Denominator sesuai mode yang dipilih
        const denominator = basisMode === 'JOINTS'
            ? Math.max(1, jointRegisteredTotalDI)
            : (totalContractDI > 0 ? totalContractDI : Math.max(1, jointRegisteredTotalDI));

        // Tentukan tanggal mulai proyek & durasi minggu
        const weldDates = weldedJoints.map(j => new Date(j.weld_date).getTime()).filter(Number.isFinite);
        const logDates = (dailyLogs || []).map(l => new Date(l.prog_date).getTime()).filter(Number.isFinite);
        const startMs = project?.start_date
            ? new Date(project.start_date).getTime()
            : (logDates.length > 0
                ? Math.min(...logDates)
                : (weldDates.length > 0 ? Math.min(...weldDates) : Date.now() - 14 * 86400000));
        const endMs = project?.end_date ? new Date(project.end_date).getTime() : startMs + 12 * 7 * 86400000;
        const totalWeeks = Math.max(4, Math.min(24, Math.round((endMs - startMs) / (7 * 86400000)) || 12));

        // Distribusi Kurva S rencana (logistic S-shape 0..100%)
        const plannedSeries = Array.from({ length: totalWeeks }, (_, idx) => {
            if (idx === totalWeeks - 1) return 100;
            const t = (idx + 1) / totalWeeks;
            const raw = 1 / (1 + Math.exp(-8 * (t - 0.5)));
            const minRaw = 1 / (1 + Math.exp(4));
            const maxRaw = 1 / (1 + Math.exp(-4));
            return Math.max(1, Math.min(99, Math.round(((raw - minRaw) / (maxRaw - minRaw)) * 100)));
        });

        // Kelompokkan progres nyata dari dailyLogs per minggu; jika dailyLogs kosong, fallback ke weld_date joints
        const weeklyAddedDI = new Array(totalWeeks).fill(0);
        let hasDatedProgress = false;

        if (dailyLogs && dailyLogs.length > 0) {
            dailyLogs.forEach(log => {
                const d = new Date(log.prog_date).getTime();
                if (!Number.isFinite(d)) return;
                hasDatedProgress = true;
                const wIdx = Math.max(0, Math.min(totalWeeks - 1, Math.floor((d - startMs) / (7 * 86400000))));
                weeklyAddedDI[wIdx] += parseFloat(log.qty) || 0;
            });
        } else if (weldedJoints.some(j => j.weld_date)) {
            weldedJoints.forEach(j => {
                if (!j.weld_date) return;
                const d = new Date(j.weld_date).getTime();
                if (!Number.isFinite(d)) return;
                hasDatedProgress = true;
                const wIdx = Math.max(0, Math.min(totalWeeks - 1, Math.floor((d - startMs) / (7 * 86400000))));
                weeklyAddedDI[wIdx] += parseFloat(j.size_in ?? j.dia_inch) || 0;
            });
        }

        const nowMs = Date.now();
        const currentWeekIdx = Math.max(0, Math.min(totalWeeks - 1, Math.floor((nowMs - startMs) / (7 * 86400000))));
        const effectiveActualDI = basisMode === 'JOINTS' ? jointActualDI : Math.max(scopeActualDI, jointActualDI);
        const rawPct = (effectiveActualDI / denominator) * 100;
        const overallActualPct = Math.min(100, Number(rawPct >= 1 ? rawPct.toFixed(1) : rawPct.toFixed(2)));

        let runningDI = 0;
        const weeks = plannedSeries.map((planned, idx) => {
            const weekNo = idx + 1;
            const weekStart = new Date(startMs + idx * 7 * 86400000);
            const weekLabel = weekStart.toISOString().slice(0, 10);

            let actual = null;
            if (hasDatedProgress) {
                runningDI += weeklyAddedDI[idx];
                if (idx <= currentWeekIdx || weeklyAddedDI[idx] > 0) {
                    const pctFromLogs = (runningDI / denominator) * 100;
                    const formatted = Number(pctFromLogs >= 1 ? pctFromLogs.toFixed(1) : pctFromLogs.toFixed(2));
                    actual = idx === currentWeekIdx ? Math.max(formatted, overallActualPct) : formatted;
                }
            } else if (idx <= currentWeekIdx) {
                actual = idx === currentWeekIdx
                    ? overallActualPct
                    : Number(((overallActualPct * (idx + 1)) / (currentWeekIdx + 1)).toFixed(1));
            }

            return {
                week: `Minggu ${weekNo}`,
                weekShort: `W${weekNo}`,
                weekDate: weekLabel,
                planned,
                actual,
                variance: actual !== null ? Number((actual - planned).toFixed(1)) : null,
            };
        });

        // Hitung produktivitas Shop vs Field (Acuan Excel: Shop 15 DI/hari, Field 10 DI/hari)
        const shopDI = weldedJoints
            .filter(j => (j.shop_field || j.location || '').toUpperCase().includes('SHOP'))
            .reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);
        const fieldDI = weldedJoints
            .filter(j => !(j.shop_field || j.location || '').toUpperCase().includes('SHOP'))
            .reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);
        const activeDays = Math.max(1, new Set([
            ...(dailyLogs || []).map(l => l.prog_date).filter(Boolean),
            ...weldedJoints.map(j => j.weld_date).filter(Boolean),
        ]).size);

        return {
            weeks,
            totalWeeks,
            currentWeekIdx,
            effectiveActualDI,
            denominator,
            totalContractDI,
            jointRegisteredTotalDI,
            jointActualDI,
            overallActualPct,
            shopRate: Number((shopDI / activeDays).toFixed(1)),
            fieldRate: Number((fieldDI / activeDays).toFixed(1)),
        };
    }, [scopes, joints, dailyLogs, project, basisMode]);

    const { weeks, totalWeeks, shopRate, fieldRate, effectiveActualDI, denominator, overallActualPct } = schedule;
    const passedWeeks = weeks.filter(w => w.actual !== null);
    const latestActual = passedWeeks.slice(-1)[0] || { weekShort: 'W1', planned: weeks[0]?.planned || 0, actual: 0, variance: -(weeks[0]?.planned || 0) };
    const isBehind = (latestActual.variance ?? 0) < 0;

    // Koordinat dinamis SVG
    const xPos = (idx) => (totalWeeks <= 1 ? 60 : 60 + (idx * (900 / (totalWeeks - 1))));
    const yPos = (pct) => 220 - (Math.max(0, Math.min(100, pct)) * 2);

    const plannedPath = weeks.map((w, idx) => `${idx === 0 ? 'M' : 'L'} ${xPos(idx).toFixed(1)},${yPos(w.planned).toFixed(1)}`).join(' ');
    const actualPoints = weeks
        .map((w, idx) => (w.actual !== null ? { idx, x: xPos(idx), y: yPos(w.actual), val: w.actual } : null))
        .filter(Boolean);
    const actualPath = actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return (
        <div>
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">S-Curve &amp; Schedule Monitoring</h2>
                    <p className="text-muted small mb-0">
                        Kurva-S kumulatif rencana (Planned) vs realisasi aktual lapangan berdasarkan data Daily Progress &amp; Joint Welding nyata.
                    </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className={`btn fw-bold ${basisMode === 'CONTRACT' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setBasisMode('CONTRACT')}
                            style={{ borderRadius: 'var(--pcm-radius-control) 0 0 var(--pcm-radius-control)' }}
                        >
                            Basis Kontrak
                        </button>
                        <button
                            type="button"
                            className={`btn fw-bold ${basisMode === 'JOINTS' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setBasisMode('JOINTS')}
                            style={{ borderRadius: '0 var(--pcm-radius-control) var(--pcm-radius-control) 0' }}
                        >
                            Basis Joint Terdaftar
                        </button>
                    </div>
                    <span className={`badge px-3 py-2 fw-bold ${isBehind ? 'bg-warning text-dark' : 'bg-success'}`} style={{ borderRadius: 'var(--pcm-radius-chip)' }}>
                        {isBehind ? `Terlambat ${Math.abs(latestActual.variance)}% (Behind)` : `On Schedule (${latestActual.variance >= 0 ? '+' : ''}${latestActual.variance}%)`}
                    </span>
                </div>
            </div>

            {/* Metric Summary Tiles (PCM Design Tokens) */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Target Rencana ({latestActual.weekShort})</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">
                            {latestActual.planned}%
                            <span className="pcm-tile__unit">kumulatif</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Realisasi Aktual ({latestActual.weekShort})</span>
                        <strong className="pcm-tile__value text-success">
                            {overallActualPct}%
                            <span className="pcm-tile__unit">({effectiveActualDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} / {denominator.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI)</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Varians Jadwal</span>
                        <strong className={`pcm-tile__value ${isBehind ? 'text-danger' : 'text-success'}`}>
                            {latestActual.variance > 0 ? `+${latestActual.variance}` : latestActual.variance}%
                            <span className="pcm-tile__unit">deviasi</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Produktivitas Las (DI/Hari)</span>
                        <strong className="pcm-tile__value">
                            {shopRate} / {fieldRate}
                            <span className="pcm-tile__unit">Shop 15 &bull; Field 10 Target</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* S-Curve Graphic (Dynamic SVG Chart) */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <h6 className="fw-bold text-dark mb-0">
                        Grafik Kurva S Kumulatif (% Progres — {totalWeeks} Minggu) &bull; Mode: {basisMode === 'CONTRACT' ? 'Kontrak Scope' : 'Joint Construction'}
                    </h6>
                    <div className="d-flex gap-3 small">
                        <span className="d-flex align-items-center gap-1">
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '2px' }}></span>
                            <span className="text-muted">Target Rencana (Baseline)</span>
                        </span>
                        <span className="d-flex align-items-center gap-1">
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#1e40af', borderRadius: '2px' }}></span>
                            <span className="fw-bold text-primary">Realisasi Aktual</span>
                        </span>
                    </div>
                </div>
                <div className="card-body p-4">
                    <div style={{ width: '100%', height: '250px', position: 'relative' }}>
                        <svg viewBox="0 0 1000 245" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            {[0, 25, 50, 75, 100].map((val) => {
                                const y = yPos(val);
                                return (
                                    <g key={val}>
                                        <line x1="45" y1={y} x2="975" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                        <text x="35" y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">{val}%</text>
                                    </g>
                                );
                            })}

                            {/* Planned Baseline Curve */}
                            <path
                                d={plannedPath}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="3"
                                strokeDasharray="6,5"
                            />

                            {/* Actual Curve */}
                            {actualPoints.length > 0 && (
                                <path
                                    d={actualPath}
                                    fill="none"
                                    stroke="#1e40af"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}

                            {/* Actual Points */}
                            {actualPoints.map((pt, i) => {
                                const isLast = i === actualPoints.length - 1;
                                return (
                                    <g key={pt.idx}>
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={isLast ? 6 : 4.5}
                                            fill={isLast ? '#15803d' : '#1e40af'}
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                        {isLast && (
                                            <text x={pt.x} y={Math.max(14, pt.y - 12)} fill="#15803d" fontSize="11" fontWeight="bold" textAnchor="middle">
                                                {pt.val}%
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* X-Axis Week Labels */}
                            {weeks.map((w, idx) => (
                                <text key={w.week} x={xPos(idx)} y="238" fill="#64748b" fontSize="10" textAnchor="middle">
                                    {w.weekShort}
                                </text>
                            ))}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Weekly Breakdown Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3">
                    <h6 className="fw-bold text-dark mb-0">Rincian Progres Per Periode Mingguan</h6>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Periode</th>
                                <th className="py-3">Mulai Minggu</th>
                                <th className="py-3 text-end">Target Rencana (Plan)</th>
                                <th className="py-3 text-end">Realisasi Aktual</th>
                                <th className="py-3 text-end">Varians Kumulatif</th>
                                <th className="py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeks.map((w) => {
                                const isPassed = w.actual !== null;
                                const isDevNegative = w.variance !== null && w.variance < 0;
                                return (
                                    <tr key={w.week}>
                                        <td className="ps-3 fw-bold text-dark">{w.week}</td>
                                        <td className="text-muted font-monospace">{w.weekDate}</td>
                                        <td className="text-end font-monospace">{w.planned}%</td>
                                        <td className="text-end font-monospace fw-bold">
                                            {isPassed ? `${w.actual}%` : '—'}
                                        </td>
                                        <td className="text-end font-monospace">
                                            {w.variance !== null ? (
                                                <span className={isDevNegative ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                                    {w.variance > 0 ? '+' : ''}{w.variance}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="text-center">
                                            {isPassed ? (
                                                <span className={`badge px-2.5 py-1 fw-bold ${isDevNegative ? 'bg-warning text-dark' : 'bg-success'}`} style={{ borderRadius: 'var(--pcm-radius-chip)' }}>
                                                    {isDevNegative ? 'Behind' : 'Achieved'}
                                                </span>
                                            ) : (
                                                <span className="badge px-2 py-1 text-dark border" style={{ backgroundColor: '#f1f5f9', borderRadius: 'var(--pcm-radius-chip)' }}>
                                                    Planned
                                                </span>
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
