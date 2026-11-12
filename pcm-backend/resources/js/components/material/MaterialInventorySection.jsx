import React, { useEffect, useState } from 'react';
import { api } from '../../api';

export function MaterialInventorySection({ activeProjectId, user }) {
    const [returns, setReturns] = useState([]);
    const [adjustments, setAdjustments] = useState([]);
    const [error, setError] = useState('');
    const canWrite = user?.permissions?.includes?.('stock.write') || user?.role === 'superadmin';

    const load = async () => {
        try {
            const query = `?project_id=${encodeURIComponent(activeProjectId)}`;
            const [returnRows, adjustmentRows] = await Promise.all([
                api.get(`/material-returns${query}`),
                api.get(`/material-adjustments${query}`),
            ]);
            setReturns(Array.isArray(returnRows) ? returnRows : []);
            setAdjustments(Array.isArray(adjustmentRows) ? adjustmentRows : []);
        } catch (err) {
            setError(err.message || 'Gagal memuat transaksi inventory.');
        }
    };

    useEffect(() => { load(); }, [activeProjectId]);

    const approve = async (id) => {
        try {
            await api.post(`/material-adjustments/${id}/approve`, {});
            await load();
        } catch (err) { setError(err.message || 'Gagal menyetujui adjustment.'); }
    };

    return (
        <div>
            <div className="mb-4">
                <h2 className="h3 fw-bolder text-dark mb-1">Material Return & Stock Adjustment</h2>
                <p className="text-muted small mb-0">Project #{activeProjectId} · Koreksi stok harus melalui transaksi dan approval.</p>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white fw-bold">Material Return</div>
                <div className="table-responsive"><table className="table table-hover mb-0"><thead><tr><th>No</th><th>Issuing</th><th>Qty</th><th>Kondisi</th><th>Status</th></tr></thead><tbody>
                    {returns.length === 0 ? <tr><td colSpan="5" className="text-center text-muted py-4">Belum ada material return.</td></tr> : returns.map((row) => <tr key={row.id}><td>{row.return_no}</td><td>{row.issuing?.issue_no || '-'}</td><td>{row.qty} {row.unit}</td><td>{row.condition}</td><td>{row.status}</td></tr>)}
                </tbody></table></div>
            </div>
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white fw-bold">Stock Adjustment</div>
                <div className="table-responsive"><table className="table table-hover mb-0"><thead><tr><th>No</th><th>Stok</th><th>Delta</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
                    {adjustments.length === 0 ? <tr><td colSpan="6" className="text-center text-muted py-4">Belum ada adjustment.</td></tr> : adjustments.map((row) => <tr key={row.id}><td>{row.adjustment_no}</td><td>{row.storing?.item_name || '-'}</td><td>{row.qty_delta}</td><td>{row.reason}</td><td>{row.status}</td><td>{canWrite && row.status === 'PENDING' && <button className="btn btn-sm btn-success" onClick={() => approve(row.id)}>Approve</button>}</td></tr>)}
                </tbody></table></div>
            </div>
        </div>
    );
}
