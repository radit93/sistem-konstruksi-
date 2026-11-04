import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';

export function MaterialInspectionSection({ user, onToast }) {
    const [inspections, setInspections] = useState([]);
    const [receivings, setReceivings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterResult, setFilterResult] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        material_receiving_id: '',
        report_no: '',
        inspection_date: new Date().toISOString().split('T')[0],
        inspector_name: 'Budi Santoso (QC Inspector)',
        item_name: '',
        heat_no: '',
        visual_check: 'PASS',
        dimension_check: 'PASS',
        mtc_check: 'PASS',
        result: 'ACCEPTED',
        ncr_no: '',
        notes: ''
    });

    const canEdit = can(user, 'material_inspection.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [inspData, recData] = await Promise.all([
                api.get('/material-inspections'),
                api.get('/material-receivings')
            ]);
            setInspections(Array.isArray(inspData) ? inspData : []);
            setReceivings(Array.isArray(recData) ? recData : []);
        } catch (err) {
            console.error('Failed to load inspection data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const total = inspections.length;
        const accepted = inspections.filter(i => i.result === 'ACCEPTED').length;
        const hold = inspections.filter(i => i.result === 'HOLD').length;
        const rejected = inspections.filter(i => i.result === 'REJECTED').length;
        return { total, accepted, hold, rejected };
    }, [inspections]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return inspections.filter(item => {
            const matchSearch = !q ||
                (item.report_no || '').toLowerCase().includes(q) ||
                (item.inspector_name || '').toLowerCase().includes(q) ||
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.heat_no || '').toLowerCase().includes(q) ||
                (item.ncr_no || '').toLowerCase().includes(q);

            const matchResult = filterResult === 'ALL' || item.result === filterResult;
            return matchSearch && matchResult;
        });
    }, [inspections, search, filterResult]);

    const inspectableReceivings = useMemo(() => {
        const candidates = receivings.filter(r => r.status === 'REQUESTED');

        if (editingItem?.material_receiving_id
            && !candidates.some(r => r.id === editingItem.material_receiving_id)) {
            const current = receivings.find(r => r.id === editingItem.material_receiving_id);
            if (current) {
                return [current, ...candidates];
            }
        }

        return candidates;
    }, [receivings, editingItem]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                material_receiving_id: item.material_receiving_id || '',
                report_no: item.report_no || '',
                inspection_date: item.inspection_date || '',
                inspector_name: item.inspector_name || '',
                item_name: item.item_name || '',
                heat_no: item.heat_no || '',
                visual_check: item.visual_check || 'PASS',
                dimension_check: item.dimension_check || 'PASS',
                mtc_check: item.mtc_check || 'PASS',
                result: item.result || 'ACCEPTED',
                ncr_no: item.ncr_no || '',
                notes: item.notes || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                material_receiving_id: inspectableReceivings[0]?.id || '',
                report_no: `MIR-2428-${(inspections.length + 1).toString().padStart(3, '0')}`,
                inspection_date: new Date().toISOString().split('T')[0],
                inspector_name: 'Budi Santoso (QC Inspector)',
                item_name: inspectableReceivings[0] ? `${inspectableReceivings[0].item_name} ${inspectableReceivings[0].size}` : '',
                heat_no: inspectableReceivings[0]?.heat_no || '',
                visual_check: 'PASS',
                dimension_check: 'PASS',
                mtc_check: 'PASS',
                result: 'ACCEPTED',
                ncr_no: '',
                notes: ''
            });
        }
        setShowModal(true);
    };

    const handleSelectReceiving = (recId) => {
        const found = receivings.find(r => r.id === parseInt(recId));
        if (found) {
            setForm(prev => ({
                ...prev,
                material_receiving_id: found.id,
                item_name: `${found.item_name} ${found.size} (${found.specification})`,
                heat_no: found.heat_no
            }));
        } else {
            setForm(prev => ({ ...prev, material_receiving_id: recId }));
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        if (!form.material_receiving_id) {
            setFormError('Pilih batch penerimaan material yang akan diinspeksi.');
            setFormLoading(false);
            return;
        }

        try {
            if (editingItem) {
                await api.put(`/material-inspections/${editingItem.id}`, form);
            } else {
                await api.post('/material-inspections', form);
            }
            handleCloseModal();
            loadData();
            if (onToast) onToast();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan laporan inspeksi.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus laporan inspeksi material ini?')) return;
        try {
            await api.del(`/material-inspections/${id}`);
            loadData();
            if (onToast) onToast();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    };

    return (
        <div className="section-material-inspection">
            {/* Header Title & Subtitle */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Material Inspection (Hold Point 2)
                    </h2>
                    <p className="text-muted small mb-0">
                        Kode WBS 26-00-MAT-001 (FE) / MAT-007 (BE) — Verifikasi mutu material bersama QA/QC Dept: Pemeriksaan visual, dimensi & ketebalan, kesesuaian Heat No vs MTC pabrik.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary px-3 py-2"
                        onClick={() => handleOpenModal()}
                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', fontWeight: 600 }}
                    >
                        + Input Hasil Inspeksi QC
                    </button>
                )}
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Total Laporan MIR</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.total}</span>
                                <span className="text-muted small">Pemeriksaan QC</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">ACCEPTED (Lolos Penuh)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-success">{stats.accepted}</span>
                                <span className="text-muted small">Bebas cacat & MTC valid</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">HOLD (Verifikasi Tambahan)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-warning">{stats.hold}</span>
                                <span className="text-muted small">Menunggu konfirmasi PMI/Lab</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b91c1c' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">REJECTED (NCR Diterbitkan)</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-danger">{stats.rejected}</span>
                                <span className="text-muted small">Material dikarantina</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-6">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari No. Laporan (MIR), Inspector, Item, Heat No, atau No. NCR..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-6 col-md-3">
                            <select
                                className="form-select"
                                value={filterResult}
                                onChange={(e) => setFilterResult(e.target.value)}
                            >
                                <option value="ALL">Semua Hasil QC</option>
                                <option value="ACCEPTED">ACCEPTED (Lolos)</option>
                                <option value="HOLD">HOLD (Ditahan)</option>
                                <option value="REJECTED">REJECTED (Ditolak / NCR)</option>
                            </select>
                        </div>
                        <div className="col-6 col-md-3 text-md-end text-muted small">
                            {filtered.length} dari {inspections.length} pemeriksaan
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.92rem' }}>
                            <thead className="table-light text-muted text-uppercase" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>
                                <tr>
                                    <th className="px-3 py-3">No. Laporan MIR</th>
                                    <th className="py-3">Tgl Inspeksi</th>
                                    <th className="py-3">QC Inspector</th>
                                    <th className="py-3">Item Material</th>
                                    <th className="py-3 text-center">Heat Number</th>
                                    <th className="py-3 text-center">Visual Check</th>
                                    <th className="py-3 text-center">Dimension</th>
                                    <th className="py-3 text-center">MTC Match</th>
                                    <th className="py-3 text-center">Hasil Akhir</th>
                                    <th className="py-3">Catatan Verifikasi / NCR</th>
                                    {canEdit && <th className="px-3 py-3 text-end">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Memuat data material inspection...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Tidak ada data inspeksi material yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-3 text-nowrap fw-bold text-dark font-monospace">
                                                {item.report_no}
                                            </td>
                                            <td className="text-nowrap text-secondary">{item.inspection_date}</td>
                                            <td className="text-nowrap fw-semibold">{item.inspector_name}</td>
                                            <td>
                                                <div className="fw-semibold text-dark">{item.item_name}</div>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary font-monospace">
                                                    {item.heat_no}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${item.visual_check === 'PASS' ? 'bg-success' : 'bg-danger'}`}>
                                                    {item.visual_check}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${item.dimension_check === 'PASS' ? 'bg-success' : 'bg-danger'}`}>
                                                    {item.dimension_check}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${item.mtc_check === 'PASS' ? 'bg-success' : 'bg-danger'}`}>
                                                    {item.mtc_check}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${
                                                    item.result === 'ACCEPTED' ? 'bg-success' :
                                                    item.result === 'HOLD' ? 'bg-warning text-dark' : 'bg-danger'
                                                }`}>
                                                    {item.result}
                                                </span>
                                                {item.ncr_no && (
                                                    <div className="text-danger small fw-bold font-monospace mt-1">
                                                        {item.ncr_no}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }} title={item.notes}>
                                                    {item.notes || '-'}
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td className="px-3 text-end text-nowrap">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary me-1 py-1 px-2"
                                                        onClick={() => handleOpenModal(item)}
                                                    >
                                                        Edit
                                                    </button>
                                                    {item.result !== 'ACCEPTED' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger py-1 px-2"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
                                                            Hapus
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    {editingItem ? 'Edit Laporan Inspeksi Mutu' : 'Input Hasil Inspeksi QC Material (Hold Point 2)'}
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    {formError && (
                                        <div className="alert alert-danger py-2 mb-3 small">
                                            {formError}
                                        </div>
                                    )}

                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Tautkan ke Batch Penerimaan</label>
                                            <select
                                                className="form-select"
                                                required
                                                value={form.material_receiving_id}
                                                disabled={Boolean(editingItem)}
                                                onChange={(e) => handleSelectReceiving(e.target.value)}
                                            >
                                                <option value="">-- Pilih Batch Surat Jalan / Penerimaan --</option>
                                                {inspectableReceivings.map(r => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.shipment_no} - {r.item_name} ({r.heat_no || 'tanpa heat'}) — {r.status}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">No. Laporan MIR</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                required
                                                placeholder="MIR-2428-XXX"
                                                value={form.report_no}
                                                onChange={(e) => setForm({ ...form, report_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Tanggal Inspeksi</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                value={form.inspection_date}
                                                onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nama QC Inspector</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.inspector_name}
                                                onChange={(e) => setForm({ ...form, inspector_name: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nama Item Material</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.item_name}
                                                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Heat Number Stamping</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                required
                                                value={form.heat_no}
                                                onChange={(e) => setForm({ ...form, heat_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Pemeriksaan Visual</label>
                                            <select
                                                className="form-select"
                                                value={form.visual_check}
                                                onChange={(e) => setForm({ ...form, visual_check: e.target.value })}
                                            >
                                                <option value="PASS">PASS (Bebas Cacat Fisik)</option>
                                                <option value="FAIL">FAIL (Goresan / Deformasi)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Cek Dimensi & Tebal</label>
                                            <select
                                                className="form-select"
                                                value={form.dimension_check}
                                                onChange={(e) => setForm({ ...form, dimension_check: e.target.value })}
                                            >
                                                <option value="PASS">PASS (Toleransi ASME)</option>
                                                <option value="FAIL">FAIL (Di luar batas)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Verifikasi MTC vs Fisik</label>
                                            <select
                                                className="form-select"
                                                value={form.mtc_check}
                                                onChange={(e) => setForm({ ...form, mtc_check: e.target.value })}
                                            >
                                                <option value="PASS">PASS (Sertifikat Valid)</option>
                                                <option value="FAIL">FAIL (Tidak Sesuai / Hilang)</option>
                                            </select>
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Keputusan Hasil Akhir</label>
                                            <select
                                                className="form-select fw-bold"
                                                value={form.result}
                                                onChange={(e) => setForm({ ...form, result: e.target.value })}
                                            >
                                                <option value="ACCEPTED" className="text-success">ACCEPTED — Siap Masuk Gudang / Fabrikasi</option>
                                                <option value="HOLD" className="text-warning">HOLD — Perlu Peninjauan Tambahan</option>
                                                <option value="REJECTED" className="text-danger">REJECTED — Terbitkan NCR & Karantina</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nomor NCR (Bila Ditolak)</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                placeholder="NCR-2428-MAT-XXX"
                                                value={form.ncr_no}
                                                onChange={(e) => setForm({ ...form, ncr_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Catatan Teknis Inspektur QC</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Pengukuran ketebalan dinding, hasil PMI test, dll"
                                                value={form.notes}
                                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={formLoading}
                                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' }}
                                    >
                                        {formLoading ? 'Menyimpan...' : 'Simpan Laporan MIR'}
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
