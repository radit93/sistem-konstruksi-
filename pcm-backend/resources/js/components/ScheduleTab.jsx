import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';

export function ScheduleTab({ scopes, user, onReload }) {
    const [showModal, setShowModal] = useState(false);
    const [selectedScopeId, setSelectedScopeId] = useState('');
    const [progressQty, setProgressQty] = useState(1);
    const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'scope.write');

    const handleSaveProgress = async (e) => {
        e.preventDefault();
        if (!selectedScopeId) return;
        setError('');
        setLoading(true);
        try {
            const scope = scopes.find(s => s.id === Number(selectedScopeId));
            if (!scope) throw new Error('Scope tidak ditemukan');

            // Hitung kumulatif baru
            const newCum = Number(scope.cumulative_qty || 0) + Number(progressQty);

            // Update scope cumulative_qty
            await api.put(`/scopes/${scope.id}`, {
                cumulative_qty: newCum
            });

            // Catat log daily progress
            await api.post('/daily-progress', {
                prog_date: workDate,
                scope: scope.scope,
                qty: Number(progressQty),
                team: user?.role || 'construction'
            });

            setShowModal(false);
            setProgressQty(1);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan progres');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Schedule & BOQ Scope Monitoring</h3>
                    <p className="text-muted mb-0">
                        18 Item Pekerjaan Kontrak Piping, Target Volume vs Realisasi Lapangan (Job 2428)
                    </p>
                </div>
                <div>
                    {canEdit ? (
                        <button onClick={() => { setSelectedScopeId(scopes?.[0]?.id || ''); setShowModal(true); }} className="btn btn-primary btn-sm">
                            <i className="cs-plus me-1"></i> Input Progres Harian
                        </button>
                    ) : (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: Construction / Manager)
                        </span>
                    )}
                </div>
            </div>

            {/* Scopes Table */}
            <div className="card shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>Item No</th>
                                <th>Deskripsi Scope Pekerjaan</th>
                                <th className="text-center">Satuan</th>
                                <th className="text-end">Volume Kontrak</th>
                                <th className="text-end">Realisasi Kumulatif</th>
                                <th className="text-end" style={{ width: 160 }}>% Penyelesaian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(scopes || []).map((s, idx) => {
                                const contract = Number(s.contract_qty) || 0;
                                const cum = Number(s.cumulative_qty) || 0;
                                const pct = contract > 0 ? Math.min(100, Math.round((cum / contract) * 100)) : 0;
                                return (
                                    <tr key={s.id || idx}>
                                        <td className="text-muted fw-bold">{idx + 1}</td>
                                        <td className="fw-semibold text-dark">{s.scope}</td>
                                        <td className="text-center"><span className="badge bg-light text-dark border">{s.unit}</span></td>
                                        <td className="text-end fw-bold">{contract.toLocaleString()}</td>
                                        <td className="text-end text-primary fw-bold">{cum.toLocaleString()}</td>
                                        <td className="text-end">
                                            <div className="d-flex align-items-center justify-content-end gap-2">
                                                <span className="small fw-bold">{pct}%</span>
                                                <div className="progress flex-grow-1" style={{ height: 6, maxWidth: 65 }}>
                                                    <div
                                                        className={`progress-bar ${pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                        style={{ width: `${pct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Input Progres */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSaveProgress}>
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">Input Progres Harian Scope</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Pilih Item Scope</label>
                                        <select
                                            className="form-select"
                                            value={selectedScopeId}
                                            onChange={e => setSelectedScopeId(e.target.value)}
                                            required
                                        >
                                            {(scopes || []).map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.scope} ({s.unit})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Volume Tambahan Hari Ini</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                className="form-control"
                                                value={progressQty}
                                                onChange={e => setProgressQty(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tanggal Pekerjaan</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={workDate}
                                                onChange={e => setWorkDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                                        {loading ? 'Menyimpan...' : 'Tambah Progres'}
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
