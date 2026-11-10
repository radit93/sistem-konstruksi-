import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { jointLabel } from './FabricationTab';
import { PcmSelect } from './SearchSelect';

// Kolom nyata inspections: joint_id, kind, result, defect_type, report_no, insp_date, inspector, photo_path, remarks.
const today = () => new Date().toISOString().split('T')[0];
const specLabel = j => [j.spec_a || j.spec_b, j.size_in ? `${j.size_in}"` : ''].filter(Boolean).join(' ');

export function QaqcTab({ joints, inspections, user, onReload }) {
    const [search, setSearch] = useState('');
    const [selectedJoint, setSelectedJoint] = useState(null);
    const [showInspectModal, setShowInspectModal] = useState(false);
    const [subTab, setSubTab] = useState('joints'); // 'joints' or 'reports'
    const [formData, setFormData] = useState({
        report_no: `QC-VR-${Math.floor(100 + Math.random() * 900)}`,
        kind: 'VISUAL',
        result: 'PASS',
        defect_type: 'NONE',
        inspector: user?.name || 'QC Inspector',
        insp_date: today(),
        remarks: 'Weld bead uniform, no undercut/porosity',
        repair_cycle: { cycle: '', date: '', result: '' }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'inspection.write');

    const handleInspect = (j) => {
        setSelectedJoint(j);
        setFormData({
            report_no: `QC-SEQ${j.seq}-${Math.floor(100 + Math.random() * 900)}`,
            kind: 'VISUAL',
            result: 'PASS',
            defect_type: 'NONE',
            inspector: user?.name || 'QC Inspector',
            insp_date: today(),
            remarks: 'Weld appearance good, compliance to ASME B31.3',
            repair_cycle: { cycle: '', date: '', result: '' }
        });
        setShowInspectModal(true);
    };

    const handleSaveInspection = async (e) => {
        e.preventDefault();
        if (!selectedJoint) return;
        setError('');
        setLoading(true);
        try {
            // Simpan laporan inspeksi
            await api.post('/inspections', {
                joint_id: selectedJoint.id,
                ...formData
            });

            // Status joint dihitung backend agar semua role memakai satu aturan.

            setShowInspectModal(false);
            setSelectedJoint(null);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan hasil inspeksi');
        } finally {
            setLoading(false);
        }
    };

    const filteredJoints = (joints || []).filter(j => {
        const q = search.toLowerCase();
        return (j.spool_no || '').toLowerCase().includes(q) ||
            String(j.seq || '').includes(q) ||
            (j.welder || '').toLowerCase().includes(q);
    });

    const filteredReports = (inspections || []).filter(r => {
        const q = search.toLowerCase();
        return (r.report_no || '').toLowerCase().includes(q) ||
            (r.inspector || '').toLowerCase().includes(q) ||
            (r.kind || '').toLowerCase().includes(q);
    });

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">QA-QC Inspection & NDT Clearance</h3>
                    <p className="text-muted mb-0">
                        Kontrol Kualitas Las, Visual QC, Radiography (RT), Penetrant (PT) & Defect Tracking (Job 2428)
                    </p>
                </div>
                <div>
                    {!canEdit && (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses verifikasi: QA-QC / Manager)
                        </span>
                    )}
                </div>
            </div>

            {/* QA-QC Metrics */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">TOTAL LAPORAN QC</small>
                        <h3 className="fw-bold text-primary mb-0">{inspections?.length || 0}</h3>
                        <small className="text-muted mt-1">Laporan inspeksi tercatat</small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">VISUAL QC PASSED</small>
                        <h3 className="fw-bold text-info mb-0">
                            {(joints || []).filter(j => ['VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length}
                        </h3>
                        <small className="text-muted mt-1">Joint berstatus Visual OK</small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">NDT CLEARED</small>
                        <h3 className="fw-bold text-success mb-0">
                            {(joints || []).filter(j => ['NDT_OK', 'TESTED'].includes(j.status)).length}
                        </h3>
                        <small className="text-muted mt-1">Lolos RT / PT 100%</small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <small className="text-muted fw-bold">REJECT / REPAIR RATE</small>
                        <h3 className="fw-bold text-dark mb-0">0.0%</h3>
                        <small className="text-muted mt-1">Target proyek: &lt; 2.0%</small>
                    </div>
                </div>
            </div>

            {/* Sub-tab Navigation: Joints vs Inspection Reports */}
            <div className="d-flex gap-2 mb-3">
                <button
                    onClick={() => setSubTab('joints')}
                    className={`btn btn-sm ${subTab === 'joints' ? 'btn-primary' : 'btn-light border'}`}
                >
                    <i className="cs-list me-1"></i> Daftar Joint & Status QC ({filteredJoints.length})
                </button>
                <button
                    onClick={() => setSubTab('reports')}
                    className={`btn btn-sm ${subTab === 'reports' ? 'btn-primary' : 'btn-light border'}`}
                >
                    <i className="cs-file-text me-1"></i> Log Laporan Inspeksi QC ({inspections?.length || 0})
                </button>
            </div>

            {/* Filter */}
            <div className="card shadow-sm border-0 mb-4 bg-white p-3">
                <div className="input-group" style={{ maxWidth: 450 }}>
                    <span className="input-group-text bg-light border-end-0"><i className="cs-search"></i></span>
                    <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Cari seq, spool, report no, welder, inspector..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tab 1: Joint Traceability Table */}
            {subTab === 'joints' && (
                <div className="card shadow-sm border-0 bg-white">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead className="table-light">
                                <tr>
                                    <th>Seq</th>
                                    <th>Spool No</th>
                                    <th>Line No</th>
                                    <th>Lokasi</th>
                                    <th>Welder</th>
                                    <th>Spec & Size</th>
                                    <th>Status Saat Ini</th>
                                    <th className="text-end">Aksi QC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredJoints.map(j => (
                                    <tr key={j.id}>
                                        <td className="text-muted fw-bold">{j.seq}</td>
                                        <td className="fw-bold text-dark">{jointLabel(j)}</td>
                                        <td className="text-muted">{j.line_no || '-'}</td>
                                        <td>
                                            <span className={`badge ${(j.shop_field || '').toLowerCase() === 'shop' ? 'bg-light text-dark border' : 'bg-warning text-dark'}`}>
                                                {(j.shop_field || '').toUpperCase()}
                                            </span>
                                        </td>
                                        <td><span className="badge bg-light text-dark border">{j.welder || '-'}</span></td>
                                        <td>{specLabel(j) || '-'}</td>
                                        <td>
                                            <span className={`badge ${
                                                j.status === 'NDT_OK' ? 'bg-success' :
                                                j.status === 'VISUAL_OK' ? 'bg-info text-dark' :
                                                j.status === 'WELDED' ? 'bg-warning text-dark' :
                                                'bg-secondary'
                                            }`}>
                                                {j.status}
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            {canEdit ? (
                                                <button
                                                    onClick={() => handleInspect(j)}
                                                    className="btn btn-sm btn-outline-danger py-1 px-2"
                                                    title="Catat Hasil Inspeksi Visual / NDT"
                                                >
                                                    <i className="cs-check-square me-1"></i> Catat QC
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
            )}

            {/* Tab 2: Inspection Reports Log */}
            {subTab === 'reports' && (
                <div className="card shadow-sm border-0 bg-white">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead className="table-light">
                                <tr>
                                    <th>Report No</th>
                                    <th>Tipe Inspeksi</th>
                                    <th>Hasil</th>
                                    <th>Defect Type</th>
                                    <th>Inspector</th>
                                    <th>Tanggal</th>
                                    <th>Catatan / Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-muted">
                                            Belum ada laporan inspeksi tersimpan. Silakan catat QC pada tab Daftar Joint.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map((r, idx) => (
                                        <tr key={r.id || idx}>
                                            <td className="fw-bold text-dark">{r.report_no}</td>
                                            <td><span className="badge bg-light text-dark border">{r.kind}</span></td>
                                            <td>
                                                <span className={`badge ${r.result === 'PASS' ? 'bg-success' : 'bg-danger'}`}>
                                                    {r.result}
                                                </span>
                                            </td>
                                            <td>{r.defect_type || 'NONE'}</td>
                                            <td className="fw-semibold text-dark">{r.inspector}</td>
                                            <td className="text-muted">{r.insp_date}</td>
                                            <td className="text-muted">{r.remarks || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Input Inspeksi */}
            {showInspectModal && selectedJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSaveInspection}>
                                <div className="modal-header bg-danger text-white">
                                    <h5 className="modal-title fw-bold">
                                        <i className="cs-check-square me-2"></i> Inspeksi QC: Seq {selectedJoint.seq}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowInspectModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="alert alert-light border small mb-3">
                                        <strong>Spool:</strong> {jointLabel(selectedJoint)} &bull; <strong>Welder:</strong> {selectedJoint.welder || '-'} &bull; <strong>Spec:</strong> {specLabel(selectedJoint)}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Nomor Laporan (Report No)</label>
                                        <input
                                            type="text"
                                            required
                                            className="form-control"
                                            value={formData.report_no}
                                            onChange={e => setFormData({ ...formData, report_no: e.target.value })}
                                        />
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Jenis Inspeksi</label>
                                            <PcmSelect
                                                
                                                value={formData.kind}
                                                onChange={e => setFormData({ ...formData, kind: e.target.value })}
                                            >
                                                <option value="VISUAL">VISUAL INSPECTION</option>
                                                <option value="RT">RADIOGRAPHY TEST (RT)</option>
                                                <option value="PT">PENETRANT TEST (PT)</option>
                                                <option value="UT">ULTRASONIC TEST (UT)</option>
                                                <option value="PMI">PMI ALLOY VERIFICATION</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Hasil Keputusan</label>
                                            <PcmSelect
                                                className="fw-bold"
                                                value={formData.result}
                                                onChange={e => setFormData({ ...formData, result: e.target.value })}
                                            >
                                                <option value="PASS" className="text-success">PASS (Diterima / Lolos)</option>
                                                <option value="FAIL" className="text-danger">FAIL (Ditolak)</option>
                                            </PcmSelect>
                                        </div>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Defect Type (Jika Ada)</label>
                                            <PcmSelect
                                                
                                                value={formData.defect_type}
                                                onChange={e => setFormData({ ...formData, defect_type: e.target.value })}
                                            >
                                                <option value="NONE">NONE (Bebas Cacat)</option>
                                                <option value="POROSITY">Porosity</option>
                                                <option value="UNDERCUT">Undercut</option>
                                                <option value="INCOMPLETE_PENETRATION">Incomplete Penetration</option>
                                                <option value="CRACK">Crack</option>
                                                <option value="SLAG">Slag Inclusion</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Nama Inspector</label>
                                            <input
                                                type="text"
                                                required
                                                className="form-control"
                                                value={formData.inspector}
                                                onChange={e => setFormData({ ...formData, inspector: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Tanggal Inspeksi</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.insp_date}
                                            onChange={e => setFormData({ ...formData, insp_date: e.target.value })}
                                        />
                                    </div>
                                    {formData.result === 'FAIL' && (
                                        <div className="border rounded p-3 mb-3 bg-warning-subtle">
                                            <div className="small fw-bold mb-2">Siklus Perbaikan</div>
                                            <div className="row g-2">
                                                <div className="col-4">
                                                    <label className="form-label small">Cycle</label>
                                                    <select className="form-select form-select-sm" value={formData.repair_cycle?.cycle || ''} onChange={e => setFormData({ ...formData, repair_cycle: { ...formData.repair_cycle, cycle: e.target.value } })} required>
                                                        <option value="">Pilih</option>
                                                        <option value="R1">R1</option>
                                                        <option value="R2">R2</option>
                                                    </select>
                                                </div>
                                                <div className="col-4">
                                                    <label className="form-label small">Tanggal</label>
                                                    <input type="date" className="form-control form-control-sm" value={formData.repair_cycle?.date || ''} onChange={e => setFormData({ ...formData, repair_cycle: { ...formData.repair_cycle, date: e.target.value } })} required />
                                                </div>
                                                <div className="col-4">
                                                    <label className="form-label small">Hasil</label>
                                                    <select className="form-select form-select-sm" value={formData.repair_cycle?.result || ''} onChange={e => setFormData({ ...formData, repair_cycle: { ...formData.repair_cycle, result: e.target.value } })} required>
                                                        <option value="">Pilih</option>
                                                        <option value="PASS">PASS</option>
                                                        <option value="FAIL">FAIL</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Catatan Temuan / Rekomendasi</label>
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            value={formData.remarks}
                                            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowInspectModal(false)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-danger btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Laporan QC'}
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
