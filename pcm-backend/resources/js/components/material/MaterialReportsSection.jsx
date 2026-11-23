import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { PcmSelect } from '../SearchSelect';

const REPORT_TABS = [
    {
        id: 'receiving',
        label: 'Receiving Report',
        title: 'Material Receiving Report',
        documentNo: 'MAT-000/FE',
        endpoint: '/material-reports/receiving',
        description: 'Penerimaan material per surat jalan, vendor, dan hasil inspeksi QC.',
    },
    {
        id: 'issuing',
        label: 'Issuing Report',
        title: 'Material Issuing Report',
        documentNo: 'MAT-005/FE',
        endpoint: '/material-reports/issuing',
        description: 'Pengeluaran material ke workshop/spool fab atau area konstruksi.',
    },
    {
        id: 'stock',
        label: 'Stock List',
        title: 'Material Stock List',
        documentNo: 'MAT-002/FE',
        endpoint: '/material-reports/stock',
        description: 'Saldo stok, mutasi masuk/keluar, safety stock, dan lokasi material.',
    },
    {
        id: 'location-map',
        label: 'Mapping Location',
        title: 'Mapping Material Location',
        documentNo: 'MAT-003/FE',
        endpoint: '/material-reports/location-map',
        description: 'Peta lokasi material berdasarkan open yard dan warehouse.',
    },
];

const EMPTY_REPORT = { meta: null, summary: {}, rows: [] };

const DEFAULT_FILTERS = {
    project_id: '',
    search: '',
    date_from: '',
    date_to: '',
    status: 'ALL',
    storage_type: 'ALL',
    category: 'ALL',
    stock_status: 'ALL',
    location: '',
};

const CATEGORY_OPTIONS = ['PIPE', 'FITTING', 'FLANGE', 'VALVE', 'FASTENER', 'GASKET', 'CONSUMABLE'];

const formatNumber = (value, maximumFractionDigits = 2) => (
    Number(value) || 0
).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
});

const formatDate = (value) => {
    if (!value) return '-';

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID');
};

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID');
};

const storageTypeLabel = (value) => (
    value === 'OPEN_YARD' ? 'Open Yard' : value === 'WAREHOUSE' ? 'Warehouse' : (value || '-')
);

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadCsv = (filename, headers, rows) => {
    const lines = [
        headers.map(csvCell).join(','),
        ...rows.map((row) => row.map(csvCell).join(',')),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const reportConfig = (id) => REPORT_TABS.find((tab) => tab.id === id) || REPORT_TABS[0];

function UnitTotals({ totals = [] }) {
    if (!totals.length) return null;

    return (
        <div className="d-flex flex-wrap gap-2 mt-2">
            {totals.map((total) => (
                <span key={total.unit} className="badge text-bg-light border text-dark">
                    {Object.entries(total)
                        .filter(([key]) => key !== 'unit')
                        .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${formatNumber(value)}`)
                        .join(' · ')}
                    {' '}{total.unit}
                </span>
            ))}
        </div>
    );
}

function SummaryCards({ reportType, report }) {
    const summary = report.summary || {};

    const cards = useMemo(() => {
        if (reportType === 'receiving') {
            return [
                ['Total Batch', summary.total_batches],
                ['Accepted', summary.accepted_batches],
                ['Menunggu QC', summary.pending_batches],
                ['Hold / Reject', (summary.hold_batches || 0) + (summary.rejected_batches || 0)],
                ['Dokumen', summary.total_documents],
            ];
        }

        if (reportType === 'issuing') {
            return [
                ['Total Slip', summary.total_slips],
                ['Slip Aktif', summary.active_slips],
                ['Dibatalkan', summary.cancelled_slips],
                ['Dokumen', summary.total_documents],
            ];
        }

        if (reportType === 'stock') {
            return [
                ['Total Item', summary.total_items],
                ['Stok Tersedia', summary.available_items],
                ['Stok Kosong', summary.empty_items],
                ['Stok Kritis', summary.low_stock_items],
                ['Lokasi', summary.total_locations],
            ];
        }

        return [
            ['Lokasi', summary.total_locations],
            ['Total Item', summary.total_items],
            ['Open Yard', summary.open_yard_locations],
            ['Warehouse', summary.warehouse_locations],
            ['Dokumen Denah', summary.mapping_documents],
        ];
    }, [reportType, summary]);

    return (
        <>
            <div className="row g-2 mb-3">
                {cards.map(([label, value]) => (
                    <div key={label} className="col-6 col-md">
                        <div className="border rounded-3 p-2 h-100 bg-light">
                            <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                                {label}
                            </div>
                            <div className="fw-bold text-dark" style={{ fontSize: '1.15rem' }}>
                                {formatNumber(value, 0)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <UnitTotals totals={summary.unit_totals || []} />
        </>
    );
}

function ReportHeader({ config, meta, projectName, filterSummary }) {
    return (
        <div className="border-bottom pb-3 mb-3">
            <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                    <div className="fw-bold text-dark" style={{ letterSpacing: '0.08em' }}>PCM PIPING SUITE</div>
                    <div className="text-muted small">Material Control Department · Job No. 2428</div>
                </div>
                <div className="text-end">
                    <div className="text-muted small text-uppercase">No. Dokumen</div>
                    <div className="fw-bold font-monospace">{meta?.document_no || config.documentNo}</div>
                    <div className="text-muted small">Revisi 0</div>
                </div>
            </div>

            <div className="text-center my-3">
                <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.35rem' }}>{meta?.title || config.title}</h2>
                <div className="text-muted small">{config.description}</div>
            </div>

            <div className="row g-2 small">
                <div className="col-12 col-md-5">
                    <span className="text-muted">Project:</span>{' '}
                    <span className="fw-semibold text-dark">{projectName || '-'}</span>
                </div>
                <div className="col-12 col-md-4">
                    <span className="text-muted">Dicetak:</span>{' '}
                    <span className="fw-semibold text-dark">{formatDateTime(meta?.generated_at || new Date().toISOString())}</span>
                </div>
                <div className="col-12 col-md-3">
                    <span className="text-muted">Oleh:</span>{' '}
                    <span className="fw-semibold text-dark">{meta?.generated_by || '-'}</span>
                </div>
                <div className="col-12">
                    <span className="text-muted">Filter:</span>{' '}
                    <span className="text-dark">{filterSummary || 'Semua data'}</span>
                </div>
            </div>
        </div>
    );
}

function TableShell({ children }) {
    return (
        <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle pcm-report-table mb-0" style={{ fontSize: '0.76rem' }}>
                {children}
            </table>
        </div>
    );
}

function ReceivingTable({ rows }) {
    return (
        <TableShell>
            <thead className="table-light">
                <tr>
                    <th style={{ width: '34px' }}>No</th>
                    <th>Tanggal</th>
                    <th>Surat Jalan / Package</th>
                    <th>PO / Vendor</th>
                    <th>Material</th>
                    <th>Spesifikasi / Size</th>
                    <th className="text-end">Qty</th>
                    <th>Heat / MTC</th>
                    <th>Lokasi</th>
                    <th>Status / QC</th>
                    <th>Ket / Dok</th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr><td colSpan="11" className="text-center text-muted py-4">Tidak ada data penerimaan pada filter ini.</td></tr>
                ) : rows.map((row, index) => (
                    <tr key={row.id}>
                        <td className="text-center">{index + 1}</td>
                        <td className="text-nowrap">{formatDate(row.arrival_date)}</td>
                        <td>
                            <div className="fw-semibold">{row.shipment_no}</div>
                            <div className="text-muted small">{row.line_no || '-'}</div>
                        </td>
                        <td>
                            <div className="fw-semibold">{row.po_no}</div>
                            <div className="text-muted small">{row.vendor}</div>
                        </td>
                        <td>
                            <div className="fw-semibold">{row.item_name}</div>
                            <div className="text-muted small">{row.description}</div>
                        </td>
                        <td>
                            <div>{row.specification}</div>
                            <div className="text-muted small">{row.size} · {row.schedule_rating || '-'}</div>
                        </td>
                        <td className="text-end text-nowrap">
                            <div className="fw-semibold">{formatNumber(row.qty)} {row.unit}</div>
                            {row.accepted_qty !== null && row.accepted_qty !== undefined && (
                                <div className="text-success small">ACC {formatNumber(row.accepted_qty)}</div>
                            )}
                        </td>
                        <td>
                            <div>{row.heat_no}</div>
                            <div className="text-muted small">{row.mtc_no || '-'}</div>
                        </td>
                        <td>
                            <div>{storageTypeLabel(row.storage_type)}</div>
                            <div className="text-muted small">{row.storage_location || '-'}</div>
                        </td>
                        <td>
                            <div className="fw-semibold">{row.status}</div>
                            <div className="text-muted small">{row.inspection_result || 'Belum inspeksi'}</div>
                        </td>
                        <td>
                            <div>{row.remarks || '-'}</div>
                            <div className="text-muted small">{row.documents_count || 0} dokumen</div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </TableShell>
    );
}

function IssuingTable({ rows }) {
    return (
        <TableShell>
            <thead className="table-light">
                <tr>
                    <th style={{ width: '34px' }}>No</th>
                    <th>Tanggal</th>
                    <th>No. Issuing</th>
                    <th>Requestor / Vendor</th>
                    <th>Drawing / Spool / Line</th>
                    <th>Material</th>
                    <th>Spesifikasi / Size</th>
                    <th className="text-end">Qty</th>
                    <th>Heat / Lot</th>
                    <th>Status</th>
                    <th>Ket / Dok</th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr><td colSpan="11" className="text-center text-muted py-4">Tidak ada data pengeluaran pada filter ini.</td></tr>
                ) : rows.map((row, index) => (
                    <tr key={row.id}>
                        <td className="text-center">{index + 1}</td>
                        <td className="text-nowrap">{formatDate(row.issue_date)}</td>
                        <td className="fw-semibold">{row.issue_no}</td>
                        <td>
                            <div>{row.requestor || '-'}</div>
                            <div className="text-muted small">{row.vendor || '-'}</div>
                        </td>
                        <td>
                            <div>{row.drawing_no || '-'}</div>
                            <div className="text-muted small">{row.target_spool_no || '-'} · {row.target_line_no || '-'}</div>
                        </td>
                        <td>
                            <div className="fw-semibold">{row.item_name}</div>
                            <div className="text-muted small">{row.description || row.standard_code || '-'}</div>
                        </td>
                        <td>
                            <div>{row.specification}</div>
                            <div className="text-muted small">{row.size} · {row.schedule_rating || '-'}</div>
                        </td>
                        <td className="text-end text-nowrap fw-semibold">{formatNumber(row.qty)} {row.unit}</td>
                        <td>
                            <div>{row.heat_no || '-'}</div>
                            <div className="text-muted small">{row.lot_code || '-'}</div>
                        </td>
                        <td className="fw-semibold">{row.status}</td>
                        <td>
                            <div>{row.remarks || '-'}</div>
                            <div className="text-muted small">{row.documents_count || 0} dokumen</div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </TableShell>
    );
}

function StockTable({ rows }) {
    return (
        <TableShell>
            <thead className="table-light">
                <tr>
                    <th style={{ width: '34px' }}>No</th>
                    <th>Item Code / Nama</th>
                    <th>Kategori</th>
                    <th>Spesifikasi / Size</th>
                    <th>Line / Heat</th>
                    <th>Lokasi</th>
                    <th className="text-end">Masuk</th>
                    <th className="text-end">Keluar</th>
                    <th className="text-end">Saldo</th>
                    <th className="text-end">Min.</th>
                    <th>Status</th>
                    <th>Dok</th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr><td colSpan="12" className="text-center text-muted py-4">Tidak ada stok pada filter ini.</td></tr>
                ) : rows.map((row, index) => (
                    <tr key={row.id} className={row.low_stock ? 'table-warning' : ''}>
                        <td className="text-center">{index + 1}</td>
                        <td>
                            <div className="fw-semibold font-monospace">{row.item_code}</div>
                            <div className="text-muted small">{row.item_name}</div>
                        </td>
                        <td>{row.category || '-'}</td>
                        <td>
                            <div>{row.specification}</div>
                            <div className="text-muted small">{row.size} · {row.schedule_rating || '-'}</div>
                        </td>
                        <td>
                            <div>{row.line_no || '-'}</div>
                            <div className="text-muted small">{row.heat_no || '-'}</div>
                        </td>
                        <td>
                            <div>{storageTypeLabel(row.storage_type)}</div>
                            <div className="text-muted small">{row.location_detail || '-'}</div>
                        </td>
                        <td className="text-end">{formatNumber(row.stock_in)}</td>
                        <td className="text-end">{formatNumber(row.stock_out)}</td>
                        <td className="text-end fw-bold">{formatNumber(row.balance)} {row.unit}</td>
                        <td className="text-end">{formatNumber(row.min_stock_alert)}</td>
                        <td className="fw-semibold">{row.low_stock ? 'LOW' : (row.status || 'OK')}</td>
                        <td className="text-center">{row.documents_count || 0}</td>
                    </tr>
                ))}
            </tbody>
        </TableShell>
    );
}

function LocationMapView({ rows, onDownloadDocument, downloadingDocumentId }) {
    const zones = ['OPEN_YARD', 'WAREHOUSE'];

    return (
        <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center border rounded-3 bg-light p-2 mb-3 small">
                <div className="fw-semibold text-dark">Peta Lokasi Material</div>
                <div className="d-flex gap-3">
                    <span><span className="d-inline-block rounded-1 me-1" style={{ width: 10, height: 10, backgroundColor: '#f59e0b' }} />Open Yard</span>
                    <span><span className="d-inline-block rounded-1 me-1" style={{ width: 10, height: 10, backgroundColor: '#2563eb' }} />Warehouse</span>
                </div>
            </div>

            <div className="pcm-map-grid">
                {zones.map((zone) => {
                    const zoneRows = rows.filter((row) => row.storage_type === zone);

                    return (
                        <div key={zone} className={`pcm-map-zone pcm-map-zone-${zone.toLowerCase()}`}>
                            <div className="pcm-map-zone-title">
                                <span>{storageTypeLabel(zone)}</span>
                                <span className="badge bg-light text-dark border">{zoneRows.length} lokasi</span>
                            </div>

                            {zoneRows.length === 0 ? (
                                <div className="text-muted small border rounded-3 bg-white p-3">
                                    Tidak ada material tersimpan pada area ini.
                                </div>
                            ) : zoneRows.map((location) => (
                                <div key={location.key} className="pcm-map-location border rounded-3 bg-white mb-2 overflow-hidden">
                                    <div className="d-flex justify-content-between align-items-start gap-2 border-bottom bg-light px-2 py-1">
                                        <div>
                                            <div className="fw-bold text-dark">{location.location_detail || 'Tanpa lokasi'}</div>
                                            <div className="text-muted small">{location.item_count} item</div>
                                        </div>
                                        <div className="text-end small text-muted">
                                            {location.unit_totals.map((total) => (
                                                <div key={total.unit}>{formatNumber(total.balance)} {total.unit}</div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="table table-sm mb-0" style={{ fontSize: '0.72rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Kode</th>
                                                    <th>Material</th>
                                                    <th>Spesifikasi</th>
                                                    <th className="text-end">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {location.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="font-monospace text-nowrap">{item.item_code}</td>
                                                        <td>
                                                            <div className="fw-semibold">{item.item_name}</div>
                                                            <div className="text-muted small">{item.category} · {item.size}</div>
                                                        </td>
                                                        <td>
                                                            <div>{item.specification}</div>
                                                            <div className="text-muted small">{item.schedule_rating || '-'} · {item.heat_no || '-'}</div>
                                                        </td>
                                                        <td className="text-end text-nowrap fw-semibold">{formatNumber(item.balance)} {item.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {location.mapping_documents?.length > 0 && (
                                        <div className="border-top px-2 py-1 small">
                                            <span className="text-muted me-1">Lampiran denah:</span>
                                            {location.mapping_documents.map((document, index) => (
                                                <span key={document.id}>
                                                    {index > 0 && <span className="text-muted">, </span>}
                                                    <button
                                                        type="button"
                                                        className="btn btn-link btn-sm p-0 align-baseline pcm-no-print"
                                                        onClick={() => onDownloadDocument(document)}
                                                        disabled={downloadingDocumentId === document.id}
                                                    >
                                                        {document.name}
                                                    </button>
                                                    <span className="d-none d-print-inline">{document.name}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            <div className="text-muted small mt-2">
                Denah skematik dibuat otomatis dari lokasi stok aktif. Untuk denah CAD/PDF resmi, unggah dokumen kategori
                “Denah Lokasi” atau “Layout Penyimpanan” melalui tombol Dokumen pada Material Storing.
            </div>
        </div>
    );
}

function Signatures({ meta }) {
    return (
        <div className="row g-4 mt-4 pcm-report-signatures" style={{ pageBreakInside: 'avoid' }}>
            {[
                ['Disiapkan oleh', meta?.generated_by || 'Material Control', 'Material Control'],
                ['Diperiksa oleh', 'QC Inspector', 'Quality Control'],
                ['Disetujui oleh', 'Project Manager', 'Project Management'],
            ].map(([label, name, role]) => (
                <div key={label} className="col-4 text-center">
                    <div className="text-muted small">{label}</div>
                    <div style={{ height: '54px' }}></div>
                    <div className="border-top pt-2 fw-semibold text-dark">{name}</div>
                    <div className="text-muted small">{role}</div>
                </div>
            ))}
        </div>
    );
}

export function MaterialReportsSection({
    user,
    initialReportType = 'receiving',
    initialFilters = null,
    lockReportType = false,
}) {
    const [activeReport, setActiveReport] = useState(() => (
        REPORT_TABS.some((tab) => tab.id === initialReportType) ? initialReportType : 'receiving'
    ));
    const [filters, setFilters] = useState(() => ({
        ...DEFAULT_FILTERS,
        ...(initialFilters || {}),
    }));
    const reportProjectId = filters.project_id;
    const [report, setReport] = useState(EMPTY_REPORT);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reloadToken, setReloadToken] = useState(0);
    const [downloadingDocumentId, setDownloadingDocumentId] = useState(null);

    const config = reportConfig(activeReport);
    const meta = report.meta;
    const project = meta?.project || projects.find((item) => String(item.id) === String(filters.project_id));

    useEffect(() => {
        let cancelled = false;

        api.get('/projects')
            .then((data) => {
                if (!cancelled) setProjects(Array.isArray(data) ? data : []);
            })
            .catch(() => {});

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (lockReportType || !REPORT_TABS.some((tab) => tab.id === initialReportType)) return;

        setActiveReport(initialReportType);
        setReport(EMPTY_REPORT);
    }, [initialReportType, lockReportType]);

    useEffect(() => {
        let cancelled = false;

        if (!reportProjectId) {
            setLoading(false);
            setError('Pilih project terlebih dahulu untuk menampilkan laporan material.');
            setReport(EMPTY_REPORT);
            return () => { cancelled = true; };
        }

        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError('');

            const params = new URLSearchParams();

            params.set('project_id', reportProjectId);
            if (filters.search) params.set('search', filters.search);

            if (activeReport === 'receiving' || activeReport === 'issuing') {
                if (filters.date_from) params.set('date_from', filters.date_from);
                if (filters.date_to) params.set('date_to', filters.date_to);
                if (filters.status !== 'ALL') params.set('status', filters.status);
            }

            if (activeReport === 'stock' || activeReport === 'location-map') {
                if (filters.storage_type !== 'ALL') params.set('storage_type', filters.storage_type);
                if (filters.location) params.set('location', filters.location);
            }

            if (activeReport === 'stock') {
                if (filters.category !== 'ALL') params.set('category', filters.category);
                if (filters.stock_status !== 'ALL') params.set('stock_status', filters.stock_status);
            }

            try {
                const data = await api.get(`${config.endpoint}?${params.toString()}`);
                if (!cancelled) setReport(data || EMPTY_REPORT);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Gagal memuat laporan material.');
                    setReport(EMPTY_REPORT);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [activeReport, filters, reportProjectId, reloadToken]);

    const filterSummary = useMemo(() => {
        const parts = [];

        if (project?.name) parts.push(`Project ${project.name}`);
        if (filters.search) parts.push(`Pencarian "${filters.search}"`);
        if (filters.date_from || filters.date_to) {
            parts.push(`Tanggal ${filters.date_from ? formatDate(filters.date_from) : 'awal'} s/d ${filters.date_to ? formatDate(filters.date_to) : 'akhir'}`);
        }
        if (filters.status !== 'ALL' && (activeReport === 'receiving' || activeReport === 'issuing')) {
            parts.push(`Status ${filters.status}`);
        }
        if (filters.storage_type !== 'ALL' && (activeReport === 'stock' || activeReport === 'location-map')) {
            parts.push(storageTypeLabel(filters.storage_type));
        }
        if (filters.category !== 'ALL' && activeReport === 'stock') parts.push(`Kategori ${filters.category}`);
        if (filters.stock_status !== 'ALL' && activeReport === 'stock') parts.push(`Stok ${filters.stock_status}`);
        if (filters.location && (activeReport === 'stock' || activeReport === 'location-map')) {
            parts.push(`Lokasi "${filters.location}"`);
        }

        return parts.join(' · ');
    }, [filters, project, activeReport]);

    const handleTabChange = (reportId) => {
        if (reportId === activeReport) return;

        setActiveReport(reportId);
        setReport(EMPTY_REPORT);
        setFilters({ ...DEFAULT_FILTERS, project_id: filters.project_id });
    };

    const handleDownloadDocument = async (document) => {
        setDownloadingDocumentId(document.id);
        setError('');

        try {
            await api.download(document.download_url, document.name);
        } catch (err) {
            setError(err.message || 'Gagal mengunduh dokumen denah.');
        } finally {
            setDownloadingDocumentId(null);
        }
    };

    const handleExportCsv = () => {
        const rows = report.rows || [];
        const stamp = new Date().toISOString().slice(0, 10);

        if (activeReport === 'receiving') {
            downloadCsv(
                `material-receiving-report-${stamp}.csv`,
                ['No', 'Tanggal', 'Surat Jalan', 'Line', 'PO', 'Vendor', 'Material', 'Deskripsi', 'Spesifikasi', 'Size', 'Rating', 'Qty', 'Accepted', 'Unit', 'Heat', 'MTC', 'Storage', 'Lokasi', 'Status', 'QC', 'Remarks'],
                rows.map((row, index) => [
                    index + 1, row.arrival_date, row.shipment_no, row.line_no, row.po_no, row.vendor,
                    row.item_name, row.description, row.specification, row.size, row.schedule_rating,
                    row.qty, row.accepted_qty, row.unit, row.heat_no, row.mtc_no, row.storage_type,
                    row.storage_location, row.status, row.inspection_result, row.remarks,
                ])
            );

            return;
        }

        if (activeReport === 'issuing') {
            downloadCsv(
                `material-issuing-report-${stamp}.csv`,
                ['No', 'Tanggal', 'Issuing', 'Requestor', 'Vendor', 'Drawing', 'Spool', 'Line', 'Material', 'Deskripsi', 'Kategori', 'Spesifikasi', 'Size', 'Rating', 'Qty', 'Unit', 'Heat', 'Lot', 'Status', 'Remarks'],
                rows.map((row, index) => [
                    index + 1, row.issue_date, row.issue_no, row.requestor, row.vendor, row.drawing_no,
                    row.target_spool_no, row.target_line_no, row.item_name, row.description, row.category,
                    row.specification, row.size, row.schedule_rating, row.qty, row.unit, row.heat_no,
                    row.lot_code, row.status, row.remarks,
                ])
            );

            return;
        }

        if (activeReport === 'stock') {
            downloadCsv(
                `material-stock-list-${stamp}.csv`,
                ['No', 'Item Code', 'Nama', 'Kategori', 'Spesifikasi', 'Size', 'Rating', 'Line', 'Heat', 'Storage', 'Lokasi', 'Masuk', 'Keluar', 'Saldo', 'Unit', 'Minimum', 'Status', 'Dokumen'],
                rows.map((row, index) => [
                    index + 1, row.item_code, row.item_name, row.category, row.specification, row.size,
                    row.schedule_rating, row.line_no, row.heat_no, row.storage_type, row.location_detail,
                    row.stock_in, row.stock_out, row.balance, row.unit, row.min_stock_alert,
                    row.low_stock ? 'LOW' : row.status, row.documents_count,
                ])
            );

            return;
        }

        const mapRows = rows.flatMap((location) => (
            location.items.map((item) => [
                location.storage_type,
                location.location_detail,
                item.item_code,
                item.item_name,
                item.category,
                item.specification,
                item.size,
                item.balance,
                item.unit,
                (location.mapping_documents || []).map((document) => document.name).join('; '),
            ])
        ));

        downloadCsv(
            `material-location-map-${stamp}.csv`,
            ['Tipe Storage', 'Lokasi', 'Item Code', 'Nama', 'Kategori', 'Spesifikasi', 'Size', 'Saldo', 'Unit', 'Lampiran Denah'],
            mapRows
        );
    };

    const canPrint = Boolean(!loading && report.meta && Array.isArray(report.rows));

    return (
        <div>
            <style>{`
                .pcm-map-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.75rem;
                }
                .pcm-map-zone {
                    border: 1px solid #cbd5e1;
                    border-radius: 0.75rem;
                    padding: 0.65rem;
                    background: #f8fafc;
                }
                .pcm-map-zone-open_yard { border-top: 4px solid #f59e0b; }
                .pcm-map-zone-warehouse { border-top: 4px solid #2563eb; }
                .pcm-map-zone-title {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 0.5rem;
                }
                @media (max-width: 767.98px) {
                    .pcm-map-grid { grid-template-columns: 1fr; }
                }
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                    body { background: #fff !important; }
                    #nav, footer, .page-title-container, .pcm-no-print { display: none !important; }
                    main, main > .container, .container-fluid {
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .pcm-material-report-print {
                        border: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    .pcm-material-report-print > .card-body { padding: 0 !important; }
                    .pcm-report-table { font-size: 7.2pt !important; }
                    .pcm-report-table th, .pcm-report-table td { padding: 2px 4px !important; }
                    .pcm-report-table thead { display: table-header-group; }
                    .pcm-report-table tr { break-inside: avoid; }
                    .table-responsive { overflow: visible !important; }
                    .pcm-map-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4mm; }
                    .pcm-map-location { break-inside: avoid; }
                    .pcm-report-signatures { margin-top: 8mm; }
                    .badge { border: 1px solid #cbd5e1 !important; }
                }
            `}</style>

            <div className="card border-0 shadow-sm mb-4 pcm-no-print">
                <div className="card-body p-3">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                        <div>
                            <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.15rem' }}>Laporan Material Control</h2>
                            <div className="text-muted small">
                                Dokumen resmi receiving, issuing, stock list, dan mapping lokasi. Gunakan tombol cetak lalu pilih
                                “Save as PDF” pada dialog browser.
                            </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setReloadToken((value) => value + 1)} disabled={loading}>
                                {loading ? 'Memuat...' : 'Muat Ulang'}
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportCsv} disabled={loading || !report.rows?.length}>
                                Export CSV
                            </button>
                            <button type="button" className="btn btn-primary btn-sm px-3" onClick={() => window.print()} disabled={!canPrint}>
                                Cetak / Simpan PDF
                            </button>
                        </div>
                    </div>

                    {!lockReportType && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {REPORT_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={`btn btn-sm ${activeReport === tab.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleTabChange(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="row g-2 align-items-end">
                        <div className="col-12 col-lg-4">
                            <label className="form-label small fw-semibold text-secondary mb-1">Pencarian</label>
                            <input
                                type="search"
                                className="form-control form-control-sm"
                                placeholder="Cari nomor, material, vendor, heat, lokasi..."
                                value={filters.search}
                                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                            />
                        </div>

                        <div className="col-6 col-lg-2">
                            <label className="form-label small fw-semibold text-secondary mb-1">Project</label>
                            <PcmSelect
                                
                                value={filters.project_id}
                                onChange={(event) => setFilters({ ...filters, project_id: event.target.value })}
                            >
                                <option value="">Semua Project</option>
                                {projects.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </PcmSelect>
                        </div>

                        {(activeReport === 'receiving' || activeReport === 'issuing') && (
                            <>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Dari Tanggal</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={filters.date_from}
                                        onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
                                    />
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={filters.date_to}
                                        onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
                                    />
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Status</label>
                                    <PcmSelect
                                        
                                        value={filters.status}
                                        onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                                    >
                                        <option value="ALL">Semua Status</option>
                                        {activeReport === 'receiving' ? (
                                            <>
                                                <option value="RECEIVED">RECEIVED</option>
                                                <option value="REQUESTED">REQUESTED</option>
                                                <option value="INSPECTED">INSPECTED</option>
                                                <option value="ACCEPTED">ACCEPTED</option>
                                                <option value="HOLD">HOLD</option>
                                                <option value="REJECTED">REJECTED</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="ISSUED">ISSUED</option>
                                                <option value="CANCELLED">CANCELLED</option>
                                            </>
                                        )}
                                    </PcmSelect>
                                </div>
                            </>
                        )}

                        {(activeReport === 'stock' || activeReport === 'location-map') && (
                            <>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Penyimpanan</label>
                                    <PcmSelect
                                        
                                        value={filters.storage_type}
                                        onChange={(event) => setFilters({ ...filters, storage_type: event.target.value })}
                                    >
                                        <option value="ALL">Semua</option>
                                        <option value="OPEN_YARD">Open Yard</option>
                                        <option value="WAREHOUSE">Warehouse</option>
                                    </PcmSelect>
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Lokasi</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Rack / bay..."
                                        value={filters.location}
                                        onChange={(event) => setFilters({ ...filters, location: event.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {activeReport === 'stock' && (
                            <>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Kategori</label>
                                    <PcmSelect
                                        
                                        value={filters.category}
                                        onChange={(event) => setFilters({ ...filters, category: event.target.value })}
                                    >
                                        <option value="ALL">Semua</option>
                                        {CATEGORY_OPTIONS.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </PcmSelect>
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Level Stok</label>
                                    <PcmSelect
                                        
                                        value={filters.stock_status}
                                        onChange={(event) => setFilters({ ...filters, stock_status: event.target.value })}
                                    >
                                        <option value="ALL">Semua</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="LOW">Kritis / Rendah</option>
                                        <option value="OUT">Kosong</option>
                                    </PcmSelect>
                                </div>
                            </>
                        )}
                    </div>

                    {error && <div className="alert alert-danger py-2 mt-3 mb-0 small">{error}</div>}
                </div>
            </div>

            <div className="card border-0 shadow-sm pcm-material-report-print">
                <div className="card-body p-4">
                    <ReportHeader
                        config={config}
                        meta={meta}
                        projectName={project?.name}
                        filterSummary={filterSummary}
                    />

                    <SummaryCards reportType={activeReport} report={report} />

                    {loading ? (
                        <div className="text-center text-muted py-5">Menyusun laporan...</div>
                    ) : activeReport === 'location-map' ? (
                        <LocationMapView
                            rows={report.rows || []}
                            onDownloadDocument={handleDownloadDocument}
                            downloadingDocumentId={downloadingDocumentId}
                        />
                    ) : activeReport === 'stock' ? (
                        <StockTable rows={report.rows || []} />
                    ) : activeReport === 'issuing' ? (
                        <IssuingTable rows={report.rows || []} />
                    ) : (
                        <ReceivingTable rows={report.rows || []} />
                    )}

                    <div className="d-flex justify-content-between text-muted small mt-2">
                        <span>Dokumen dibuat otomatis dari PCM Piping Suite.</span>
                        <span>{report.rows?.length || 0} baris</span>
                    </div>

                    <Signatures meta={meta} />
                </div>
            </div>
        </div>
    );
}
