import React from 'react';

export function ReportTab({ overview, joints, stockMoves, scopes, user }) {
    const totalJoints = joints?.length || 28;
    const welded = (joints || []).filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
    const visualOk = (joints || []).filter(j => ['VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
    const ndtOk = (joints || []).filter(j => ['NDT_OK', 'TESTED'].includes(j.status)).length;

    const exportJointsCsv = () => {
        const headers = ['Seq', 'Spool No', 'Line No', 'Shop/Field', 'Joint Type', 'Item A', 'Item B', 'Spec', 'Size_in', 'Welder', 'Fit-Up Date', 'Weld Date', 'Status'];
        const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = (joints || []).map(j => [
            j.seq,
            q(j.spool_no || `#${j.seq ?? j.id}`),
            q(j.line_no || ''),
            j.shop_field,
            j.joint_type,
            q(j.item_a),
            q(j.item_b),
            q([j.spec_a, j.spec_b].filter(Boolean).join(' / ')),
            j.size_in,
            q(j.welder || ''),
            j.fit_date || '',
            j.weld_date || '',
            j.status
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `PCM_Piping_Joints_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportMaterialCsv = () => {
        const headers = ['Date', 'Type', 'Item Description', 'Spec', 'Size', 'Qty', 'Unit', 'Heat No', 'PO No', 'Location', 'Requestor'];
        const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = (stockMoves || []).map(m => [
            m.move_date || '',
            m.kind,
            q(m.description),
            q(m.spec),
            q(m.size),
            m.qty,
            m.unit,
            q(m.heat_no || ''),
            q(m.po_no || ''),
            q(m.location || ''),
            q(m.requestor || '')
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `PCM_Material_Traceability_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Laporan Resmi Proyek & Ekspor Data</h3>
                    <p className="text-muted mb-0">
                        Format Laporan Eksekutif, Lembar Pengesahan Tanda Tangan & Export CSV (Job 2428)
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={exportJointsCsv} className="btn btn-outline-success btn-sm">
                        <i className="cs-file-text me-1"></i> Ekspor CSV Joint
                    </button>
                    <button onClick={exportMaterialCsv} className="btn btn-outline-warning text-dark btn-sm">
                        <i className="cs-archive me-1"></i> Ekspor CSV Material
                    </button>
                    <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                        <i className="cs-print me-1"></i> Cetak Dokumen (PDF)
                    </button>
                </div>
            </div>

            {/* Printable Sheet Card */}
            <div className="card shadow border-0 p-4 p-md-5 bg-white mx-auto" style={{ maxWidth: 960 }}>
                {/* Official Letterhead */}
                <div className="border-bottom pb-4 mb-4">
                    <div className="row align-items-center">
                        <div className="col-8">
                            <span className="badge bg-primary px-3 py-2 fw-bold mb-2">OFFICIAL PROJECT REPORT</span>
                            <h2 className="fw-bold text-dark mb-0">PCM PIPING FABRICATION & ERECTION PROGRESS</h2>
                            <p className="text-muted mb-0 small">
                                Project Job No. 2428 &bull; Client / Facility: Main Process Piping &bull; ASME B31.3 Standard
                            </p>
                        </div>
                        <div className="col-4 text-end">
                            <div className="fw-bold text-dark">Tanggal Laporan:</div>
                            <div className="text-muted">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div className="badge bg-success mt-2">STATUS: ON TRACK</div>
                        </div>
                    </div>
                </div>

                {/* Executive Summary Metrics */}
                <div className="row g-3 mb-4">
                    <div className="col-3">
                        <div className="border rounded p-3 text-center bg-light">
                            <small className="text-muted fw-bold d-block">TOTAL JOINTS</small>
                            <h4 className="fw-bold text-primary mb-0">{totalJoints}</h4>
                            <small className="text-muted">25 Shop / 3 Field</small>
                        </div>
                    </div>
                    <div className="col-3">
                        <div className="border rounded p-3 text-center bg-light">
                            <small className="text-muted fw-bold d-block">WELDING SELESAI</small>
                            <h4 className="fw-bold text-success mb-0">{welded}</h4>
                            <small className="text-muted">{Math.round((welded/totalJoints)*100)}% Terealisasi</small>
                        </div>
                    </div>
                    <div className="col-3">
                        <div className="border rounded p-3 text-center bg-light">
                            <small className="text-muted fw-bold d-block">QC VISUAL & NDT</small>
                            <h4 className="fw-bold text-info mb-0">{ndtOk}</h4>
                            <small className="text-muted">{ndtOk} Joint Cleared</small>
                        </div>
                    </div>
                    <div className="col-3">
                        <div className="border rounded p-3 text-center bg-light">
                            <small className="text-muted fw-bold d-block">SAFETY / HSE</small>
                            <h4 className="fw-bold text-dark mb-0">ZERO</h4>
                            <small className="text-muted">0 Lost Time Injury</small>
                        </div>
                    </div>
                </div>

                {/* Progress Highlights */}
                <h5 className="fw-bold text-dark border-bottom pb-2 mb-3">Ringkasan Pencapaian Utama</h5>
                <ul className="text-muted small mb-4" style={{ lineHeight: '1.8' }}>
                    <li>Seluruh 25 joint shop fabrication telah terdistribusi pada Welder W-005 dengan fit-up dan material ASTM A106 / A234 WPB.</li>
                    <li>Sebanyak 3 joint lapangan (field tie-in joints seq 26, 27, 28) dialokasikan untuk Welder W-007.</li>
                    <li>Sistem traceability heat number dan mill certificate (MTR) telah tercatat di modul Material Control.</li>
                    <li>Paket Hydrotest (TP-2428-MPP-01) disiapkan dengan tekanan uji 15.0 Bar menggunakan media air bersih (demineralized water).</li>
                </ul>

                {/* Joint Sampling Summary */}
                <h5 className="fw-bold text-dark border-bottom pb-2 mb-3">Status Joint Piping (Sampel 10 Joint Pertama)</h5>
                <div className="table-responsive mb-4">
                    <table className="table table-sm table-bordered align-middle" style={{ fontSize: '0.8rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>Seq</th>
                                <th>Spool No</th>
                                <th>Joint No</th>
                                <th>Komponen</th>
                                <th>Size & Thk</th>
                                <th>Welder</th>
                                <th>Status QC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(joints || []).slice(0, 10).map(j => (
                                <tr key={j.id}>
                                    <td className="text-center">{j.seq}</td>
                                    <td><strong>{j.spool_no || `#${j.seq ?? j.id}`}</strong></td>
                                    <td>{j.line_no || '-'}</td>
                                    <td>{j.item_a} &rarr; {j.item_b}</td>
                                    <td>{[j.spec_a, j.spec_b].filter(Boolean).join(' / ')}{j.size_in ? ` ${j.size_in}"` : ''}</td>
                                    <td className="text-center">{j.welder || '-'}</td>
                                    <td><span className="badge bg-secondary">{j.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Approval Signatures Block */}
                <div className="border-top pt-4 mt-5">
                    <div className="row text-center">
                        <div className="col-4">
                            <small className="text-muted d-block mb-4">Dibuat Oleh (Prepared By):</small>
                            <div className="fw-bold text-dark border-bottom pb-1 mx-3">LEAD ENGINEER / MATERIAL</div>
                            <small className="text-muted">Engineering & Material Dept</small>
                        </div>
                        <div className="col-4">
                            <small className="text-muted d-block mb-4">Diperiksa Oleh (Verified By):</small>
                            <div className="fw-bold text-dark border-bottom pb-1 mx-3">QA-QC INSPECTOR</div>
                            <small className="text-muted">Quality Control Dept</small>
                        </div>
                        <div className="col-4">
                            <small className="text-muted d-block mb-4">Disetujui Oleh (Approved By):</small>
                            <div className="fw-bold text-dark border-bottom pb-1 mx-3">PROJECT MANAGER</div>
                            <small className="text-muted">PCM Project Leadership</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
