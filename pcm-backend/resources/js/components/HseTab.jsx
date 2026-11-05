import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { PcmSelect } from './SearchSelect';

export function HseTab({ hseLogs, user, onReload }) {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        log_date: new Date().toISOString().split('T')[0],
        kind: 'tbm',
        description: 'Safety briefing pagi sebelum pekerjaan fit-up & welding',
        status: 'open',
        action_taken: 'Semua pekerja mengenakan APD lengkap (Face shield, welding gloves, safety shoes)'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'hse.write');

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/hse', {
                project_id: 1,
                ...formData
            });
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan catatan HSE');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">HSE Safety & Toolbox Control</h3>
                    <p className="text-muted mb-0">
                        Keselamatan Kerja, Catatan Briefing Lapangan, Hazard & Zero Accident Target (Job 2428)
                    </p>
                </div>
                <div>
                    {canEdit ? (
                        <button onClick={() => setShowModal(true)} className="btn btn-dark text-white btn-sm">
                            <i className="cs-plus me-1"></i> Catat Log HSE Baru
                        </button>
                    ) : (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: HSE Officer / Manager)
                        </span>
                    )}
                </div>
            </div>

            {/* HSE KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">ZERO ACCIDENT RECORD</small>
                        <h3 className="fw-bold text-success mb-0">0 <span className="fs-6 text-muted">Incident</span></h3>
                        <small className="text-muted mt-1">100% Bebas Kecelakaan</small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">SAFE MANHOURS</small>
                        <h3 className="fw-bold text-primary mb-0">1,240 <span className="fs-6 text-muted">Jam</span></h3>
                        <small className="text-muted mt-1">Akumulasi jam kerja selamat</small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">TOOLBOX MEETINGS</small>
                        <h3 className="fw-bold text-info mb-0">
                            {(hseLogs || []).filter(l => l.kind === 'tbm').length || 1}
                        </h3>
                        <small className="text-muted mt-1">Briefing keselamatan harian</small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">OPEN HAZARD / ISSUE</small>
                        <h3 className="fw-bold text-warning mb-0">
                            {(hseLogs || []).filter(l => l.status === 'open').length}
                        </h3>
                        <small className="text-muted mt-1">Tindak lanjut tertunda</small>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Kategori Event</th>
                                <th>Uraian Kejadian / Topik</th>
                                <th>Tindakan / Mitigasi</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(hseLogs || []).length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        Belum ada catatan log HSE. Klik "Catat Log HSE Baru" untuk menambah laporan.
                                    </td>
                                </tr>
                            ) : (
                                (hseLogs || []).map((l, idx) => (
                                    <tr key={l.id || idx}>
                                        <td className="text-muted">{idx + 1}</td>
                                        <td className="fw-semibold text-dark">{l.log_date}</td>
                                        <td>
                                            <span className={`badge ${
                                                l.kind === 'tbm' ? 'bg-info text-dark' :
                                                l.kind === 'finding' ? 'bg-warning text-dark' :
                                                'bg-secondary'
                                            }`}>
                                                {l.kind}
                                            </span>
                                        </td>
                                        <td>{l.description}</td>
                                        <td className="text-muted">{l.action_taken || '-'}</td>
                                        <td>
                                            <span className={`badge ${l.status === 'open' ? 'bg-danger' : 'bg-success'}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah Log HSE */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header bg-dark text-white">
                                    <h5 className="modal-title fw-bold">Catat Event HSE / Toolbox Baru</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tanggal Log</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.log_date}
                                                onChange={e => setFormData({ ...formData, log_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Jenis Acara HSE</label>
                                            <PcmSelect
                                                
                                                value={formData.kind}
                                                onChange={e => setFormData({ ...formData, kind: e.target.value })}
                                            >
                                                <option value="tbm">Toolbox Meeting</option>
                                                <option value="permit">Work Permit</option>
                                                <option value="finding">Hazard Finding</option>
                                                <option value="induction">Induksi</option>
                                                <option value="inspection">Inspeksi</option>
                                            </PcmSelect>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Uraian / Topik Pembahasan</label>
                                        <textarea
                                            rows="2"
                                            required
                                            className="form-control"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Tindakan Mitigasi / SOP yang Ditegakkan</label>
                                        <textarea
                                            rows="2"
                                            className="form-control"
                                            value={formData.action_taken}
                                            onChange={e => setFormData({ ...formData, action_taken: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Status Penyelesaian</label>
                                        <PcmSelect
                                            
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="open">OPEN (Perlu Tindak Lanjut Lapangan)</option>
                                            <option value="closed">CLOSED (Telah Dimengerti / Tuntas)</option>
                                        </PcmSelect>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-dark btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Log HSE'}
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
