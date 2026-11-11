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
    const [filterStatus, setFilterStatus] = useState('ALL');
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
            const matchStatus = filterStatus === 'ALL' ||
                (filterStatus === 'HOLD_POINT' ? m.is_hold_point : m.status === filterStatus);
            const matchSearch = !q ||
                (m.code || '').toLowerCase().includes(q) ||
                (m.name || '').toLowerCase().includes(q) ||
                (m.phase || '').toLowerCase().includes(q) ||
                (m.pic_lead || '').toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [milestones, search, filterStatus]);

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

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!window.confirm(`Hapus milestone "${editingItem.code} - ${editingItem.name}"?`)) return;
        setFormLoading(true);
        try {
            await api.delete(`/project-milestones/${editingItem.id}`);
            if (onToast) onToast('Milestone berhasil dihapus.');
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menghapus milestone.');
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
                        style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                        onClick={() => handleOpenModal()}
                    >
                        + Tambah Milestone
                    </button>
                )}
            </div>

            {/* Metric Summary Tiles (PCM Design Tokens) */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Total Milestone</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">
                            {stats.total}
                            <span className="pcm-tile__unit">tahapan</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Tahap Selesai (Gates)</span>
                        <strong className="pcm-tile__value text-success">
                            {stats.completed}
                            <span className="pcm-tile__unit">selesai ({stats.completedWeight}%)</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Sedang Berjalan</span>
                        <strong className="pcm-tile__value" style={{ color: '#b45309' }}>
                            {stats.inProgress}
                            <span className="pcm-tile__unit">tahap aktif</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Hold Points Kritis</span>
                        <strong className="pcm-tile__value text-danger">
                            {stats.holdPoints}
                            <span className="pcm-tile__unit">gerbang kontrol</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* Auto Hold-Point Readiness Tracker (Lintas Departemen) */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', borderLeft: '4px solid #1e40af' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <span className="small fw-bold text-uppercase text-primary">
                        Kesiapan Gerbang Proyek Otomatis (Live Data Lintas Departemen)
                    </span>
                    <span className="badge px-2.5 py-1 fw-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                        Auto-Synced
                    </span>
                </div>
                <div className="card-body py-3 px-4">
                    <div className="row g-3">
                        {liveGates.map(g => (
                            <div key={g.code} className="col-12 col-sm-6 col-md-3">
                                <div className="p-3 rounded border bg-light h-100">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="badge px-2 py-1 fw-bold" style={{ backgroundColor: '#1e40af', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                                            {g.code}
                                        </span>
                                        <strong className="small text-dark font-monospace">{g.pct}%</strong>
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

            {/* Search & Filter Toolbar */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Cari Milestone, Tahapan, PIC Lead..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: 'var(--pcm-radius-control)', padding: '0.5rem 0.75rem' }}
                    />
                </div>
                <PcmSelect
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: 'auto', borderRadius: 'var(--pcm-radius-control)' }}
                >
                    <option value="ALL">Semua Status</option>
                    <option value="HOLD_POINT">Khusus Hold Point Kritis</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="PENDING">PENDING</option>
                </PcmSelect>
            </div>

            {/* Table (Clean Compact Layout, No Horizontal Scroll Overflow) */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '130px' }}>Kode &amp; Gerbang</th>
                                <th className="py-3">Nama Milestone &amp; Phase Gate</th>
                                <th className="py-3">Fase Proyek</th>
                                <th className="py-3 text-center" style={{ width: '80px' }}>Bobot</th>
                                <th className="py-3" style={{ width: '190px' }}>Jadwal (Target / Aktual)</th>
                                <th className="py-3" style={{ width: '170px' }}>PIC Lead</th>
                                <th className="py-3 text-center" style={{ width: '110px' }}>Status</th>
                                {canEdit && <th className="text-end pe-3 py-3" style={{ width: '140px' }}>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 8 : 7} className="text-center py-4 text-muted">
                                        Memuat data milestone proyek...
                                    </td>
                                </tr>
                            ) : filteredMilestones.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 8 : 7} className="text-center py-4 text-muted">
                                        Tidak ada data milestone yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                filteredMilestones.map((m) => {
                                    const isDone = m.status === 'COMPLETED';
                                    const isInProgress = m.status === 'IN_PROGRESS';
                                    return (
                                        <tr key={m.id}>
                                            <td className="ps-3">
                                                <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                                    <span className="fw-bold font-monospace text-dark">{m.code}</span>
                                                    {m.is_hold_point && (
                                                        <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>HP</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="fw-semibold text-dark">{m.name}</div>
                                                {m.remarks && <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{m.remarks}</div>}
                                            </td>
                                            <td>
                                                <span className="badge px-2 py-1 text-dark border" style={{ backgroundColor: '#f1f5f9' }}>
                                                    {m.phase}
                                                </span>
                                            </td>
                                            <td className="text-center font-monospace fw-bold">{m.weight_pct}%</td>
                                            <td className="font-monospace small">
                                                <div>Target: <span className="text-muted">{m.target_date || '—'}</span></div>
                                                {m.actual_date ? (
                                                    <div className="text-success fw-bold">Selesai: {m.actual_date}</div>
                                                ) : (
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Belum selesai</div>
                                                )}
                                            </td>
                                            <td className="small text-muted">{m.pic_lead}</td>
                                            <td className="text-center">
                                                <span
                                                    className={`badge px-2.5 py-1 fw-bold ${
                                                        isDone
                                                            ? 'bg-success text-white'
                                                            : isInProgress
                                                                ? 'text-white'
                                                                : 'text-dark border'
                                                    }`}
                                                    style={{
                                                        backgroundColor: isInProgress ? '#1e40af' : (!isDone ? '#f1f5f9' : undefined),
                                                        borderRadius: 'var(--pcm-radius-chip)'
                                                    }}
                                                >
                                                    {m.status}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="text-end pe-3">
                                                    {!isDone && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success btn-sm me-1 px-2 py-1 fw-bold"
                                                            style={{ borderRadius: 'var(--pcm-radius-chip)' }}
                                                            onClick={() => handleMarkComplete(m)}
                                                            title="Sahkan Milestone Selesai"
                                                        >
                                                            Sahkan
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ borderRadius: 'var(--pcm-radius-chip)' }}
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
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <form onSubmit={handleSave}>
                                <div className="modal-header border-bottom">
                                    <h5 className="modal-title fw-bold text-dark">
                                        {editingItem ? 'Edit Milestone Proyek' : 'Tambah Milestone Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
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
                                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                                    {editingItem ? (
                                        <button type="button" className="btn btn-outline-danger btn-sm fw-bold" onClick={handleDelete} disabled={formLoading}>
                                            Hapus Milestone
                                        </button>
                                    ) : <div />}
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} disabled={formLoading}>
                                            {formLoading ? 'Menyimpan...' : 'Simpan Milestone'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
