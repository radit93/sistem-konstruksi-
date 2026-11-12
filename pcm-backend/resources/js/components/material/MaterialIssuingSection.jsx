import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { confirmDelete } from '../../confirm';
import { MaterialDocumentsModal } from './MaterialDocumentsModal';
import { MaterialReportModal } from './MaterialReportModal';
import { PcmSelect } from '../SearchSelect';
import { defaultProjectId, scopeRows } from '../engineering/projectScope';

export function MaterialIssuingSection({
    user,
    onToast,
    projects = [],
    activeProjectId = '',
    filterProject = 'ALL',
}) {
    const [issuings, setIssuings] = useState([]);
    const [storings, setStorings] = useState([]);
    const [standards, setStandards] = useState([]);
    const [drawings, setDrawings] = useState([]);
    const [boms, setBoms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [documentSubject, setDocumentSubject] = useState(null);
    const [reportOpen, setReportOpen] = useState(false);

    const [form, setForm] = useState({
        issue_date: new Date().toISOString().split('T')[0],
        issue_no: '',
        requestor: 'Workshop Spool Fab - Team A (Foreman Sukardi)',
        vendor: '',
        target_spool_no: 'SP-01',
        target_line_no: '15-MPP-AB',
        drawing_no: '2428-M-15-MPP-AB-SHT1',
        drawing_id: '',
        bom_id: '',
        material_storing_id: '',
        material_standard_id: '',
        item_name: 'Pipe Seamless CS 4" Sch 40',
        description: '',
        specification: 'ASTM A106 Gr. B',
        size: '4"',
        schedule_rating: 'Sch 40',
        qty: 1,
        unit: 'meter',
        heat_no: 'HT-99421A',
        mtc_no: '',
        issued_by: 'Material Control (Agus W.)',
        remarks: ''
    });

    const canEdit = can(user, 'stock.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [issData, stkData, standardData, drawingData, bomData] = await Promise.all([
                api.get('/material-issuings'),
                api.get('/material-storings'),
                api.get('/material-standards'),
                api.get('/drawings'),
                api.get('/bill-of-materials')
            ]);
            setIssuings(Array.isArray(issData) ? issData : []);
            setStorings(Array.isArray(stkData) ? stkData : []);
            setStandards(Array.isArray(standardData) ? standardData : []);
            setDrawings(Array.isArray(drawingData) ? drawingData : []);
            setBoms(Array.isArray(bomData) ? bomData : []);
        } catch (err) {
            console.error('Failed to load material issuing data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const scopedIssuings = useMemo(
        () => scopeRows(issuings, activeProjectId, filterProject),
        [issuings, activeProjectId, filterProject]
    );

    const scopedStorings = useMemo(
        () => scopeRows(storings, activeProjectId, filterProject),
        [storings, activeProjectId, filterProject]
    );

    // Opsi stok mengikuti project terpilih; baris yang sedang diedit tetap
    // ditampilkan walau berada di luar scope supaya nilai dropdown tidak hilang.
    const stockOptions = useMemo(() => {
        if (!form.material_storing_id) return scopedStorings;
        const current = storings.find(s => String(s.id) === String(form.material_storing_id));
        if (!current || scopedStorings.some(s => String(s.id) === String(current.id))) return scopedStorings;
        return [current, ...scopedStorings];
    }, [scopedStorings, storings, form.material_storing_id]);

    const stats = useMemo(() => {
        const totalSlips = scopedIssuings.length;
        const totalSpoolsTargeted = new Set(scopedIssuings.map(i => i.target_spool_no).filter(Boolean)).size;
        const totalPipesIssued = scopedIssuings
            .filter(i => i.unit === 'meter')
            .reduce((acc, i) => acc + (parseFloat(i.qty) || 0), 0);
        const totalFittingsIssued = scopedIssuings
            .filter(i => i.unit === 'pcs')
            .reduce((acc, i) => acc + (parseFloat(i.qty) || 0), 0);
        return { totalSlips, totalSpoolsTargeted, totalPipesIssued, totalFittingsIssued };
    }, [scopedIssuings]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return scopedIssuings.filter(item => {
            return !q ||
                (item.issue_no || '').toLowerCase().includes(q) ||
                (item.requestor || '').toLowerCase().includes(q) ||
                (item.target_spool_no || '').toLowerCase().includes(q) ||
                (item.target_line_no || '').toLowerCase().includes(q) ||
                (item.drawing_no || '').toLowerCase().includes(q) ||
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.material_standard?.code || '').toLowerCase().includes(q) ||
                (item.heat_no || '').toLowerCase().includes(q);
        });
    }, [scopedIssuings, search]);

    const bomOptions = useMemo(() => {
        if (!form.drawing_id) return boms;

        return boms.filter((bom) => String(bom.drawing_id) === String(form.drawing_id));
    }, [boms, form.drawing_id]);

    const selectedStock = useMemo(() => (
        form.material_storing_id
            ? storings.find((stock) => String(stock.id) === String(form.material_storing_id))
            : null
    ), [storings, form.material_storing_id]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        if (item) {
            setEditingItem(item);
            setForm({
                issue_date: item.issue_date || '',
                issue_no: item.issue_no || '',
                requestor: item.requestor || '',
                vendor: item.vendor || '',
                target_spool_no: item.target_spool_no || '',
                target_line_no: item.target_line_no || '',
                drawing_no: item.drawing_no || '',
                drawing_id: item.drawing_id || '',
                bom_id: item.bom_id || '',
                material_storing_id: item.material_storing_id || '',
                material_standard_id: item.material_standard_id || '',
                item_name: item.item_name || '',
                description: item.description || '',
                specification: item.specification || '',
                size: item.size || '',
                schedule_rating: item.schedule_rating || '',
                qty: item.qty || 1,
                unit: item.unit || 'meter',
                heat_no: item.heat_no || '',
                mtc_no: item.mtc_no || '',
                issued_by: item.issued_by || 'Material Control',
                remarks: item.remarks || ''
            });
        } else {
            setEditingItem(null);
            setForm({
                issue_date: new Date().toISOString().split('T')[0],
                issue_no: `MIS-2428-${(issuings.length + 1).toString().padStart(3, '0')}`,
                requestor: 'Workshop Spool Fab - Team A (Foreman Sukardi)',
                vendor: '',
                target_spool_no: 'SP-01',
                target_line_no: '15-MPP-AB',
                drawing_no: '2428-M-15-MPP-AB-SHT1',
                drawing_id: '',
                bom_id: '',
                material_storing_id: '',
                material_standard_id: '',
                item_name: 'Pipe Seamless CS 4" Sch 40',
                description: '',
                specification: 'ASTM A106 Gr. B',
                size: '4"',
                schedule_rating: 'Sch 40',
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
        if (!stkId) {
            setForm(prev => ({ ...prev, material_storing_id: '' }));
            return;
        }

        const found = storings.find(s => s.id === parseInt(stkId));
        if (found) {
            setForm(prev => ({
                ...prev,
                material_storing_id: found.id,
                material_standard_id: found.material_standard_id || prev.material_standard_id,
                item_name: found.item_name,
                description: found.item_name,
                specification: found.specification,
                size: found.size,
                schedule_rating: found.schedule_rating || prev.schedule_rating,
                vendor: found.receiving?.vendor || prev.vendor,
                unit: found.unit,
                heat_no: found.heat_no || '',
                mtc_no: found.mtc_no || found.receiving?.mtc_no || prev.mtc_no || ''
            }));
        }
    };

    const handleSelectDrawing = (drawingId) => {
        const found = drawings.find((drawing) => String(drawing.id) === String(drawingId));

        setForm((prev) => ({
            ...prev,
            drawing_id: found?.id || '',
            drawing_no: found?.drawing_no || prev.drawing_no,
            bom_id: '',
        }));
    };

    const handleSelectBom = (bomId) => {
        const found = boms.find((bom) => String(bom.id) === String(bomId));

        if (!found) {
            setForm((prev) => ({ ...prev, bom_id: '' }));
            return;
        }

        // Auto-matching FIFO: Cari stok yang paling sesuai dan balance > 0
        const availableStorings = storings
            .filter(s => (parseFloat(s.balance) || 0) > 0)
            .sort((a, b) => Number(a.id) - Number(b.id));
        let matchedStock = null;

        if (found.material_standard_id) {
            matchedStock = availableStorings.find(s => (
                String(s.material_standard_id) === String(found.material_standard_id)
                && (!found.unit || String(s.unit).toLowerCase() === String(found.unit).toLowerCase())
            ));
        }

        if (!matchedStock) {
            // Fallback: exact specification, size, and unit; tetap mengambil lot tertua.
            const normalize = (value) => String(value || '').trim().toLowerCase();
            matchedStock = availableStorings.find(s => (
                (!found.material_spec || normalize(s.specification) === normalize(found.material_spec))
                && (!found.size || normalize(s.size) === normalize(found.size))
                && (!found.unit || normalize(s.unit) === normalize(found.unit))
            ));
        }

        setForm((prev) => {
            const st = matchedStock;
            return {
                ...prev,
                bom_id: found.id,
                drawing_id: found.drawing_id || prev.drawing_id,
                drawing_no: found.drawing?.drawing_no || prev.drawing_no,
                target_spool_no: found.spool_no || prev.target_spool_no,
                material_storing_id: st ? st.id : prev.material_storing_id,
                material_standard_id: st?.material_standard_id || found.material_standard_id || prev.material_standard_id,
                item_name: st?.item_name || found.description || prev.item_name,
                description: st?.item_name || found.description || prev.description,
                specification: st?.specification || found.material_spec || prev.specification,
                size: st?.size || found.size || prev.size,
                schedule_rating: st?.schedule_rating || found.rating_sch || prev.schedule_rating,
                unit: st?.unit || found.unit || prev.unit,
                vendor: st?.receiving?.vendor || prev.vendor,
                heat_no: st?.heat_no || prev.heat_no,
                mtc_no: st?.mtc_no || st?.receiving?.mtc_no || prev.mtc_no,
                qty: parseFloat(found.qty) || prev.qty,
            };
        });
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

        const selectedStock = form.material_storing_id
            ? storings.find(s => s.id === parseInt(form.material_storing_id))
            : null;
        const payload = {
            ...form,
            drawing_id: form.drawing_id || null,
            bom_id: form.bom_id || null,
            material_storing_id: form.material_storing_id || null,
            material_standard_id: form.material_standard_id || null,
        };

        if (!editingItem) {
            const projectId = defaultProjectId(activeProjectId, filterProject, projects);
            if (projectId) payload.project_id = projectId;
        }

        if (!editingItem && selectedStock
            && (parseFloat(form.qty) || 0) > (parseFloat(selectedStock.balance) || 0)) {
            setFormError(`Stok tidak cukup. Sisa ${selectedStock.balance} ${selectedStock.unit}.`);
            setFormLoading(false);
            return;
        }

        try {
            if (editingItem) {
                await api.put(`/material-issuings/${editingItem.id}`, payload);
            } else {
                await api.post('/material-issuings', payload);
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
        if (!(await confirmDelete('Batalkan issuing ini? Stok akan dikembalikan ke lot asal.'))) return;
        try {
            await api.del(`/material-issuings/${id}`);
            loadData();
            if (onToast) onToast();
        } catch (err) {
            alert('Gagal membatalkan: ' + err.message);
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
                <div className="d-flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary px-3 py-2"
                        onClick={() => setReportOpen(true)}
                    >
                        Cetak Laporan
                    </button>
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
                            {filtered.length} dari {scopedIssuings.length} slip pengeluaran
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
                                                {item.bom_id && (
                                                    <div className="text-muted small">BOM #{item.bom_id}</div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="fw-semibold text-dark">{item.item_name}</div>
                                                {item.description && item.description !== item.item_name && (
                                                    <div className="text-muted small">{item.description}</div>
                                                )}
                                                {item.material_standard?.code && (
                                                    <div className="text-muted small font-monospace">
                                                        {item.material_standard.code}
                                                    </div>
                                                )}
                                                {item.storing && (
                                                    <div className="text-muted small font-monospace">
                                                        Lot {item.storing.item_code}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-nowrap small text-muted">
                                                {item.specification} ({item.size}{item.schedule_rating ? ` / ${item.schedule_rating}` : ''})
                                                {item.vendor && (
                                                    <div className="small">Vendor: {item.vendor}</div>
                                                )}
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
                                                        className="btn btn-sm btn-outline-primary me-1 py-1 px-2"
                                                        onClick={() => setDocumentSubject(item)}
                                                    >
                                                        Dokumen {item.documents?.length ? `(${item.documents.length})` : ''}
                                                    </button>
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
                                                        Batalkan
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

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Drawing Isometrik (Master)</label>
                                            <PcmSelect
                                                
                                                value={form.drawing_id}
                                                onChange={(e) => handleSelectDrawing(e.target.value)}
                                            >
                                                <option value="">-- Pilih drawing / isometrik --</option>
                                                {drawings.map((drawing) => (
                                                    <option key={drawing.id} value={drawing.id}>
                                                        {drawing.drawing_no} — {drawing.line_no || drawing.title || 'Tanpa line'}
                                                    </option>
                                                ))}
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Baris BOM / MTO</label>
                                            <PcmSelect
                                                
                                                value={form.bom_id}
                                                onChange={(e) => handleSelectBom(e.target.value)}
                                            >
                                                <option value="">-- Tanpa link BOM / MTO --</option>
                                                {bomOptions.map((bom) => (
                                                    <option key={bom.id} value={bom.id}>
                                                        {bom.spool_no || 'Tanpa spool'} · Item {bom.item_no} — {bom.description}
                                                        {bom.material_standard?.code ? ` [${bom.material_standard.code}]` : ''}
                                                        {` (butuh ${parseFloat(bom.qty || 0).toLocaleString('id-ID')} ${bom.unit})`}
                                                    </option>
                                                ))}
                                            </PcmSelect>
                                            <div className="form-text">
                                                Pilih baris BOM agar issuing ini dihitung pada dashboard Kebutuhan Material.
                                            </div>
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
                                            <PcmSelect
                                                className={form.material_storing_id ? 'pcm-select-ok' : ''}
                                                value={form.material_storing_id || ''}
                                                disabled={Boolean(editingItem)}
                                                onChange={(e) => handleSelectStock(e.target.value)}
                                            >
                                                <option value="">-- Isi Manual atau Pilih dari Stok --</option>
                                                {stockOptions.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.item_code} - {s.item_name} (Sisa: {s.balance} {s.unit})
                                                        {s.material_standard?.code ? ` | ${s.material_standard.code}` : ''}
                                                        {s.heat_no ? ` | Heat ${s.heat_no}` : ''}
                                                    </option>
                                                ))}
                                            </PcmSelect>
                                            {form.bom_id && form.material_storing_id && (
                                                <div className="text-success small mt-1">
                                                    <i className="bi bi-check-circle-fill me-1"></i>
                                                    Otomatis terpilih (FIFO) sesuai BOM
                                                </div>
                                            )}
                                            {form.bom_id && !form.material_storing_id && (
                                                <div className="text-danger small mt-1">
                                                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                                    Stok tidak ditemukan di gudang (Shortage)
                                                </div>
                                            )}
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

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Kode Standar Material</label>
                                            <PcmSelect
                                                
                                                value={form.material_standard_id}
                                                onChange={(e) => setForm({ ...form, material_standard_id: e.target.value })}
                                                disabled={Boolean(selectedStock?.material_standard_id || editingItem?.material_standard_id)}
                                            >
                                                <option value="">Tanpa kode standar (cocokkan via teks)</option>
                                                {standards.map((standard) => (
                                                    <option key={standard.id} value={standard.id}>
                                                        {standard.code} — {standard.specification} ({standard.category})
                                                    </option>
                                                ))}
                                            </PcmSelect>
                                            <div className="form-text">
                                                Otomatis mengikuti lot stok/BOM. Kode ini yang dipakai untuk rekonsiliasi kebutuhan.
                                            </div>
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Vendor / Supplier</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Nama vendor"
                                                value={form.vendor}
                                                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Deskripsi Material</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Deskripsi sesuai form issuing"
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-secondary">Ukuran Nominal</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={form.size}
                                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-secondary">Sch / Class</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Sch 40 / 150#"
                                                value={form.schedule_rating}
                                                onChange={(e) => setForm({ ...form, schedule_rating: e.target.value })}
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
                                            <PcmSelect
                                                
                                                value={form.unit}
                                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            >
                                                <option value="meter">meter</option>
                                                <option value="pcs">pcs</option>
                                                <option value="set">set</option>
                                                <option value="kg">kg</option>
                                            </PcmSelect>
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

            <MaterialDocumentsModal
                open={Boolean(documentSubject)}
                subjectType="issuing"
                subject={documentSubject}
                canEdit={canEdit}
                onClose={() => setDocumentSubject(null)}
                onChanged={loadData}
            />

            <MaterialReportModal
                open={reportOpen}
                reportType="issuing"
                initialFilters={{ project_id: activeProjectId, search }}
                onClose={() => setReportOpen(false)}
            />
        </div>
    );
}
