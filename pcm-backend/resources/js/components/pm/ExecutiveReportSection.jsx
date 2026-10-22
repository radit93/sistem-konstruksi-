import React from 'react';

export function ExecutiveReportSection({ overview, project, joints = [], stockMoves = [], scopes = [], user }) {
    const totalJoints = joints?.length || 28;
    const welded = (joints || []).filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
    const visualOk = (joints || []).filter(j => ['VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
    const ndtOk = (joints || []).filter(j => ['NDT_OK', 'TESTED'].includes(j.status)).length;

    const shopJoints = (joints || []).filter(j => j.shop_field === 'Shop');
    const fieldJoints = (joints || []).filter(j => j.shop_field === 'Field');

    const shopWelded = shopJoints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;
    const fieldWelded = fieldJoints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length;

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
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
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
            return [
                idx + 1,
                q(s.scope),
                s.unit,
                contract,
                cum,
                `${pct}%`
            ];
        });
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
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
                        Rekapitulasi pencapaian fisik proyek, persentase pengelasan &amp; NDT, lembar pengesahan tanda tangan resmi, dan ekspor data CSV.
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={exportScopesCsv}
                    >
                        Export BOQ (CSV)
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={exportMaterialCsv}
                    >
                        Export Material (CSV)
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={exportJointsCsv}
                    >
                        Export Joints (CSV)
                    </button>
                </div>
            </div>

            {/* KPI Progress Cards */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Shop Fabrication</span>
                        <strong className="h3 fw-bold text-primary mb-0">
                            {shopJoints.length > 0 ? Math.round((shopWelded / shopJoints.length) * 100) : 0}%
                        </strong>
                        <span className="text-muted ms-1 small">({shopWelded}/{shopJoints.length} joints)</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Field Erection</span>
                        <strong className="h3 fw-bold text-success mb-0">
                            {fieldJoints.length > 0 ? Math.round((fieldWelded / fieldJoints.length) * 100) : 0}%
                        </strong>
                        <span className="text-muted ms-1 small">({fieldWelded}/{fieldJoints.length} joints)</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Visual Inspection OK</span>
                        <strong className="h3 fw-bold text-dark mb-0">
                            {totalJoints > 0 ? Math.round((visualOk / totalJoints) * 100) : 0}%
                        </strong>
                        <span className="text-muted ms-1 small">({visualOk}/{totalJoints} joints)</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">NDT Clearance</span>
                        <strong className="h3 fw-bold text-primary mb-0">
                            {totalJoints > 0 ? Math.round((ndtOk / totalJoints) * 100) : 0}%
                        </strong>
                        <span className="text-muted ms-1 small">({ndtOk}/{totalJoints} joints)</span>
                    </div>
                </div>
            </div>

            {/* Official Executive Sign-off Sheet */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3">
                    <h6 className="fw-bold text-dark mb-0">Lembar Pengesahan Laporan Resmi Proyek (Official Sign-off)</h6>
                </div>
                <div className="card-body p-4">
                    <div className="row g-4 text-center">
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light" style={{ height: '100%' }}>
                                <span className="text-muted small text-uppercase fw-bold d-block mb-1">Disiapkan Oleh (Prepared)</span>
                                <strong className="text-dark d-block">Project Manager</strong>
                                <span className="small text-muted font-monospace d-block mb-4">Departemen PMO</span>
                                <div style={{ height: '50px' }}></div>
                                <div className="border-top pt-2">
                                    <span className="fw-bold d-block text-dark">Bpk. Ir. Hendra Wijaya</span>
                                    <span className="text-muted small">Project Manager (PMO)</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light" style={{ height: '100%' }}>
                                <span className="text-muted small text-uppercase fw-bold d-block mb-1">Diverifikasi Teknis (Checked)</span>
                                <strong className="text-dark d-block">Lead Piping Engineer</strong>
                                <span className="small text-muted font-monospace d-block mb-4">Departemen Engineering</span>
                                <div style={{ height: '50px' }}></div>
                                <div className="border-top pt-2">
                                    <span className="fw-bold d-block text-dark">Bpk. Ahmad Fauzi, ST</span>
                                    <span className="text-muted small">Lead Piping Engineer</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light" style={{ height: '100%' }}>
                                <span className="text-muted small text-uppercase fw-bold d-block mb-1">Disetujui Klien (Approved)</span>
                                <strong className="text-dark d-block">Client / Owner Representative</strong>
                                <span className="small text-muted font-monospace d-block mb-4">PT. Pertamina / PGN</span>
                                <div style={{ height: '50px' }}></div>
                                <div className="border-top pt-2">
                                    <span className="fw-bold d-block text-dark">Dr. Bambang Purnomo</span>
                                    <span className="text-muted small">Owner Project Director</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
