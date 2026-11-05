import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { defaultProjectId, isProjectLocked, scopeRows, useProjectFilter } from './projectScope';

const PRESSURE_UNITS = ['bar', 'psi', 'kPa', 'MPa', 'kg/cm²'];
const TEMPERATURE_UNITS = ['°C', '°F', 'K'];

function QtyField({ id, label, placeholder, value, unit, units, onValue, onUnit }) {
    const options = units.includes(unit) ? units : [unit, ...units].filter(Boolean);

    return (
        <div>
            <label className="form-label small fw-bold" htmlFor={id}>{label}</label>
            <div className="input-group input-group-sm pcm-qty">
                <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    className="form-control form-control-sm"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onValue(e.target.value)}
                />
                <select
                    className="form-select form-select-sm"
                    value={unit}
                    onChange={(e) => onUnit(e.target.value)}
                    aria-label={`Satuan ${label}`}
                >
                    {options.map((u) => (
                        <option key={u} value={u}>{u}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export function LineServiceSection({ user, projects = [], activeProject = null, activeProjectId = '', onToast }) {
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const parseValUnit = (str, defaultUnit) => {
        if (!str) return { val: '', unit: defaultUnit };
        const parts = String(str).trim().split(/\s+/);
        if (parts.length >= 2) {
            return { val: parts[0], unit: parts.slice(1).join(' ') };
        }
        return { val: parts[0], unit: defaultUnit };
    };

    const composeVal = (val, unit) => {
        const clean = String(val ?? '').trim().replace(',', '.');
        return clean ? `${clean} ${unit}` : '';
    };

    const emptyForm = () => ({
        line_no: '',
        service_name: '',
        fluid_code: '',
        piping_class: '',
        design_press_val: '',
        design_press_unit: 'bar',
        design_temp_val: '',
        design_temp_unit: '°C',
        operating_press_val: '',
        operating_press_unit: 'bar',
        operating_temp_val: '',
        operating_temp_unit: '°C',
        test_press_val: '',
        test_press_unit: 'bar',
        test_medium: 'Hydrostatic (Water)',
        insulation: 'None',
        project_id: defaultProjectId(activeProjectId, filterProject, projects)
    });

    const [form, setForm] = useState(emptyForm);

    const canEdit = can(user, 'drawing.write');

    const projectMap = useMemo(() => {
        const map = {};
        (projects || []).forEach(p => {
            map[p.id] = p;
        });
        return map;
    }, [projects]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/line-services');
            setLines(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load line services:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredLines = useMemo(() => {
        const q = search.toLowerCase();
        return lines.filter(l => {
            if (!q) return true;
            return (
                (l.line_no || '').toLowerCase().includes(q) ||
                (l.service_name || '').toLowerCase().includes(q) ||
                (l.fluid_code || '').toLowerCase().includes(q) ||
                (l.piping_class || '').toLowerCase().includes(q)
            );
        });
    }, [lines, search]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            const dp = parseValUnit(item.design_press, 'bar');
            const dt = parseValUnit(item.design_temp, '°C');
            const op = parseValUnit(item.operating_press, 'bar');
            const ot = parseValUnit(item.operating_temp, '°C');
            const tp = parseValUnit(item.test_press, 'bar');

            setForm({
                line_no: item.line_no || '',
                service_name: item.service_name || '',
                fluid_code: item.fluid_code || '',
                piping_class: item.piping_class || '',
                design_press_val: dp.val,
                design_press_unit: dp.unit || 'bar',
                design_temp_val: dt.val,
                design_temp_unit: dt.unit || '°C',
                operating_press_val: op.val,
                operating_press_unit: op.unit || 'bar',
                operating_temp_val: ot.val,
                operating_temp_unit: ot.unit || '°C',
                test_press_val: tp.val,
                test_press_unit: tp.unit || 'bar',
                test_medium: item.test_medium || 'Hydrostatic (Water)',
                insulation: item.insulation || 'None',
                project_id: item.project_id || defaultProjectId(activeProjectId, filterProject, projects)
            });
        } else {
            setEditingItem(null);
            setForm(emptyForm());
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.line_no.trim() || !form.service_name.trim()) {
            setFormError('Nomor Line dan Nama Service wajib diisi.');
            return;
        }

        const payload = {
            project_id: form.project_id || null,
            line_no: form.line_no.toUpperCase().trim(),
            service_name: form.service_name.trim(),
            fluid_code: form.fluid_code ? form.fluid_code.toUpperCase().trim() : '',
            piping_class: form.piping_class ? form.piping_class.toUpperCase().trim() : '',
            design_press: composeVal(form.design_press_val, form.design_press_unit),
            design_temp: composeVal(form.design_temp_val, form.design_temp_unit),
            operating_press: composeVal(form.operating_press_val, form.operating_press_unit),
            operating_temp: composeVal(form.operating_temp_val, form.operating_temp_unit),
            test_press: composeVal(form.test_press_val, form.test_press_unit),
            test_medium: form.test_medium,
            insulation: form.insulation
        };

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.put(`/line-services/${editingItem.id}`, payload);
                if (onToast) onToast('Line Service berhasil diperbarui.');
            } else {
                await api.post('/line-services', payload);
                if (onToast) onToast('Line Service baru berhasil ditambahkan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan Line Service.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirmDelete('Yakin ingin menghapus Line Service ini?'))) return;
        try {
            await api.delete(`/line-services/${id}`);
            if (onToast) onToast('Line Service berhasil dihapus.');
            loadData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus Line Service.');
        }
    };

    return (
        <div>
            {/* Header Standar Independen (Global Master Data) */}
            <div className="mb-4">
                <h2 className="h3 fw-bolder text-dark mb-0" style={{ letterSpacing: '-0.02em' }}>
                    Line Service Register
                </h2>
            </div>

            {/* Toolbar Bersih: Search di Kiri & Tambah Line Service di Kanan Sejajar */}
            <div className="d-flex align-items-center gap-3 mb-4">
                <div className="flex-grow-1 min-w-0">
                    <div className="pcm-search w-100" style={{ maxWidth: '100%' }}>
                        <span className="pcm-search__icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <input
                            type="text"
                            className="form-control form-control-sm pcm-filter-input w-100"
                            placeholder="Cari Line No, Service, Fluid, Piping Class..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold px-3 py-2 text-nowrap d-inline-flex align-items-center gap-1.5"
                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8', color: '#ffffff' }}
                        onClick={() => handleOpenModal()}
                    >
                        <span>+ Tambah Line Service</span>
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="pcm-card">
                <div className="table-responsive">
                    <table className="table table-hover align-middle pcm-table mb-0">
                        <thead>
                            <tr>
                                <th className="text-center" style={{ width: '150px' }}>
                                    <span className="pcm-th-title">Line Number</span>
                                </th>
                                <th style={{ minWidth: '180px' }}>
                                    <span className="pcm-th-title">Service Name</span>
                                </th>
                                <th className="text-center" style={{ width: '90px' }}>
                                    <span className="pcm-th-title">Fluid</span>
                                </th>
                                <th className="text-center" style={{ minWidth: '140px' }}>
                                    <span className="pcm-th-title">Piping Class</span>
                                </th>
                                <th className="text-center" style={{ minWidth: '130px' }}>
                                    <span className="pcm-th-title">Design (P / T)</span>
                                </th>
                                <th className="text-center" style={{ minWidth: '130px' }}>
                                    <span className="pcm-th-title">Operating (P / T)</span>
                                </th>
                                <th className="text-center" style={{ minWidth: '140px' }}>
                                    <span className="pcm-th-title">Test Pressure</span>
                                </th>
                                <th className="text-center" style={{ width: '100px' }}>
                                    <span className="pcm-th-title">Insulation</span>
                                </th>
                                {canEdit && (
                                    <th className="text-center" style={{ width: '160px' }}>
                                        <span className="pcm-th-title">Aksi</span>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                        Memuat data Line Service...
                                    </td>
                                </tr>
                            ) : filteredLines.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 pcm-cell-sub">
                                        Tidak ada data Line Service yang sesuai dengan filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredLines.map((l) => {
                                    const proj = projectMap[l.project_id];
                                    return (
                                        <tr key={l.id}>
                                            <td className="text-center">
                                                <span className="pcm-cell-id d-block">{l.line_no}</span>
                                            </td>
                                            <td>
                                                <span className="pcm-cell-strong d-block">{l.service_name}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="pcm-chip pcm-chip--primary pcm-code">{l.fluid_code || '—'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="pcm-code small d-block font-monospace">{l.piping_class || '—'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="d-block pcm-cell-strong">{l.design_press || '—'}</span>
                                                <span className="d-block pcm-cell-sub">{l.design_temp || '—'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="d-block pcm-cell-strong">{l.operating_press || '—'}</span>
                                                <span className="d-block pcm-cell-sub">{l.operating_temp || '—'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="pcm-chip pcm-chip--primary pcm-code mb-1">{l.test_press || '—'}</span>
                                                <span className="pcm-cell-sub d-block">({l.test_medium || 'Hydro'})</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="pcm-cell-sub">{l.insulation || 'None'}</span>
                                            </td>
                                            {canEdit && (
                                                <td className="text-center text-nowrap">
                                                    <div className="d-inline-flex align-items-center justify-content-center gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm px-3 py-1.5 fw-bold"
                                                            onClick={() => handleOpenModal(l)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm px-3 py-1.5 fw-bold"
                                                            onClick={() => handleDelete(l.id)}
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
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
                <div className="modal fade show d-block pcm-modal" style={{ zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title fw-bold">
                                        {editingItem ? 'Edit Line Service' : 'Tambah Line Service Baru'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}
                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Identitas Jalur (Standard Line Service)</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <label className="form-label small fw-bold" htmlFor="ls-line-no">Line Number *</label>
                                                <input
                                                    id="ls-line-no"
                                                    type="text"
                                                    className="form-control form-control-sm pcm-code text-uppercase"
                                                    placeholder="Contoh: 15-MPP-1001"
                                                    value={form.line_no}
                                                    onChange={(e) => setForm({ ...form, line_no: e.target.value.toUpperCase() })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <label className="form-label small fw-bold" htmlFor="ls-service">Nama Service *</label>
                                                <input
                                                    id="ls-service"
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: Main Process Piping (Crude Oil)"
                                                    value={form.service_name}
                                                    onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-4">
                                                <label className="form-label small fw-bold" htmlFor="ls-fluid">Kode Fluida</label>
                                                <input
                                                    id="ls-fluid"
                                                    type="text"
                                                    className="form-control form-control-sm pcm-code text-uppercase"
                                                    placeholder="Contoh: MPP, FG, CW, IA, ST"
                                                    value={form.fluid_code}
                                                    onChange={(e) => setForm({ ...form, fluid_code: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <div className="col-12 col-md-4">
                                                <label className="form-label small fw-bold" htmlFor="ls-piping-class">Piping Class</label>
                                                <input
                                                    id="ls-piping-class"
                                                    type="text"
                                                    className="form-control form-control-sm pcm-code text-uppercase"
                                                    placeholder="Contoh: A1A (CS 150#)"
                                                    value={form.piping_class}
                                                    onChange={(e) => setForm({ ...form, piping_class: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <div className="col-12 col-md-4">
                                                <label className="form-label small fw-bold" htmlFor="ls-insulation">Insulation</label>
                                                <input
                                                    id="ls-insulation"
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="None / Thermal Hot / Cold"
                                                    value={form.insulation}
                                                    onChange={(e) => setForm({ ...form, insulation: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Parameter Desain &amp; Operasi</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <QtyField
                                                    id="ls-design-press"
                                                    label="Design Pressure"
                                                    placeholder="10.5"
                                                    value={form.design_press_val}
                                                    unit={form.design_press_unit}
                                                    units={PRESSURE_UNITS}
                                                    onValue={(v) => setForm({ ...form, design_press_val: v })}
                                                    onUnit={(u) => setForm({ ...form, design_press_unit: u })}
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <QtyField
                                                    id="ls-design-temp"
                                                    label="Design Temperature"
                                                    placeholder="120"
                                                    value={form.design_temp_val}
                                                    unit={form.design_temp_unit}
                                                    units={TEMPERATURE_UNITS}
                                                    onValue={(v) => setForm({ ...form, design_temp_val: v })}
                                                    onUnit={(u) => setForm({ ...form, design_temp_unit: u })}
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <QtyField
                                                    id="ls-operating-press"
                                                    label="Operating Pressure"
                                                    placeholder="8.0"
                                                    value={form.operating_press_val}
                                                    unit={form.operating_press_unit}
                                                    units={PRESSURE_UNITS}
                                                    onValue={(v) => setForm({ ...form, operating_press_val: v })}
                                                    onUnit={(u) => setForm({ ...form, operating_press_unit: u })}
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <QtyField
                                                    id="ls-operating-temp"
                                                    label="Operating Temperature"
                                                    placeholder="90"
                                                    value={form.operating_temp_val}
                                                    unit={form.operating_temp_unit}
                                                    units={TEMPERATURE_UNITS}
                                                    onValue={(v) => setForm({ ...form, operating_temp_val: v })}
                                                    onUnit={(u) => setForm({ ...form, operating_temp_unit: u })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pcm-form-section">
                                        <span className="pcm-form-section__title">Pengujian</span>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <QtyField
                                                    id="ls-test-press"
                                                    label="Test Pressure"
                                                    placeholder="15.8"
                                                    value={form.test_press_val}
                                                    unit={form.test_press_unit}
                                                    units={PRESSURE_UNITS}
                                                    onValue={(v) => setForm({ ...form, test_press_val: v })}
                                                    onUnit={(u) => setForm({ ...form, test_press_unit: u })}
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <label className="form-label small fw-bold" htmlFor="ls-test-medium">Test Medium</label>
                                                <input
                                                    id="ls-test-medium"
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Hydrostatic (Water) / Pneumatic"
                                                    value={form.test_medium}
                                                    onChange={(e) => setForm({ ...form, test_medium: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={formLoading}>
                                        {formLoading ? 'Menyimpan...' : 'Simpan Line Service'}
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
