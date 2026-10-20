import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';

// Kolom nyata test_packages: pkg_no, system_name, line_no, test_kind, test_pressure_bar,
// holding_time_min, schedule_date, status, punch_list_open, blinds, blinds_installed, reinstated.
const today = () => new Date().toISOString().split('T')[0];

export function TestPackageTab({ testPackages, joints, user, onReload }) {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        pkg_no: 'TP-2428-MPP-01',
        system_name: 'Main Process Piping System',
        test_kind: 'Hydro',
        test_pressure_bar: 15.0,
        holding_time_min: 60,
        schedule_date: today(),
        status: 'planned',
        blinds_installed: true,
        reinstated: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'testpackage.write');

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/test-packages', formData);
            setShowModal(false);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan test package');
        } finally {
            setLoading(false);
        }
    };

    // Evaluasi kesiapan NDT semua joint
    const totalJoints = joints?.length || 28;
    const ndtCleared = (joints || []).filter(j => ['NDT_OK', 'TESTED'].includes(j.status)).length;
    const isReadyForHydrotest = totalJoints > 0 && ndtCleared === totalJoints;

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Test Package & Hydrotest Control</h3>
                    <p className="text-muted mb-0">
                        Manajemen Paket Uji Tekan (Hydrostatic Test), Blind Flange, Holding Time & Reinstatement (Job 2428)
                    </p>
                </div>
                <div>
                    {canEdit ? (
                        <button onClick={() => setShowModal(true)} className="btn btn-secondary text-white btn-sm">
                            <i className="cs-plus me-1"></i> Buat Test Package Baru
                        </button>
                    ) : (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: Test Package / Manager)
                        </span>
                    )}
                </div>
            </div>

            {/* Hydrotest Readiness Alert Banner */}
            <div className={`card border-0 mb-4 p-3 shadow-sm ${isReadyForHydrotest ? 'bg-success-subtle text-success-emphasis border-start border-success border-4' : 'bg-warning-subtle text-warning-emphasis border-start border-warning border-4'}`}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                        <i className={`fs-2 ${isReadyForHydrotest ? 'cs-check-circle text-success' : 'cs-warning-hexagon text-warning'}`}></i>
                        <div>
                            <h6 className="fw-bold mb-1">
                                {isReadyForHydrotest ? 'Sistem 100% Siap Hydrotest!' : 'Prasyarat Hydrotest Sedang Berlangsung'}
                            </h6>
                            <p className="small mb-0">
                                Status Joint NDT Clearance: <strong>{ndtCleared} / {totalJoints} Joints Lolos</strong>. Semua joint las wajib lolos NDT sebelum tekanan hydrotest diaplikasikan.
                            </p>
                        </div>
                    </div>
                    <div className="text-end">
                        <span className="badge bg-dark px-3 py-2">Tekanan Desain: 15.0 Bar</span>
                    </div>
                </div>
            </div>

            {/* Test Packages Table */}
            <div className="card shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>No</th>
                                <th>Package No</th>
                                <th>Sistem / Line</th>
                                <th>Media Uji</th>
                                <th>Tekanan (Bar)</th>
                                <th>Holding Time</th>
                                <th>Target Tanggal</th>
                                <th>Blinds Terpasang</th>
                                <th>Status Paket</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(testPackages || []).length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-4 text-muted">
                                        Belum ada test package dibuat. Silakan klik "Buat Test Package Baru".
                                    </td>
                                </tr>
                            ) : (
                                (testPackages || []).map((tp, idx) => (
                                    <tr key={tp.id || idx}>
                                        <td className="text-muted">{idx + 1}</td>
                                        <td className="fw-bold text-primary">{tp.pkg_no}</td>
                                        <td>{tp.system_name || tp.line_no || '-'}</td>
                                        <td><span className="badge bg-light text-dark border">{tp.test_kind}</span></td>
                                        <td className="fw-bold text-dark">{tp.test_pressure_bar ?? '-'} Bar</td>
                                        <td>{tp.holding_time_min != null ? `${tp.holding_time_min} Menit` : '-'}</td>
                                        <td>{tp.schedule_date || '-'}</td>
                                        <td>
                                            <span className={`badge ${tp.blinds_installed ? 'bg-success' : 'bg-secondary'}`}>
                                                {tp.blinds_installed ? 'INSTALLED' : 'PENDING'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge bg-info text-dark">
                                                {tp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah Test Package */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header bg-secondary text-white">
                                    <h5 className="modal-title fw-bold">Buat Paket Hydrotest Baru</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Package Number</label>
                                        <input
                                            type="text"
                                            required
                                            className="form-control"
                                            value={formData.pkg_no}
                                            onChange={e => setFormData({ ...formData, pkg_no: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Nama Sistem / Jalur</label>
                                        <input
                                            type="text"
                                            required
                                            className="form-control"
                                            value={formData.system_name}
                                            onChange={e => setFormData({ ...formData, system_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Media Uji</label>
                                            <select
                                                className="form-select"
                                                value={formData.test_kind}
                                                onChange={e => setFormData({ ...formData, test_kind: e.target.value })}
                                            >
                                                <option value="Hydro">Hydro (Air)</option>
                                                <option value="Pneumatic">Pneumatic (Udara)</option>
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tekanan (Bar)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={formData.test_pressure_bar}
                                                onChange={e => setFormData({ ...formData, test_pressure_bar: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Holding Time (Menit)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={formData.holding_time_min}
                                                onChange={e => setFormData({ ...formData, holding_time_min: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Target Tanggal</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.schedule_date}
                                                onChange={e => setFormData({ ...formData, schedule_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Test Package'}
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
