import React, { useState, useMemo } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function BoqContractSection({ scopes = [], user, onReload }) {
    const [search, setSearch] = useState('');
    const [filterUnit, setFilterUnit] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingScope, setEditingScope] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        scope: '',
        unit: 'DI',
        contract_qty: 0,
        cumulative_qty: 0
    });

    const canEdit = can(user, 'scope.write');

    const units = useMemo(() => {
        return Array.from(new Set(scopes.map(s => s.unit).filter(Boolean))).sort();
    }, [scopes]);

    const stats = useMemo(() => {
        const totalItems = scopes.length;
        const totalContractDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0);
        const totalActualDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.cumulative_qty) || 0), 0);
        const avgPct = totalContractDI > 0 ? Math.round((totalActualDI / totalContractDI) * 100) : 0;
        const totalWeightTon = scopes
            .filter(s => s.unit === 'TON')
            .reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0);
        return { totalItems, totalContractDI, totalActualDI, avgPct, totalWeightTon };
    }, [scopes]);

    const filteredScopes = useMemo(() => {
        const q = search.toLowerCase();
        return scopes.filter(s => {
            const matchUnit = filterUnit === 'ALL' || s.unit === filterUnit;
            const matchSearch = !q ||
                (s.scope || '').toLowerCase().includes(q) ||
                (s.unit || '').toLowerCase().includes(q);
            return matchUnit && matchSearch;
        });
    }, [scopes, search, filterUnit]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingScope(item);
            setForm({
                scope: item.scope || '',
                unit: item.unit || 'DI',
                contract_qty: item.contract_qty || 0,
                cumulative_qty: item.cumulative_qty || 0
            });
        } else {
            setEditingScope(null);
            setForm({
                scope: '',
                unit: 'DI',
                contract_qty: 1000,
                cumulative_qty: 0
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.scope.trim()) {
            setFormError('Deskripsi scope pekerjaan wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingScope) {
                await api.put(`/scopes/${editingScope.id}`, form);
            } else {
                await api.post('/scopes', form);
            }
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan scope BOQ.');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Kontrak &amp; BOQ Scope Monitoring</h2>
                    <p className="text-muted small mb-0">
                        Baseline kontrak 18 lingkup pekerjaan piping, target volume kontrak vs realisasi aktual kumulatif (Job 2428).
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Scope Kontrak
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Volume Kontrak DI</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.totalContractDI.toLocaleString()}</strong>
                        <span className="text-muted ms-1 small">Dia-Inch</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Realisasi Aktual DI</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.totalActualDI.toLocaleString()}</strong>
                        <span className="text-muted ms-1 small">Dia-Inch</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Bobot Support</span>
                        <strong className="h3 fw-bold text-dark mb-0">{stats.totalWeightTon.toLocaleString()}</strong>
                        <span className="text-muted ms-1 small">TON</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Rata-Rata Progres</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.avgPct}%</strong>
                        <span className="text-muted ms-1 small">tercapai</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari deskripsi scope pekerjaan atau kode..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: '6px', padding: '0.5rem 0.75rem' }}
                    />
                </div>
                <select
                    className="form-select form-select-sm"
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                    style={{ width: 'auto', borderRadius: '6px' }}
                >
                    <option value="ALL">Semua Satuan ({units.length})</option>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '50px' }}>No</th>
                                <th className="py-3">Deskripsi Scope Pekerjaan</th>
                                <th className="py-3 text-center" style={{ width: '90px' }}>Satuan</th>
                                <th className="py-3 text-end" style={{ width: '150px' }}>Volume Kontrak</th>
                                <th className="py-3 text-end" style={{ width: '150px' }}>Realisasi Aktual</th>
                                <th className="py-3 text-end pe-3" style={{ width: '180px' }}>Penyelesaian</th>
                                {canEdit && <th className="text-end pe-3 py-3" style={{ width: '100px' }}>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredScopes.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 7 : 6} className="text-center py-4 text-muted">
                                        Tidak ada item scope kontrak yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredScopes.map((s, idx) => {
                                    const contract = parseFloat(s.contract_qty) || 0;
                                    const cum = parseFloat(s.cumulative_qty) || 0;
                                    const pct = contract > 0 ? Math.min(100, Math.round((cum / contract) * 100)) : 0;
                                    return (
                                        <tr key={s.id || idx}>
                                            <td className="ps-3 text-muted fw-bold">{idx + 1}</td>
                                            <td className="fw-semibold text-dark">{s.scope}</td>
                                            <td className="text-center">
                                                <span className="badge bg-light text-dark border font-monospace">{s.unit}</span>
                                            </td>
                                            <td className="text-end fw-bold">{contract.toLocaleString()}</td>
                                            <td className="text-end text-primary fw-bold">{cum.toLocaleString()}</td>
                                            <td className="text-end pe-3">
                                                <div className="d-flex align-items-center justify-content-end gap-2">
                                                    <span className="small fw-bold">{pct}%</span>
                                                    <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '80px', backgroundColor: '#e2e8f0' }}>
                                                        <div
                                                            className={`progress-bar ${pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                            style={{ width: `${pct}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td className="text-end pe-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm px-2 py-1"
                                                        onClick={() => handleOpenModal(s)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit / Add Scope */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingScope ? 'Edit Scope Kontrak' : 'Tambah Scope Kontrak Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Deskripsi Scope Pekerjaan *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={form.scope}
                                            onChange={(e) => setForm({ ...form, scope: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Satuan (Unit)</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Volume Kontrak Baseline</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={form.contract_qty}
                                                onChange={(e) => setForm({ ...form, contract_qty: parseFloat(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Realisasi Aktual Kumulatif</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={form.cumulative_qty}
                                                onChange={(e) => setForm({ ...form, cumulative_qty: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="text-muted small mt-1 d-block">
                                                Dapat diupdate manual atau otomatis terisi dari pencatatan Daily Progress Log.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
