import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { PcmSelect } from '../SearchSelect';

function diffDaysInclusive(startStr, endStr) {
    if (!startStr || !endStr) return 0;
    const sParts = String(startStr).split('-');
    const eParts = String(endStr).split('-');
    if (sParts.length !== 3 || eParts.length !== 3) return 0;
    const sUtc = Date.UTC(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]));
    const eUtc = Date.UTC(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]));
    if (Number.isNaN(sUtc) || Number.isNaN(eUtc)) return 0;
    return Math.max(1, Math.round((eUtc - sUtc) / 86400000) + 1);
}

function parseMinutes(hhmm) {
    const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
}

function calcSlotHours(startStr, endStr) {
    const s = parseMinutes(startStr);
    const e = parseMinutes(endStr);
    if (s === null || e === null || e <= s) return 0;
    return Math.round(((e - s) / 60) * 100) / 100;
}

function formatHours(hrs) {
    const h = Number(hrs) || 0;
    const rounded = Math.round(h * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toLocaleString('id-ID')} jam`;
}

// Smooth spline generator (Catmull-Rom to cubic Bezier)
function buildSplinePath(points = []) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
}

export function SCurveSection({
    projects = [],
    initialProjectId = '',
    onSelectProject,
    scopes = [],
    joints = [],
    dailyLogs = [],
    user
}) {
    // Mode Tampilan: jika belum pilih proyek -> List Proyek, jika sudah -> Detail Proyek
    const [selectedProjId, setSelectedProjId] = useState(initialProjectId ? String(initialProjectId) : '');
    const [searchProject, setSearchProject] = useState('');
    const [clientFilter, setClientFilter] = useState('ALL');

    // Filter Drill-down akun di dalam proyek aktif: 'ALL' = Global Proyek, number/id = Akun Pekerja Terpilih
    const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');

    // Data Milestone proyek untuk kurva estimasi durasi terlama & jam kerja
    const [milestones, setMilestones] = useState([]);
    const [loadingMilestones, setLoadingMilestones] = useState(false);

    useEffect(() => {
        if (initialProjectId && String(initialProjectId) !== selectedProjId) {
            setSelectedProjId(String(initialProjectId));
        }
    }, [initialProjectId]);

    const activeProject = useMemo(() => {
        if (!selectedProjId) return null;
        return (projects || []).find(p => String(p.id) === String(selectedProjId)) || null;
    }, [projects, selectedProjId]);

    // Muat data milestone untuk proyek aktif (termasuk kegiatan jam kerja per hari)
    const loadMilestones = useCallback(async (projId) => {
        setLoadingMilestones(true);
        try {
            const url = projId ? `/project-milestones?project_id=${projId}` : '/project-milestones';
            const data = await api.get(url);
            const raw = Array.isArray(data) ? data : [];
            const filtered = projId
                ? raw.filter(m => Number(m.project_id) === Number(projId) || (!m.project_id && Number(projId) === 1))
                : raw;
            setMilestones(filtered);
        } catch (err) {
            console.error('Failed to load milestones for scurve:', err);
            setMilestones([]);
        } finally {
            setLoadingMilestones(false);
        }
    }, []);

    useEffect(() => {
        if (selectedProjId) {
            loadMilestones(selectedProjId);
        } else {
            setMilestones([]);
        }
    }, [selectedProjId, loadMilestones]);

    const handlePickProject = (projId) => {
        const idStr = String(projId || '');
        setSelectedProjId(idStr);
        setSelectedUserFilter('ALL');
        if (onSelectProject) onSelectProject(idStr);
    };

    // Client options untuk filter list proyek
    const clientOptions = useMemo(() => {
        return Array.from(new Set((projects || []).map(p => (p.client || '').trim()).filter(Boolean))).sort();
    }, [projects]);

    const filteredProjects = useMemo(() => {
        const q = searchProject.toLowerCase();
        return (projects || []).filter(p => {
            const matchClient = clientFilter === 'ALL' || (p.client || '').toLowerCase() === clientFilter.toLowerCase();
            const matchSearch = !q ||
                (p.name || '').toLowerCase().includes(q) ||
                (p.client || '').toLowerCase().includes(q) ||
                (p.job_no || '').toLowerCase().includes(q);
            return matchClient && matchSearch;
        });
    }, [projects, searchProject, clientFilter]);

    // Kumpulan akun yang terlibat di proyek ini berdasarkan milestonenya
    const projectAccounts = useMemo(() => {
        const map = new Map();
        milestones.forEach(m => {
            if (m.user?.id) {
                const uid = String(m.user.id);
                if (!map.has(uid)) {
                    map.set(uid, {
                        id: uid,
                        name: m.user.name,
                        role: m.project_role || m.user.role || 'Pekerja',
                        milestones: [],
                    });
                }
                map.get(uid).milestones.push(m);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [milestones]);

    // Dropdown options untuk PcmSelect
    const accountSelectOptions = useMemo(() => {
        return [
            { value: 'ALL', label: 'Semua Akun (Global)' },
            ...projectAccounts.map(acc => ({
                value: String(acc.id),
                label: `${acc.name} (${acc.role}) • ${acc.milestones.length} milestone`
            }))
        ];
    }, [projectAccounts]);

    // ============================================================
    // KALKULASI KURVA S (GLOBAL ATAU PER AKUN TERPILIH)
    // ============================================================
    const curveData = useMemo(() => {
        if (!activeProject) return null;

        // Filter milestone: Global vs Per Akun
        const targetMilestones = selectedUserFilter === 'ALL'
            ? milestones
            : milestones.filter(m => String(m.user_id || m.user?.id || '') === String(selectedUserFilter));

        // 1. Cari pengerjaan terlama (durasi estimasi hari & rentang tanggal nyata dari DB)
        let earliestStartMs = Infinity;
        let latestTargetMs = -Infinity;
        let maxEstimatedDays = 0;
        let totalEstimatedHours = 0;
        let totalDoneHours = 0;

        // Kumpulkan jam kerja per hari nyata dari DB
        const plannedHoursByDate = new Map();
        const actualHoursByDate = new Map();

        targetMilestones.forEach(m => {
            const estDays = Number(m.estimated_days) || diffDaysInclusive(m.start_date, m.target_date) || 1;
            if (estDays > maxEstimatedDays) maxEstimatedDays = estDays;

            if (m.start_date) {
                const s = new Date(`${m.start_date}T00:00:00`).getTime();
                if (Number.isFinite(s) && s < earliestStartMs) earliestStartMs = s;
            }
            if (m.target_date) {
                const e = new Date(`${m.target_date}T00:00:00`).getTime();
                if (Number.isFinite(e) && e > latestTargetMs) latestTargetMs = e;
            }

            const acts = m.activities || [];
            if (acts.length > 0) {
                acts.forEach(a => {
                    const h = calcSlotHours(a.time_start, a.time_end);
                    totalEstimatedHours += h;
                    if (a.is_done) totalDoneHours += h;

                    const dateKey = a.work_date || (m.start_date && a.day_number ? new Date(new Date(`${m.start_date}T00:00:00`).getTime() + (Number(a.day_number) - 1) * 86400000).toISOString().slice(0, 10) : null);
                    if (dateKey) {
                        plannedHoursByDate.set(dateKey, (plannedHoursByDate.get(dateKey) || 0) + h);
                        if (a.is_done) {
                            actualHoursByDate.set(dateKey, (actualHoursByDate.get(dateKey) || 0) + h);
                        }
                    }
                });
            } else {
                const dailyH = Number(m.work_hours_per_day) || 8;
                const estTotalH = estDays * dailyH;
                totalEstimatedHours += estTotalH;
                if (m.status === 'COMPLETED') totalDoneHours += estTotalH;
                else if (m.status === 'IN_PROGRESS') totalDoneHours += estTotalH * 0.4;
            }
        });

        // Fallback jika tanggal belum terdaftar
        const nowMs = Date.now();
        if (!Number.isFinite(earliestStartMs)) earliestStartMs = nowMs - 14 * 86400000;
        if (!Number.isFinite(latestTargetMs) || latestTargetMs <= earliestStartMs) {
            latestTargetMs = earliestStartMs + Math.max(7, maxEstimatedDays || 30) * 86400000;
        }

        const projectSpanDays = Math.max(1, Math.round((latestTargetMs - earliestStartMs) / 86400000) + 1);

        // Jumlah kolom periode: mingguan (kelipatan 7 hari) agar nama hari dan tanggal kalender berurutan teratur
        const totalPeriods = Math.max(4, Math.min(24, Math.ceil(projectSpanDays / 7)));

        // Distribusi Kurva S Estimasi / Rencana (0% -> 100%)
        const plannedSeries = Array.from({ length: totalPeriods }, (_, idx) => {
            if (idx === totalPeriods - 1) return 100;
            const t = (idx + 1) / totalPeriods;
            const raw = 1 / (1 + Math.exp(-8 * (t - 0.5)));
            const minRaw = 1 / (1 + Math.exp(4));
            const maxRaw = 1 / (1 + Math.exp(-4));
            return Math.max(1, Math.min(99, Math.round(((raw - minRaw) / (maxRaw - minRaw)) * 100)));
        });

        // Realisasi pengerjaan nyata kumulatif per periode
        const currentPeriodIdx = Math.max(0, Math.min(totalPeriods - 1, Math.floor((nowMs - earliestStartMs) / (7 * 86400000))));
        const overallRealizationPct = totalEstimatedHours > 0
            ? Math.min(100, Math.round((totalDoneHours / totalEstimatedHours) * 100))
            : (activeProject.progress_pct || 0);

        let runningActualHours = 0;
        const periods = plannedSeries.map((planned, idx) => {
            const pStart = new Date(earliestStartMs + idx * 7 * 86400000);
            const pEnd = new Date(earliestStartMs + (idx + 1) * 7 * 86400000);
            const pLabel = pStart.toISOString().slice(0, 10);
            const periodNo = idx + 1;

            // Hitung jam kerja teralokasi di minggu ini dari database
            let periodPlannedHours = 0;
            let periodActualHours = 0;

            for (let d = 0; d < 7; d++) {
                const curDateStr = new Date(pStart.getTime() + d * 86400000).toISOString().slice(0, 10);
                periodPlannedHours += plannedHoursByDate.get(curDateStr) || 0;
                periodActualHours += actualHoursByDate.get(curDateStr) || 0;
            }

            // Fallback distribusi jam kerja jika milestone belum rinci per hari
            if (periodPlannedHours === 0 && totalEstimatedHours > 0) {
                const prevPct = idx === 0 ? 0 : plannedSeries[idx - 1];
                periodPlannedHours = Math.round(totalEstimatedHours * ((planned - prevPct) / 100) * 10) / 10;
            }

            runningActualHours += periodActualHours;

            let actual = null;
            if (idx <= currentPeriodIdx) {
                if (totalEstimatedHours > 0 && runningActualHours > 0) {
                    actual = Math.min(100, Math.round((runningActualHours / totalEstimatedHours) * 100));
                } else {
                    const fraction = (idx + 1) / (currentPeriodIdx + 1);
                    actual = idx === currentPeriodIdx
                        ? overallRealizationPct
                        : Math.min(overallRealizationPct, Math.round(overallRealizationPct * fraction * 0.95));
                }
            }

            const plannedHourAccum = Math.round((totalEstimatedHours * (planned / 100)) * 10) / 10;
            const actualHourAccum = actual !== null ? Math.round((totalEstimatedHours * (actual / 100)) * 10) / 10 : null;

            return {
                period: `P${periodNo}`,
                periodName: `Minggu ${periodNo}`,
                date: pLabel,
                dateObj: pStart,
                monthName: pStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
                plannedPct: planned,
                actualPct: actual,
                variancePct: actual !== null ? Number((actual - planned).toFixed(1)) : null,
                periodPlannedHours: Math.round(periodPlannedHours * 10) / 10,
                plannedHours: plannedHourAccum,
                actualHours: actualHourAccum,
            };
        });

        return {
            maxEstimatedDays,
            totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
            totalDoneHours: Math.round(totalDoneHours * 10) / 10,
            hourRealizationPct: overallRealizationPct,
            totalPeriods,
            periods,
            currentPeriodIdx,
            startDateStr: new Date(earliestStartMs).toISOString().slice(0, 10),
            targetDateStr: new Date(latestTargetMs).toISOString().slice(0, 10),
            milestoneCount: targetMilestones.length,
        };
    }, [activeProject, selectedUserFilter, milestones]);

    return (
        <div>
            {/* ============================================================
                VIEW 1: LIST PROJECT (JIKA BELUM MEMILIH PROYEK)
                ============================================================ */}
            {!activeProject ? (
                <div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                        <div>
                            <h2 className="h4 fw-bold text-dark mb-1">S-Curve &amp; Schedule &mdash; Pilih Proyek</h2>
                            <p className="text-muted small mb-0">
                                Daftar seluruh proyek. Klik salah satu proyek untuk melihat grafik Kurva S progres global proyek serta progresing per akun pekerja.
                            </p>
                        </div>
                    </div>

                    {/* Toolbar Pencarian */}
                    <div className="pcm-toolbar mb-3">
                        <div className="pcm-toolbar__grow">
                            <div className="pcm-search">
                                <span className="pcm-search__icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Cari proyek, job no, client..."
                                    value={searchProject}
                                    onChange={(e) => setSearchProject(e.target.value)}
                                />
                            </div>
                            <PcmSelect
                                searchable={false}
                                clearable={false}
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                            >
                                <option value="ALL">Semua Client ({projects.length})</option>
                                {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </PcmSelect>
                        </div>
                        <span className="pcm-count">
                            Menampilkan <strong>{filteredProjects.length}</strong> proyek
                        </span>
                    </div>

                    {/* Tabel List Proyek */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.85rem', borderColor: '#cbd5e1' }}>
                                <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                                    <tr>
                                        <th className="ps-3 py-3" style={{ width: '50px' }}>No</th>
                                        <th className="py-3" style={{ width: '120px' }}>Job No</th>
                                        <th className="py-3">Nama Paket Proyek</th>
                                        <th className="py-3" style={{ width: '180px' }}>Client</th>
                                        <th className="py-3 text-center" style={{ width: '120px' }}>Scopes</th>
                                        <th className="py-3" style={{ width: '190px' }}>Progres Realisasi</th>
                                        <th className="text-end pe-3 py-3" style={{ width: '170px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                Tidak ada proyek yang sesuai dengan kriteria pencarian.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProjects.map((p, idx) => (
                                            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handlePickProject(p.id)}>
                                                <td className="ps-3 text-muted fw-bold">{idx + 1}</td>
                                                <td>
                                                    <span className="pcm-chip pcm-chip--primary pcm-code fw-bold">
                                                        {p.job_no || '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-bold text-dark">{p.name}</div>
                                                </td>
                                                <td className="text-secondary">{p.client || '—'}</td>
                                                <td className="text-center font-monospace">
                                                    {p.scopes_count || 0} scope
                                                </td>
                                                <td>
                                                    <div className="d-flex justify-content-between small fw-bold mb-1">
                                                        <span>{p.progress_pct || 0}%</span>
                                                        <span className="text-muted">{p.total_actual_di || 0} / {p.total_contract_di || 0} DI</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '6px', backgroundColor: '#e2e8f0' }}>
                                                        <div
                                                            className={`progress-bar ${(p.progress_pct || 0) >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                            style={{ width: `${p.progress_pct || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="text-end pe-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm px-3 py-1 fw-bold"
                                                        style={{ borderRadius: 'var(--pcm-radius-chip)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePickProject(p.id);
                                                        }}
                                                    >
                                                        Buka Kurva S &rarr;
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* ============================================================
                   VIEW 2: DETAIL S-CURVE PROYEK TERPILIH (GLOBAL & PER AKUN)
                   ============================================================ */
                <div>
                    {/* Breadcrumb Context Bar */}
                    <div
                        className="pcm-crumbs mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-white border"
                        style={{ borderRadius: 'var(--pcm-radius-card)', boxShadow: 'var(--pcm-elev-1)', borderColor: 'var(--pcm-line-soft)' }}
                    >
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                                onClick={() => handlePickProject('')}
                            >
                                <span>&larr; Ganti Proyek (List Proyek)</span>
                            </button>
                            <span className="pcm-chip pcm-chip--primary pcm-code">
                                JOB: {activeProject.job_no || '-'}
                            </span>
                            <span className="fw-bold text-dark">{activeProject.name}</span>
                            <span className="pcm-chip pcm-chip--neutral">
                                <span>{activeProject.client || 'Client Umum'}</span>
                            </span>
                        </div>

                        {/* Quick Project Switcher */}
                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small fw-semibold text-nowrap">Pindah Proyek:</span>
                            <PcmSelect
                                searchable={false}
                                clearable={false}
                                value={activeProject.id}
                                onChange={(e) => handlePickProject(e.target.value)}
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.job_no ? `[${p.job_no}] ` : ''}{p.name}
                                    </option>
                                ))}
                            </PcmSelect>
                        </div>
                    </div>

                    {/* Filter Tab: Progres Global Proyek vs Progres Per Akun */}
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                        <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="small fw-bold text-dark">Filter Tampilan Kurva S:</span>
                                <div className="btn-group btn-group-sm" role="group">
                                    <button
                                        type="button"
                                        className={`btn fw-bold px-3 ${selectedUserFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        style={{ backgroundColor: selectedUserFilter === 'ALL' ? '#1e40af' : undefined }}
                                        onClick={() => setSelectedUserFilter('ALL')}
                                    >
                                        Progres Global Proyek
                                    </button>
                                    {selectedUserFilter !== 'ALL' && (
                                        <button
                                            type="button"
                                            className="btn fw-bold px-3 btn-success text-white"
                                            disabled
                                        >
                                            Akun: {projectAccounts.find(a => String(a.id) === String(selectedUserFilter))?.name || 'Pekerja'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dropdown Akun Pekerja Terlibat */}
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: '280px' }}>
                                <span className="small fw-semibold text-muted text-nowrap">Cek Akun:</span>
                                <PcmSelect
                                    searchable={false}
                                    clearable={false}
                                    value={selectedUserFilter}
                                    onChange={(e) => setSelectedUserFilter(e.target.value)}
                                >
                                    {accountSelectOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </PcmSelect>
                            </div>
                        </div>
                    </div>

                    {/* Metric Summary Tiles */}
                    {curveData && (
                        <div className="row g-3 mb-4">
                            <div className="col-6 col-md-3">
                                <div className="pcm-tile h-100">
                                    <span className="pcm-tile__label">Estimasi Pengerjaan Terlama</span>
                                    <strong className="pcm-tile__value pcm-tile__value--primary">
                                        {curveData.maxEstimatedDays}
                                        <span className="pcm-tile__unit">hari ({curveData.startDateStr} s/d {curveData.targetDateStr})</span>
                                    </strong>
                                </div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="pcm-tile h-100">
                                    <span className="pcm-tile__label">Total Estimasi Jam Kerja</span>
                                    <strong className="pcm-tile__value text-dark">
                                        {curveData.totalEstimatedHours.toLocaleString('id-ID')}
                                        <span className="pcm-tile__unit">jam rencana ({curveData.milestoneCount} milestone)</span>
                                    </strong>
                                </div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="pcm-tile h-100">
                                    <span className="pcm-tile__label">Realisasi Jam Kerja Lapangan</span>
                                    <strong className="pcm-tile__value text-success">
                                        {curveData.totalDoneHours.toLocaleString('id-ID')}
                                        <span className="pcm-tile__unit">jam selesai ({curveData.hourRealizationPct}%)</span>
                                    </strong>
                                </div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="pcm-tile h-100">
                                    <span className="pcm-tile__label">Status Schedule (Varians)</span>
                                    {(() => {
                                        const curP = curveData.periods[curveData.currentPeriodIdx];
                                        const v = curP?.variancePct;
                                        const isBehind = v !== null && v !== undefined && v < 0;
                                        return (
                                            <strong className={`pcm-tile__value ${isBehind ? 'text-danger' : 'text-success'}`}>
                                                {v !== null && v !== undefined ? `${v > 0 ? '+' : ''}${v}%` : '0%'}
                                                <span className="pcm-tile__unit">{isBehind ? 'Behind Schedule' : 'On Track / Ahead'}</span>
                                            </strong>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GRAFIK KURVA S GAYA KALENDER / PROGRES PROJECT (SESUAI ACUAN EXCEL / TEMPLATE) */}
                    {curveData && (
                        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                            <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <div>
                                    <h6 className="fw-bold text-dark mb-0">
                                        {selectedUserFilter === 'ALL'
                                            ? `Grafik Kurva S Global: Estimasi Pengerjaan Terlama vs Realisasi (${activeProject.name})`
                                            : `Grafik Kurva S Pekerja: Estimasi vs Realisasi (${projectAccounts.find(a => String(a.id) === String(selectedUserFilter))?.name || 'Pekerja'})`}
                                    </h6>
                                    <div className="text-muted small">
                                        Garis biru: Target Rencana (Plan); Garis merah: Realisasi Aktual. Kalender waktu di atas grafik memetakan hari, tanggal kalender, dan jam kerja teralokasi.
                                    </div>
                                </div>
                                <div className="d-flex flex-wrap align-items-center gap-3 small">
                                    <span className="d-flex align-items-center gap-1.5" style={{ color: '#1a73e8' }}>
                                        <span style={{ display: 'inline-block', width: '20px', height: '3px', backgroundColor: '#1a73e8' }}></span>
                                        <strong>Rencana (Plan - Biru)</strong>
                                    </span>
                                    <span className="d-flex align-items-center gap-1.5" style={{ color: '#d93025' }}>
                                        <span style={{ display: 'inline-block', width: '20px', height: '3px', backgroundColor: '#d93025' }}></span>
                                        <strong>Realisasi (Actual - Merah)</strong>
                                    </span>
                                </div>
                            </div>

                            <div className="card-body p-3 bg-white">
                                {(() => {
                                    const periods = curveData.periods;
                                    const count = periods.length;
                                    const svgWidth = 1000;
                                    const svgHeight = 390;
                                    const leftLabelWidth = 150;
                                    const rightPad = 30;
                                    const plotW = svgWidth - leftLabelWidth - rightPad;
                                    const colW = count > 0 ? plotW / count : plotW;

                                    // Baris Tabel Kalender
                                    const chartTop = 160;
                                    const chartHeight = 180;
                                    const chartBottom = chartTop + chartHeight;

                                    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

                                    // Kelompokkan bulan unik untuk banner atas kalender
                                    const monthSpans = [];
                                    let curMonth = null;
                                    let curSpan = 0;
                                    periods.forEach((p, i) => {
                                        if (p.monthName !== curMonth) {
                                            if (curMonth !== null) monthSpans.push({ month: curMonth, span: curSpan, startIdx: i - curSpan });
                                            curMonth = p.monthName;
                                            curSpan = 1;
                                        } else {
                                            curSpan++;
                                        }
                                    });
                                    if (curMonth !== null) {
                                        monthSpans.push({ month: curMonth, span: curSpan, startIdx: periods.length - curSpan });
                                    }

                                    const xForIdx = (i) => leftLabelWidth + i * colW + colW / 2;
                                    const yForPct = (pct) => chartBottom - (Math.max(0, Math.min(100, pct)) / 100) * chartHeight;

                                    // Titik spline halus
                                    const plannedPoints = periods.map((p, idx) => ({ x: xForIdx(idx), y: yForPct(p.plannedPct) }));
                                    const plannedSpline = buildSplinePath(plannedPoints);

                                    const actualPoints = periods
                                        .map((p, idx) => (p.actualPct !== null ? { x: xForIdx(idx), y: yForPct(p.actualPct), val: p.actualPct, p, idx } : null))
                                        .filter(Boolean);
                                    const actualSpline = buildSplinePath(actualPoints);

                                    return (
                                        <div className="w-100 overflow-auto border rounded" style={{ borderColor: '#cbd5e1' }}>
                                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', minWidth: '850px', height: 'auto', display: 'block', backgroundColor: '#ffffff' }}>
                                                {/* Left Column Headers */}
                                                <rect x="0" y="0" width={leftLabelWidth} height={chartTop} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />

                                                <text x="14" y="24" fill="#0f172a" fontSize="10.5" fontWeight="bold">BULAN &amp; TAHUN</text>
                                                <line x1="0" y1="35" x2={svgWidth} y2="35" stroke="#cbd5e1" strokeWidth="1" />

                                                <text x="14" y="56" fill="#475569" fontSize="10.5" fontWeight="600">PERIODE MINGGU</text>
                                                <line x1="0" y1="67" x2={svgWidth} y2="67" stroke="#cbd5e1" strokeWidth="1" />

                                                <text x="14" y="88" fill="#475569" fontSize="10.5" fontWeight="600">HARI MULAI</text>
                                                <line x1="0" y1="99" x2={svgWidth} y2="99" stroke="#cbd5e1" strokeWidth="1" />

                                                <text x="14" y="120" fill="#475569" fontSize="10.5" fontWeight="600">TANGGAL AWAL</text>
                                                <line x1="0" y1="131" x2={svgWidth} y2="131" stroke="#cbd5e1" strokeWidth="1" />

                                                <text x="14" y="149" fill="#1e40af" fontSize="10.5" fontWeight="bold">ALOKASI JAM PLAN</text>
                                                <line x1="0" y1={chartTop} x2={svgWidth} y2={chartTop} stroke="#94a3b8" strokeWidth="1.5" />

                                                {/* Month Spans Header */}
                                                {monthSpans.map((m, mIdx) => {
                                                    const mX = leftLabelWidth + m.startIdx * colW;
                                                    const mW = m.span * colW;
                                                    return (
                                                        <g key={mIdx}>
                                                            <rect x={mX} y="0" width={mW} height="35" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                                                            <text x={mX + mW / 2} y="22" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="0.04em">
                                                                {m.month.toUpperCase()}
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                                {/* Kolom Periode: Minggu, Hari, Tanggal, Jam Plan */}
                                                {periods.map((p, idx) => {
                                                    const xStart = leftLabelWidth + idx * colW;
                                                    const xMid = xStart + colW / 2;
                                                    const dObj = p.dateObj;
                                                    const dayOfWeek = Number.isNaN(dObj.getTime()) ? 1 : dObj.getDay();
                                                    const isSunday = dayOfWeek === 0;

                                                    return (
                                                        <g key={p.period}>
                                                            {/* Garis Grid Vertikal Menembus Sampai Bawah Chart */}
                                                            <line x1={xStart} y1="35" x2={xStart} y2={chartBottom} stroke="#e2e8f0" strokeWidth="1" />

                                                            {/* Periode */}
                                                            <rect x={xStart} y="35" width={colW} height="32" fill="#ffffff" />
                                                            <text x={xMid} y="55" fill="#1e293b" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                                                                {p.period}
                                                            </text>

                                                            {/* Hari Mulai */}
                                                            <rect x={xStart} y="67" width={colW} height="32" fill={isSunday ? '#fee2e2' : '#ffffff'} />
                                                            <text x={xMid} y="87" fill={isSunday ? '#dc2626' : '#475569'} fontSize="10" fontWeight="bold" textAnchor="middle">
                                                                {dayNames[dayOfWeek] || '—'}
                                                            </text>

                                                            {/* Tanggal Kalender */}
                                                            <rect x={xStart} y="99" width={colW} height="32" fill="#ffffff" />
                                                            <text x={xMid} y="119" fill="#0f172a" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                                                {dObj.getDate()}
                                                            </text>

                                                            {/* Jam Rencana per Periode */}
                                                            <rect x={xStart} y="131" width={colW} height="29" fill="#eff6ff" />
                                                            <text x={xMid} y="150" fill="#1e40af" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                                                {p.periodPlannedHours}h
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                                <line x1={leftLabelWidth + plotW} y1="0" x2={leftLabelWidth + plotW} y2={chartBottom} stroke="#cbd5e1" strokeWidth="1" />

                                                {/* Chart Area Canvas & Gridlines */}
                                                <rect x={leftLabelWidth} y={chartTop} width={plotW} height={chartHeight} fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
                                                {[0, 25, 50, 75, 100].map(val => {
                                                    const y = yForPct(val);
                                                    return (
                                                        <g key={val}>
                                                            <line x1={leftLabelWidth} y1={y} x2={leftLabelWidth + plotW} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={val === 0 || val === 100 ? undefined : '3,3'} />
                                                            <text x={leftLabelWidth - 8} y={y + 4} fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                                                                {val}%
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                                {/* Kurva S Rencana (Smooth Spline Biru) */}
                                                <path
                                                    d={plannedSpline}
                                                    fill="none"
                                                    stroke="#1a73e8"
                                                    strokeWidth="3.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />

                                                {/* Kurva S Realisasi (Smooth Spline Merah) */}
                                                {actualPoints.length > 0 && (
                                                    <path
                                                        d={actualSpline}
                                                        fill="none"
                                                        stroke="#d93025"
                                                        strokeWidth="3.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                )}

                                                {/* Titik Realisasi Aktual & Tooltip Callout Rapi */}
                                                {actualPoints.map((pt, i) => {
                                                    const isLast = i === actualPoints.length - 1;
                                                    return (
                                                        <g key={pt.idx}>
                                                            <circle
                                                                cx={pt.x}
                                                                cy={pt.y}
                                                                r={isLast ? 6 : 4}
                                                                fill="#d93025"
                                                                stroke="#ffffff"
                                                                strokeWidth="2"
                                                            />
                                                            {isLast && (
                                                                <g>
                                                                    <rect
                                                                        x={pt.x - 46}
                                                                        y={Math.max(chartTop + 8, pt.y - 32)}
                                                                        width="92"
                                                                        height="22"
                                                                        rx="4"
                                                                        fill="#0f172a"
                                                                    />
                                                                    <text
                                                                        x={pt.x}
                                                                        y={Math.max(chartTop + 22, pt.y - 18)}
                                                                        fill="#ffffff"
                                                                        fontSize="10"
                                                                        fontWeight="bold"
                                                                        textAnchor="middle"
                                                                        fontFamily="monospace"
                                                                    >
                                                                        {pt.val}% ({pt.p.actualHours || 0}h)
                                                                    </text>
                                                                </g>
                                                            )}
                                                        </g>
                                                    );
                                                })}

                                                {/* Label Sumbu Bawah */}
                                                <text x={leftLabelWidth + plotW / 2} y={chartBottom + 24} fill="#64748b" fontSize="10.5" fontWeight="600" textAnchor="middle">
                                                    Distribusi Periode Mingguan (Kurva-S Akumulasi Jam Kerja Rencana vs Realisasi Lapangan)
                                                </text>
                                            </svg>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Tabel Rincian Per Periode Termasuk Jam Kerja */}
                    {curveData && (
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <h6 className="fw-bold text-dark mb-0">Rincian Estimasi Jam Kerja vs Realisasi Lapangan</h6>
                                <span className="badge bg-light text-dark border font-monospace">
                                    Total Jam Kerja Rencana: {formatHours(curveData.totalEstimatedHours)}
                                </span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.85rem', borderColor: '#cbd5e1' }}>
                                    <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                                        <tr>
                                            <th className="ps-3 py-3" style={{ width: '100px' }}>Periode</th>
                                            <th className="py-3" style={{ width: '130px' }}>Tanggal</th>
                                            <th className="py-3 text-end" style={{ width: '140px' }}>Estimasi (%)</th>
                                            <th className="py-3 text-end" style={{ width: '160px' }}>Target Jam Plan</th>
                                            <th className="py-3 text-end" style={{ width: '140px' }}>Realisasi (%)</th>
                                            <th className="py-3 text-end" style={{ width: '160px' }}>Realisasi Jam</th>
                                            <th className="py-3 text-end" style={{ width: '120px' }}>Varians</th>
                                            <th className="py-3 text-center" style={{ width: '110px' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {curveData.periods.map(p => {
                                            const isPassed = p.actualPct !== null;
                                            const isNegative = p.variancePct !== null && p.variancePct < 0;
                                            return (
                                                <tr key={p.period}>
                                                    <td className="ps-3 font-monospace fw-bold text-dark">{p.period}</td>
                                                    <td className="font-monospace text-muted small">{p.date}</td>
                                                    <td className="text-end font-monospace">{p.plannedPct}%</td>
                                                    <td className="text-end font-monospace text-muted">{formatHours(p.plannedHours)}</td>
                                                    <td className="text-end font-monospace fw-bold text-primary">
                                                        {isPassed ? `${p.actualPct}%` : '—'}
                                                    </td>
                                                    <td className="text-end font-monospace fw-bold text-success">
                                                        {isPassed ? formatHours(p.actualHours) : '—'}
                                                    </td>
                                                    <td className="text-end font-monospace">
                                                        {p.variancePct !== null ? (
                                                            <span className={isNegative ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                                                {p.variancePct > 0 ? '+' : ''}{p.variancePct}%
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="text-center">
                                                        {isPassed ? (
                                                            <span className={`badge px-2.5 py-1 fw-bold ${isNegative ? 'bg-warning text-dark' : 'bg-success text-white'}`} style={{ borderRadius: 'var(--pcm-radius-chip)' }}>
                                                                {isNegative ? 'Behind' : 'On Track'}
                                                            </span>
                                                        ) : (
                                                            <span className="badge px-2 py-0.5 text-muted border bg-light" style={{ borderRadius: 'var(--pcm-radius-chip)' }}>
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
                    )}
                </div>
            )}
        </div>
    );
}
export default SCurveSection;
