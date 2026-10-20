import React, { useState } from 'react';
import { api } from '../api';
import { can } from '../auth';

// Kolom nyata stock_moves: move_date, kind ('IN'/'OUT'), description, spec, size, qty,
// unit, requestor, location, heat_no, po_no.
const today = () => new Date().toISOString().split('T')[0];

export function MaterialTab({ stockMoves, user, onReload }) {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        move_date: today(),
        kind: 'IN',
        description: '',
        spec: 'ASTM A106 Gr.B',
        size: '2"',
        qty: 10,
        unit: 'MTR',
        location: 'Laydown Yard A',
        heat_no: '',
        po_no: 'PO-2428-001',
        requestor: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canEdit = can(user, 'stock.write');

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/stock', { ...formData, qty: Number(formData.qty) });
            setShowModal(false);
            setFormData({
                move_date: today(),
                kind: 'IN',
                description: '',
                spec: 'ASTM A106 Gr.B',
                size: '2"',
                qty: 10,
                unit: 'MTR',
                location: 'Laydown Yard A',
                heat_no: '',
                po_no: 'PO-2428-001',
                requestor: ''
            });
            if (onReload) onReload();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan mutasi material');
        } finally {
            setLoading(false);
        }
    };

    const filtered = (stockMoves || []).filter(m => {
        const q = search.toLowerCase();
        return (m.description || '').toLowerCase().includes(q) ||
            (m.heat_no || '').toLowerCase().includes(q) ||
            (m.po_no || '').toLowerCase().includes(q);
    });

    // Hitung ringkasan total IN dan OUT
    const totalIn = (stockMoves || []).filter(m => m.kind === 'IN').reduce((acc, c) => acc + Number(c.qty || 0), 0);
    const totalOut = (stockMoves || []).filter(m => m.kind === 'OUT').reduce((acc, c) => acc + Number(c.qty || 0), 0);

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Material Control & Traceability</h3>
                    <p className="text-muted mb-0">
                        Pencatatan Masuk/Keluar Material Piping, Heat Number, MTR Mill Certificate (Job 2428)
                    </p>
                </div>
                <div>
                    {canEdit ? (
                        <button onClick={() => setShowModal(true)} className="btn btn-warning text-dark fw-bold btn-sm">
                            <i className="cs-plus me-1"></i> Input Mutasi Material
                        </button>
                    ) : (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: Material / Manager)
                        </span>
                    )}
                </div>
            </div>

            {/* Material KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <div className="d-flex justify-content-between text-muted small fw-bold mb-1">
                            <span>TOTAL MATERIAL MASUK (IN)</span>
                            <span className="badge bg-success-subtle text-success">Laydown / Warehouse</span>
                        </div>
                        <h3 className="fw-bold text-success mb-0">{totalIn.toLocaleString()} <small className="text-muted fs-6">Unit/Mtr</small></h3>
                        <small className="text-muted mt-2 d-block">Barang diterima dari vendor & MTR verified</small>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <div className="d-flex justify-content-between text-muted small fw-bold mb-1">
                            <span>MATERIAL DISERAHKAN (OUT)</span>
                            <span className="badge bg-warning-subtle text-warning">Shop & Field</span>
                        </div>
                        <h3 className="fw-bold text-warning mb-0">{totalOut.toLocaleString()} <small className="text-muted fs-6">Unit/Mtr</small></h3>
                        <small className="text-muted mt-2 d-block">Dikeluarkan untuk perakitan spool fitting & pipa</small>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-white">
                        <div className="d-flex justify-content-between text-muted small fw-bold mb-1">
                            <span>SISA STOCK TERSEDIA (BALANCE)</span>
                            <span className="badge bg-primary-subtle text-primary">Ready to Issue</span>
                        </div>
                        <h3 className="fw-bold text-primary mb-0">{Math.max(0, totalIn - totalOut).toLocaleString()} <small className="text-muted fs-6">Unit/Mtr</small></h3>
                        <small className="text-muted mt-2 d-block">Cadangan aman material di warehouse yard</small>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="card shadow-sm border-0 mb-4 bg-white p-3">
                <div className="row g-2 align-items-center">
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="cs-search"></i></span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Cari deskripsi item, Heat Number, PO Number..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 text-md-end text-muted small">
                        Total {filtered.length} riwayat pergerakan material
                    </div>
                </div>
            </div>

            {/* Material Movements Table */}
            <div className="card shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Jenis</th>
                                <th>Deskripsi Item</th>
                                <th>Spec & Size</th>
                                <th className="text-end">Jumlah</th>
                                <th>Heat Number</th>
                                <th>PO Number</th>
                                <th>Lokasi Yard</th>
                                <th>Requestor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-4 text-muted">
                                        Belum ada data mutasi material. Silakan klik tombol "Input Mutasi Material".
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m, idx) => (
                                    <tr key={m.id || idx}>
                                        <td className="text-muted">{idx + 1}</td>
                                        <td className="text-muted">{m.move_date || '-'}</td>
                                        <td>
                                            <span className={`badge ${m.kind === 'IN' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {m.kind === 'IN' ? 'MASUK (IN)' : 'KELUAR (OUT)'}
                                            </span>
                                        </td>
                                        <td className="fw-semibold text-dark">{m.description}</td>
                                        <td>{m.spec} &bull; {m.size}</td>
                                        <td className="text-end fw-bold">{m.qty} {m.unit}</td>
                                        <td><code className="text-dark bg-light px-2 py-1 rounded">{m.heat_no || '-'}</code></td>
                                        <td>{m.po_no || '-'}</td>
                                        <td><span className="badge bg-light text-muted border">{m.location || '-'}</span></td>
                                        <td className="text-muted">{m.requestor || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Input Mutasi */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <form onSubmit={handleSave}>
                                <div className="modal-header bg-warning text-dark">
                                    <h5 className="modal-title fw-bold">Input Mutasi Material Baru</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tanggal</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.move_date}
                                                onChange={e => setFormData({ ...formData, move_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Tipe Mutasi</label>
                                            <select
                                                className="form-select"
                                                value={formData.kind}
                                                onChange={e => setFormData({ ...formData, kind: e.target.value })}
                                            >
                                                <option value="IN">IN (Barang Masuk)</option>
                                                <option value="OUT">OUT (Barang Keluar ke Spool)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Deskripsi Material</label>
                                        <input
                                            type="text"
                                            required
                                            className="form-control"
                                            placeholder="contoh: PIPA SEAMLESS SCH 40 / ELBOW 90"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Material Spec</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.spec}
                                                onChange={e => setFormData({ ...formData, spec: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Size</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.size}
                                                onChange={e => setFormData({ ...formData, size: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Jumlah (Qty)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                className="form-control"
                                                value={formData.qty}
                                                onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Satuan (Unit)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.unit}
                                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Heat Number</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="contoh: H-88239"
                                                value={formData.heat_no}
                                                onChange={e => setFormData({ ...formData, heat_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">PO Number</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.po_no}
                                                onChange={e => setFormData({ ...formData, po_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Lokasi Yard / Rak</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-semibold">Requestor / Pemohon</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="contoh: Workshop Shop"
                                                value={formData.requestor}
                                                onChange={e => setFormData({ ...formData, requestor: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" disabled={loading} className="btn btn-warning text-dark fw-bold btn-sm">
                                        {loading ? 'Menyimpan...' : 'Simpan Mutasi'}
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
