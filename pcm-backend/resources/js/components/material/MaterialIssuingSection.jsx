import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';

export function MaterialIssuingSection({ user, onToast }) {
    const [issuings, setIssuings] = useState([]);
    const [storings, setStorings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        issue_date: new Date().toISOString().split('T')[0],
        issue_no: '',
        requestor: 'Workshop Spool Fab - Team A (Foreman Sukardi)',
        target_spool_no: 'SP-01',
        target_line_no: '15-MPP-AB',
        drawing_no: '2428-M-15-MPP-AB-SHT1',
        item_name: 'Pipe Seamless CS 4" Sch 40',
        specification: 'ASTM A106 Gr. B',
        size: '4"',
        qty: 1,
        unit: 'meter',
        heat_no: 'HT-99421A',
        issued_by: 'Material Control (Agus W.)',
        remarks: ''
    });

    const canEdit = can(user, 'stock.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [issData, stkData] = await Promise.all([
                api.get('/material-issuings'),
                api.get('/material-storings')
            ]);
            setIssuings(Array.isArray(issData) ? issData : []);
            setStorings(Array.isArray(stkData) ? stkData : []);
        } catch (err) {
            console.error('Failed to load material issuing data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const totalSlips = issuings.length;
        const totalSpoolsTargeted = new Set(issuings.map(i => i.target_spool_no).filter(Boolean)).size;
        const totalPipesIssued = issuings
            .filter(i => i.unit === 'meter')
            .reduce((acc, i) => acc + (parseFloat(i.qty) || 0), 0);
        const totalFittingsIssued = issuings
            .filter(i => i.unit === 'pcs')
            .reduce((acc, i) => acc + (parseFloat(i.qty) || 0), 0);
        return { totalSlips, totalSpoolsTargeted, totalPipesIssued, totalFittingsIssued };
    }, [issuings]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return issuings.filter(item => {
            return !q ||
                (item.issue_no || '').toLowerCase().includes(q) ||
                (item.requestor || '').toLowerCase().includes(q) ||
                (item.target_spool_no || '').toLowerCase().includes(q) ||
                (item.target_line_no || '').toLowerCase().includes(q) ||
                (item.drawing_no || '').toLowerCase().includes(q) ||
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.heat_no || '').toLowerCase().includes(q);
        });
    }, [issuings, search]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                issue_date: item.issue_date || '',
                issue_no: item.issue_no || '',
                requestor: item.requestor || '',
                target_spool_no: item.target_spool_no || '',
                target_line_no: item.target_line_no || '',
                drawing_no: item.drawing_no || '',
                item_name: item.item_name || '',
                specification: item.specification || '',
                size: item.size || '',
                qty: item.qty || 1,
                unit: item.unit || 'meter',
                heat_no: item.heat_no || '',
                issued_by: item.issued_by || 'Material Control',
                remarks: item.remarks || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                issue_date: new Date().toISOString().split('T')[0],
                issue_no: `MIS-2428-${(issuings.length + 1).toString().padStart(3, '0')}`,
                requestor: 'Workshop Spool Fab - Team A (Foreman Sukardi)',
                target_spool_no: 'SP-01',
                target_line_no: '15-MPP-AB',
                drawing_no: '2428-M-15-MPP-AB-SHT1',
                item_name: 'Pipe Seamless CS 4" Sch 40',
                specification: 'ASTM A106 Gr. B',
                size: '4"',
                qty: 1,
                unit: 'meter',
                heat_no: 'HT-99421A',
                issued_by: 'Material Control',
                remarks: 'Dikeluarkan untuk pemotongan pipa & perakitan spool workshop'
            });
        }
        setShowModal(true);
    };

    const handleSelectStock = (stkId) => {
        const found = storings.find(s => s.id === parseInt(stkId));
        if (found) {
            setForm(prev => ({
                ...prev,
                item_name: found.item_name,
                specification: found.specification,
                size: found.size,
                unit: found.unit
            }));
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

        try {
            if (editingItem) {
                await api.put(`/material-issuings/${editingItem.id}`, form);
            } else {
                await api.post('/material-issuings', form);
            }
            handleCloseModal();
            loadData();
            if (onToast) onToast();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan data pengeluaran material.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirmDelete('Yakin ingin menghapus bukti pengeluaran material ini?'))) return;
        try {
            await api.del(`/material-issuings/${id}`);
            loadData();
            if (onToast) onToast();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    };

    return (
        <div className="section-material-issuing">
            {/* Header Title & Subtitle */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Material Issuing (Distribusi Spool &amp; Ereksi)
                    </h2>
                    <p className="text-muted small mb-0">
                        Kode WBS 26-00-MAT-005 (FE) / MAT-011 (BE) — Pengeluaran material ke Workshop Fabrikasi Spool &amp; Ereksi Lapangan berdasarkan nomor Spool, Jalur Pipa, dan Gambar Isometrik.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-primary px-3 py-2"
                        onClick={() => handleOpenModal()}
                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', fontWeight: 600 }}
                    >
                        + Terbitkan Bukti Pengeluaran (MIS)
                    </button>
                )}
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Total Bukti Pengeluaran</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.totalSlips}</span>
                                <span className="text-muted small">Slip MIS Terbit</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Spool Terlayani</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-success">{stats.totalSpoolsTargeted}</span>
                                <span className="text-muted small">Nomor Spool Unik</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Pipa Disalurkan</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-warning">{stats.totalPipesIssued.toFixed(1)}</span>
                                <span className="text-muted small">Meter Pipa</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #64748b' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Komponen Disalurkan</span>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="h3 mb-0 fw-bold text-dark">{stats.totalFittingsIssued}</span>
                                <span className="text-muted small">Fittings / Flanges (pcs)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-8">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari No. Bukti MIS, Requestor, Target Spool, Line No, Isometrik, atau Heat No..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-4 text-md-end text-muted small">
                            {filtered.length} dari {issuings.length} slip pengeluaran
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
                                    <th className="px-3 py-3">No. Bukti MIS</th>
                                    <th className="py-3">Tgl Keluar</th>
                                    <th className="py-3">Pemohon (Requestor)</th>
                                    <th className="py-3">Target Spool / Line</th>
                                    <th className="py-3">Gambar Isometrik</th>
                                    <th className="py-3">Item Material</th>
                                    <th className="py-3">Spec &amp; Ukuran</th>
                                    <th className="py-3 text-center">Heat Number</th>
                                    <th className="py-3 text-end fw-bold">Qty Keluar</th>
                                    <th className="py-3">Petugas Gudang</th>
                                    {canEdit && <th className="px-3 py-3 text-end">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Memuat riwayat pengeluaran material...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 11 : 10} className="text-center py-4 text-muted">
                                            Tidak ada riwayat pengeluaran material yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-3 text-nowrap fw-bold text-dark font-monospace">
                                                {item.issue_no}
                                            </td>
                                            <td className="text-nowrap text-secondary">{item.issue_date}</td>
                                            <td>
                                                <div className="fw-semibold text-dark">{item.requestor}</div>
                                            </td>
                                            <td className="text-nowrap">
                                                <span className="badge bg-primary me-1">{item.target_spool_no || '-'}</span>
                                                <span className="badge bg-secondary font-monospace">{item.target_line_no || '-'}</span>
                                            </td>
                                            <td className="text-nowrap font-monospace small">
                                                {item.drawing_no || '-'}
                                            </td>
                                            <td>
                                                <div className="fw-semibold text-dark">{item.item_name}</div>
                                            </td>
                                            <td className="text-nowrap small text-muted">
                                                {item.specification} ({item.size})
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary font-monospace">
                                                    {item.heat_no || '-'}
                                                </span>
                                            </td>
                                            <td className="text-end text-nowrap fw-bold text-danger">
                                                -{parseFloat(item.qty).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {item.unit}
                                            </td>
                                            <td className="text-nowrap small text-muted">
                                                {item.issued_by}
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
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger py-1 px-2"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        Hapus
                                                    </button>
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

            {/* Modal Input/Edit Form */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    {editingItem ? 'Edit Bukti Pengeluaran Material' : 'Terbitkan Bukti Pengeluaran (Material Issuing Slip)'}
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
                                            <label className="form-label small fw-semibold text-secondary">Nomor Bukti MIS</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                required
                                                placeholder="MIS-2428-XXX"
                                                value={form.issue_no}
                                                onChange={(e) => setForm({ ...form, issue_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Tanggal Pengeluaran</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                value={form.issue_date}
                                                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Pihak Pemohon (Requestor / Tim Fabrikasi)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Contoh: Workshop Spool Fab - Team A (Foreman Sukardi)"
                                                value={form.requestor}
                                                onChange={(e) => setForm({ ...form, requestor: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Target Spool No</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                placeholder="SP-01 / SP-02"
                                                value={form.target_spool_no}
                                                onChange={(e) => setForm({ ...form, target_spool_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Target Line No</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                placeholder="15-MPP-AB"
                                                value={form.target_line_no}
                                                onChange={(e) => setForm({ ...form, target_line_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Gambar Isometrik</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                placeholder="2428-M-15-MPP-AB-SHT1"
                                                value={form.drawing_no}
                                                onChange={(e) => setForm({ ...form, drawing_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Pilih dari Master Stok</label>
                                            <select
                                                className="form-select"
                                                onChange={(e) => handleSelectStock(e.target.value)}
                                            >
                                                <option value="">-- Isi Manual atau Pilih dari Stok --</option>
                                                {storings.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.item_code} - {s.item_name} (Sisa: {s.balance} {s.unit})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Nama Material</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.item_name}
                                                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Spesifikasi ASTM</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.specification}
                                                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Ukuran Nominal</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.size}
                                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Nomor Heat Stamping</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace"
                                                placeholder="HT-XXXXXX"
                                                value={form.heat_no}
                                                onChange={(e) => setForm({ ...form, heat_no: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Jumlah Dikeluarkan</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                required
                                                value={form.qty}
                                                onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Satuan</label>
                                            <select
                                                className="form-select"
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            >
                                                <option value="meter">meter</option>
                                                <option value="pcs">pcs</option>
                                                <option value="set">set</option>
                                                <option value="kg">kg</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">Petugas Gudang (Issued By)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.issued_by}
                                                onChange={(e) => setForm({ ...form, issued_by: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Catatan / Keperluan Perakitan</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Detail sambungan joint las, toleransi potongan, dll"
                                                value={form.remarks}
                                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
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
                                        {formLoading ? 'Menyimpan...' : 'Terbitkan Bukti Pengeluaran'}
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
