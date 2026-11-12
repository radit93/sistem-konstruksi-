import React, { useState, useMemo } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { PcmSelect } from './SearchSelect';

/* --------------------------------------------------------------------------
 * Helpers & Formatters
 * ----------------------------------------------------------------------- */
const today = () => new Date().toISOString().split('T')[0];

const specLabel = (j) => [j.spec_a || j.spec_b, j.size_in ? `${j.size_in}\"` : ''].filter(Boolean).join(' ') || '—';

const jointLabel = (j) => j.spool_no ? `${j.spool_no} · Joint #${j.seq || '—'}` : `Joint #${j.seq || j.id || '—'}`;

const statusChip = (status) => ({
    PLANNED: 'pcm-chip--neutral',
    RECEIVED: 'pcm-chip--neutral',
    ISSUED: 'pcm-chip--neutral',
    FITUP_OK: 'pcm-chip--warning',
    WELDED: 'pcm-chip--primary',
    VISUAL_OK: 'pcm-chip--primary',
    NDT_OK: 'pcm-chip--success',
    REPAIR: 'pcm-chip--warning',
    TESTED: 'pcm-chip--dark',
}[status] || 'pcm-chip--neutral');

/* --------------------------------------------------------------------------
 * Inline SVG Icons (Acorn/Heroicon standard)
 * ----------------------------------------------------------------------- */
const SVG_PROPS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false'
};

function IconCheck({ className = '' }) {
    return (
        <svg className={`pcm-i ${className}`} style={{ width: '1rem', height: '1rem' }} {...SVG_PROPS}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconEye({ className = '' }) {
    return (
        <svg className={`pcm-i ${className}`} style={{ width: '1rem', height: '1rem' }} {...SVG_PROPS}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function IconEdit({ className = '' }) {
    return (
        <svg className={`pcm-i ${className}`} style={{ width: '1rem', height: '1rem' }} {...SVG_PROPS}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function IconFileText({ className = '' }) {
    return (
        <svg className={`pcm-i ${className}`} style={{ width: '1rem', height: '1rem' }} {...SVG_PROPS}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

function IconList({ className = '' }) {
    return (
        <svg className={`pcm-i ${className}`} style={{ width: '1rem', height: '1rem' }} {...SVG_PROPS}>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );
}

export function QaqcTab({
    joints = [],
    inspections = [],
    drawings = [],
    projects = [],
    user,
    onReload
}) {
    const [search, setSearch] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedDrawingNo, setSelectedDrawingNo] = useState('');
    const [subTab, setSubTab] = useState('joints'); // 'joints' or 'reports'

    // Modals
    const [showInspectModal, setShowInspectModal] = useState(false);
    const [showEditReportModal, setShowEditReportModal] = useState(false);
    const [showDetailJointModal, setShowDetailJointModal] = useState(false);
    const [showDetailReportModal, setShowDetailReportModal] = useState(false);

    // Active Objects
    const [activeJoint, setActiveJoint] = useState(null);
    const [activeReport, setActiveReport] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        report_no: '',
        kind: 'VISUAL',
        result: 'PASS',
        defect_type: 'NONE',
        inspector: user?.name || 'QC Inspector',
        insp_date: today(),
        remarks: 'Weld appearance uniform, full penetration, ASME B31.3 compliant',
        repair_cycle: { cycle: '', date: '', result: '' }
    });

    const [editFormData, setEditFormData] = useState({
        inspector: '',
        insp_date: today(),
        defect_type: 'NONE',
        remarks: '',
        repair_cycle: { cycle: '', date: '', result: '' }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'inspection.write');

    // Drawing lookup helper
    const drawingLookup = useMemo(() => {
        const map = {};
        (drawings || []).forEach(d => {
            if (d.drawing_no) {
                map[d.drawing_no] = d;
            }
        });
        return map;
    }, [drawings]);

    // Active drawing object
    const currentDrawing = selectedDrawingNo ? drawingLookup[selectedDrawingNo] : null;

    // Filtered options for Drawing dropdown
    const drawingOptions = useMemo(() => {
        let list = drawings || [];
        if (selectedProjectId) {
            list = list.filter(d => String(d.project_id) === String(selectedProjectId));
        }
        return list.map(d => ({
            value: d.drawing_no,
            label: `${d.drawing_no}${d.sheet ? ` (${d.sheet})` : ''} — ${d.line_no || 'No Line'}`
        }));
    }, [drawings, selectedProjectId]);

    // Filter Joints
    const filteredJoints = useMemo(() => {
        return (joints || []).filter(j => {
            // Project filter
            if (selectedProjectId) {
                const dwg = drawingLookup[j.drawing_no];
                if (dwg && String(dwg.project_id) !== String(selectedProjectId)) {
                    return false;
                }
            }
            // Isometric filter
            if (selectedDrawingNo && (j.drawing_no || '').toLowerCase() !== selectedDrawingNo.toLowerCase()) {
                return false;
            }
            // Text search
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return (j.spool_no || '').toLowerCase().includes(q) ||
                String(j.seq || '').includes(q) ||
                (j.drawing_no || '').toLowerCase().includes(q) ||
                (j.line_no || '').toLowerCase().includes(q) ||
                (j.welder || '').toLowerCase().includes(q);
        });
    }, [joints, selectedProjectId, selectedDrawingNo, search, drawingLookup]);

    // Filter Inspection Reports
    const filteredReports = useMemo(() => {
        return (inspections || []).filter(r => {
            const joint = (joints || []).find(j => j.id === r.joint_id);

            // Project filter
            if (selectedProjectId && joint) {
                const dwg = drawingLookup[joint.drawing_no];
                if (dwg && String(dwg.project_id) !== String(selectedProjectId)) {
                    return false;
                }
            }
            // Isometric filter
            if (selectedDrawingNo && joint && (joint.drawing_no || '').toLowerCase() !== selectedDrawingNo.toLowerCase()) {
                return false;
            }
            // Text search
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return (r.report_no || '').toLowerCase().includes(q) ||
                (r.inspector || '').toLowerCase().includes(q) ||
                (r.kind || '').toLowerCase().includes(q) ||
                (r.remarks || '').toLowerCase().includes(q) ||
                (joint?.spool_no || '').toLowerCase().includes(q) ||
                (joint?.drawing_no || '').toLowerCase().includes(q);
        });
    }, [inspections, joints, selectedProjectId, selectedDrawingNo, search, drawingLookup]);

    // Handlers
    const handleOpenInspect = (j) => {
        setActiveJoint(j);
        const isoClean = (j.drawing_no || 'ISO').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const seqPad = String(j.seq || 1).padStart(2, '0');
        const count = (inspections || []).filter(i => String(i.joint_id) === String(j.id) && i.kind === 'VISUAL').length + 1;
        const countPad = String(count).padStart(2, '0');

        setFormData({
            report_no: `QC-2428-${isoClean}-J${seqPad}-VT-${countPad}`,
            kind: 'VISUAL',
            result: 'PASS',
            defect_type: 'NONE',
            inspector: user?.name || 'QC Inspector',
            insp_date: today(),
            remarks: 'Weld appearance uniform, full penetration, ASME B31.3 compliant',
            repair_cycle: { cycle: '', date: '', result: '' }
        });
        setError('');
        setShowInspectModal(true);
    };

    const handleSaveInspection = async (e) => {
        e.preventDefault();
        if (!activeJoint) return;
        setError('');
        setLoading(true);
        try {
            await api.post('/inspections', {
                joint_id: activeJoint.id,
                ...formData
            });
            setShowInspectModal(false);
            setActiveJoint(null);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan hasil inspeksi');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditReport = (r) => {
        setActiveReport(r);
        setEditFormData({
            inspector: r.inspector || '',
            insp_date: r.insp_date || today(),
            defect_type: r.defect_type || 'NONE',
            remarks: r.remarks || '',
            repair_cycle: r.repair_cycle || { cycle: '', date: '', result: '' }
        });
        setError('');
        setShowEditReportModal(true);
    };

    const handleSaveEditReport = async (e) => {
        e.preventDefault();
        if (!activeReport) return;
        setError('');
        setLoading(true);
        try {
            await api.put(`/inspections/${activeReport.id}`, {
                ...editFormData
            });
            setShowEditReportModal(false);
            setActiveReport(null);
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal memperbarui laporan inspeksi');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetailJoint = (j) => {
        setActiveJoint(j);
        setShowDetailJointModal(true);
    };

    const handleOpenDetailReport = (r) => {
        setActiveReport(r);
        setShowDetailReportModal(true);
    };

    return (
        <div className="py-4 px-3 px-lg-4">
            {/* Header: Title & Access Notice */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h1 className="h3 fw-bolder text-dark mb-1">QA-QC Inspection &amp; NDT Clearance</h1>
                    <p className="text-muted small mb-0">
                        Kontrol Kualitas Las, Visual QC, Radiography (RT), Penetrant (PT) &amp; Defect Tracking (Job 2428 &bull; ASME B31.3)
                    </p>
                </div>
                <div>
                    {!canEdit ? (
                        <span className="pcm-chip pcm-chip--neutral">
                            Mode Baca (Akses Verifikasi: QA-QC / Inspector)
                        </span>
                    ) : (
                        <span className="pcm-chip pcm-chip--primary">
                            Akses QC Aktif &bull; {user?.name || 'Inspector'}
                        </span>
                    )}
                </div>
            </div>

            {/* Metric KPI Cards (Acorn/Engineering Standard) */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="pcm-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Total Laporan QC</span>
                            <span className="pcm-chip pcm-chip--neutral pcm-code">{inspections?.length || 0} Doc</span>
                        </div>
                        <div className="h3 fw-bolder text-dark mb-0">{inspections?.length || 0}</div>
                        <div className="pcm-cell-sub small text-muted mt-1">Laporan inspeksi resmi tersimpan</div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="pcm-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Visual QC Passed</span>
                            <span className="pcm-chip pcm-chip--primary pcm-code">VT Clean</span>
                        </div>
                        <div className="h3 fw-bolder text-primary mb-0">
                            {(joints || []).filter(j => ['VISUAL_OK', 'NDT_OK', 'TESTED'].includes(j.status)).length}
                        </div>
                        <div className="pcm-cell-sub small text-muted mt-1">Joint berstatus Visual OK</div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="pcm-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-muted small fw-bold text-uppercase">NDT Cleared</span>
                            <span className="pcm-chip pcm-chip--success pcm-code">RT / PT 100%</span>
                        </div>
                        <div className="h3 fw-bolder text-success mb-0">
                            {(joints || []).filter(j => ['NDT_OK', 'TESTED'].includes(j.status)).length}
                        </div>
                        <div className="pcm-cell-sub small text-muted mt-1">Lolos pengujian NDT final</div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="pcm-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Rework / Repair Rate</span>
                            <span className="pcm-chip pcm-chip--warning pcm-code">Target &lt; 2.0%</span>
                        </div>
                        <div className="h3 fw-bolder text-dark mb-0">
                            {(joints || []).filter(j => j.status === 'REPAIR').length > 0
                                ? `${(((joints || []).filter(j => j.status === 'REPAIR').length / Math.max(joints?.length || 1, 1)) * 100).toFixed(1)}%`
                                : '0.0%'}
                        </div>
                        <div className="pcm-cell-sub small text-muted mt-1">
                            {(joints || []).filter(j => j.status === 'REPAIR').length} joint butuh perbaikan
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar: Project & Isometric Selector (Read-Only Master Integration) */}
            <div className="pcm-card p-3 mb-4">
                <div className="row g-2 align-items-center">
                    <div className="col-12 col-md-3">
                        <label className="form-label small fw-semibold text-muted mb-1">Filter Project (Master)</label>
                        <PcmSelect
                            value={selectedProjectId}
                            onChange={(e) => {
                                setSelectedProjectId(e.target.value);
                                setSelectedDrawingNo('');
                            }}
                        >
                            <option value="">Semua Project (Global)</option>
                            {(projects || []).map(p => (
                                <option key={p.id} value={String(p.id)}>
                                    Job {p.job_no || p.code || p.id} — {p.name}
                                </option>
                            ))}
                        </PcmSelect>
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-muted mb-1">Filter Isometric Drawing</label>
                        <PcmSelect
                            value={selectedDrawingNo}
                            onChange={(e) => setSelectedDrawingNo(e.target.value)}
                        >
                            <option value="">Semua Isometric Drawing</option>
                            {drawingOptions.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </PcmSelect>
                    </div>
                    <div className="col-12 col-md-5">
                        <label className="form-label small fw-semibold text-muted mb-1">Cari Spesifik</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0 text-muted">
                                <i className="cs-search" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Cari spool, no joint, welder, no laporan, inspector..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() => setSearch('')}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Read-Only Isometric Context Banner */}
                {currentDrawing && (
                    <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2 text-muted small">
                        <div>
                            <span className="fw-bold text-dark me-2">Isometric Aktif:</span>
                            <span className="pcm-code fw-bold text-primary me-2">{currentDrawing.drawing_no}</span>
                            <span className="me-2">&bull; {currentDrawing.sheet || 'Sheet 1 of 1'}</span>
                            <span className="me-2">&bull; Rev {currentDrawing.rev ?? '0'}</span>
                            <span>&bull; Line: <strong>{currentDrawing.line_no || '—'}</strong> ({currentDrawing.line_service || 'Standard'})</span>
                        </div>
                        <div className="d-flex gap-2">
                            <span className="pcm-chip pcm-chip--neutral pcm-code">Total {currentDrawing.total_joints || 0} Joint</span>
                            <span className="pcm-chip pcm-chip--neutral pcm-code">{currentDrawing.total_dia_inch || 0} Dia-Inch</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-tab Navigation: Joints vs Log Laporan (LPG) */}
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div className="btn-group" role="group">
                    <button
                        type="button"
                        onClick={() => setSubTab('joints')}
                        className={`btn btn-sm fw-bold px-3 py-2 d-inline-flex align-items-center gap-1.5 ${
                            subTab === 'joints' ? 'btn-primary' : 'btn-outline-secondary'
                        }`}
                    >
                        <IconList />
                        <span>Daftar Joint &amp; Status QC ({filteredJoints.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab('reports')}
                        className={`btn btn-sm fw-bold px-3 py-2 d-inline-flex align-items-center gap-1.5 ${
                            subTab === 'reports' ? 'btn-primary' : 'btn-outline-secondary'
                        }`}
                    >
                        <IconFileText />
                        <span>Log Laporan Inspeksi (LPG) ({filteredReports.length})</span>
                    </button>
                </div>
                <div className="text-muted small">
                    {subTab === 'joints'
                        ? `Menampilkan ${filteredJoints.length} joint terdaftar`
                        : `Menampilkan ${filteredReports.length} laporan QC resmi`}
                </div>
            </div>

            {/* Tab 1: Joint Traceability Table */}
            {subTab === 'joints' && (
                <div className="pcm-card">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle pcm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col" className="text-center" style={{ width: '80px' }}>
                                        <span className="pcm-th-title">Seq / No</span>
                                    </th>
                                    <th scope="col" style={{ minWidth: '130px' }}>
                                        <span className="pcm-th-title">Spool No</span>
                                    </th>
                                    <th scope="col" style={{ minWidth: '180px' }}>
                                        <span className="pcm-th-title">Isometric &amp; Line</span>
                                    </th>
                                    <th scope="col" style={{ minWidth: '150px' }}>
                                        <span className="pcm-th-title">Spec &amp; Size</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '110px' }}>
                                        <span className="pcm-th-title">Welder / Loc</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '130px' }}>
                                        <span className="pcm-th-title">Status QC</span>
                                    </th>
                                    <th scope="col" className="text-end" style={{ minWidth: '170px' }}>
                                        <span className="pcm-th-title">Aksi</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredJoints.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <div className="py-3">
                                                <IconFileText className="text-muted mb-2" />
                                                <p className="mb-1 fw-bold text-dark">Tidak ada data joint</p>
                                                <small className="text-muted">Coba ubah filter Project atau kata kunci pencarian.</small>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredJoints.map(j => (
                                        <tr key={j.id}>
                                            <td className="text-center font-monospace">
                                                <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                    #{j.seq != null ? String(j.seq).padStart(2, '0') : j.id}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="pcm-code fw-bold text-dark" style={{ fontSize: '0.8125rem' }}>
                                                    {j.spool_no || '—'}
                                                </div>
                                                <div className="pcm-cell-sub small text-muted">
                                                    {j.joint_type || 'Butt Weld'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="pcm-code fw-bold text-dark" style={{ fontSize: '0.8125rem' }}>
                                                    {j.drawing_no || '—'}
                                                </div>
                                                <div className="pcm-cell-sub small text-muted">
                                                    {j.line_no || 'Line unassigned'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-dark" style={{ fontSize: '0.8125rem' }}>
                                                    {specLabel(j)}
                                                </div>
                                                {j.wps && (
                                                    <div className="pcm-cell-sub small text-muted">
                                                        WPS: {j.wps}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <div className="pcm-code fw-bold text-dark" style={{ fontSize: '0.8125rem' }}>
                                                    {j.welder || '—'}
                                                </div>
                                                <span className={`pcm-chip ${(j.shop_field || '').toLowerCase() === 'shop' ? 'pcm-chip--neutral' : 'pcm-chip--warning'}`}>
                                                    {(j.shop_field || 'SHOP').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`pcm-chip ${statusChip(j.status)}`}>
                                                    {j.status || 'PLANNED'}
                                                </span>
                                            </td>
                                            <td className="text-end text-nowrap">
                                                <div className="d-inline-flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetailJoint(j)}
                                                        className="btn btn-outline-secondary btn-sm px-2.5 py-1"
                                                        title="Lihat spesifikasi lengkap &amp; riwayat inspeksi"
                                                    >
                                                        <IconEye className="me-1" />
                                                        <span>Detail</span>
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenInspect(j)}
                                                            className="btn btn-primary btn-sm px-2.5 py-1 fw-bold"
                                                            title="Catat hasil inspeksi Visual atau NDT"
                                                        >
                                                            <IconCheck className="me-1" />
                                                            <span>Catat QC</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Inspection Reports Log (LPG) */}
            {subTab === 'reports' && (
                <div className="pcm-card">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle pcm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col" style={{ minWidth: '190px' }}>
                                        <span className="pcm-th-title">No Laporan (Report No)</span>
                                    </th>
                                    <th scope="col" style={{ minWidth: '160px' }}>
                                        <span className="pcm-th-title">Ref Isometric &amp; Joint</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '100px' }}>
                                        <span className="pcm-th-title">Metode</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '100px' }}>
                                        <span className="pcm-th-title">Hasil</span>
                                    </th>
                                    <th scope="col" style={{ minWidth: '120px' }}>
                                        <span className="pcm-th-title">Defect Type</span>
                                    </th>
                                    <th scope="col" style={{ minWidth: '140px' }}>
                                        <span className="pcm-th-title">Inspector</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '110px' }}>
                                        <span className="pcm-th-title">Tanggal</span>
                                    </th>
                                    <th scope="col" className="text-end" style={{ minWidth: '150px' }}>
                                        <span className="pcm-th-title">Aksi</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            <div className="py-3">
                                                <IconFileText className="text-muted mb-2" />
                                                <p className="mb-1 fw-bold text-dark">Belum ada laporan inspeksi tersimpan</p>
                                                <small className="text-muted">Pilih tab Daftar Joint untuk mencatat hasil inspeksi baru.</small>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map((r) => {
                                        const joint = (joints || []).find(j => j.id === r.joint_id);
                                        return (
                                            <tr key={r.id}>
                                                <td>
                                                    <div className="pcm-code fw-bold text-primary" style={{ fontSize: '0.8125rem' }}>
                                                        {r.report_no}
                                                    </div>
                                                    {r.remarks && (
                                                        <div className="pcm-cell-sub small text-muted text-truncate" style={{ maxWidth: '240px' }} title={r.remarks}>
                                                            {r.remarks}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="pcm-code text-dark" style={{ fontSize: '0.8125rem' }}>
                                                        {joint?.drawing_no || '—'}
                                                    </div>
                                                    <div className="pcm-cell-sub small text-muted">
                                                        {joint ? jointLabel(joint) : `Joint ID #${r.joint_id}`}
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <span className="pcm-chip pcm-chip--neutral pcm-code">
                                                        {r.kind}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`pcm-chip ${r.result === 'PASS' ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                        {r.result}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-muted small">
                                                        {r.defect_type && r.defect_type !== 'NONE' ? r.defect_type : 'Bebas Cacat'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-dark small">
                                                        {r.inspector || '—'}
                                                    </div>
                                                </td>
                                                <td className="text-center font-monospace small text-muted">
                                                    {r.insp_date || '—'}
                                                </td>
                                                <td className="text-end text-nowrap">
                                                    <div className="d-inline-flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDetailReport(r)}
                                                            className="btn btn-outline-secondary btn-sm px-2.5 py-1"
                                                            title="Lihat lembar laporan inspeksi lengkap"
                                                        >
                                                            <IconEye className="me-1" />
                                                            <span>Detail</span>
                                                        </button>
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditReport(r)}
                                                                className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                                                title="Perbaiki catatan atau typo laporan"
                                                            >
                                                                <IconEdit className="me-1" />
                                                                <span>Edit</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Input Inspeksi Baru (Auto Report No & Locked Reference) */}
            {showInspectModal && activeJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSaveInspection}>
                                <div className="modal-header border-bottom py-3 px-4 bg-light">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">
                                            Catat Hasil Inspeksi QC &bull; Joint #{activeJoint.seq || activeJoint.id}
                                        </h5>
                                        <small className="text-muted">Standar evaluasi pengelasan piping ASME B31.3</small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowInspectModal(false)}
                                    />
                                </div>
                                <div className="modal-body p-4">
                                    {error && <div className="alert alert-warning py-2 small mb-3">{error}</div>}

                                    {/* Master Traceability Context */}
                                    <div className="bg-light border rounded p-3 mb-3">
                                        <div className="row g-2 small">
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Isometric Drawing:</span>{' '}
                                                <span className="pcm-code fw-bold text-dark">{activeJoint.drawing_no || '—'}</span>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Line No:</span>{' '}
                                                <span className="pcm-code fw-bold text-dark">{activeJoint.line_no || '—'}</span>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Spool &amp; Seq:</span>{' '}
                                                <strong className="text-dark">{jointLabel(activeJoint)}</strong>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Welder / Loc:</span>{' '}
                                                <strong className="text-dark">{activeJoint.welder || '—'}</strong> ({activeJoint.shop_field || 'SHOP'})
                                            </div>
                                            <div className="col-12">
                                                <span className="text-muted">Spec &amp; Size:</span>{' '}
                                                <strong className="text-dark">{specLabel(activeJoint)}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Report No Preview (Read-Only) */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-muted mb-1">
                                            Nomor Laporan (Otomatis dari Master Drawing &amp; Joint)
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            className="form-control font-monospace bg-light"
                                            value={formData.report_no || 'Otomatis di-generate saat disimpan'}
                                        />
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            Format baku mengikuti master project, isometric, joint sequence, dan metode inspeksi.
                                        </small>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-semibold">Jenis Inspeksi</label>
                                            <PcmSelect
                                                value={formData.kind}
                                                onChange={(e) => {
                                                    const newKind = e.target.value;
                                                    const isoClean = (activeJoint.drawing_no || 'ISO').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                                    const seqPad = String(activeJoint.seq || 1).padStart(2, '0');
                                                    const kindCode = newKind === 'VISUAL' ? 'VT' : newKind;
                                                    const count = (inspections || []).filter(i => String(i.joint_id) === String(activeJoint.id) && i.kind === newKind).length + 1;
                                                    const countPad = String(count).padStart(2, '0');

                                                    setFormData({
                                                        ...formData,
                                                        kind: newKind,
                                                        report_no: `QC-2428-${isoClean}-J${seqPad}-${kindCode}-${countPad}`
                                                    });
                                                }}
                                            >
                                                <option value="VISUAL">VISUAL INSPECTION (VT)</option>
                                                <option value="RT">RADIOGRAPHY TEST (RT)</option>
                                                <option value="PT">PENETRANT TEST (PT)</option>
                                                <option value="UT">ULTRASONIC TEST (UT)</option>
                                                <option value="PMI">PMI ALLOY VERIFICATION</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-semibold">Hasil Keputusan</label>
                                            <PcmSelect
                                                value={formData.result}
                                                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                                            >
                                                <option value="PASS">PASS (Diterima / Lolos)</option>
                                                <option value="FAIL">FAIL (Perlu Perbaikan / Rework)</option>
                                            </PcmSelect>
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-semibold">Defect Type (Jika Ada Temuan)</label>
                                            <PcmSelect
                                                value={formData.defect_type}
                                                onChange={(e) => setFormData({ ...formData, defect_type: e.target.value })}
                                            >
                                                <option value="NONE">NONE (Bebas Cacat)</option>
                                                <option value="POROSITY">Porosity</option>
                                                <option value="UNDERCUT">Undercut</option>
                                                <option value="INCOMPLETE_PENETRATION">Incomplete Penetration</option>
                                                <option value="CRACK">Crack</option>
                                                <option value="SLAG">Slag Inclusion</option>
                                                <option value="LACK_OF_FUSION">Lack of Fusion</option>
                                                <option value="MISALIGNMENT">Excessive Misalignment</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-semibold">Nama Inspector</label>
                                            <input
                                                type="text"
                                                required
                                                className="form-control"
                                                value={formData.inspector}
                                                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Tanggal Inspeksi</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.insp_date}
                                            onChange={(e) => setFormData({ ...formData, insp_date: e.target.value })}
                                        />
                                    </div>

                                    {/* Siklus Perbaikan jika FAIL (Tanpa Merah) */}
                                    {formData.result === 'FAIL' && (
                                        <div className="border rounded p-3 mb-3 bg-light">
                                            <div className="small fw-bold text-dark mb-2">
                                                Tracking Siklus Perbaikan (Repair Cycle)
                                            </div>
                                            <div className="row g-2">
                                                <div className="col-4">
                                                    <label className="form-label small text-muted">Cycle</label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={formData.repair_cycle?.cycle || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            repair_cycle: { ...formData.repair_cycle, cycle: e.target.value }
                                                        })}
                                                    >
                                                        <option value="">Pilih</option>
                                                        <option value="R1">R1 (Repair ke-1)</option>
                                                        <option value="R2">R2 (Repair ke-2)</option>
                                                    </select>
                                                </div>
                                                <div className="col-4">
                                                    <label className="form-label small text-muted">Tanggal Rework</label>
                                                    <input
                                                        type="date"
                                                        className="form-control form-control-sm"
                                                        value={formData.repair_cycle?.date || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            repair_cycle: { ...formData.repair_cycle, date: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                                <div className="col-4">
                                                    <label className="form-label small text-muted">Status Rework</label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={formData.repair_cycle?.result || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            repair_cycle: { ...formData.repair_cycle, result: e.target.value }
                                                        })}
                                                    >
                                                        <option value="">Pilih</option>
                                                        <option value="OPEN">OPEN (Menunggu Welder)</option>
                                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                                        <option value="RE-INSPECT">RE-INSPECT</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Catatan / Rekomendasi QC</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={formData.remarks}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            placeholder="Deskripsi temuan visual / referensi film NDT..."
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-top py-2 px-4">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setShowInspectModal(false)}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary btn-sm fw-bold px-3"
                                    >
                                        {loading ? 'Menyimpan...' : 'Simpan Laporan QC'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Laporan Inspeksi (Fix Typo without altering Report No) */}
            {showEditReportModal && activeReport && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSaveEditReport}>
                                <div className="modal-header border-bottom py-3 px-4 bg-light">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">
                                            Koreksi Laporan QC &bull; {activeReport.report_no}
                                        </h5>
                                        <small className="text-muted">Koreksi catatan, nama inspector, atau tanggal inspeksi</small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowEditReportModal(false)}
                                    />
                                </div>
                                <div className="modal-body p-4">
                                    {error && <div className="alert alert-warning py-2 small mb-3">{error}</div>}

                                    {/* Locked Reference Notice */}
                                    <div className="bg-light border rounded p-3 mb-3">
                                        <div className="row g-2 small">
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Nomor Laporan (Terkunci):</span>{' '}
                                                <span className="pcm-code fw-bold text-primary">{activeReport.report_no}</span>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Metode / Jenis:</span>{' '}
                                                <span className="pcm-chip pcm-chip--neutral pcm-code">{activeReport.kind}</span>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Hasil Saat Ini:</span>{' '}
                                                <span className={`pcm-chip ${activeReport.result === 'PASS' ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                    {activeReport.result}
                                                </span>
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Joint Terkait:</span>{' '}
                                                <strong className="text-dark">ID #{activeReport.joint_id}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-semibold">Nama Inspector</label>
                                            <input
                                                type="text"
                                                required
                                                className="form-control"
                                                value={editFormData.inspector}
                                                onChange={(e) => setEditFormData({ ...editFormData, inspector: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-sm-6">
                                            <label className="form-label small fw-semibold">Tanggal Inspeksi</label>
                                            <input
                                                type="date"
                                                required
                                                className="form-control"
                                                value={editFormData.insp_date}
                                                onChange={(e) => setEditFormData({ ...editFormData, insp_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Defect Type</label>
                                        <PcmSelect
                                            value={editFormData.defect_type}
                                            onChange={(e) => setEditFormData({ ...editFormData, defect_type: e.target.value })}
                                        >
                                            <option value="NONE">NONE (Bebas Cacat)</option>
                                            <option value="POROSITY">Porosity</option>
                                            <option value="UNDERCUT">Undercut</option>
                                            <option value="INCOMPLETE_PENETRATION">Incomplete Penetration</option>
                                            <option value="CRACK">Crack</option>
                                            <option value="SLAG">Slag Inclusion</option>
                                            <option value="LACK_OF_FUSION">Lack of Fusion</option>
                                            <option value="MISALIGNMENT">Excessive Misalignment</option>
                                        </PcmSelect>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Catatan Temuan / Rekomendasi</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={editFormData.remarks}
                                            onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-top py-2 px-4">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setShowEditReportModal(false)}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary btn-sm fw-bold px-3"
                                    >
                                        {loading ? 'Menyimpan...' : 'Perbarui Laporan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Joint & Riwayat Inspeksi */}
            {showDetailJointModal && activeJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom py-3 px-4 bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        Detail Sambungan &bull; Joint #{activeJoint.seq || activeJoint.id}
                                    </h5>
                                    <small className="text-muted">{jointLabel(activeJoint)} &bull; {activeJoint.drawing_no || 'Isometric unassigned'}</small>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowDetailJointModal(false)}
                                />
                            </div>
                            <div className="modal-body p-4">
                                {/* Spesifikasi Teknis */}
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Isometric Drawing</div>
                                            <div className="pcm-code fw-bold text-dark">{activeJoint.drawing_no || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Line Number</div>
                                            <div className="pcm-code fw-bold text-dark">{activeJoint.line_no || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Spool Number</div>
                                            <div className="fw-bold text-dark">{activeJoint.spool_no || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Size &amp; Material Spec</div>
                                            <div className="fw-bold text-dark">{specLabel(activeJoint)}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Welder ID / Lokasi</div>
                                            <div className="fw-bold text-dark">
                                                {activeJoint.welder || '—'} ({activeJoint.shop_field || 'SHOP'})
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Status Saat Ini</div>
                                            <span className={`pcm-chip ${statusChip(activeJoint.status)} mt-0.5`}>
                                                {activeJoint.status || 'PLANNED'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Checklist Konstruksi / Fitup */}
                                <h6 className="fw-bold text-dark mb-2">Parameter Fit-Up &amp; Welding</h6>
                                <div className="bg-light border rounded p-3 mb-4">
                                    <div className="row g-2 small">
                                        <div className="col-6 col-md-3">
                                            <span className="text-muted">Alignment:</span>{' '}
                                            <strong>{activeJoint.fitup_alignment || 'OK'}</strong>
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <span className="text-muted">Root Gap:</span>{' '}
                                            <strong>{activeJoint.fitup_root_gap || '3.2 mm'}</strong>
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <span className="text-muted">Bevel:</span>{' '}
                                            <strong>{activeJoint.fitup_bevel || '37.5°'}</strong>
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <span className="text-muted">WPS Ref:</span>{' '}
                                            <strong>{activeJoint.wps || 'WPS-01'}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Riwayat Laporan Inspeksi pada Joint Ini */}
                                <h6 className="fw-bold text-dark mb-2">Riwayat Inspeksi QC Terkait</h6>
                                <div className="border rounded">
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle pcm-table mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-3">Report No</th>
                                                    <th>Metode</th>
                                                    <th>Hasil</th>
                                                    <th>Inspector</th>
                                                    <th>Tanggal</th>
                                                    <th>Catatan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(inspections || []).filter(i => String(i.joint_id) === String(activeJoint.id)).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-3 text-muted small">
                                                            Belum ada laporan inspeksi untuk joint ini.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (inspections || []).filter(i => String(i.joint_id) === String(activeJoint.id)).map(rep => (
                                                        <tr key={rep.id}>
                                                            <td className="ps-3 font-monospace fw-bold text-primary small">{rep.report_no}</td>
                                                            <td><span className="pcm-chip pcm-chip--neutral pcm-code">{rep.kind}</span></td>
                                                            <td>
                                                                <span className={`pcm-chip ${rep.result === 'PASS' ? 'pcm-chip--success' : 'pcm-chip--warning'}`}>
                                                                    {rep.result}
                                                                </span>
                                                            </td>
                                                            <td className="small">{rep.inspector}</td>
                                                            <td className="small text-muted">{rep.insp_date}</td>
                                                            <td className="small text-muted">{rep.remarks || '—'}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-top py-2 px-4">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setShowDetailJointModal(false)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Laporan (Official Inspection Sheet View) */}
            {showDetailReportModal && activeReport && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom py-3 px-4 bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        Lembar Laporan Hasil Inspeksi QC &bull; {activeReport.report_no}
                                    </h5>
                                    <small className="text-muted">Format resmi inspeksi piping sesuai standar ASME B31.3</small>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowDetailReportModal(false)}
                                />
                            </div>
                            <div className="modal-body p-4">
                                <div className="border rounded p-3 mb-3 bg-light">
                                    <div className="row g-3">
                                        <div className="col-12 col-sm-6">
                                            <div className="text-muted small">Nomor Laporan</div>
                                            <div className="pcm-code fw-bolder text-primary h5 mb-0">{activeReport.report_no}</div>
                                        </div>
                                        <div className="col-12 col-sm-6 text-sm-end">
                                            <div className="text-muted small">Status Evaluasi</div>
                                            <span className={`pcm-chip ${activeReport.result === 'PASS' ? 'pcm-chip--success' : 'pcm-chip--warning'} mt-1`}>
                                                {activeReport.result} &bull; {activeReport.result === 'PASS' ? 'Lolos' : 'Rework'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Metode Uji</div>
                                            <div className="fw-bold text-dark">{activeReport.kind}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Inspector</div>
                                            <div className="fw-bold text-dark">{activeReport.inspector || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Tanggal Uji</div>
                                            <div className="fw-bold text-dark">{activeReport.insp_date || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-6">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Defect Type</div>
                                            <div className="fw-bold text-dark">{activeReport.defect_type || 'NONE'}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-6">
                                        <div className="p-2.5 bg-light rounded">
                                            <div className="text-muted small">Standar Acuan</div>
                                            <div className="fw-bold text-dark">ASME B31.3 Table 341.3.2</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold text-muted mb-1">Catatan / Keterangan Temuan</label>
                                    <div className="p-3 bg-light rounded border small text-dark">
                                        {activeReport.remarks || 'Tidak ada catatan tambahan.'}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-top py-2 px-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => setShowDetailReportModal(false)}
                                >
                                    Tutup
                                </button>
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm fw-bold px-3"
                                        onClick={() => {
                                            setShowDetailReportModal(false);
                                            handleOpenEditReport(activeReport);
                                        }}
                                    >
                                        <IconEdit className="me-1" />
                                        <span>Edit Catatan / Typo</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
