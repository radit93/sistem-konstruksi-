import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../api';
import { formatRupiah } from '../../currency';
import { PcmSelect } from '../SearchSelect';

const MILESTONE_ROLE_OPTIONS = [
    { code: 'ALL', label: 'Semua Role' },
    { code: 'project_manager', label: 'Project Manager' },
    { code: 'engineer', label: 'Engineer' },
    { code: 'material', label: 'Material Control' },
    { code: 'construction', label: 'Construction' },
    { code: 'qaqc', label: 'QA/QC' },
    { code: 'testpackage', label: 'Test Package' },
    { code: 'hse', label: 'HSE' },
];

const MILESTONE_STATUS_LABEL = {
    PENDING: 'Pending',
    IN_PROGRESS: 'Berjalan',
    COMPLETED: 'Selesai',
    HOLD: 'Hold',
};

function accountRoleOf(milestone) {
    if (milestone?.user?.role) return milestone.user.role;
    const role = (milestone?.project_role || '').toLowerCase();
    if (role.includes('welder') || role.includes('fitter')) return 'construction';
    if (role.includes('piping engineer')) return 'engineer';
    if (role.includes('material')) return 'material';
    if (role.includes('qa') || role.includes('qc')) return 'qaqc';
    if (role.includes('test package')) return 'testpackage';
    if (role.includes('hse')) return 'hse';
    if (role.includes('project manager')) return 'project_manager';
    return '';
}

function ReportPrintHeader({ project, title, subtitle, extraMeta }) {
    return (
        <div className="pcm-doc-header">
            <div className="pcm-doc-eyebrow">
                <span>PCM Piping Suite</span>
                <span>Dokumen Resmi &middot; Project Control</span>
            </div>
            <h1 className="pcm-doc-title">{title}</h1>
            {subtitle && <div className="pcm-doc-subtitle">{subtitle}</div>}
            <div className="pcm-doc-meta">
                <div><span>Nama Proyek</span><strong>{project?.name || 'PCM Piping 2428'}</strong></div>
                <div><span>Job No</span><strong>{project?.job_no || '2428'}</strong></div>
                <div><span>Client</span><strong>{project?.client || '-'}</strong></div>
                <div><span>Tanggal Cetak</span><strong>{new Date().toLocaleString('id-ID')}</strong></div>
                {extraMeta}
            </div>
        </div>
    );
}

function ReportPrintFooter({ signers }) {
    const columns = [
        ['Disusun Oleh', signers.preparedName, signers.preparedRole],
        ['Diperiksa Oleh', signers.checkedName, signers.checkedRole],
        ['Disetujui Oleh', signers.approvedName, signers.approvedRole],
    ];
    return (
        <div className="pcm-doc-sign">
            <div className="pcm-doc-sign__grid">
                {columns.map(([label, name, role]) => (
                    <div key={label}>
                        <div className="pcm-doc-sign__role">{label}</div>
                        <div className="pcm-doc-sign__space" />
                        <div className="pcm-doc-sign__name">{name || '-'}</div>
                        <div className="pcm-doc-sign__role">{role || ''}</div>
                    </div>
                ))}
            </div>
            <div className="pcm-doc-footer">
                <span>PCM Piping Suite — Laporan Proyek</span>
                <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
            </div>
        </div>
    );
}

export function ProjectReportSection({
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

    const [printMode, setPrintMode] = useState(null);
    const [milestoneRole, setMilestoneRole] = useState('ALL');
    const [dailyLogs, setDailyLogs] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [budgetItems, setBudgetItems] = useState([]);

    useEffect(() => {
        if (!project?.id) {
            setDailyLogs([]);
            setMilestones([]);
            setBudgetItems([]);
            return undefined;
        }
        let alive = true;
        Promise.allSettled([
            api.get(`/daily-progress?project_id=${project.id}`),
            api.get('/project-milestones'),
            api.get(`/budget-items?project_id=${project.id}`),
        ]).then((results) => {
            if (!alive) return;
            const val = (idx) => (results[idx]?.status === 'fulfilled' && Array.isArray(results[idx].value) ? results[idx].value : []);
            const inProject = (row) => Number(row.project_id) === Number(project.id) || (!row.project_id && Number(project.id) === 1);
            setDailyLogs(val(0).filter(inProject));
            setMilestones(val(1).filter(inProject));
            setBudgetItems(val(2).filter(inProject));
        });
        return () => {
            alive = false;
        };
    }, [project?.id]);

    useEffect(() => {
        if (!printMode) return undefined;
        document.body.classList.add('pcm-printing');
        const cleanup = () => {
            document.body.classList.remove('pcm-printing');
            setPrintMode(null);
        };
        window.addEventListener('afterprint', cleanup);
        const timer = setTimeout(() => {
            window.print();
            setTimeout(cleanup, 300);
        }, 80);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', cleanup);
            document.body.classList.remove('pcm-printing');
        };
    }, [printMode]);

    const scopeMap = useMemo(
        () => new Map((scopes || []).map(s => [s.id, s.scope_description || s.item_code || `Scope #${s.id}`])),
        [scopes]
    );

    const milestoneRows = useMemo(() => {
        if (milestoneRole === 'ALL') return milestones;
        return milestones.filter(m => accountRoleOf(m) === milestoneRole);
    }, [milestones, milestoneRole]);

    const dailyTotals = useMemo(() => ({
        count: dailyLogs.length,
        qty: dailyLogs.reduce((acc, l) => acc + (parseFloat(l.qty) || 0), 0),
    }), [dailyLogs]);

    const budgetTotals = useMemo(() => {
        const totalBudget = budgetItems.reduce((acc, b) => acc + (parseFloat(b.total_budget) || 0), 0);
        const totalActual = budgetItems.reduce((acc, b) => acc + (parseFloat(b.actual_cost) || 0), 0);
        return { totalBudget, totalActual, variance: totalBudget - totalActual };
    }, [budgetItems]);

    const milestoneRoleLabel = MILESTONE_ROLE_OPTIONS.find(o => o.code === milestoneRole)?.label || 'Semua Role';

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
            weldPct: totalJoints > 0 ? Math.round((welded / totalJoints) * 100) : 0,
            visualPct: totalJoints > 0 ? Math.round((visualOk / totalJoints) * 100) : 0,
            ndtPct: totalJoints > 0 ? Math.round((ndtOk / totalJoints) * 100) : 0,
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
        <div className="pb-2">
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4 d-print-none">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Laporan Proyek</h2>
                    <p className="text-muted small mb-0">
                        Rekapitulasi progres fisik, nilai teknis (BOQ + BOM), kualitas QA/QC &amp; HSE, serta lembar pengesahan{project ? ` — Job ${project.job_no || '-'} · ${project.name}` : ''}.
                    </p>
                </div>
                <div className="d-flex flex-column gap-2 align-items-stretch align-items-lg-end">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="text-muted small fw-semibold">Cetak PDF:</span>
                        <button type="button" className="btn btn-primary btn-sm fw-bold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} onClick={() => setPrintMode('summary')}>
                            Ringkasan
                        </button>
                        <button type="button" className="btn btn-outline-primary btn-sm fw-semibold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)' }} onClick={() => setPrintMode('daily')}>
                            Daily Progress
                        </button>
                        <PcmSelect
                            aria-label="Filter role milestone"
                            className="pcm-report-role"
                            value={milestoneRole}
                            onChange={(e) => setMilestoneRole(e.target.value || 'ALL')}
                        >
                            {MILESTONE_ROLE_OPTIONS.map((opt) => (
                                <option key={opt.code} value={opt.code}>{opt.label}</option>
                            ))}
                        </PcmSelect>
                        <button type="button" className="btn btn-outline-primary btn-sm fw-semibold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)' }} onClick={() => setPrintMode('milestone')}>
                            Milestone
                        </button>
                        <button type="button" className="btn btn-outline-primary btn-sm fw-semibold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)' }} onClick={() => setPrintMode('budget')}>
                            Budgeting
                        </button>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="text-muted small fw-semibold">Export CSV:</span>
                        <button type="button" className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)' }} onClick={exportScopesCsv}>
                            Progres
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)' }} onClick={exportMaterialCsv}>
                            Material
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2" style={{ borderRadius: 'var(--pcm-radius-control)' }} onClick={exportJointsCsv}>
                            Welding
                        </button>
                    </div>
                </div>
            </div>

            {/* Ringkasan (tampilan layar) */}
            <div className="d-print-none">

            {/* Ringkasan KPI */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Progres Kontrak DI</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">
                            {summary.contractPct}%
                            <span className="pcm-tile__unit">({summary.totalActualDI.toLocaleString('id-ID')} / {summary.totalContractDI.toLocaleString('id-ID')} DI)</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Nilai Teknis (BOQ + BOM)</span>
                        <strong className="pcm-tile__value text-truncate" style={{ color: '#0369a1' }} title={formatRupiah(summary.totalTechValue)}>
                            {formatRupiah(summary.totalTechValue)}
                            <span className="pcm-tile__unit">BOQ {formatRupiah(summary.engBoqValue)}</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Test Package Hydrotest</span>
                        <strong className="pcm-tile__value text-success">
                            {summary.tpPass} / {summary.tpTotal}
                            <span className="pcm-tile__unit">paket lulus uji</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">HSE Safety Log</span>
                        <strong className={`pcm-tile__value ${summary.hseOpen > 0 ? 'text-danger' : 'text-success'}`}>
                            {summary.hseOpen} Open
                            <span className="pcm-tile__unit">{summary.hseClosed} / {summary.hseTotal} closed</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* Ringkasan Detail */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-lg-6">
                    <div className="pcm-card h-100">
                        <div className="pcm-card__head">
                            <h6 className="pcm-card__title mb-0">Progres Pengelasan &amp; Kualitas (QA/QC)</h6>
                        </div>
                        <div className="pcm-card__body">
                            <div className="mb-3">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Total Joint Welded ({summary.welded} / {summary.totalJoints})</span>
                                    <span>{summary.weldPct}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', backgroundColor: '#e2e8f0' }}>
                                    <div className="progress-bar bg-primary" style={{ width: `${summary.weldPct}%` }}></div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Lolos Inspeksi Visual ({summary.visualOk} / {summary.totalJoints})</span>
                                    <span>{summary.visualPct}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', backgroundColor: '#e2e8f0' }}>
                                    <div className="progress-bar bg-info" style={{ width: `${summary.visualPct}%` }}></div>
                                </div>
                            </div>
                            <div className="mb-0">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Lolos NDT / Radiography ({summary.ndtOk} / {summary.totalJoints})</span>
                                    <span>{summary.ndtPct}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px', backgroundColor: '#e2e8f0' }}>
                                    <div className="progress-bar bg-success" style={{ width: `${summary.ndtPct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-6">
                    <div className="pcm-card h-100">
                        <div className="pcm-card__head">
                            <h6 className="pcm-card__title mb-0">Rasio Shop vs Field Erection</h6>
                        </div>
                        <div className="pcm-card__body d-flex flex-column justify-content-between">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="p-3 bg-light rounded border h-100">
                                        <span className="text-muted small fw-bold d-block text-uppercase">Shop Fabrication</span>
                                        <strong className="h3 fw-bold text-primary mb-0 font-monospace">
                                            {summary.shopWelded} / {summary.shopJointsCount}
                                        </strong>
                                        <span className="text-muted small d-block">joints selesai</span>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 bg-light rounded border h-100">
                                        <span className="text-muted small fw-bold d-block text-uppercase">Field Erection</span>
                                        <strong className="h3 fw-bold text-success mb-0 font-monospace">
                                            {summary.fieldWelded} / {summary.fieldJointsCount}
                                        </strong>
                                        <span className="text-muted small d-block">joints selesai</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-top text-muted small d-flex justify-content-between flex-wrap gap-2">
                                <span>NDT Reject Rate Global: <strong className="text-dark">{overview?.reject_rate ?? 0}%</strong></span>
                                <span>BOM Material: <strong className="text-dark">{formatRupiah(summary.bomValue)}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lembar Pengesahan */}
            <div className="pcm-card">
                <div className="pcm-card__head">
                    <h6 className="pcm-card__title mb-0">Lembar Pengesahan Laporan Proyek</h6>
                    <span className="pcm-chip pcm-chip--neutral d-print-none">Nama dapat diedit sebelum cetak</span>
                </div>
                <div className="pcm-card__body">
                    <div className="row g-4 text-center">
                        <div className="col-12 col-md-4">
                            <div className="p-3 border rounded bg-light h-100">
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
                            <div className="p-3 border rounded bg-light h-100">
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
                            <div className="p-3 border rounded bg-light h-100">
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

            {/* Ringkasan (dokumen cetak) */}
                <div className={`pcm-printable${printMode === 'summary' ? ' pcm-printable--active' : ''} d-none d-print-block`}>
                    <ReportPrintHeader
                        project={project}
                        title="Laporan Proyek"
                        subtitle="Ringkasan progres, kualitas, dan pengesahan proyek"
                    />

                    <div className="pcm-doc-section-title">Ringkasan Kinerja Proyek</div>
                    <table className="pcm-doc-kpi">
                        <tbody>
                            <tr>
                                <td>
                                    <div className="pcm-doc-kpi__label">Progres Kontrak DI</div>
                                    <div className="pcm-doc-kpi__value">{summary.contractPct}%</div>
                                    <div className="pcm-doc-kpi__note">{summary.totalActualDI.toLocaleString('id-ID')} / {summary.totalContractDI.toLocaleString('id-ID')} DI</div>
                                </td>
                                <td>
                                    <div className="pcm-doc-kpi__label">Nilai Teknis (BOQ + BOM)</div>
                                    <div className="pcm-doc-kpi__value">{formatRupiah(summary.totalTechValue)}</div>
                                    <div className="pcm-doc-kpi__note">BOQ {formatRupiah(summary.engBoqValue)}</div>
                                </td>
                                <td>
                                    <div className="pcm-doc-kpi__label">Test Package Hydrotest</div>
                                    <div className="pcm-doc-kpi__value">{summary.tpPass} / {summary.tpTotal}</div>
                                    <div className="pcm-doc-kpi__note">paket lulus uji</div>
                                </td>
                                <td>
                                    <div className="pcm-doc-kpi__label">HSE Safety Log</div>
                                    <div className="pcm-doc-kpi__value">{summary.hseOpen} Open</div>
                                    <div className="pcm-doc-kpi__note">{summary.hseClosed} / {summary.hseTotal} closed</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="pcm-doc-section-title">Progres Pengelasan &amp; Kualitas (QA/QC)</div>
                    <table className="pcm-table">
                        <thead>
                            <tr>
                                <th>Tahap Pekerjaan</th>
                                <th className="text-end" style={{ width: '110px' }}>Selesai</th>
                                <th className="text-end" style={{ width: '110px' }}>Total</th>
                                <th className="text-end" style={{ width: '110px' }}>Persentase</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Joint Welded</td>
                                <td className="text-end">{summary.welded}</td>
                                <td className="text-end">{summary.totalJoints}</td>
                                <td className="text-end">{summary.weldPct}%</td>
                            </tr>
                            <tr>
                                <td>Lolos Inspeksi Visual</td>
                                <td className="text-end">{summary.visualOk}</td>
                                <td className="text-end">{summary.totalJoints}</td>
                                <td className="text-end">{summary.visualPct}%</td>
                            </tr>
                            <tr>
                                <td>Lolos NDT / Radiography</td>
                                <td className="text-end">{summary.ndtOk}</td>
                                <td className="text-end">{summary.totalJoints}</td>
                                <td className="text-end">{summary.ndtPct}%</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="pcm-doc-section-title">Rasio Shop vs Field Erection</div>
                    <table className="pcm-table">
                        <thead>
                            <tr>
                                <th>Area Pekerjaan</th>
                                <th className="text-end" style={{ width: '130px' }}>Joint Selesai</th>
                                <th className="text-end" style={{ width: '120px' }}>Total Joint</th>
                                <th className="text-end" style={{ width: '140px' }}>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Shop Fabrication</td>
                                <td className="text-end">{summary.shopWelded}</td>
                                <td className="text-end">{summary.shopJointsCount}</td>
                                <td className="text-end">NDT Reject {overview?.reject_rate ?? 0}%</td>
                            </tr>
                            <tr>
                                <td>Field Erection</td>
                                <td className="text-end">{summary.fieldWelded}</td>
                                <td className="text-end">{summary.fieldJointsCount}</td>
                                <td className="text-end">-</td>
                            </tr>
                            <tr>
                                <td>Nilai Material (BOM)</td>
                                <td className="text-end" colSpan={3}>{formatRupiah(summary.bomValue)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <ReportPrintFooter signers={signers} />
                </div>

            {/* Daily Progress (print only) */}
            {printMode === 'daily' && (
                <div className="pcm-printable pcm-printable--active d-none d-print-block">
                    <ReportPrintHeader
                        project={project}
                        title="Daily Progress Log"
                        subtitle={`${dailyTotals.count} catatan · Total volume ${dailyTotals.qty.toLocaleString('id-ID')}`}
                    />
                    <table className="table table-sm pcm-table align-middle">
                        <thead>
                            <tr>
                                <th style={{ width: '45px' }}>No</th>
                                <th style={{ width: '105px' }}>Tanggal</th>
                                <th>Scope Pekerjaan</th>
                                <th className="text-end" style={{ width: '90px' }}>Qty</th>
                                <th style={{ width: '140px' }}>Team</th>
                                <th>Catatan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-3">Belum ada catatan progres harian.</td>
                                </tr>
                            ) : (
                                dailyLogs.map((l, idx) => (
                                    <tr key={l.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td className="font-monospace">{l.prog_date || '-'}</td>
                                        <td>{scopeMap.get(l.scope_id) || `Scope #${l.scope_id}`}</td>
                                        <td className="text-end font-monospace">{(parseFloat(l.qty) || 0).toLocaleString('id-ID')}</td>
                                        <td>{l.team || '-'}</td>
                                        <td>{l.notes || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <ReportPrintFooter signers={signers} />
                </div>
            )}

            {/* Milestone (print only) */}
            {printMode === 'milestone' && (
                <div className="pcm-printable pcm-printable--active d-none d-print-block">
                    <ReportPrintHeader
                        project={project}
                        title="Milestone & Jadwal Kerja"
                        subtitle={`Role: ${milestoneRoleLabel} · ${milestoneRows.length} milestone`}
                    />
                    <table className="table table-sm pcm-table align-middle">
                        <thead>
                            <tr>
                                <th style={{ width: '45px' }}>No</th>
                                <th style={{ width: '90px' }}>Kode</th>
                                <th>Milestone</th>
                                <th style={{ width: '130px' }}>Role</th>
                                <th style={{ width: '150px' }}>Akun / PIC</th>
                                <th style={{ width: '95px' }}>Mulai</th>
                                <th style={{ width: '95px' }}>Target</th>
                                <th style={{ width: '90px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {milestoneRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-muted py-3">Belum ada milestone untuk role ini.</td>
                                </tr>
                            ) : (
                                milestoneRows.map((m, idx) => (
                                    <tr key={m.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td className="font-monospace">{m.code || '-'}</td>
                                        <td>{m.name || '-'}</td>
                                        <td>{m.project_role || '-'}</td>
                                        <td>{m.user?.name || m.pic_lead || '-'}</td>
                                        <td className="font-monospace">{m.start_date || '-'}</td>
                                        <td className="font-monospace">{m.target_date || '-'}</td>
                                        <td>{MILESTONE_STATUS_LABEL[m.status] || m.status || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <ReportPrintFooter signers={signers} />
                </div>
            )}

            {/* Budgeting (print only) */}
            {printMode === 'budget' && (
                <div className="pcm-printable pcm-printable--active d-none d-print-block">
                    <ReportPrintHeader
                        project={project}
                        title="Budgeting"
                        subtitle={`Total budget ${formatRupiah(budgetTotals.totalBudget)} · Actual ${formatRupiah(budgetTotals.totalActual)} · Sisa ${formatRupiah(budgetTotals.variance)}`}
                    />
                    <table className="table table-sm pcm-table align-middle">
                        <thead>
                            <tr>
                                <th style={{ width: '45px' }}>No</th>
                                <th style={{ width: '95px' }}>Kode</th>
                                <th style={{ width: '120px' }}>Kategori</th>
                                <th>Uraian</th>
                                <th className="text-center" style={{ width: '65px' }}>Satuan</th>
                                <th className="text-end" style={{ width: '80px' }}>Qty</th>
                                <th className="text-end" style={{ width: '130px' }}>Total Budget</th>
                                <th className="text-end" style={{ width: '130px' }}>Actual</th>
                                <th className="text-end" style={{ width: '130px' }}>Sisa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgetItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center text-muted py-3">Belum ada item budget.</td>
                                </tr>
                            ) : (
                                budgetItems.map((b, idx) => {
                                    const budget = parseFloat(b.total_budget) || 0;
                                    const actual = parseFloat(b.actual_cost) || 0;
                                    return (
                                        <tr key={b.id || idx}>
                                            <td>{idx + 1}</td>
                                            <td className="font-monospace">{b.item_code || '-'}</td>
                                            <td>{b.category || '-'}</td>
                                            <td>{b.scope_description || '-'}</td>
                                            <td className="text-center">{b.unit || '-'}</td>
                                            <td className="text-end font-monospace">{(parseFloat(b.contract_qty) || 0).toLocaleString('id-ID')}</td>
                                            <td className="text-end font-monospace">{formatRupiah(budget)}</td>
                                            <td className="text-end font-monospace">{formatRupiah(actual)}</td>
                                            <td className={`text-end font-monospace ${budget - actual < 0 ? 'text-danger' : 'text-success'}`}>{formatRupiah(budget - actual)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {budgetItems.length > 0 && (
                            <tfoot>
                                <tr className="fw-bold">
                                    <td colSpan={6} className="text-end">Total</td>
                                    <td className="text-end font-monospace">{formatRupiah(budgetTotals.totalBudget)}</td>
                                    <td className="text-end font-monospace">{formatRupiah(budgetTotals.totalActual)}</td>
                                    <td className="text-end font-monospace">{formatRupiah(budgetTotals.variance)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                    <ReportPrintFooter signers={signers} />
                </div>
            )}
        </div>
    );
}
