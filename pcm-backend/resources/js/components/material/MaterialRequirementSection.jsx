import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { PcmSelect } from '../SearchSelect';

const EMPTY_SUMMARY = {
    total_lines: 0,
    shortage_lines: 0,
    fulfilled_lines: 0,
    to_procure_lines: 0,
};

const formatQty = (value) => (parseFloat(value) || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export function MaterialRequirementSection({ user, onToast }) {
    const [data, setData] = useState({ summary: EMPTY_SUMMARY, rows: [] });
    const [projects, setProjects] = useState([]);
    const [drawings, setDrawings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        project_id: '',
        drawing_id: '',
        status: 'ALL',
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();

            if (filters.search.trim()) params.set('search', filters.search.trim());
            if (filters.project_id) params.set('project_id', filters.project_id);
            if (filters.drawing_id) params.set('drawing_id', filters.drawing_id);
            if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);

            const result = await api.get(`/material-requirements${params.toString() ? `?${params.toString()}` : ''}`);
            setData({
                summary: result?.summary || EMPTY_SUMMARY,
                rows: Array.isArray(result?.rows) ? result.rows : [],
            });
        } catch (err) {
            setError(err.message || 'Gagal memuat dashboard kebutuhan material.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timer = setTimeout(loadData, 250);

        return () => clearTimeout(timer);
    }, [loadData]);

    useEffect(() => {
        let active = true;

        Promise.all([api.get('/projects'), api.get('/drawings')])
            .then(([projectData, drawingData]) => {
                if (!active) return;
                setProjects(Array.isArray(projectData) ? projectData : []);
                setDrawings(Array.isArray(drawingData) ? drawingData : []);
            })
            .catch((err) => console.error('Failed to load requirement filters:', err));

        return () => {
            active = false;
        };
    }, []);

    const drawingOptions = useMemo(() => {
        if (!filters.project_id) return drawings;

        return drawings.filter((drawing) => String(drawing.project_id) === String(filters.project_id));
    }, [drawings, filters.project_id]);

    const rows = data.rows || [];
    const summary = data.summary || EMPTY_SUMMARY;

    const resetFilters = () => {
        setFilters({ search: '', project_id: '', drawing_id: '', status: 'ALL' });
    };

    return (
        <div className="section-material-requirement">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="h4 text-dark mb-1" style={{ fontWeight: 700 }}>
                        Kebutuhan Material (BOM vs Issuing vs Stok)
                    </h2>
                    <p className="text-muted small mb-0">
                        Rekonsiliasi material per drawing, spool, dan kode standar: kebutuhan Engineering BOM/MTO, realisasi issuing, stok tersedia, dan material yang masih perlu pengadaan.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-primary px-3 py-2"
                    onClick={loadData}
                    disabled={loading}
                >
                    {loading ? 'Memuat...' : 'Muat Ulang'}
                </button>
            </div>

            {error && (
                <div className="alert alert-danger py-2 small">{error}</div>
            )}

            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #1d4ed8' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Baris Kebutuhan</span>
                            <div className="h3 mb-0 fw-bold text-dark">{summary.total_lines}</div>
                            <span className="text-muted small">drawing/spool/kode unik</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b91c1c' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Belum Terpenuhi</span>
                            <div className="h3 mb-0 fw-bold text-danger">{summary.shortage_lines}</div>
                            <span className="text-muted small">issued &lt; required</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #15803d' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Terpenuhi</span>
                            <div className="h3 mb-0 fw-bold text-success">{summary.fulfilled_lines}</div>
                            <span className="text-muted small">issued &ge; required</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: '4px solid #b45309' }}>
                        <div className="card-body py-3">
                            <span className="text-muted small text-uppercase fw-bold">Perlu Pengadaan</span>
                            <div className="h3 mb-0 fw-bold text-warning">{summary.to_procure_lines}</div>
                            <span className="text-muted small">stok &lt; sisa kebutuhan</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari drawing, spool, kode standar, deskripsi..."
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                        <div className="col-6 col-md-3">
                            <PcmSelect
                                
                                value={filters.project_id}
                                onChange={(e) => setFilters((prev) => ({
                                    ...prev,
                                    project_id: e.target.value,
                                    drawing_id: '',
                                }))}
                            >
                                <option value="">Semua Project</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </PcmSelect>
                        </div>
                        <div className="col-6 col-md-3">
                            <PcmSelect
                                
                                value={filters.drawing_id}
                                onChange={(e) => setFilters((prev) => ({ ...prev, drawing_id: e.target.value }))}
                            >
                                <option value="">Semua Drawing</option>
                                {drawingOptions.map((drawing) => (
                                    <option key={drawing.id} value={drawing.id}>{drawing.drawing_no}</option>
                                ))}
                            </PcmSelect>
                        </div>
                        <div className="col-6 col-md-2">
                            <PcmSelect
                                
                                value={filters.status}
                                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="ALL">Semua Status</option>
                                <option value="SHORTAGE">Belum Terpenuhi</option>
                                <option value="FULFILLED">Terpenuhi</option>
                            </PcmSelect>
                        </div>
                        <div className="col-6 col-md-12 col-xl-2 text-md-end">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>
                                Reset Filter
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                            <thead className="table-light text-muted text-uppercase" style={{ fontSize: '0.76rem', letterSpacing: '0.4px' }}>
                                <tr>
                                    <th className="px-3 py-3">Drawing / Spool</th>
                                    <th className="py-3">Kode Std</th>
                                    <th className="py-3">Material</th>
                                    <th className="py-3 text-end">Required</th>
                                    <th className="py-3 text-end">Issued</th>
                                    <th className="py-3 text-end">Sisa</th>
                                    <th className="py-3 text-end">Stok</th>
                                    <th className="py-3 text-end">Diterima</th>
                                    <th className="py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-4 text-muted">
                                            Memuat rekonsiliasi kebutuhan material...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-4 text-muted">
                                            Belum ada BOM yang bisa direkonsiliasi. Pastikan Engineering sudah mengisi BOM/MTO dan kode standar material.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.key}>
                                            <td className="px-3">
                                                <div className="fw-semibold text-dark font-monospace">{row.drawing_no || '—'}</div>
                                                <div className="text-muted small">
                                                    {row.spool_no || 'Tanpa spool'}
                                                    {row.bom_lines > 1 ? ` • ${row.bom_lines} baris BOM` : ''}
                                                </div>
                                            </td>
                                            <td>
                                                {row.standard_code ? (
                                                    <span className="badge bg-light text-dark border font-monospace">{row.standard_code}</span>
                                                ) : (
                                                    <span className="text-muted small">TANPA KODE</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="fw-semibold text-dark">{row.description || row.component_type || '—'}</div>
                                                <div className="text-muted small">
                                                    {row.component_type || 'Material'}
                                                    {row.specification ? ` • ${row.specification}` : ''}
                                                    {row.size ? ` • ${row.size}` : ''}
                                                </div>
                                            </td>
                                            <td className="text-end text-nowrap fw-semibold">
                                                {formatQty(row.required_qty)} {row.unit}
                                            </td>
                                            <td className="text-end text-nowrap text-primary fw-semibold">
                                                {formatQty(row.issued_qty)} {row.unit}
                                            </td>
                                            <td className="text-end text-nowrap">
                                                {row.surplus_qty > 0 ? (
                                                    <span className="text-info">+{formatQty(row.surplus_qty)} {row.unit}</span>
                                                ) : (
                                                    <span className={row.remaining_qty > 0 ? 'text-danger fw-semibold' : 'text-success'}>
                                                        {formatQty(row.remaining_qty)} {row.unit}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-end text-nowrap">
                                                <div className="fw-semibold text-dark">{formatQty(row.stock_balance)} {row.unit}</div>
                                                <div className={`small ${row.procurement === 'STOCK_READY' ? 'text-success' : 'text-warning'}`}>
                                                    {row.procurement === 'STOCK_READY' ? 'Stok siap' : 'Perlu pengadaan'}
                                                </div>
                                            </td>
                                            <td className="text-end text-nowrap text-muted">
                                                {formatQty(row.received_qty)} {row.unit}
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${row.status === 'FULFILLED' ? 'bg-success' : 'bg-danger'}`}>
                                                    {row.status === 'FULFILLED' ? 'Terpenuhi' : 'Belum'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="text-muted small mt-3">
                Stok dan qty diterima dihitung per kode standar material (atau spesifikasi + ukuran + satuan untuk data lama tanpa kode). Qty diterima hanya dari receiving berstatus ACCEPTED.
            </div>
        </div>
    );
}
