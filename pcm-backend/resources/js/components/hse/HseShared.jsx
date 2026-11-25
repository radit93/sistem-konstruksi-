import React from 'react';
import { api } from '../../api';

/* -------------------------------------------------------------------------
 * Kosakata HSE
 * Semua label disimpan di satu tempat supaya tabel, form, dan cetakan tidak
 * pernah memakai istilah yang berbeda untuk hal yang sama.
 * ---------------------------------------------------------------------- */

export const PERMIT_TYPES = [
    ['HOT_WORK', 'Hot Work (las / potong)'],
    ['CONFINED_SPACE', 'Confined Space'],
    ['WORKING_AT_HEIGHT', 'Working at Height'],
    ['LIFTING', 'Lifting / Rigging'],
    ['EXCAVATION', 'Excavation'],
    ['LOTO', 'LOTO / isolasi energi'],
    ['COLD_WORK', 'Cold Work'],
];

export const PERMIT_STATUS = [
    ['PENDING', 'Menunggu persetujuan'],
    ['APPROVED', 'Disetujui'],
    ['REJECTED', 'Ditolak'],
    ['CLOSED', 'Ditutup'],
];

export const HAZARD_CATEGORIES = [
    ['UNSAFE_ACT', 'Unsafe act'],
    ['UNSAFE_CONDITION', 'Unsafe condition'],
    ['NEAR_MISS', 'Near miss'],
    ['ENVIRONMENT', 'Environment'],
];

export const HAZARD_SEVERITIES = [
    ['LOW', 'Low'],
    ['MEDIUM', 'Medium'],
    ['HIGH', 'High'],
    ['CRITICAL', 'Critical'],
];

export const HAZARD_STATUS = [
    ['OPEN', 'Open'],
    ['IN_PROGRESS', 'In progress'],
    ['RESOLVED', 'Resolved'],
    ['CLOSED', 'Closed'],
    ['REOPENED', 'Reopened'],
];

export const LOG_KINDS = [
    ['tbm', 'Toolbox meeting'],
    ['permit', 'Work permit'],
    ['finding', 'Hazard finding'],
    ['inspection', 'Inspeksi'],
    ['induction', 'Induksi'],
    ['incident', 'Insiden'],
];

export const LOG_STATUS = [
    ['open', 'Open'],
    ['closed', 'Closed'],
];

export const SHIFTS = [
    ['PAGI', 'Pagi'],
    ['SIANG', 'Siang'],
    ['MALAM', 'Malam'],
];

const STATUS_TONE = {
    OPEN: 'bg-danger',
    IN_PROGRESS: 'bg-warning text-dark',
    RESOLVED: 'bg-primary',
    CLOSED: 'bg-success',
    REOPENED: 'bg-danger',
    PENDING: 'bg-warning text-dark',
    APPROVED: 'bg-success',
    REJECTED: 'bg-danger',
    open: 'bg-danger',
    closed: 'bg-success',
};

export const labelOf = (list, value) => {
    const found = list.find(([key]) => key === value);
    return found ? found[1] : (value || '-');
};

export const toneOf = (value) => STATUS_TONE[value] || 'bg-secondary';

export const fmtDate = (value) => {
    if (!value) return '-';
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-');
    if (parts.length !== 3) return raw;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const fmtDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

export const toInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fmtNumber = (value, digits = 2) => {
    const number = Number(value ?? 0);
    if (!Number.isFinite(number)) return '0';
    return number.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    });
};

/* Tanggal lokal, bukan UTC. toISOString() memakai UTC sehingga sebelum pukul
   07:00 WITA nilai default form dan isOverdue mundur satu hari. */
export const today = () => {
    const now = new Date();
    const pad = (number) => String(number).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/* Rentang default laporan: awal bulan berjalan sampai hari ini. */
export const monthRange = () => {
    const now = new Date();
    const pad = (number) => String(number).padStart(2, '0');
    return {
        from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
        to: today(),
    };
};

export const isOverdue = (hazard) => {
    if (!hazard?.due_date) return false;
    if (hazard.status === 'CLOSED' || hazard.status === 'RESOLVED') return false;
    return String(hazard.due_date).slice(0, 10) < today();
};

/* -------------------------------------------------------------------------
 * Bantuan filter tabel
 * ---------------------------------------------------------------------- */

export const matchesSearch = (query, fields = []) => {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) return true;
    return fields.some((field) => String(field ?? '').toLowerCase().includes(needle));
};

/* Nilai tanggal di database bisa berupa "YYYY-MM-DD" atau timestamp ISO;
   perbandingan dilakukan pada 10 karakter pertama agar aman untuk keduanya. */
export const inDateRange = (value, from, to) => {
    if (!from && !to) return true;
    const raw = String(value || '').slice(0, 10);
    if (!raw) return false;
    if (from && raw < from) return false;
    if (to && raw > to) return false;
    return true;
};

export function useHseFilters() {
    const [search, setSearch] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [from, setFrom] = React.useState('');
    const [to, setTo] = React.useState('');
    const active = Boolean(search.trim() || status || from || to);
    const reset = () => {
        setSearch('');
        setStatus('');
        setFrom('');
        setTo('');
    };
    return { search, setSearch, status, setStatus, from, setFrom, to, setTo, active, reset };
}

/**
 * Semua simpanan HSE dikirim sebagai FormData supaya unggah foto/attachment
 * bisa memakai jalur yang sama dengan form biasa. Laravel membaca _method
 * untuk PUT (spoofing form HTML standar).
 */
export async function submitHseForm(endpoint, payload, files = {}, method = 'POST') {
    const body = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        body.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    });

    Object.entries(files).forEach(([key, file]) => {
        if (file) body.append(key, file);
    });

    if (method !== 'POST') body.append('_method', method);

    return api.upload(endpoint, body);
}

/* -------------------------------------------------------------------------
 * Komponen bersama
 * ---------------------------------------------------------------------- */

export function HseModal({ title, subtitle, onClose, children, footer, size = '' }) {
    return (
        <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1060 }}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
                <div className="modal-content border-0 shadow">
                    <div className="modal-header align-items-start">
                        <div>
                            <h5 className="modal-title fw-bold text-dark mb-0">{title}</h5>
                            {subtitle && <p className="text-muted small mb-0 mt-1">{subtitle}</p>}
                        </div>
                        <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
                    </div>
                    <div className="modal-body">{children}</div>
                    {footer && <div className="modal-footer bg-light">{footer}</div>}
                </div>
            </div>
        </div>
    );
}

export function Field({ label, required = false, hint, children, className = 'col-md-6' }) {
    return (
        <div className={className}>
            <label className="form-label small fw-semibold text-dark">
                {label}
                {required && <span className="text-danger"> *</span>}
            </label>
            {children}
            {hint && <div className="form-text small">{hint}</div>}
        </div>
    );
}

export function StatusBadge({ value, list }) {
    return (
        <span className={`badge ${toneOf(value)}`}>
            {list ? labelOf(list, value) : (value || '-')}
        </span>
    );
}

export function SectionToolbar({ title, description, count, children }) {
    return (
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <div>
                <h5 className="fw-bold text-dark mb-1">{title}</h5>
                <p className="text-muted small mb-0">
                    {description}
                    {typeof count === 'number' && (
                        <span className="ms-1 text-dark fw-semibold">({count} baris)</span>
                    )}
                </p>
            </div>
            <div className="d-flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

/**
 * FilterField — pembungkus label kecil untuk kontrol filter.
 */
export function FilterField({ label, children, width = 150 }) {
    return (
        <div style={{ minWidth: width }}>
            <label className="form-label small fw-semibold text-muted mb-1">{label}</label>
            {children}
        </div>
    );
}

/**
 * HseFilters — satu baris filter (cari + kontrol tambahan) untuk semua tabel
 * HSE. Jumlah baris yang tampil selalu dilaporkan apa adanya.
 */
export function HseFilters({
    search = '',
    onSearchChange,
    placeholder = 'Cari…',
    children,
    shown = 0,
    total = 0,
    active = false,
    onReset,
}) {
    return (
        <div className="card border-0 shadow-sm mb-3">
            <div className="card-body py-2">
                <div className="d-flex flex-wrap align-items-end gap-2">
                    <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="input-group input-group-sm">
                            <span className="input-group-text bg-light border-end-0">
                                <i className="cs-search" />
                            </span>
                            <input
                                type="search"
                                className="form-control border-start-0"
                                placeholder={placeholder}
                                value={search}
                                onChange={(event) => onSearchChange(event.target.value)}
                                aria-label="Cari data"
                            />
                        </div>
                    </div>
                    {children}
                    {active && (
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onReset}>
                            Reset filter
                        </button>
                    )}
                </div>
                <div className="text-muted small mt-2">
                    Menampilkan <strong className="text-dark">{shown}</strong> dari{' '}
                    <strong className="text-dark">{total}</strong> baris
                    {active ? ' · filter aktif' : ''}.
                </div>
            </div>
        </div>
    );
}

export function StatusFilter({ value, onChange, options, label = 'Status' }) {
    return (
        <FilterField label={label} width={170}>
            <select
                className="form-select form-select-sm"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="">Semua status</option>
                {options.map(([key, text]) => (
                    <option key={key} value={key}>{text}</option>
                ))}
            </select>
        </FilterField>
    );
}

export function DateRangeFilter({ from, to, onFromChange, onToChange, labelFrom = 'Dari tanggal', labelTo = 'Sampai tanggal' }) {
    return (
        <>
            <FilterField label={labelFrom} width={150}>
                <input
                    type="date"
                    className="form-control form-control-sm"
                    value={from}
                    onChange={(event) => onFromChange(event.target.value)}
                />
            </FilterField>
            <FilterField label={labelTo} width={150}>
                <input
                    type="date"
                    className="form-control form-control-sm"
                    value={to}
                    onChange={(event) => onToChange(event.target.value)}
                />
            </FilterField>
        </>
    );
}

export function PhotoLink({ path, label = 'Foto' }) {
    if (!path) return <span className="text-muted">-</span>;
    return (
        <a href={path} target="_blank" rel="noreferrer" className="small fw-semibold">
            {label}
        </a>
    );
}

export function EmptyState({ colSpan, message }) {
    return (
        <tr>
            <td colSpan={colSpan} className="text-center text-muted py-4">
                {message}
            </td>
        </tr>
    );
}

/* -------------------------------------------------------------------------
 * Cetakan
 * Satu komponen untuk semua modul. Isi hanya berasal dari baris database;
 * tidak ada angka atau narasi yang dikarang di sini.
 * ---------------------------------------------------------------------- */

export function PrintSheet({ project, sections, user, period = null, summary = null }) {
    const printedAt = new Date().toLocaleString('id-ID');
    const title = period
        ? 'Laporan HSE per Periode'
        : (sections.length === 1 ? sections[0].title : 'Laporan HSE Gabungan');

    return (
        <div className="hse-print-sheet">
            <div style={{ borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    PCM Piping Suite &middot; HSE Department
                </div>
                <h1 style={{ fontSize: 18, margin: '4px 0 2px', fontWeight: 700 }}>
                    {title}
                </h1>
                <div style={{ fontSize: 11 }}>
                    Project: <strong>{project?.name || '-'}</strong>
                    {' '}&middot; Job No: <strong>{project?.job_no || '-'}</strong>
                    {project?.client ? <> &middot; Client: {project.client}</> : null}
                </div>
                {period && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                        Periode: <strong>{fmtDate(period.from)}</strong> s.d. <strong>{fmtDate(period.to)}</strong>
                    </div>
                )}
            </div>

            {summary && summary.length > 0 && (
                <section style={{ marginBottom: 18 }}>
                    <h2 style={{ fontSize: 13, margin: '0 0 6px', fontWeight: 700 }}>Ringkasan periode</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
                        <thead>
                            <tr>
                                {summary.map((item) => (
                                    <th
                                        key={item.label}
                                        style={{ border: '1px solid #444', padding: '3px 4px', textAlign: 'left', backgroundColor: '#e5e7eb' }}
                                    >
                                        {item.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {summary.map((item) => (
                                    <td key={item.label} style={{ border: '1px solid #444', padding: '4px', verticalAlign: 'top' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{item.value}</div>
                                        <div style={{ color: '#374151' }}>{item.note}</div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </section>
            )}

            {sections.map((section, index) => (
                <section key={section.title} style={{ marginBottom: index === sections.length - 1 ? 12 : 20 }}>
                    {sections.length > 1 && (
                        <h2 style={{ fontSize: 13, margin: '0 0 6px', fontWeight: 700 }}>
                            {index + 1}. {section.title}
                        </h2>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
                        <thead>
                            <tr>
                                {section.columns.map((column) => (
                                    <th
                                        key={column}
                                        style={{ border: '1px solid #444', padding: '3px 4px', textAlign: 'left', backgroundColor: '#e5e7eb' }}
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {section.rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={section.columns.length}
                                        style={{ border: '1px solid #444', padding: '6px 4px', textAlign: 'center' }}
                                    >
                                        Belum ada data.
                                    </td>
                                </tr>
                            ) : section.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} style={{ border: '1px solid #444', padding: '3px 4px', verticalAlign: 'top' }}>
                                            {cell === null || cell === undefined || cell === '' ? '-' : cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ))}

            <table style={{ width: '100%', marginTop: 18, fontSize: 10 }}>
                <tbody>
                    <tr>
                        <td style={{ width: '22%', verticalAlign: 'top' }}>
                            Dicetak: {printedAt}
                            <br />
                            Oleh: {user?.name || '-'}
                        </td>
                        <td style={{ width: '26%', textAlign: 'center' }}>
                            Dibuat oleh,
                            <div style={{ height: 46 }} />
                            ( {user?.name || '................'} )
                        </td>
                        <td style={{ width: '26%', textAlign: 'center' }}>
                            Diverifikasi HSE,
                            <div style={{ height: 46 }} />
                            ( ................ )
                        </td>
                        <td style={{ width: '26%', textAlign: 'center' }}>
                            Disetujui Project Manager,
                            <div style={{ height: 46 }} />
                            ( ................ )
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export function HsePrintStyles() {
    return (
        <style>{`
            .hse-print-sheet { display: none; }
            @media print {
                @page { size: A4 portrait; margin: 12mm; }
                body { background: #fff !important; }
                body * { visibility: hidden !important; }
                .hse-print-sheet, .hse-print-sheet * { visibility: visible !important; }
                .hse-print-sheet {
                    display: block !important;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    color: #111;
                    background: #fff;
                    font-family: Arial, Helvetica, sans-serif;
                }
                .hse-print-sheet table { page-break-inside: auto; }
                .hse-print-sheet tr { page-break-inside: avoid; }
            }
        `}</style>
    );
}
