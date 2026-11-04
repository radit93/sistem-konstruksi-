import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MaterialReportsSection } from './MaterialReportsSection';

const REPORT_TITLES = {
    receiving: 'Laporan Penerimaan Material',
    issuing: 'Laporan Pengeluaran Material',
    stock: 'Stock List Material',
    'location-map': 'Mapping Lokasi Material',
};

export function MaterialReportModal({
    open,
    reportType = 'receiving',
    initialFilters = null,
    onClose,
}) {
    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="pcm-report-modal-root">
            <style>{`
                @media print {
                    body > *:not(.pcm-report-modal-root) { display: none !important; }
                    .pcm-report-modal-root { display: block !important; }
                    .pcm-report-modal-root .pcm-report-modal,
                    .pcm-report-modal-root .modal-dialog,
                    .pcm-report-modal-root .modal-content,
                    .pcm-report-modal-root .modal-body {
                        position: static !important;
                        display: block !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        max-height: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        border: 0 !important;
                        border-radius: 0 !important;
                        background: #fff !important;
                        box-shadow: none !important;
                    }
                    .pcm-report-modal-root .modal-header,
                    .pcm-report-modal-root .pcm-no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div
                className="modal show d-block pcm-report-modal"
                tabIndex="-1"
                role="dialog"
                aria-modal="true"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) onClose();
                }}
            >
                <div className="modal-dialog modal-fullscreen modal-dialog-scrollable">
                    <div className="modal-content border-0">
                        <div className="modal-header bg-white border-bottom px-4">
                            <div>
                                <h5 className="modal-title fw-bold text-dark mb-1">
                                    {REPORT_TITLES[reportType] || 'Laporan Material'}
                                </h5>
                                <div className="text-muted small">
                                    Preview dokumen. Sesuaikan filter, lalu tekan Cetak / Simpan PDF.
                                </div>
                            </div>
                            <button type="button" className="btn-close" onClick={onClose} aria-label="Tutup"></button>
                        </div>
                        <div className="modal-body bg-light p-3 p-lg-4">
                            <MaterialReportsSection
                                reportType={reportType}
                                initialReportType={reportType}
                                initialFilters={initialFilters}
                                lockReportType
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
