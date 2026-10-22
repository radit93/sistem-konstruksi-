import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

function ConfirmDialog({ message, confirmLabel, cancelLabel, onClose }) {
    const cancelRef = useRef(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Fokus ke Batal supaya Enter tidak langsung menghapus.
        cancelRef.current?.focus();

        const handleKey = (event) => {
            if (event.key === 'Escape') onClose(false);
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    return (
        <div
            className="modal fade show d-block pcm-modal pcm-confirm"
            style={{ zIndex: 1080 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="Konfirmasi hapus"
            aria-describedby="pcm-confirm-message"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose(false);
            }}
        >
            <div className="modal-dialog modal-dialog-centered pcm-confirm__dialog">
                <div className="modal-content pcm-confirm__panel border-0">
                    <button
                        type="button"
                        className="btn-close pcm-confirm__close"
                        aria-label="Tutup"
                        onClick={() => onClose(false)}
                    />
                    <p className="pcm-confirm__message" id="pcm-confirm-message">{message}</p>
                    <p className="pcm-confirm__hint">Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="pcm-confirm__actions">
                        <button
                            type="button"
                            ref={cancelRef}
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => onClose(false)}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger btn-sm fw-bold"
                            onClick={() => onClose(true)}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Pengganti window.confirm dengan dialog ringkas bergaya dashboard.
 * Mengembalikan Promise<boolean>: true bila pengguna menekan tombol hapus.
 */
let activeDialog = false;

export function confirmDelete(message, options = {}) {
    if (activeDialog) return Promise.resolve(false);
    activeDialog = true;

    return new Promise((resolve) => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        let finished = false;

        const finish = (value) => {
            if (finished) return;
            finished = true;
            activeDialog = false;
            resolve(value);
            // Beri kesempatan handler klik selesai sebelum root dilepas.
            window.setTimeout(() => {
                root.unmount();
                host.remove();
            }, 0);
        };

        root.render(
            <ConfirmDialog
                message={message}
                confirmLabel={options.confirmLabel || 'Hapus'}
                cancelLabel={options.cancelLabel || 'Batal'}
                onClose={finish}
            />
        );
    });
}
