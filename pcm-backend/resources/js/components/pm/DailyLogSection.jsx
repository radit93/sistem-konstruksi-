import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { PcmSelect } from '../SearchSelect';

export function DailyLogSection({ scopes = [], joints = [], project, user, onReload }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        prog_date: new Date().toISOString().split('T')[0],
        scope_id: '',
        qty: 1,
        team: 'project_manager'
    });

    const canEdit = can(user, 'progress.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const url = project?.id ? `/daily-progress?project_id=${project.id}` : '/daily-progress';
            const data = await api.get(url);
            const raw = Array.isArray(data) ? data : [];
            const filtered = project?.id
                ? raw.filter(l => Number(l.project_id) === Number(project.id) || (!l.project_id && Number(project.id) === 1))
                : raw;
            setLogs(filtered);
        } catch (err) {
            console.error('Failed to load daily progress:', err);
        } finally {
            setLoading(false);
        }
    }, [project?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const totalLogs = logs.length;
        const totalQtyLogged = logs.reduce((acc, l) => acc + (parseFloat(l.qty) || 0), 0);
        const weldedDI = (joints || [])
            .filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes((j.status || '').toUpperCase()))
            .reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);
        return { totalLogs, totalQtyLogged, weldedDI };
    }, [logs, joints]);

    const jointDailyRecap = useMemo(() => {
        const byDate = {};
        (joints || []).forEach(j => {
            if (j.fit_date) {
                const d = j.fit_date;
                if (!byDate[d]) byDate[d] = { date: d, fitCount: 0, weldCount: 0, weldDI: 0 };
                byDate[d].fitCount += 1;
            }
            if (j.weld_date) {
                const d = j.weld_date;
                if (!byDate[d]) byDate[d] = { date: d, fitCount: 0, weldCount: 0, weldDI: 0 };
                byDate[d].weldCount += 1;
                byDate[d].weldDI += parseFloat(j.size_in ?? j.dia_inch) || 0;
            }
        });
        return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    }, [joints]);

    const filteredLogs = useMemo(() => {
        const q = search.toLowerCase();
        return logs.filter(l => {
            return !q ||
                (l.scope || '').toLowerCase().includes(q) ||
                (l.prog_date || '').toLowerCase().includes(q) ||
                (l.team || '').toLowerCase().includes(q);
        });
    }, [logs, search]);

    const handleOpenModal = () => {
        setFormError('');
        setForm({
            prog_date: new Date().toISOString().split('T')[0],
            scope_id: scopes[0]?.id || '',
            qty: 10,
            team: user?.role || 'project_manager'
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        const selectedScope = scopes.find(s => s.id === Number(form.scope_id));
        if (!selectedScope) {
            setFormError('Pilih lingkup pekerjaan yang valid.');
            return;
        }

        setFormLoading(true);
        try {
            // 1. Post daily progress log
            await api.post('/daily-progress', {
                prog_date: form.prog_date,
                scope: selectedScope.scope,
                qty: Number(form.qty),
                team: form.team,
                project_id: project?.id
            });

            // 2. Increment scope cumulative_qty
            const newCum = (parseFloat(selectedScope.cumulative_qty) || 0) + Number(form.qty);
            await api.put(`/scopes/${selectedScope.id}`, {
                cumulative_qty: newCum,
                project_id: project?.id || selectedScope.project_id
            });

            setShowModal(false);
            loadData();
            if (onReload) onReload();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan progres harian.');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div>
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Daily Progress Log &amp; Timesheet</h2>
                    <p className="text-muted small mb-0">
                        Jurnal pencatatan volume progres harian per lingkup pekerjaan, verifikasi pelaksana lapangan, dan sinkronisasi otomatis ke kumulatif kontrak.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={handleOpenModal}
                    >
                        + Input Progres Harian
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-4">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Catatan Jurnal</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.totalLogs}</strong>
                        <span className="text-muted ms-1 small">entri harian</span>
                    </div>
                </div>
                <div className="col-6 col-md-4">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Volume Terinput / Las Aktual</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.totalQtyLogged.toLocaleString()}</strong>
                        <span className="text-muted ms-1 small">unit &bull; Las: {stats.weldedDI.toLocaleString(undefined, { maximumFractionDigits: 1 })} DI</span>
                    </div>
                </div>
                <div className="col-12 col-md-4 d-flex align-items-center">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Cari tanggal, lingkup scope, atau tim..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.65rem 0.85rem' }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '120px' }}>Tanggal</th>
                                <th className="py-3">Scope Pekerjaan</th>
                                <th className="py-3 text-end" style={{ width: '140px' }}>Volume Harian</th>
                                <th className="py-3" style={{ width: '150px' }}>Tim Pelaksana</th>
                                <th className="py-3 text-muted" style={{ width: '160px' }}>Waktu Input</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        Memuat data jurnal progres harian...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        Belum ada catatan progres harian yang diinput.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((l, idx) => (
                                    <tr key={l.id || idx}>
                                        <td className="ps-3 font-monospace fw-bold text-dark">{l.prog_date}</td>
                                        <td className="fw-semibold text-primary">{l.scope}</td>
                                        <td className="text-end font-monospace fw-bold text-success">
                                            +{parseFloat(l.qty).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className="badge bg-secondary font-monospace">
                                                {l.team || 'PMO'}
                                            </span>
                                        </td>
                                        <td className="text-muted small">
                                            {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rekap Output Lapangan Harian (Construction Sync) */}
            <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark mb-0">Rekap Produksi Fit-Up &amp; Welding Harian (Otomatis dari Construction)</h6>
                    <span className="badge bg-info text-dark">Cross-Dept Sync</span>
                </div>
                <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: '0.84rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                            <tr>
                                <th className="ps-3 py-2">Tanggal</th>
                                <th className="py-2 text-end">Joint Fit-Up</th>
                                <th className="py-2 text-end">Joint Welded</th>
                                <th className="pe-3 py-2 text-end">Total Dia-Inch Las</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jointDailyRecap.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-3 text-muted">
                                        Belum ada tanggal Fit-Up / Welding tercatat pada Construction Joints proyek ini.
                                    </td>
                                </tr>
                            ) : (
                                jointDailyRecap.map(r => (
                                    <tr key={r.date}>
                                        <td className="ps-3 font-monospace fw-bold text-dark">{r.date}</td>
                                        <td className="text-end font-monospace">{r.fitCount} joints</td>
                                        <td className="text-end font-monospace text-primary fw-bold">{r.weldCount} joints</td>
                                        <td className="pe-3 text-end font-monospace text-success fw-bold">
                                            {r.weldDI.toLocaleString(undefined, { maximumFractionDigits: 1 })} DI
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Input Progres Harian */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">Input Progres Harian Proyek</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Tanggal Pelaksanaan *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={form.prog_date}
                                            onChange={(e) => setForm({ ...form, prog_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Pilih Scope Kontrak *</label>
                                            <PcmSelect
                                            
                                            value={form.scope_id}
                                            onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                                            required
                                        >
                                            {scopes.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.scope} ({s.unit}) - Kontrak: {s.contract_qty}
                                                </option>
                                            ))}
                                        </PcmSelect>
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Volume Progres Hari Ini *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                className="form-control"
                                                value={form.qty}
                                                onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Tim Pelaksana</label>
                                            <PcmSelect
                                                
                                                value={form.team}
                                                onChange={(e) => setForm({ ...form, team: e.target.value })}
                                            >
                                                <option value="project_manager">Project Manager (PMO)</option>
                                                <option value="construction">Construction Team</option>
                                                <option value="workshop">Workshop Spool Fab</option>
                                            </PcmSelect>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan & Update Kumulatif'}
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
