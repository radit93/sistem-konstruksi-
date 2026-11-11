import React, { useState, useMemo } from 'react';
import { formatRupiah } from '../../currency';

export function ExecutiveReportSection({
    overview,
    project,
    joints = [],
    stockMoves = [],
    scopes = [],
    engBoqs = [],
    boms = [],
    testPackages = [],
    hseLogs = [],
    user,
}) {
    const [signers, setSigners] = useState({
        preparedName: user?.name || 'Project Manager',
        preparedRole: 'Project Manager (PMO)',
        checkedName: 'Lead Piping Engineer',
        checkedRole: 'Engineering & QA/QC Lead',
        approvedName: project?.client ? `Representative — ${project.client}` : 'Owner / Client Representative',
        approvedRole: 'Client Project Director',
    });

    const summary = useMemo(() => {
        const totalJoints = (joints || []).length;
        const welded = (joints || []).filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
        const visualOk = (joints || []).filter(j => ['VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
        const ndtOk = (joints || []).filter(j => ['NDT_OK', 'TESTED'].includes(j.status)).length;

        const shopJoints = (joints || []).filter(j => j.shop_field === 'Shop');
        const fieldJoints = (joints || []).filter(j => j.shop_field === 'Field');
        const shopWelded = shopJoints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
        const fieldWelded = fieldJoints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;

        const engBoqValue = (engBoqs || []).reduce((acc, b) => acc + (parseFloat(b.total_amount ?? b.total_price) || 0), 0);
        const bomValue = (boms || []).reduce((acc, b) => acc + (parseFloat(b.total_price) || 0), 0);
        const totalTechValue = engBoqValue + bomValue;

        const tpTotal = (testPackages || []).length;
        const tpPass = (testPackages || []).filter(t => ['PASSED', 'TESTED', 'COMPLETED', 'REINSTATED'].includes((t.status || '').toUpperCase())).length;

        const hseTotal = (hseLogs || []).length;
        const hseOpen = (hseLogs || []).filter(h => (h.status || '').toUpperCase() === 'OPEN').length;
        const hseClosed = hseTotal - hseOpen;

        const totalContractDI = (scopes || []).filter(s => s.unit === 'DI').reduce((acc, s) => acc + (parseFloat(s.contract_qty) || 0), 0);
        const totalActualDI = (scopes || []).filter(s => s.unit === 'DI').reduce((acc, s) => acc + (parseFloat(s.cumulative_qty) || 0), 0);
        const contractPct = totalContractDI > 0 ? Math.round((totalActualDI / totalContractDI) * 100) : 0;

        return {
            totalJoints,
            welded,
            visualOk,
            ndtOk,
            shopJointsCount: shopJoints.length,
            fieldJointsCount: fieldJoints.length,
            shopWelded,
            fieldWelded,
            engBoqValue,
            bomValue,
            totalTechValue,
            tpTotal,
            tpPass,
            hseTotal,
            hseOpen,
            hseClosed,
            totalContractDI,
            totalActualDI,
            contractPct,
        };
    }, [joints, engBoqs, boms, testPackages, hseLogs, scopes]);

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
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
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
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `PCM_Material_Traceability_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportScopesCsv = () => {
        const headers = ['No', 'Scope Description', 'Unit', 'Contract Qty', 'Actual Cumulative Qty', 'Progress Pct'];
        const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = (scopes || []).map((s, idx) => {
            const contract = parseFloat(s.contract_qty) || 0;
            const cum = parseFloat(s.cumulative_qty) || 0;
            const pct = contract > 0 ? ((cum / contract) * 100).toFixed(1) : '0.0';
            return [idx + 1, q(s.scope), s.unit, contract, cum, `${pct}%`];
        });
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `PCM_BOQ_Contract_Progress_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Laporan Resmi Eksekutif &amp; Export Center</h2>
                    <p className="text-muted small mb-0">
                        Rekapitulasi progres fisik, proyeksi biaya teknis (BOQ + BOM), kualitas QA/QC &amp; HSE, serta lembar pengesahan penagihan {project ? `(Job ${project.job_no || '-'} — ${project.name})` : ''}.
                    </p>
                </div>
                <div className="d-flex flex-wrap gap-2 d-print-none">
                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold px-3 py-2" style={{ borderRadius: '6px' }} onClick={exportScopesCsv}>
                        Export BOQ (CSV)
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm fw-bold px-3 py-2" style={{ borderRadius: '6px' }} onClick={exportMaterialCsv}>
                        Export Material (CSV)
                    </button>
                    <button type="button" className="btn btn-outline-dark btn-sm fw-bold px-3 py-2" style={{ borderRadius: '6px' }} onClick={exportJointsCsv}>
                        Export Welding (CSV)
                    </button>
                    <button type="button" className="btn btn-primary btn-sm fw-bold px-3 py-2" style={{ borderRadius: '6px' }} onClick={() => window.print()}>
                        Cetak Laporan / PDF
                    </button>
                </div>
            </div>

            {/* Executive Summary KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Progres Kontrak DI</span>
                        <strong className="h4 fw-bold text-primary mb-0">{summary.contractPct}%</strong>
                        <div className="text-muted small">{summary.totalActualDI.toLocaleString()} / {summary.totalContractDI.toLocaleString()} DI</div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Nilai Teknis (BOQ + BOM)</span>
                        <strong className="h5 fw-bold text-dark mb-0 d-block text-truncate" title={formatRupiah(summary.totalTechValue)}>
                            {formatRupiah(summary.totalTechValue)}
                        </strong>
                        <div className="text-muted small">BOQ {formatRupiah(summary.engBoqValue)}</div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Test Package Hydrotest</span>
                        <strong className="h4 fw-bold text-success mb-0">{summary.tpPass} / {summary.tpTotal}</strong>
                        <div className="text-muted small">paket lulus test</div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">HSE Safety Log</span>
                        <strong className={`h4 fw-bold mb-0 ${summary.hseOpen > 0 ? 'text-danger' : 'text-success'}`}>
                            {summary.hseOpen} Open
                        </strong>
                        <div className="text-muted small">{summary.hseClosed} / {summary.hseTotal} closed</div>
                    </div>
                </div>
            </div>

            {/* Summary Report Grid */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-lg-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="fw-bold text-dark mb-0">Progres Pengelasan &amp; Kualitas (QA/QC)</h6>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Total Joint Welded ({summary.welded} / {summary.totalJoints})</span>
                                    <span>{summary.totalJoints > 0 ? Math.round((summary.welded / summary.totalJoints) * 100) : 0}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', backgroundColor: '#e2e8f0' }}>
                                    <div className="progress-bar bg-primary" style={{ width: `${summary.totalJoints > 0 ? Math.round((summary.welded / summary.totalJoints) * 100) : 0}%` }}></div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Lolos Inspeksi Visual ({summary.visualOk} / {summary.totalJoints})</span>
                                    <span>{summary.totalJoints > 0 ? Math.round((summary.visualOk / summary.totalJoints) * 100) : 0}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', backgroundColor: '#e2e8f0' }}>
                                    <div className="progress-bar bg-info" style={{ width: `${summary.totalJoints > 0 ? Math.round((summary.visualOk / summary.totalJoints) * 100) : 0}%` }}></div>
                                </div>
                            </div>
                            <div className="mb-0">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Lolos NDT / Radiography ({summary.ndtOk} / {summary.totalJoints})</span>
                                    <span>{summary.totalJoints > 0 ? Math.round((summary.ndtOk / summary.totalJoints) * 100) : 0}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', backgroundColor: '#e2e8f0' }}>
                                    <div className="progress-bar bg-success" style={{ width: `${summary.totalJoints > 0 ? Math.round((summary.ndtOk / summary.totalJoints) * 100) : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="fw-bold text-dark mb-0">Rasio Eksekusi Shop vs Field Erection</h6>
                        </div>
                        <div className="card-body p-4 d-flex flex-column justify-content-between">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="p-3 bg-light rounded border">
                                        <span className="text-muted small fw-bold d-block text-uppercase">Shop Fabrication</span>
                                        <strong className="h3 fw-bold text-primary mb-0">
                                            {summary.shopWelded} / {summary.shopJointsCount}
                                        </strong>
                                        <span className="text-muted small d-block">joints selesai</span>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 bg-light rounded border">
                                        <span className="text-muted small fw-bold d-block text-uppercase">Field Erection</span>
                                        <strong className="h3 fw-bold text-success mb-0">
                                            {summary.fieldWelded} / {summary.fieldJointsCount}
                                        </strong>
                                        <span className="text-muted small d-block">joints selesai</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-top text-muted small d-flex justify-content-between">
                                <span>NDT Reject Rate Global: <strong className="text-dark">{overview?.reject_rate ?? 0}%</strong></span>
                                <span>BOM Material: <strong className="text-dark">{formatRupiah(summary.bomValue)}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Official Sign-Off Sheet */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark mb-0">Lembar Pengesahan Laporan Proyek (Progress Billing Sign-Off)</h6>
                    <span className="badge bg-light text-muted border d-print-none">Nama dapat diedit sebelum cetak</span>
                </div>
                <div className="card-body p-4">
                    <div className="row g-4 text-center">
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light">
                                <span className="text-muted small text-uppercase fw-bold d-block mb-4">Disusun Oleh (Prepared By)</span>
                                <div style={{ height: '36px' }}></div>
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center fw-bold border-0 border-bottom bg-transparent mb-1"
                                    value={signers.preparedName}
                                    onChange={(e) => setSigners({ ...signers, preparedName: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center text-muted border-0 bg-transparent p-0"
                                    style={{ fontSize: '0.78rem' }}
                                    value={signers.preparedRole}
                                    onChange={(e) => setSigners({ ...signers, preparedRole: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light">
                                <span className="text-muted small text-uppercase fw-bold d-block mb-4">Diperiksa Oleh (Checked By)</span>
                                <div style={{ height: '36px' }}></div>
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center fw-bold border-0 border-bottom bg-transparent mb-1"
                                    value={signers.checkedName}
                                    onChange={(e) => setSigners({ ...signers, checkedName: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center text-muted border-0 bg-transparent p-0"
                                    style={{ fontSize: '0.78rem' }}
                                    value={signers.checkedRole}
                                    onChange={(e) => setSigners({ ...signers, checkedRole: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light">
                                <span className="text-muted small text-uppercase fw-bold d-block mb-4">Disetujui Oleh (Approved By)</span>
                                <div style={{ height: '36px' }}></div>
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center fw-bold border-0 border-bottom bg-transparent mb-1"
                                    value={signers.approvedName}
                                    onChange={(e) => setSigners({ ...signers, approvedName: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center text-muted border-0 bg-transparent p-0"
                                    style={{ fontSize: '0.78rem' }}
                                    value={signers.approvedRole}
                                    onChange={(e) => setSigners({ ...signers, approvedRole: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
