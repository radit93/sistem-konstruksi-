import React from 'react';
import { fmtDate, fmtNumber, isOverdue } from './HseShared';

function KpiCard({ label, value, unit, note, tone = 'text-dark' }) {
    return (
        <div className="col-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                    <div className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.6875rem', letterSpacing: '0.06em' }}>
                        {label}
                    </div>
                    <div className={`fw-bold mb-0 ${tone}`} style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
                        {value}
                        {unit && <span className="fs-6 text-muted ms-1">{unit}</span>}
                    </div>
                    <div className="text-muted small mt-1">{note}</div>
                </div>
            </div>
        </div>
    );
}

/**
 * Ringkasan HSE. Semua angka berasal dari /hse-summary yang menghitung baris
 * database; nilai null ditampilkan sebagai "—" (belum ada data), bukan nol
 * yang berpura-pura aman.
 */
export function HseSummarySection({
    summary,
    hazards = [],
    permits = [],
    loading = false,
    period = null,
    onPeriodChange,
    periodValid = false,
    onPrintPeriod,
    periodCounts = null,
}) {
    if (loading && !summary) {
        return <div className="text-muted small py-4">Memuat ringkasan HSE…</div>;
    }

    const periodCard = period && onPeriodChange && (
        <div className="card border-0 shadow-sm mb-4">
            <div className="card-body py-3">
                <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
                    <div style={{ maxWidth: 620 }}>
                        <h6 className="fw-bold mb-1">Laporan HSE per periode</h6>
                        <p className="text-muted small mb-0">
                            Pilih rentang tanggal, lalu cetak PDF berisi ringkasan periode, tabel tiap modul,
                            dan kolom tanda tangan HSE serta Project Manager.
                        </p>
                    </div>
                    <div className="d-flex flex-wrap align-items-end gap-2">
                        <div>
                            <label className="form-label small fw-semibold text-muted mb-1">Dari tanggal</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={period.from || ''}
                                onChange={(event) => onPeriodChange({ ...period, from: event.target.value })}
                            />
                        </div>
                        <div>
                            <label className="form-label small fw-semibold text-muted mb-1">Sampai tanggal</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={period.to || ''}
                                onChange={(event) => onPeriodChange({ ...period, to: event.target.value })}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn-dark btn-sm"
                            onClick={onPrintPeriod}
                            disabled={!periodValid}
                        >
                            <i className="cs-file me-1"></i> Cetak laporan periode
                        </button>
                    </div>
                </div>
                {!periodValid && (
                    <div className="text-danger small mt-2">
                        Tanggal awal harus diisi dan tidak boleh lebih akhir dari tanggal akhir.
                    </div>
                )}
                {periodValid && periodCounts && (
                    <div className="text-muted small mt-2">
                        Periode ini: <strong className="text-dark">{periodCounts.logs}</strong> log ·{' '}
                        <strong className="text-dark">{periodCounts.permits}</strong> permit ·{' '}
                        <strong className="text-dark">{periodCounts.hazards}</strong> hazard ·{' '}
                        <strong className="text-dark">{periodCounts.tbm}</strong> TBM ·{' '}
                        <strong className="text-dark">{periodCounts.manhours}</strong> baris man-hours.
                    </div>
                )}
            </div>
        </div>
    );

    if (!summary) {
        return (
            <div>
                {periodCard}
                <div className="alert alert-light border small mb-0">
                    Ringkasan belum tersedia. Muat ulang data setelah mencatat log, permit, TBM, atau man-hours.
                </div>
            </div>
        );
    }

    const manhours = summary.manhours || {};
    const tbm = summary.tbm || {};
    const hazard = summary.hazards || {};
    const permit = summary.permits || {};

    const overdueRows = hazards.filter(isOverdue);
    const expiringRows = permits.filter((row) => {
        if (row.status !== 'APPROVED' || !row.valid_to) return false;
        const end = new Date(row.valid_to).getTime();
        if (Number.isNaN(end)) return false;
        const diff = end - Date.now();
        return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
    });

    return (
        <div>
            {periodCard}

            <div className="row g-3 mb-4">
                <KpiCard
                    label="Safe man-hours"
                    value={fmtNumber(manhours.total, 2)}
                    unit="jam"
                    note={`${fmtNumber(manhours.this_month, 2)} jam bulan ini · ${manhours.days_recorded || 0} hari tercatat`}
                />
                <KpiCard
                    label="Toolbox meeting"
                    value={fmtNumber(tbm.this_month, 0)}
                    unit="kegiatan"
                    note={`${fmtNumber(tbm.total, 0)} total · ${fmtNumber(tbm.attendees_total, 0)} peserta tercatat`}
                    tone="text-primary"
                />
                <KpiCard
                    label="Hazard belum selesai"
                    value={fmtNumber(hazard.open, 0)}
                    unit="temuan"
                    note={`${fmtNumber(hazard.overdue, 0)} lewat tenggat · ${fmtNumber(hazard.closed, 0)} sudah ditutup`}
                    tone={hazard.overdue > 0 ? 'text-danger' : 'text-warning'}
                />
                <KpiCard
                    label="Permit aktif"
                    value={fmtNumber(permit.active, 0)}
                    unit="izin"
                    note={`${fmtNumber(permit.pending, 0)} menunggu · ${fmtNumber(permit.expired, 0)} kedaluwarsa`}
                    tone={permit.expired > 0 ? 'text-danger' : 'text-success'}
                />
            </div>

            <div className="row g-3">
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="fw-bold mb-0">Hazard lewat tenggat</h6>
                                <span className="badge bg-danger">{overdueRows.length}</span>
                            </div>
                            {overdueRows.length === 0 ? (
                                <p className="text-muted small mb-0">
                                    Tidak ada temuan yang melewati due date. Daftar ini dihitung dari status dan tenggat sebenarnya.
                                </p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr>
                                                <th>No. Temuan</th>
                                                <th>Lokasi</th>
                                                <th>PIC</th>
                                                <th>Due</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overdueRows.slice(0, 8).map((row) => (
                                                <tr key={row.id}>
                                                    <td className="fw-semibold">{row.hazard_no}</td>
                                                    <td>{row.location}</td>
                                                    <td>{row.pic_name || row.pic_company || '-'}</td>
                                                    <td className="text-danger fw-semibold">{fmtDate(row.due_date)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="fw-bold mb-0">Permit mendekati kedaluwarsa</h6>
                                <span className="badge bg-warning text-dark">{expiringRows.length}</span>
                            </div>
                            {expiringRows.length === 0 ? (
                                <p className="text-muted small mb-0">
                                    Tidak ada permit yang berakhir dalam 3 hari ke depan.
                                </p>
                            ) : (
                                <ul className="list-unstyled mb-0 small">
                                    {expiringRows.slice(0, 8).map((row) => (
                                        <li key={row.id} className="d-flex justify-content-between border-bottom py-1">
                                            <span className="fw-semibold">{row.permit_no}</span>
                                            <span className="text-muted">{fmtDate(row.valid_to)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <hr />
                            <div className="small text-muted">
                                TBM terakhir: <strong className="text-dark">{fmtDate(tbm.last_date)}</strong>
                                <br />
                                Hazard dilaporkan bulan ini: <strong className="text-dark">{fmtNumber(hazard.reported_this_month, 0)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
