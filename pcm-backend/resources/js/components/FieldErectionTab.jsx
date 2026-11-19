import React, { useMemo, useState } from 'react';
import { api } from '../api';
import { can } from '../auth';
import { jointLabel } from './FabricationTab';
import { PcmSelect } from './SearchSelect';
import { ProjectGuard } from './ProjectGuard';
import {
    ConstructionChecklistSection,
    ConstructionKpiCards,
    downloadConstructionCsv,
    emptyConstructionFields,
    formatJointSpec,
    formatNps,
    pickConstructionFields
} from './ConstructionChecklist';

const isField = j => (j.shop_field || '').toLowerCase() === 'field';
const specLabel = formatJointSpec;
const isBolted = j => String(j.joint_type || '').toUpperCase() === 'BOLTED';

/** Jenis pekerjaan erection. Nilainya dipakai backend (erection_type). */
export const ERECTION_TYPES = [
    { value: 'SHOP_WELD', label: 'Shop Weld', field: 'Shop' },
    { value: 'FILL_WELD', label: 'Fill Weld', field: 'Field' },
    { value: 'ASSEMBLY', label: 'Assembly', field: 'Field' },
    { value: 'BOLTED', label: 'Bolted Connection', field: 'Field' }
];

const erectionTypeLabel = (value) => ERECTION_TYPES.find(t => t.value === value)?.label || value || '-';

const NPS_OPTIONS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24];

const emptyNewJoint = () => ({
    drawing_no: '',
    line_no: '',
    spool_no: '',
    seq: '',
    size_in: '',
    item_a: '',
    spec_a: '',
    item_b: '',
    spec_b: '',
    erection_type: 'ASSEMBLY',
    joint_type: 'BW'
});

export function FieldErectionTab({
    projects = [],
    joints,
    drawings = [],
    user,
    onReload,
    activeProjectId,
    onSetActiveProject,
    allowedWorkTypes = null
}) {
    /**
     * Menu Construction Fill hanya mengerjakan fill weld, sedangkan Field
     * Erection mengerjakan assembly dan bolted connection. Daftar ini yang
     * memisahkan kedua menu sekaligus membatasi pilihan saat membuat joint.
     */
    const workTypeOptions = useMemo(
        () => ERECTION_TYPES.filter(t => t.field === 'Field' && (!allowedWorkTypes || allowedWorkTypes.includes(t.value))),
        [allowedWorkTypes]
    );
    const pageLabel = allowedWorkTypes && allowedWorkTypes.length === 1 && allowedWorkTypes[0] === 'FILL_WELD'
        ? 'Construction Fill'
        : 'Field Erection';

    const [selectedJoint, setSelectedJoint] = useState(null);
    const [editData, setEditData] = useState({
        status: 'WELDED',
        welder: '',
        fit_date: new Date().toISOString().split('T')[0],
        weld_date: new Date().toISOString().split('T')[0],
    });
    const [newJoint, setNewJoint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createError, setCreateError] = useState('');

    const canEdit = can(user, 'joint.write');
    const canQcEdit = can(user, 'inspection.write');
    const canTestEdit = can(user, 'testpackage.write');
    const editableStatus = (status) => {
        if (['VISUAL_OK', 'NDT_OK'].includes(status)) return canQcEdit;
        if (status === 'TESTED') return canTestEdit;
        return canEdit;
    };

    const activeProject = useMemo(
        () => projects.find(project => String(project.id) === String(activeProjectId)) || null,
        [projects, activeProjectId]
    );

    const projectDrawings = useMemo(
        () => (drawings || []).filter(d => String(d.project_id || '') === String(activeProjectId)),
        [drawings, activeProjectId]
    );

    const projectJoints = useMemo(() => {
        if (!activeProjectId) return [];
        return (joints || []).filter(joint => String(joint.project_id || '') === String(activeProjectId));
    }, [joints, activeProjectId]);

    const fieldJoints = useMemo(() => {
        const items = projectJoints.filter(isField);
        if (!allowedWorkTypes) return items;
        return items.filter(joint => allowedWorkTypes.includes(String(joint.erection_type || '')));
    }, [projectJoints, allowedWorkTypes]);

    const openEdit = (j) => {
        setError('');
        setSelectedJoint(j);
        setEditData({
            status: j.status || 'WELDED',
            welder: j.welder || '',
            fit_date: j.fit_date || new Date().toISOString().split('T')[0],
            weld_date: j.weld_date || new Date().toISOString().split('T')[0],
            ...emptyConstructionFields,
            ...pickConstructionFields(j)
        });
    };

    const openCreate = () => {
        setCreateError('');
        setNewJoint({
            ...emptyNewJoint(),
            erection_type: workTypeOptions[0]?.value || 'ASSEMBLY'
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

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newJoint) return;
        if (!newJoint.drawing_no) {
            setCreateError('Drawing isometrik wajib dipilih.');
            return;
        }
        setCreateError('');
        setLoading(true);
        try {
            const payload = {
                ...newJoint,
                status: 'PLANNED',
                project_id: activeProjectId,
                seq: newJoint.seq === '' ? null : Number(newJoint.seq),
                size_in: newJoint.size_in === '' ? null : Number(newJoint.size_in),
                joint_type: newJoint.erection_type === 'BOLTED' ? 'BOLTED' : newJoint.joint_type
            };
            await api.post('/joints', payload);
            setNewJoint(null);
            if (onReload) onReload();
        } catch (err) {
            setCreateError(err.message || 'Gagal menambah joint erection');
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (st) => {
        const map = {
            'PLANNED': 'bg-light text-dark border',
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

    if (!activeProjectId) {
        return (
            <ProjectGuard
                sectionLabel={pageLabel}
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={onSetActiveProject}
            />
        );
    }

    const selectedBolted = selectedJoint ? isBolted(selectedJoint) : false;
    const pageDescription = allowedWorkTypes && allowedWorkTypes.length === 1 && allowedWorkTypes[0] === 'FILL_WELD'
        ? 'Sambungan fill weld lapangan per project'
        : 'Assembly dan bolted connection lapangan per project';

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">
                        {pageLabel === 'Construction Fill' ? 'Construction Fill Weld' : 'Field Erection & Tie-In Control'}
                    </h3>
                    <p className="text-muted mb-0">{pageDescription}</p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={() => downloadConstructionCsv(
                            fieldJoints,
                            pageLabel === 'Construction Fill' ? 'construction-fill.csv' : 'field-erection.csv',
                            pageLabel === 'Construction Fill' ? 'Data Construction Fill' : 'Data Field Erection'
                        )}
                    >
                        <i className="cs-document me-1"></i>Export CSV
                    </button>
                    {canEdit && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
                            <i className="cs-plus me-1"></i>Tambah Joint
                        </button>
                    )}
                    <select
                        className="form-select form-select-sm"
                        style={{ width: '240px' }}
                        value={activeProjectId}
                        onChange={(e) => onSetActiveProject(e.target.value)}
                        aria-label="Pilih project Field Erection"
                    >
                        <option value="">-- Pilih Project --</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name || project.job_no || `Project #${project.id}`}
                            </option>
                        ))}
                    </select>
                    {!canEdit && (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: Fabrication / Manager)
                        </span>
                    )}
                </div>
            </div>

            <ConstructionKpiCards items={fieldJoints} readyLabel="Kesiapan hydrotest" />

            {/* Table */}
            <div className="card shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>Seq</th>
                                <th>Spool No</th>
                                <th>Line No</th>
                                <th>Jenis Pekerjaan</th>
                                <th>Jenis Sambungan</th>
                                <th>Komponen Sambungan</th>
                                <th>Spec & Size</th>
                                <th>Welder Lapangan</th>
                                <th>Status QC</th>
                                <th>Repair</th>
                                <th className="text-end">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fieldJoints.map(j => (
                                <tr key={j.id}>
                                    <td className="text-muted fw-bold">{j.seq}</td>
                                    <td className="fw-bold text-dark">{jointLabel(j)}</td>
                                    <td className="text-muted">{j.line_no || '-'}</td>
                                    <td>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                            {erectionTypeLabel(j.erection_type)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge border ${isBolted(j) ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
                                            {j.joint_type || 'BW'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="fw-semibold text-dark">{j.item_a} &rarr; {j.item_b}</div>
                                        <small className="text-muted">Tie-In ke sistem eksisting</small>
                                    </td>
                                    <td>{specLabel(j) || '-'}</td>
                                    <td>
                                        {isBolted(j) ? (
                                            <span className="text-muted small">Tanpa las</span>
                                        ) : (
                                            <span className="badge bg-light text-dark border fw-bold">{j.welder || '-'}</span>
                                        )}
                                    </td>
                                    <td>{statusBadge(j.status)}</td>
                                    <td>
                                        {j.repair_no ? (
                                            <span className={`badge ${j.repair_status === 'CLOSED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {j.repair_no} · {j.repair_status || 'OPEN'}
                                            </span>
                                        ) : <span className="text-muted">-</span>}
                                    </td>
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
                            {fieldJoints.length === 0 && (
                                <tr>
                                    <td colSpan="11" className="text-center text-muted py-4">
                                        Belum ada joint lapangan. Gunakan <strong>Tambah Joint</strong> untuk membuat{' '}
                                        {workTypeOptions.map(t => t.label.toLowerCase()).join(' atau ')}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah Joint */}
            {newJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleCreate}>
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">Tambah Joint {erectionTypeLabel(newJoint.erection_type)}</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setNewJoint(null)}></button>
                                </div>
                                <div className="modal-body">
                                    {createError && <div className="alert alert-danger py-2 small">{createError}</div>}
                                    <div className="row g-2">
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold">Drawing Isometrik *</label>
                                            <PcmSelect
                                                value={newJoint.drawing_no}
                                                onChange={e => setNewJoint({ ...newJoint, drawing_no: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Pilih Drawing --</option>
                                                {projectDrawings.map(d => (
                                                    <option key={d.id} value={d.drawing_no}>
                                                        {d.drawing_no} · {d.line_no || '-'}
                                                    </option>
                                                ))}
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Jenis Pekerjaan *</label>
                                            <PcmSelect
                                                value={newJoint.erection_type}
                                                onChange={e => setNewJoint({ ...newJoint, erection_type: e.target.value })}
                                            >
                                                {workTypeOptions.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Jenis Sambungan *</label>
                                            <PcmSelect
                                                value={newJoint.erection_type === 'BOLTED' ? 'BOLTED' : newJoint.joint_type}
                                                onChange={e => setNewJoint({ ...newJoint, joint_type: e.target.value })}
                                                disabled={newJoint.erection_type === 'BOLTED'}
                                            >
                                                <option value="BW">Butt Weld (BW)</option>
                                                <option value="SW">Socket Weld (SW)</option>
                                                <option value="FW">Fillet Weld (FW)</option>
                                                <option value="THD">Threaded (THD)</option>
                                                <option value="BOLTED">Bolted Connection</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Line No</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newJoint.line_no}
                                                onChange={e => setNewJoint({ ...newJoint, line_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Spool No</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="SP-01"
                                                value={newJoint.spool_no}
                                                onChange={e => setNewJoint({ ...newJoint, spool_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Seq Joint</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="form-control"
                                                value={newJoint.seq}
                                                onChange={e => setNewJoint({ ...newJoint, seq: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Size (NPS)</label>
                                            <PcmSelect
                                                value={newJoint.size_in}
                                                onChange={e => setNewJoint({ ...newJoint, size_in: e.target.value })}
                                            >
                                                <option value="">-- Pilih Size --</option>
                                                {NPS_OPTIONS.map(nps => (
                                                    <option key={nps} value={nps}>{formatNps(nps)}</option>
                                                ))}
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Item A</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Pipe"
                                                value={newJoint.item_a}
                                                onChange={e => setNewJoint({ ...newJoint, item_a: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Spec A</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="A106-B"
                                                value={newJoint.spec_a}
                                                onChange={e => setNewJoint({ ...newJoint, spec_a: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Item B</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Elbow"
                                                value={newJoint.item_b}
                                                onChange={e => setNewJoint({ ...newJoint, item_b: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Spec B</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="A234-WPB"
                                                value={newJoint.spec_b}
                                                onChange={e => setNewJoint({ ...newJoint, spec_b: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <small className="text-muted">
                                                Joint baru masuk sebagai PLANNED. Status shop/field ditentukan otomatis
                                                dari jenis pekerjaan yang dipilih.
                                            </small>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewJoint(null)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Joint'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Update */}
            {selectedJoint && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleUpdate}>
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">
                                        Update {erectionTypeLabel(selectedJoint.erection_type)} · Seq {selectedJoint.seq}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedJoint(null)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Status Field Erection</label>
                                        <PcmSelect
                                            value={editData.status}
                                            onChange={e => setEditData({ ...editData, status: e.target.value })}
                                            disabled={!editableStatus(selectedJoint.status)}
                                        >
                                            <option value="PLANNED" disabled={selectedJoint.status !== 'PLANNED'}>PLANNED (Terdaftar)</option>
                                            <option value="RECEIVED" disabled={!canEdit}>RECEIVED (Material Lapangan Diterima)</option>
                                            <option value="ISSUED" disabled={!canEdit}>ISSUED (Spool Siap Dipasang)</option>
                                            <option value="FITUP_OK" disabled={!canEdit}>FITUP_OK (Tack Weld / Assembly OK)</option>
                                            {!selectedBolted && <option value="WELDED" disabled={!canEdit}>WELDED (Selesai Las Erection)</option>}
                                            <option value="REPAIR" disabled={!canEdit}>REPAIR (Perbaikan Defect)</option>
                                            {(canQcEdit || editData.status === 'VISUAL_OK') && (
                                                <option value="VISUAL_OK" disabled={!canQcEdit}>VISUAL_OK (Visual QC Lapangan Lolos)</option>
                                            )}
                                            {(canQcEdit || editData.status === 'NDT_OK') && (
                                                <option value="NDT_OK" disabled={!canQcEdit}>NDT_OK (NDT Tie-in Lolos)</option>
                                            )}
                                            {(canTestEdit || editData.status === 'TESTED') && (
                                                <option value="TESTED" disabled={!canTestEdit}>TESTED (Hydrotested)</option>
                                            )}
                                        </PcmSelect>
                                        {selectedBolted && (
                                            <small className="text-muted">Sambungan bolted tidak melewati tahap pengelasan.</small>
                                        )}
                                    </div>
                                    {!selectedBolted && (
                                        <>
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
                                        </>
                                    )}

                                    <ConstructionChecklistSection
                                        editData={editData}
                                        setEditData={setEditData}
                                        showWelding={!selectedBolted}
                                    />
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
