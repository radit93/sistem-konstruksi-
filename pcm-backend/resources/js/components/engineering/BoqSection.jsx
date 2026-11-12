import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { formatRupiah } from '../../currency';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';
import { PcmSelect } from '../SearchSelect';

export function BoqSection({ user, projects = [], drawings = [], activeProjectId = '', onToast }) {
    const [boqList, setBoqList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [syncing, setSyncing] = useState(false);

    const [form, setForm] = useState({
        item_code: 'BOQ-ENG-FAB-01',
        work_scope: 'Workshop Spool Fabrication (Carbon Steel)',
        material_group: 'Carbon Steel',
        dia_inch_total: 0,
        rate_per_di: 55000,
        joints_count: 0,
        spools_count: 0,
        weight_kg: 0,
        welding_cost_total: 0,
        total_amount: 0,
        status: 'APPROVED',
        line_no: '15-MPP-AB',
        drawing_id: '',
        project_id: ''
    });

    const canEdit = can(user, 'drawing.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeProjectId && activeProjectId !== 'ALL') {
                params.append('project_id', activeProjectId);
            }
            const url = params.toString() ? `/engineering-boqs?${params.toString()}` : '/engineering-boqs';
            const data = await api.get(url);
            setBoqList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load engineering BOQ:', err);
        } finally {
            setLoading(false);
        }
    }, [activeProjectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const scopedBoq = useMemo(
        () => scopeRows(boqList, activeProjectId, filterProject),
        [boqList, activeProjectId, filterProject]
    );

    const scopedDrawings = useMemo(
        () => scopeRows(drawings, activeProjectId, filterProject),
        [drawings, activeProjectId, filterProject]
    );

    const stats = useMemo(() => {
        const totalDI = scopedBoq.reduce((acc, b) => acc + (parseFloat(b.dia_inch_total) || 0), 0);
        const totalJoints = scopedBoq.reduce((acc, b) => acc + (parseInt(b.joints_count, 10) || 0), 0);
        const totalWeight = scopedBoq.reduce((acc, b) => acc + (parseFloat(b.weight_kg) || 0), 0);
        const totalSpools = scopedBoq.reduce((acc, b) => acc + (parseInt(b.spools_count, 10) || 0), 0);
        const totalWeldingCost = scopedBoq.reduce((acc, b) => acc + (parseFloat(b.welding_cost_total) || 0), 0);
        const totalAmount = scopedBoq.reduce((acc, b) => acc + (parseFloat(b.total_amount) || 0), 0);
        return { totalDI, totalJoints, totalWeight, totalSpools, totalWeldingCost, totalAmount };
    }, [scopedBoq]);

    const handleSyncFromWeldingMap = async () => {
        const targetProjId = defaultProjectId(activeProjectId, filterProject, projects);
        if (!targetProjId) {
            alert('Please select a project first to synchronize BOQ.');
            return;
        }

        setSyncing(true);
        try {
            const res = await api.post('/engineering-boqs/sync-from-welding-map', {
                project_id: targetProjId,
            });
            if (onToast) onToast(res.message || 'BOQ successfully synchronized from Welding Map.');
            loadData();
        } catch (err) {
            alert(err.message || 'Failed to synchronize BOQ from welding data.');
        } finally {
            setSyncing(false);
        }
    };

    const filteredBoq = useMemo(() => {
        const q = search.toLowerCase();
        return scopedBoq.filter(b => {
            const matchSearch = !q ||
                (b.item_code || '').toLowerCase().includes(q) ||
                (b.work_scope || '').toLowerCase().includes(q) ||
                (b.material_group || '').toLowerCase().includes(q) ||
                (b.line_no || '').toLowerCase().includes(q);
            return matchSearch;
        });
    }, [scopedBoq, search]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                item_code: item.item_code || '',
                work_scope: item.work_scope || '',
                material_group: item.material_group || 'Carbon Steel',
                dia_inch_total: item.dia_inch_total || 0,
                rate_per_di: item.rate_per_di || 0,
                joints_count: item.joints_count || 0,
                spools_count: item.spools_count || 0,
                weight_kg: item.weight_kg || 0,
                welding_cost_total: item.welding_cost_total || 0,
                total_amount: item.total_amount || 0,
                status: item.status || 'ESTIMATED',
                line_no: item.line_no || '15-MPP-AB',
                drawing_id: item.drawing_id || '',
                project_id: item.project_id || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                item_code: `BOQ-ENG-${String(boqList.length + 1).padStart(2, '0')}`,
                work_scope: 'Workshop Spool Fabrication (Carbon Steel)',
                material_group: 'Carbon Steel',
                dia_inch_total: 0,
                rate_per_di: 55000,
                joints_count: 0,
                spools_count: 0,
                weight_kg: 0,
                welding_cost_total: 0,
                total_amount: 0,
                status: 'APPROVED',
                line_no: '15-MPP-AB',
                drawing_id: scopedDrawings[0]?.id || '',
                project_id: defaultProjectId(activeProjectId, filterProject, projects)
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.item_code.trim() || !form.work_scope.trim()) {
            setFormError('Item Code and Work Scope are required.');
            return;
        }

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/engineering-boqs/${editingItem.id}`, form);
                if (onToast) onToast('Engineering BOQ item successfully updated.');
            } else {
                await api.post('/engineering-boqs', form);
                if (onToast) onToast('New Engineering BOQ item successfully added.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Failed to save BOQ data.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirmDelete('Are you sure you want to delete this BOQ item?'))) return;
        setDeleteError('');
        try {
            await api.delete(`/engineering-boqs/${id}`);
            if (onToast) onToast('BOQ item successfully deleted.');
            loadData();
        } catch (err) {
            setDeleteError(err.message || 'Failed to delete data.');
        }
    };

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Bill of Quantities (BOQ) Engineering</h2>
                    <p className="pcm-cell-sub mb-0">
                        Technical quantities calculation per work scope: Diameter-Inch (DI) volume, tonnage weight, and estimated construction &amp; electrode welding costs.
                    </p>
                </div>
                {canEdit && (
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm fw-bold px-3 py-2 d-inline-flex align-items-center gap-1.5"
                            onClick={handleSyncFromWeldingMap}
                            disabled={syncing}
                            title="Hitung ulang otomatis volume DI, joint, bobot, dan biaya las dari titik pengelasan ISO aktif"
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'pcm-spin' : ''}>
                                <polyline points="23 4 23 10 17 10" />
                                <polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            {syncing ? 'Syncing...' : 'Sync from Welding Map'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm fw-bold px-3 py-2"
                            onClick={() => handleOpenModal()}
                        >
                            + Add BOQ Item
                        </button>
                    </div>
                )}
            </div>

            {deleteError && (
                <div role="alert" className="alert alert-danger py-2 small mb-3">{deleteError}</div>
            )}

            {/* Summary Metrics - 6 Tiles Simetris */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-2">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Volume DI</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">{stats.totalDI.toFixed(1)}</strong>
                        <span className="pcm-tile__unit">Dia-Inch</span>
                    </div>
                </div>
                <div className="col-6 col-md-2">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Joints</span>
                        <strong className="pcm-tile__value text-success">{stats.totalJoints}</strong>
                        <span className="pcm-tile__unit">joints</span>
                    </div>
                </div>
                <div className="col-6 col-md-2">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Spools</span>
                        <strong className="pcm-tile__value">{stats.totalSpools}</strong>
                        <span className="pcm-tile__unit">spools</span>
                    </div>
                </div>
                <div className="col-6 col-md-2">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Weight</span>
                        <strong className="pcm-tile__value text-dark">{stats.totalWeight.toFixed(0)}</strong>
                        <span className="pcm-tile__unit">kg</span>
                    </div>
                </div>
                <div className="col-6 col-md-2">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Electrode Cost</span>
                        <strong className="pcm-tile__value text-success">{formatRupiah(stats.totalWeldingCost)}</strong>
                        <span className="pcm-tile__unit">consumables</span>
                    </div>
                </div>
                <div className="col-6 col-md-2">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total BOQ Value</span>
                        <strong className="pcm-tile__value text-primary">{formatRupiah(stats.totalAmount)}</strong>
                        <span className="pcm-tile__unit">labor + electrodes</span>
                    </div>
                </div>
            </div>

            {/* Search & Project Filter Toolbar */}
            <div className="pcm-filter-bar">
                <div className="pcm-filter-search">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search Item Code, Work Scope, Material Group..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {!isProjectLocked(activeProjectId) && (
                    <PcmSelect
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="ALL">All Projects ({projects.length})</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.client ? `[${p.client}] ` : ''}{p.name} (JOB: {p.job_no || '-'})
                            </option>
                        ))}
                    </PcmSelect>
                )}
            </div>

            {/* Table */}
            <div className="pcm-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle pcm-table mb-0" style={{ minWidth: '820px' }}>
                        <thead>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '22%' }}>Item &amp; Scope</th>
                                <th className="py-3" style={{ width: '15%' }}>Material &amp; Status</th>
                                <th className="py-3" style={{ width: '16%' }}>Technical Volume</th>
                                <th className="py-3" style={{ width: '14%' }}>Material Weight</th>
                                <th className="py-3" style={{ width: '21%' }}>Contract Value</th>
                                {canEdit && <th className="text-end pe-3 py-3" style={{ width: '12%' }}>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 6 : 5} className="text-center py-4 pcm-cell-sub">
                                        Loading Engineering BOQ data...
                                    </td>
                                </tr>
                            ) : filteredBoq.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 6 : 5} className="text-center py-4 pcm-cell-sub">
                                        No matching BOQ items found. Click "Sync from Welding Map" to auto-calculate from active ISO welding joints.
                                    </td>
                                </tr>
                            ) : (
                                filteredBoq.map((b) => (
                                    <tr key={b.id}>
                                        <td className="ps-3">
                                            <div className="fw-bold pcm-code text-dark" style={{ fontSize: '0.875rem' }}>
                                                {b.item_code}
                                            </div>
                                            <div className="pcm-cell-sub text-truncate" style={{ maxWidth: '240px' }} title={b.work_scope}>
                                                {b.work_scope}
                                            </div>
                                            {b.line_no && (
                                                <span className="badge bg-light text-muted border font-monospace mt-0.5" style={{ fontSize: '0.6875rem' }}>
                                                    Line: {b.line_no}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div>
                                                <span className="pcm-chip pcm-chip--neutral me-1" style={{ fontSize: '0.75rem' }}>
                                                    {b.material_group}
                                                </span>
                                            </div>
                                            <div className="mt-1">
                                                <span className={`pcm-chip ${b.status === 'APPROVED' ? 'pcm-chip--success' : 'pcm-chip--warning'}`} style={{ fontSize: '0.6875rem' }}>
                                                    {b.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="fw-bold pcm-code text-dark" style={{ fontSize: '0.9375rem' }}>
                                                {parseFloat(b.dia_inch_total).toFixed(1)} DI
                                            </div>
                                            <div className="pcm-cell-sub small">
                                                {b.joints_count} joints · {b.spools_count} spools
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pcm-code fw-semibold text-dark">
                                                {parseFloat(b.weight_kg).toFixed(1)} kg
                                            </div>
                                            <div className="pcm-cell-sub small">
                                                {(parseFloat(b.weight_kg) / 1000).toFixed(2)} ton
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pcm-code fw-bold text-primary" style={{ fontSize: '0.9375rem' }}>
                                                {b.total_amount ? formatRupiah(b.total_amount) : '—'}
                                            </div>
                                            <div className="pcm-cell-sub small">
                                                Rate: {b.rate_per_di ? formatRupiah(b.rate_per_di) : '—'}/DI
                                                {b.welding_cost_total > 0 && ` · Las: ${formatRupiah(b.welding_cost_total)}`}
                                            </div>
                                        </td>
                                        {canEdit && (
                                            <td className="text-end pe-3 text-nowrap">
                                                <div className="d-inline-flex gap-1 justify-content-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff', fontSize: '0.75rem' }}
                                                        onClick={() => handleOpenModal(b)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm px-2.5 py-1 fw-bold"
                                                        style={{ fontSize: '0.75rem' }}
                                                        onClick={() => handleDelete(b.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
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
                                        {editingItem ? 'Edit Engineering BOQ Item' : 'Add New BOQ Item'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Item Code *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.item_code}
                                                onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-8">
                                            <label className="form-label small fw-bold">Work Scope *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.work_scope}
                                                onChange={(e) => setForm({ ...form, work_scope: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Material Group</label>
                                            <PcmSelect
                                                value={form.material_group}
                                                onChange={(e) => setForm({ ...form, material_group: e.target.value })}
                                            >
                                                <option value="Carbon Steel">Carbon Steel</option>
                                                <option value="Stainless Steel">Stainless Steel</option>
                                                <option value="Alloy Steel">Alloy Steel</option>
                                                <option value="Structural Steel">Structural Steel</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Total DI</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={form.dia_inch_total}
                                                onChange={(e) => setForm({ ...form, dia_inch_total: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Joints Count</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.joints_count}
                                                onChange={(e) => setForm({ ...form, joints_count: parseInt(e.target.value, 10) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-bold">Spools Count</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.spools_count}
                                                onChange={(e) => setForm({ ...form, spools_count: parseInt(e.target.value, 10) || 0 })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-3">
                                            <label className="form-label small fw-bold">Weight (Kg)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={form.weight_kg}
                                                onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Rate per DI (Rp)</label>
                                            <input
                                                type="number"
                                                step="1000"
                                                className="form-control pcm-code"
                                                placeholder="55000"
                                                value={form.rate_per_di}
                                                onChange={(e) => {
                                                    const r = parseFloat(e.target.value) || 0;
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        rate_per_di: r,
                                                        total_amount: Math.round(((prev.dia_inch_total || 0) * r) + (prev.welding_cost_total || 0))
                                                    }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Electrode Cost (Rp)</label>
                                            <input
                                                type="number"
                                                step="100"
                                                className="form-control pcm-code"
                                                placeholder="0"
                                                value={form.welding_cost_total}
                                                onChange={(e) => {
                                                    const wc = parseFloat(e.target.value) || 0;
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        welding_cost_total: wc,
                                                        total_amount: Math.round(((prev.dia_inch_total || 0) * (prev.rate_per_di || 0)) + wc)
                                                    }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-bold">Total Work Value (Rp)</label>
                                            <input
                                                type="number"
                                                step="100"
                                                className="form-control pcm-code fw-bold text-primary"
                                                value={form.total_amount || Math.round(((form.dia_inch_total || 0) * (form.rate_per_di || 0)) + (form.welding_cost_total || 0))}
                                                onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <div className="p-2.5 rounded d-flex align-items-center justify-content-between" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                <div className="small text-muted">
                                                    Calculation: <span className="font-monospace fw-semibold">{form.dia_inch_total || 0} DI × {formatRupiah(form.rate_per_di || 0)}</span> + Electrode Cost <span className="font-monospace fw-semibold">{formatRupiah(form.welding_cost_total || 0)}</span>
                                                </div>
                                                <span className="fw-bolder pcm-code text-primary" style={{ fontSize: '0.95rem' }}>
                                                    = {formatRupiah(form.total_amount || (((form.dia_inch_total || 0) * (form.rate_per_di || 0)) + (form.welding_cost_total || 0)))}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Estimate Status</label>
                                            <PcmSelect
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option value="ESTIMATED">ESTIMATED</option>
                                                <option value="REVIEWED">REVIEWED</option>
                                                <option value="APPROVED">APPROVED</option>
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold">Related Line Number</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.line_no}
                                                onChange={(e) => setForm({ ...form, line_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Saving...' : 'Save BOQ'}
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
