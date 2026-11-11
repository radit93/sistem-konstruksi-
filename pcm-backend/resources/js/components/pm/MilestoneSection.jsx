import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { PcmSelect } from '../SearchSelect';

export function MilestoneSection({
    project,
    drawings = [],
    joints = [],
    materialInspections = [],
    inspections = [],
    testPackages = [],
    user,
    onToast,
}) {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        code: '',
        name: '',
        phase: 'Project Execution',
        target_date: '',
        actual_date: '',
        weight_pct: 10,
        status: 'PENDING',
        is_hold_point: false,
        pic_lead: 'Project Manager',
        remarks: ''
    });

    const canEdit = can(user, 'scope.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const url = project?.id ? `/project-milestones?project_id=${project.id}` : '/project-milestones';
            const data = await api.get(url);
            const raw = Array.isArray(data) ? data : [];
            const filtered = project?.id
                ? raw.filter(m => Number(m.project_id) === Number(project.id) || (!m.project_id && Number(project.id) === 1))
                : raw;
            setMilestones(filtered);
        } catch (err) {
            console.error('Failed to load project milestones:', err);
        } finally {
            setLoading(false);
        }
    }, [project?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const total = milestones.length;
        const completed = milestones.filter(m => m.status === 'COMPLETED').length;
        const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length;
        const holdPoints = milestones.filter(m => m.is_hold_point).length;
        const completedWeight = milestones
            .filter(m => m.status === 'COMPLETED')
            .reduce((acc, m) => acc + (parseFloat(m.weight_pct) || 0), 0);
        return { total, completed, inProgress, holdPoints, completedWeight };
    }, [milestones]);

    const liveGates = useMemo(() => {
        const dwgTotal = drawings.length;
        const dwgIfc = drawings.filter(d => ['IFC', 'ACTIVE'].includes((d.status || '').toUpperCase())).length;
        const ifcPct = dwgTotal > 0 ? Math.round((dwgIfc / dwgTotal) * 100) : 0;

        const matTotal = materialInspections.length;
        const matPass = materialInspections.filter(m => ['PASS', 'ACCEPTED'].includes((m.result || m.status || '').toUpperCase())).length;
        const matPct = matTotal > 0 ? Math.round((matPass / matTotal) * 100) : 0;

        const jTotal = joints.length;
        const jWelded = joints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes((j.status || '').toUpperCase())).length;
        const weldPct = jTotal > 0 ? Math.round((jWelded / jTotal) * 100) : 0;

        const tpTotal = testPackages.length;
        const tpPass = testPackages.filter(t => ['PASSED', 'TESTED', 'COMPLETED', 'REINSTATED'].includes((t.status || '').toUpperCase())).length;
        const tpPct = tpTotal > 0 ? Math.round((tpPass / tpTotal) * 100) : 0;

        const visualPass = joints.filter(j => (j.visual || '').toUpperCase() === 'PASS').length;
        const inspPass = inspections.length > 0
            ? inspections.filter(i => (i.result || '').toUpperCase() === 'PASS').length
            : visualPass;
        const inspTotal = inspections.length > 0 ? inspections.length : jTotal;

        return [
            { code: 'HP-1', title: 'Engineering IFC Drawing', pct: ifcPct, detail: `${dwgIfc}/${dwgTotal} drawings` },
            { code: 'HP-2', title: 'Material & MTC QC Pass', pct: matPct, detail: `${matPass}/${matTotal} lot` },
            { code: 'HP-3', title: 'Welding & Visual/NDT', pct: weldPct, detail: `${jWelded}/${jTotal} joints (QC Pass: ${inspPass}/${inspTotal})` },
            { code: 'HP-4', title: 'Hydrotest & Test Package', pct: tpPct, detail: `${tpPass}/${tpTotal} packages` },
        ];
    }, [drawings, materialInspections, joints, inspections, testPackages]);

    const filteredMilestones = useMemo(() => {
        const q = search.toLowerCase();
        return milestones.filter(m => {
            return !q ||
                (m.code || '').toLowerCase().includes(q) ||
                (m.name || '').toLowerCase().includes(q) ||
                (m.phase || '').toLowerCase().includes(q) ||
                (m.pic_lead || '').toLowerCase().includes(q);
        });
    }, [milestones, search]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                code: item.code || '',
                name: item.name || '',
                phase: item.phase || 'Project Execution',
                target_date: item.target_date || '',
                actual_date: item.actual_date || '',
                weight_pct: item.weight_pct || 10,
                status: item.status || 'PENDING',
                is_hold_point: Boolean(item.is_hold_point),
                pic_lead: item.pic_lead || 'Project Manager',
                remarks: item.remarks || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                code: `M-${String(milestones.length + 1).padStart(2, '0')}`,
                name: '',
                phase: 'Project Execution',
                target_date: new Date().toISOString().split('T')[0],
                actual_date: '',
                weight_pct: 10,
                status: 'PENDING',
                is_hold_point: false,
                pic_lead: 'Project Manager',
                remarks: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.code.trim() || !form.name.trim()) {
            setFormError('Kode dan Nama Milestone wajib diisi.');
            return;
        }

        setFormLoading(true);
        try {
            const payload = { ...form, project_id: project?.id };
            if (editingItem) {
                await api.put(`/project-milestones/${editingItem.id}`, payload);
                if (onToast) onToast('Milestone proyek berhasil diperbarui.');
            } else {
                await api.post('/project-milestones', payload);
                if (onToast) onToast('Milestone baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan milestone.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleMarkComplete = async (item) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            await api.put(`/project-milestones/${item.id}`, {
                ...item,
                status: 'COMPLETED',
                actual_date: item.actual_date || today
            });
            if (onToast) onToast(`Milestone ${item.code} disahkan selesai.`);
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal mengubah status milestone.');
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Project Milestone &amp; Phase Gates</h2>
                    <p className="text-muted small mb-0">
                        Pengendalian gerbang proyek (Hold Points) mengacu pada flowchart konstruksi: Engineering IFC, verifikasi MTC, NDT clearance, dan hydrotest.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Milestone
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Total Milestone</span>
                        <strong className="h3 fw-bold text-primary mb-0">{stats.total}</strong>
                        <span className="text-muted ms-1 small">tahapan</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Tahap Selesai (Gates)</span>
                        <strong className="h3 fw-bold text-success mb-0">{stats.completed}</strong>
                        <span className="text-muted ms-1 small">terverifikasi ({stats.completedWeight}%)</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Sedang Berjalan</span>
                        <strong className="h3 fw-bold text-warning text-dark mb-0">{stats.inProgress}</strong>
                        <span className="text-muted ms-1 small">tahapan aktif</span>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <span className="text-muted small text-uppercase fw-bold d-block">Hold Points Kritis</span>
                        <strong className="h3 fw-bold text-danger mb-0">{stats.holdPoints}</strong>
                        <span className="text-muted ms-1 small">gerbang inspeksi</span>
                    </div>
                </div>
            </div>

            {/* Auto Hold-Point Readiness Tracker (Lintas Departemen) */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '8px' }}>
                <div className="card-header bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                    <span className="small fw-bold text-uppercase text-primary">
                        Kesiapan Gerbang Proyek Otomatis (Live Data Lintas Departemen)
                    </span>
                    <span className="badge bg-light text-muted border">Auto-Synced</span>
                </div>
                <div className="card-body py-3">
                    <div className="row g-3">
                        {liveGates.map(g => (
                            <div key={g.code} className="col-12 col-sm-6 col-md-3">
                                <div className="p-2.5 rounded border bg-light h-100">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="badge bg-primary">{g.code}</span>
                                        <strong className="small text-dark">{g.pct}%</strong>
                                    </div>
                                    <div className="fw-bold small text-dark mb-1">{g.title}</div>
                                    <div className="progress mb-1" style={{ height: '6px', backgroundColor: '#e2e8f0' }}>
                                        <div
                                            className={`progress-bar ${g.pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                            style={{ width: `${g.pct}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{g.detail}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Toolbar */}
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Cari Milestone, Tahapan, PIC Lead..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ borderRadius: '6px', padding: '0.65rem 0.85rem' }}
                />
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3">Kode</th>
                                <th className="py-3">Nama Milestone &amp; Phase Gate</th>
                                <th className="py-3">Fase Proyek</th>
                                <th className="py-3 text-center">Bobot</th>
                                <th className="py-3">Target Date</th>
                                <th className="py-3">Actual Date</th>
                                <th className="py-3 text-center">Hold Point</th>
                                <th className="py-3">PIC Lead</th>
                                <th className="py-3 text-center">Status</th>
                                {canEdit && <th className="text-end pe-3 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Memuat data milestone proyek...
                                    </td>
                                </tr>
                            ) : filteredMilestones.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-4 text-muted">
                                        Tidak ada data milestone yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredMilestones.map((m) => {
                                    const isDone = m.status === 'COMPLETED';
                                    return (
                                        <tr key={m.id}>
                                            <td className="ps-3 fw-bold font-monospace text-dark">{m.code}</td>
                                            <td className="fw-semibold text-dark">{m.name}</td>
                                            <td><span className="badge bg-light text-dark border">{m.phase}</span></td>
                                            <td className="text-center font-monospace fw-bold">{m.weight_pct}%</td>
                                            <td className="font-monospace small text-muted">{m.target_date || '—'}</td>
                                            <td className="font-monospace small fw-bold">
                                                {m.actual_date ? (
                                                    <span className="text-success">{m.actual_date}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="text-center">
                                                {m.is_hold_point ? (
                                                    <span className="badge bg-danger">HOLD POINT</span>
                                                ) : (
                                                    <span className="text-muted small">Standard</span>
                                                )}
                                            </td>
                                            <td className="small">{m.pic_lead}</td>
                                            <td className="text-center">
                                                <span className={`badge ${isDone ? 'bg-success' : m.status === 'IN_PROGRESS' ? 'bg-primary' : 'bg-secondary'}`}>
                                                    {m.status}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="text-end pe-3">
                                                    {!isDone && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success btn-sm me-1 px-2 py-1"
                                                            onClick={() => handleMarkComplete(m)}
                                                            title="Sahkan Milestone Selesai"
                                                        >
                                                            Sahkan
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                                                        onClick={() => handleOpenModal(m)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Add / Edit */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Milestone Proyek' : 'Tambah Milestone Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold">Kode Milestone *</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                value={form.code}
                                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-9">
                                            <label className="form-label small fw-bold">Nama Milestone &amp; Gate *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Fase Konstruksi</label>
                                            <PcmSelect
                                                
                                                value={form.phase}
                                                onChange={(e) => setForm({ ...form, phase: e.target.value })}
                                            >
                                                <option value="Initiation">Initiation &amp; Kick-off</option>
                                                <option value="Engineering">Engineering &amp; IFC Release</option>
                                                <option value="Procurement">Procurement &amp; Material MTC</option>
                                                <option value="Fabrication">Workshop Spool Fabrication</option>
                                                <option value="Erection">Field Erection &amp; NDT</option>
                                                <option value="Testing">Hydrotest &amp; Reinstatement</option>
                                                <option value="Closing">Closing &amp; Handover</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Bobot (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control font-monospace"
                                                value={form.weight_pct}
                                                onChange={(e) => setForm({ ...form, weight_pct: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Target Tanggal</label>
                                            <input
                                                type="date"
                                                className="form-control font-monospace"
                                                value={form.target_date}
                                                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Tanggal Aktual</label>
                                            <input
                                                type="date"
                                                className="form-control font-monospace"
                                                value={form.actual_date}
                                                onChange={(e) => setForm({ ...form, actual_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">PIC Penanggung Jawab</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.pic_lead}
                                                onChange={(e) => setForm({ ...form, pic_lead: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Status Gate</label>
                                            <PcmSelect
                                                
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option value="PENDING">PENDING</option>
                                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                <option value="COMPLETED">COMPLETED</option>
                                                <option value="DELAYED">DELAYED</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6 col-md-3 d-flex align-items-center pt-3">
                                            <div className="form-check">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="isHoldPointCheck"
                                                    checked={form.is_hold_point}
                                                    onChange={(e) => setForm({ ...form, is_hold_point: e.target.checked })}
                                                />
                                                <label className="form-check-label small fw-bold text-danger" htmlFor="isHoldPointCheck">
                                                    Hold Point Kritis
                                                </label>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-bold">Catatan Verifikasi</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                value={form.remarks}
                                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Milestone'}
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
