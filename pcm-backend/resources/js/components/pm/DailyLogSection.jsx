import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { PcmSelect } from '../SearchSelect';

export function DailyLogSection({ scopes = [], joints = [], project, user, onReload }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionError, setActionError] = useState('');
    const [search, setSearch] = useState('');

    // Modal Input Progres Harian (Volume DI Kontrak)
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState({
        prog_date: new Date().toISOString().split('T')[0],
        scope_id: '',
        qty: '',
        team: '',
        notes: ''
    });

    const canEdit = can(user, 'progress.write') || can(user, 'scope.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        setActionError('');
        try {
            const logUrl = project?.id ? `/daily-progress?project_id=${project.id}` : '/daily-progress';
            const res = await api.get(logUrl);
            if (Array.isArray(res)) {
                const filteredLogs = project?.id
                    ? res.filter(l => Number(l.project_id) === Number(project.id) || (!l.project_id && Number(project.id) === 1))
                    : res;
                setLogs(filteredLogs);
            }
        } catch (err) {
            console.error('Failed to load daily progress:', err);
            setActionError(err.message || 'Gagal memuat data daily progress.');
        } finally {
            setLoading(false);
        }
    }, [project?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenModal = () => {
        setFormError('');
        const firstScope = scopes[0];
        setForm({
            prog_date: new Date().toISOString().split('T')[0],
            scope_id: firstScope ? String(firstScope.id) : '',
            qty: '',
            team: user?.name || '',
            notes: ''
        });
        setShowModal(true);
    };

    const handleSaveLog = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.scope_id || !form.qty || parseFloat(form.qty) <= 0) {
            setFormError('Pilih lingkup scope pekerjaan dan masukkan volume progres harian valid.');
            return;
        }

        setFormLoading(true);
        try {
            await api.post('/daily-progress', {
                project_id: project?.id,
                prog_date: form.prog_date,
                scope_id: Number(form.scope_id),
                qty: parseFloat(form.qty),
                team: form.team || user?.name || 'PMO',
                notes: form.notes || null,
            });
            setShowModal(false);
            loadData();
            if (onReload) onReload();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan catatan progres harian.');
        } finally {
            setFormLoading(false);
        }
    };

    // Rekap produksi Fit-Up & Welding per hari dari Construction Joints
    const jointDailyRecap = useMemo(() => {
        const map = new Map();
        (joints || []).forEach(j => {
            const di = parseFloat(j.dia_inch) || 0;
            if (j.fitup_date) {
                const d = j.fitup_date;
                if (!map.has(d)) map.set(d, { date: d, fitCount: 0, weldCount: 0, weldDI: 0 });
                map.get(d).fitCount += 1;
            }
            if (j.weld_date) {
                const d = j.weld_date;
                if (!map.has(d)) map.set(d, { date: d, fitCount: 0, weldCount: 0, weldDI: 0 });
                map.get(d).weldCount += 1;
                map.get(d).weldDI += di;
            }
        });
        return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    }, [joints]);

    const stats = useMemo(() => {
        const totalLogs = logs.length;
        const totalQtyLogged = logs.reduce((acc, l) => acc + (parseFloat(l.qty) || 0), 0);
        const weldedDI = (joints || [])
            .filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes((j.status || '').toUpperCase()))
            .reduce((acc, j) => acc + (parseFloat(j.dia_inch) || 0), 0);
        return { totalLogs, totalQtyLogged, weldedDI };
    }, [logs, joints]);

    // Format & filter daftar jurnal progres harian
    const filteredLogs = useMemo(() => {
        const scopeMap = new Map((scopes || []).map(s => [s.id, s.scope_description || s.item_code || `Scope #${s.id}`]));
        const enriched = logs.map(l => ({
            ...l,
            scope: scopeMap.get(l.scope_id) || `Scope ID: ${l.scope_id}`,
        }));

        const q = search.toLowerCase();
        return enriched.filter(l =>
            !q ||
            (l.prog_date || '').toLowerCase().includes(q) ||
            (l.scope || '').toLowerCase().includes(q) ||
            (l.team || '').toLowerCase().includes(q) ||
            (l.notes || '').toLowerCase().includes(q)
        );
    }, [logs, scopes, search]);

    return (
        <div>
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Daily Progress Log</h2>
                    <p className="text-muted small mb-0">
                        Pencatatan akumulasi volume pekerjaan per hari itu saja (Kontrak &amp; BOQ), serta sinkronisasi rekap harian fabrikasi/pengelasan dari Construction.
                    </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm fw-bold px-3 py-2"
                            style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                            onClick={handleOpenModal}
                        >
                            + Input Progres Harian (Hari Ini)
                        </button>
                    )}
                </div>
            </div>

            {actionError && (
                <div className="alert alert-danger py-2 small mb-3 d-flex justify-content-between align-items-center">
                    <span>{actionError}</span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setActionError('')}></button>
                </div>
            )}

            {/* Metric Summary Tiles (PCM Design Tokens) */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Total Catatan Jurnal Harian</span>
                        <strong className="pcm-tile__value text-dark">
                            {stats.totalLogs.toLocaleString('id-ID')}
                            <span className="pcm-tile__unit">entri per hari</span>
                        </strong>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Volume Terinput / Las Lapangan</span>
                        <strong className="pcm-tile__value text-success">
                            {stats.totalQtyLogged.toLocaleString('id-ID')}
                            <span className="pcm-tile__unit">unit total &bull; Las Lapangan: {stats.weldedDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* JURNAL VOLUME PROGRES KONTRAK PER HARI */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <h6 className="fw-bold text-dark mb-0">Jurnal Volume Progres Per Hari (Kontrak DI)</h6>
                        <div className="text-muted small">
                            Pencatatan capaian harian per lingkup pekerjaan untuk dasar kurva S dan progress billing.
                        </div>
                    </div>
                    <div style={{ width: '280px', maxWidth: '100%' }}>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Cari tanggal, lingkup scope, tim..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ borderRadius: 'var(--pcm-radius-control)', height: '38px', padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.85rem', borderColor: '#cbd5e1' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '130px' }}>Tanggal</th>
                                <th className="py-3">Scope Pekerjaan</th>
                                <th className="py-3 text-end" style={{ width: '150px' }}>Volume Harian</th>
                                <th className="py-3" style={{ width: '160px' }}>Tim Pelaksana</th>
                                <th className="py-3 text-muted" style={{ width: '170px' }}>Waktu Input</th>
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
                                        Belum ada catatan progres harian yang diinput. Klik "+ Input Progres Harian" untuk menambahkan capaian per hari ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((l, idx) => (
                                    <tr key={l.id || idx}>
                                        <td className="ps-3 font-monospace fw-bold text-dark">{l.prog_date}</td>
                                        <td className="fw-semibold text-primary">{l.scope}</td>
                                        <td className="text-end font-monospace fw-bold text-success">
                                            +{parseFloat(l.qty).toLocaleString('id-ID')}
                                        </td>
                                        <td>
                                            <span className="badge px-2.5 py-1 text-dark border font-monospace" style={{ backgroundColor: '#f1f5f9' }}>
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
            <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <div>
                        <h6 className="fw-bold text-dark mb-0">Rekap Produksi Fit-Up &amp; Welding Per Hari (Otomatis dari Construction)</h6>
                        <div className="text-muted small">
                            Akumulasi pengelasan dan fit-up per tanggal pelaksanaan di lapangan.
                        </div>
                    </div>
                    <span className="badge px-2.5 py-1 fw-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                        Cross-Dept Sync
                    </span>
                </div>
                <div className="table-responsive">
                    <table className="table table-bordered table-sm table-hover align-middle mb-0" style={{ fontSize: '0.84rem', borderColor: '#cbd5e1' }}>
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
                                        <td className="text-end font-monospace">{r.fitCount.toLocaleString('id-ID')} joints</td>
                                        <td className="text-end font-monospace text-primary fw-bold">{r.weldCount.toLocaleString('id-ID')} joints</td>
                                        <td className="pe-3 text-end font-monospace text-success fw-bold">
                                            {r.weldDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL INPUT PROGRES HARIAN (VOLUME) */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <form onSubmit={handleSaveLog}>
                                <div className="modal-header border-bottom">
                                    <h5 className="modal-title fw-bold text-dark">Input Progres Harian (Hari Ini)</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Tanggal Pelaksanaan *</label>
                                        <input
                                            type="date"
                                            className="form-control font-monospace"
                                            value={form.prog_date}
                                            onChange={(e) => setForm({ ...form, prog_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Scope Pekerjaan *</label>
                                        <PcmSelect
                                            value={form.scope_id}
                                            onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Pilih Lingkup Kontrak --</option>
                                            {scopes.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.item_code ? `[${s.item_code}] ` : ''}{s.scope_description} ({s.unit || 'DI'})
                                                </option>
                                            ))}
                                        </PcmSelect>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Volume Tambahan Hari Ini *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            className="form-control font-monospace fw-bold"
                                            placeholder="Contoh: 15.5"
                                            value={form.qty}
                                            onChange={(e) => setForm({ ...form, qty: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Tim Pelaksana / Mandor</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Contoh: Tim Fabrikasi Spool Spv A"
                                            value={form.team}
                                            onChange={(e) => setForm({ ...form, team: e.target.value })}
                                        />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label small fw-bold">Catatan Progres Harian</label>
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows="2"
                                            placeholder="Catatan pelaksanaan pekerjaan hari ini..."
                                            value={form.notes}
                                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Progres Harian'}
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
