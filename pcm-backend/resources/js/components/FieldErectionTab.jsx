import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { jointLabel } from './FabricationTab';

const isField = j => (j.shop_field || '').toLowerCase() === 'field';
const specLabel = j => [j.spec_a || j.spec_b, j.size_in ? `${j.size_in}"` : ''].filter(Boolean).join(' ');

export function FieldErectionTab({ joints, user, onReload }) {
    const [selectedJoint, setSelectedJoint] = useState(null);
    const [editData, setEditData] = useState({
        status: 'WELDED',
        welder: 'W-007',
        fit_date: new Date().toISOString().split('T')[0],
        weld_date: new Date().toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'joint.write');

    const fieldJoints = (joints || []).filter(isField);

    const openEdit = (j) => {
        setSelectedJoint(j);
        setEditData({
            status: j.status || 'WELDED',
            welder: j.welder || 'W-007',
            fit_date: j.fit_date || new Date().toISOString().split('T')[0],
            weld_date: j.weld_date || new Date().toISOString().split('T')[0],
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedJoint) return;
        setError('');
        setLoading(true);
        try {
            await api.put(`/joints/${selectedJoint.id}`, editData);
            setSelectedJoint(null);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal mengupdate joint');
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (st) => {
        const map = {
            'RECEIVED': 'bg-secondary',
            'ISSUED': 'bg-secondary',
            'FITUP_OK': 'bg-primary',
            'WELDED': 'bg-warning text-dark',
            'VISUAL_OK': 'bg-info text-dark',
            'NDT_OK': 'bg-success',
            'TESTED': 'bg-primary',
            'REINSTATED': 'bg-dark'
        };
        return <span className={`badge ${map[st] || 'bg-secondary'}`}>{st}</span>;
    };

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Field Erection & Tie-In Control</h3>
                    <p className="text-muted mb-0">
                        Monitoring Sambungan Lapangan (Field Joints), Tie-In Titik Pasang & Welder Lapangan (Job 2428)
                    </p>
                </div>
                <div>
                    {!canEdit && (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: Construction / Manager)
                        </span>
                    )}
                </div>
            </div>

            {/* Field Erection Highlight Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">TOTAL FIELD JOINTS</small>
                        <h3 className="fw-bold text-primary mb-0">{fieldJoints.length}</h3>
                        <small className="text-muted mt-1">Sambungan tie-in di lapangan</small>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">SELESAI FIT-UP & WELD</small>
                        <h3 className="fw-bold text-success mb-0">
                            {fieldJoints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK'].includes(j.status)).length}
                        </h3>
                        <small className="text-muted mt-1">Welder Lapangan W-007</small>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">STATUS SYSTEM</small>
                        <h3 className="fw-bold text-info mb-0">
                            {fieldJoints.length > 0 && fieldJoints.every(j => ['VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)) ? 'READY HYDROTEST' : 'IN PROGRESS'}
                        </h3>
                        <small className="text-muted mt-1">Kesiapan paket hydrotest</small>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>Seq</th>
                                <th>Spool No</th>
                                <th>Line No</th>
                                <th>Jenis Sambungan</th>
                                <th>Komponen Sambungan</th>
                                <th>Spec & Size</th>
                                <th>Welder Lapangan</th>
                                <th>Tgl Fit-up</th>
                                <th>Tgl Weld</th>
                                <th>Status QC</th>
                                <th className="text-end">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fieldJoints.map(j => (
                                <tr key={j.id}>
                                    <td className="text-muted fw-bold">{j.seq}</td>
                                    <td className="fw-bold text-dark">{jointLabel(j)}</td>
                                    <td className="text-muted">{j.line_no || '-'}</td>
                                    <td><span className="badge bg-warning text-dark border">FIELD JOINT</span></td>
                                    <td>
                                        <div className="fw-semibold text-dark">{j.item_a} &rarr; {j.item_b}</div>
                                        <small className="text-muted">Tie-In ke sistem eksisting</small>
                                    </td>
                                    <td>{specLabel(j) || '-'}</td>
                                    <td>
                                        <span className="badge bg-light text-dark border fw-bold">{j.welder || 'W-007'}</span>
                                    </td>
                                    <td className="text-muted">{j.fit_date || '-'}</td>
                                    <td className="text-muted">{j.weld_date || '-'}</td>
                                    <td>{statusBadge(j.status)}</td>
                                    <td className="text-end">
                                        {canEdit ? (
                                            <button
                                                onClick={() => openEdit(j)}
                                                className="btn btn-sm btn-outline-primary py-1 px-2"
                                                title="Update Field Erection"
                                            >
                                                <i className="cs-edit me-1"></i> Update
                                            </button>
                                        ) : (
                                            <button disabled className="btn btn-sm btn-light py-1 px-2 text-muted border">
                                                Locked
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Update */}
            {selectedJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleUpdate}>
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">Update Field Joint Seq {selectedJoint.seq}</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedJoint(null)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Status Field Erection</label>
                                        <select
                                            className="form-select"
                                            value={editData.status}
                                            onChange={e => setEditData({ ...editData, status: e.target.value })}
                                        >
                                            <option value="ISSUED">ISSUED (Spool Siap Dipasang)</option>
                                            <option value="FITUP_OK">FITUP_OK (Tack Weld & Fit-up Lapangan OK)</option>
                                            <option value="WELDED">WELDED (Selesai Las Erection)</option>
                                            <option value="VISUAL_OK">VISUAL_OK (Visual QC Lapangan Lolos)</option>
                                            <option value="NDT_OK">NDT_OK (NDT Tie-in Lolos)</option>
                                            <option value="TESTED">TESTED (Hydrotested)</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Welder Lapangan</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editData.welder}
                                            onChange={e => setEditData({ ...editData, welder: e.target.value })}
                                        />
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tanggal Fit-Up</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={editData.fit_date}
                                                onChange={e => setEditData({ ...editData, fit_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tanggal Pengelasan</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={editData.weld_date}
                                                onChange={e => setEditData({ ...editData, weld_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedJoint(null)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Field Joint'}
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
