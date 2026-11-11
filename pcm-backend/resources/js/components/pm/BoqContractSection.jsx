import React, { useState, useMemo } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { formatRupiah } from '../../currency';
import { PcmSelect } from '../SearchSelect';

export function BoqContractSection({ scopes = [], engBoqs = [], joints = [], project, user, onReload }) {
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
        const totalActualScopeDI = scopes
            .filter(s => s.unit === 'DI')
            .reduce((acc, s) => acc + (parseFloat(s.cumulative_qty) || 0), 0);
        const avgPct = totalContractDI > 0 ? Math.round((totalActualScopeDI / totalContractDI) * 100) : 0;
        const totalWeightTon = scopes
            .filter(s => s.unit === 'TON')
            .reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0);

        // Sinkronisasi dari Engineering BOQ (Welding Map) & Construction Joints aktual
        const engBoqDI = (engBoqs || []).reduce((acc, b) => acc + (parseFloat(b.dia_inch_total ?? b.total_di) || 0), 0);
        const engBoqValue = (engBoqs || []).reduce((acc, b) => acc + (parseFloat(b.total_amount ?? b.total_price) || 0), 0);
        const engShopDI = (engBoqs || [])
            .filter(b => (b.work_scope || b.work_type || '').toUpperCase().includes('SHOP'))
            .reduce((acc, b) => acc + (parseFloat(b.dia_inch_total ?? b.total_di) || 0), 0);
        const engFieldDI = (engBoqs || [])
            .filter(b => (b.work_scope || b.work_type || '').toUpperCase().includes('FIELD'))
            .reduce((acc, b) => acc + (parseFloat(b.dia_inch_total ?? b.total_di) || 0), 0);

        const doneJointStatuses = new Set(['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED']);
        const jointTotalDI = (joints || []).reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);
        const jointWeldedDI = (joints || [])
            .filter(j => doneJointStatuses.has((j.status || '').toUpperCase()))
            .reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);

        return {
            totalItems,
            totalContractDI,
            totalActualDI: totalActualScopeDI,
            avgPct,
            totalWeightTon,
            engBoqDI,
            engBoqValue,
            engShopDI,
            engFieldDI,
            jointTotalDI,
            jointWeldedDI,
        };
    }, [scopes, engBoqs, joints]);

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
            const payload = { ...form, project_id: project?.id };
            if (editingScope) {
                await api.put(`/scopes/${editingScope.id}`, payload);
            } else {
                await api.post('/scopes', payload);
            }
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan scope BOQ.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingScope) return;
        if (!window.confirm(`Hapus scope "${editingScope.scope}"?`)) return;
        setFormLoading(true);
        try {
            await api.delete(`/scopes/${editingScope.id}`);
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setFormError(err.message || 'Gagal menghapus scope.');
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
                        Baseline kontrak lingkup pekerjaan piping, target volume kontrak vs realisasi aktual kumulatif {project ? `(Job ${project.job_no || '-'} — ${project.name})` : ''}.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Scope Kontrak
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles (Design Tokens PCM) */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Volume Kontrak DI</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">
                            {stats.totalContractDI.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                            <span className="pcm-tile__unit">DI</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">BOQ Engineering (Weld Map)</span>
                        <strong className="pcm-tile__value" style={{ color: '#0369a1' }}>
                            {stats.engBoqDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                            <span className="pcm-tile__unit">DI ({formatRupiah(stats.engBoqValue)})</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Realisasi Aktual Lapangan</span>
                        <strong className="pcm-tile__value text-success">
                            {stats.totalActualDI.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                            <span className="pcm-tile__unit">DI (Las: {stats.jointWeldedDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI)</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Rata-Rata Progres &amp; Support</span>
                        <strong className="pcm-tile__value">
                            {stats.avgPct}%
                            <span className="pcm-tile__unit">&bull; {stats.totalWeightTon.toLocaleString('id-ID')} TON</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* Rekonsiliasi Engineering vs Kontrak */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', borderLeft: '4px solid #1e40af' }}>
                <div className="card-body py-3 px-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <div className="small fw-bold text-uppercase text-primary mb-1">
                                Sinkronisasi BOQ Engineering (Welding Map) vs Kontrak Baseline
                            </div>
                            <div className="small text-muted">
                                Shop Fabrication: <strong className="text-dark">{stats.engShopDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI</strong> &bull;{' '}
                                Field Erection: <strong className="text-dark">{stats.engFieldDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI</strong> &bull;{' '}
                                Total Joint Terdaftar: <strong className="text-dark">{(joints || []).length} joints ({stats.jointTotalDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI)</strong>
                            </div>
                        </div>
                        <span className="badge px-3 py-2 fw-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                            {stats.totalContractDI > 0
                                ? `Cakupan Gambar: ${Math.round((stats.engBoqDI / stats.totalContractDI) * 100)}% dari Kontrak`
                                : 'Menunggu Baseline Kontrak'}
                        </span>
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
                        style={{ borderRadius: 'var(--pcm-radius-control)', padding: '0.5rem 0.75rem' }}
                    />
                </div>
                <PcmSelect
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                    style={{ width: 'auto', borderRadius: 'var(--pcm-radius-control)' }}
                >
                    <option value="ALL">Semua Satuan ({units.length})</option>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                </PcmSelect>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '50px' }}>No</th>
                                <th className="py-3">Deskripsi Scope Pekerjaan</th>
                                <th className="py-3 text-center" style={{ width: '90px' }}>Satuan</th>
                                <th className="py-3 text-end" style={{ width: '160px' }}>Volume Kontrak</th>
                                <th className="py-3 text-end" style={{ width: '160px' }}>Realisasi Aktual</th>
                                <th className="py-3 text-end pe-3" style={{ width: '180px' }}>Penyelesaian</th>
                                {canEdit && <th className="text-end pe-3 py-3" style={{ width: '90px' }}>Aksi</th>}
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
                                                <span className="badge px-2.5 py-1 text-dark border font-monospace" style={{ backgroundColor: '#f1f5f9' }}>
                                                    {s.unit}
                                                </span>
                                            </td>
                                            <td className="text-end fw-bold font-monospace">{contract.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                                            <td className="text-end text-primary fw-bold font-monospace">{cum.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
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
                                                        className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ borderRadius: 'var(--pcm-radius-chip)' }}
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
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <form onSubmit={handleSave}>
                                <div className="modal-header border-bottom">
                                    <h5 className="modal-title fw-bold text-dark">
                                        {editingScope ? 'Edit Scope Kontrak' : 'Tambah Scope Kontrak Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
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
                                                className="form-control font-monospace"
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
                                                className="form-control font-monospace"
                                                value={form.cumulative_qty}
                                                onChange={(e) => setForm({ ...form, cumulative_qty: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="text-muted small mt-1 d-block">
                                                Dapat diupdate manual atau otomatis terisi dari pencatatan Daily Progress Log.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                                    {editingScope ? (
                                        <button type="button" className="btn btn-outline-danger btn-sm fw-bold" onClick={handleDelete} disabled={formLoading}>
                                            Hapus Scope
                                        </button>
                                    ) : <div />}
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} disabled={formLoading}>
                                            {formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
