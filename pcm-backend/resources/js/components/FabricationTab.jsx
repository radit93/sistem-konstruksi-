import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { PcmSelect } from './SearchSelect';
import {
    ConstructionChecklistSection,
    ConstructionKpiCards,
    downloadConstructionCsv,
    emptyConstructionFields,
    formatJointSpec,
    pickConstructionFields
} from './ConstructionChecklist';

// Kolom nyata joints: drawing_no, line_no, spool_no, seq, item_a, spec_a, item_b, spec_b,
// size_in, shop_field ('Shop'/'Field'), joint_type, method, wps, welder, fit_date, weld_date, visual, status.
const isShop = j => (j.shop_field || '').toLowerCase() === 'shop';
export const jointLabel = j => j.spool_no || `#${j.seq ?? j.id}`;
const specLabel = formatJointSpec;

export function FabricationTab({ joints, user, onReload }) {
    const [search, setSearch] = useState('');
    const [selectedJoint, setSelectedJoint] = useState(null);
    const [editData, setEditData] = useState({
        status: 'WELDED',
        welder: 'W-005',
        fit_date: new Date().toISOString().split('T')[0],
        weld_date: new Date().toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'joint.write');
    const canQcEdit = can(user, 'inspection.write');
    const canTestEdit = can(user, 'testpackage.write');
    const editableStatus = (status) => {
        if (['VISUAL_OK', 'NDT_OK'].includes(status)) return canQcEdit;
        if (status === 'TESTED') return canTestEdit;
        return canEdit;
    };

    const shopJoints = (joints || []).filter(isShop);

    const filtered = shopJoints.filter(j => {
        const q = search.toLowerCase();
        return (j.spool_no || '').toLowerCase().includes(q) ||
            String(j.seq || '').includes(q) ||
            (j.welder || '').toLowerCase().includes(q) ||
            (j.item_a || '').toLowerCase().includes(q) ||
            (j.item_b || '').toLowerCase().includes(q);
    });

    const openEdit = (j) => {
        setSelectedJoint(j);
        setEditData({
            status: j.status || 'WELDED',
            welder: j.welder || 'W-005',
            fit_date: j.fit_date || new Date().toISOString().split('T')[0],
            weld_date: j.weld_date || new Date().toISOString().split('T')[0],
            ...emptyConstructionFields,
            ...pickConstructionFields(j)
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
                    <h3 className="fw-bold text-dark mb-1">Shop Fabrication Spool Control</h3>
                    <p className="text-muted mb-0">
                        Monitoring {shopJoints.length} Joint Fabrikasi Bengkel (Shop), Fit-Up, Welder ID & Tanggal Pengelasan (Job 2428)
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

            <ConstructionKpiCards items={shopJoints} readyLabel="Siap kirim ke field" />

            {/* Filter Search */}
            <div className="card shadow-sm border-0 mb-4 bg-white p-3">
                <div className="row g-2 align-items-center">
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="cs-search"></i></span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Cari Seq, Spool No, Welder, atau Komponen Pipa..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 text-md-end text-muted small d-flex justify-content-end align-items-center gap-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => downloadConstructionCsv(filtered, 'construction-shop.csv', 'Data Construction Shop')}
                        >
                            <i className="cs-document me-1"></i>Export CSV
                        </button>
                        <span>Menampilkan <strong>{filtered.length}</strong> shop joints</span>
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
                                <th>Tipe Sambungan</th>
                                <th>Item A &rarr; Item B</th>
                                <th>Spec & Size</th>
                                <th>Welder</th>
                                <th>Tgl Fit-up</th>
                                <th>Tgl Weld</th>
                                <th>Status</th>
                                <th>Repair</th>
                                <th className="text-end">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(j => (
                                <tr key={j.id}>
                                    <td className="text-muted fw-bold">{j.seq}</td>
                                    <td className="fw-bold text-dark">{jointLabel(j)}</td>
                                    <td className="text-muted">{j.line_no || '-'}</td>
                                    <td><span className="badge bg-light text-dark border">{j.joint_type || 'BW'}</span></td>
                                    <td>
                                        <div className="text-truncate" style={{ maxWidth: 200 }} title={`${j.item_a} to ${j.item_b}`}>
                                            {j.item_a} &rarr; {j.item_b}
                                        </div>
                                    </td>
                                    <td>{specLabel(j) || '-'}</td>
                                    <td>
                                        <span className="badge bg-light text-dark border fw-bold">{j.welder || '-'}</span>
                                    </td>
                                    <td className="text-muted">{j.fit_date || '-'}</td>
                                    <td className="text-muted">{j.weld_date || '-'}</td>
                                    <td>{statusBadge(j.status)}</td>
                                    <td>{j.repair_no ? <span className={`badge ${j.repair_status === 'CLOSED' ? 'bg-success' : 'bg-warning text-dark'}`}>{j.repair_no} · {j.repair_status || 'OPEN'}</span> : <span className="text-muted">-</span>}</td>
                                    <td className="text-end">
                                        {canEdit ? (
                                            <button
                                                onClick={() => openEdit(j)}
                                                className="btn btn-sm btn-outline-primary py-1 px-2"
                                                title="Update Status / Welder"
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

            {/* Modal Update Joint */}
            {selectedJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleUpdate}>
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">Update Joint Seq {selectedJoint.seq} ({jointLabel(selectedJoint)})</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedJoint(null)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Status Tahapan Joint</label>
                                        <PcmSelect
                                            value={editData.status}
                                            onChange={e => setEditData({ ...editData, status: e.target.value })}
                                            disabled={!editableStatus(selectedJoint.status)}
                                        >
                                            <option value="PLANNED" disabled={selectedJoint.status !== 'PLANNED'}>PLANNED (Terdaftar dari Engineering)</option>
                                            <option value="RECEIVED" disabled={!canEdit}>RECEIVED (Material Diterima)</option>
                                            <option value="ISSUED" disabled={!canEdit}>ISSUED (Dikeluarkan ke Fabrikasi)</option>
                                            <option value="FITUP_OK" disabled={!canEdit}>FITUP_OK (Fit-up Selesai & Disetujui)</option>
                                            <option value="WELDED" disabled={!canEdit}>WELDED (Pengelasan Selesai)</option>
                                            <option value="REPAIR" disabled={!canEdit}>REPAIR (Perbaikan Defect)</option>
                                            {(canQcEdit || editData.status === 'VISUAL_OK') && (
                                                <option value="VISUAL_OK" disabled={!canQcEdit}>VISUAL_OK (Visual QC Lolos)</option>
                                            )}
                                            {(canQcEdit || editData.status === 'NDT_OK') && (
                                                <option value="NDT_OK" disabled={!canQcEdit}>NDT_OK (Radiography / PT Lolos)</option>
                                            )}
                                            {(canTestEdit || editData.status === 'TESTED') && (
                                                <option value="TESTED" disabled={!canTestEdit}>TESTED (Telah Hydrotest)</option>
                                            )}
                                        </PcmSelect>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Welder ID / Stencil</label>
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

                                    <ConstructionChecklistSection editData={editData} setEditData={setEditData} />
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedJoint(null)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
