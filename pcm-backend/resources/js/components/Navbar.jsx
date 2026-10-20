import React from 'react';

// Daftar Menu Role Utama pada Sidebar / Navigation Bar
const ROLE_MENUS = [
    { id: 'overview', label: 'Global Dashboard', icon: 'cs-screen', role: 'all', desc: 'Rangkuman Master Seluruh Role' },
    { id: 'engineering', label: 'Engineer', icon: 'cs-file-text', role: 'engineer', desc: 'Input Drawing & Upload CAD/PDF' },
    { id: 'material', label: 'Material', icon: 'cs-archive', role: 'material', desc: 'Kontrol Stok Pipa & Heat No' },
    { id: 'fabrication', label: 'Construction', icon: 'cs-gear', role: 'construction', desc: 'Spool Workshop & Fit-up' },
    { id: 'qaqc', label: 'QA-QC', icon: 'cs-check-square', role: 'qaqc', desc: 'Pemeriksaan Visual & NDT' },
    { id: 'testpackage', label: 'Test Package', icon: 'cs-clipboard', role: 'testpackage', desc: 'Hydrotest & Blinds Limits' },
    { id: 'hse', label: 'HSE', icon: 'cs-warning-hexagon', role: 'hse', desc: 'Jam Kerja Aman & Safety Log' },
    { id: 'schedule', label: 'Project Control', icon: 'cs-calendar', role: 'manager', desc: 'S-Curve & Kontrak BOQ' }
];

export function Navbar({ user, activeTab, setActiveTab, onRefresh, lastRefresh, onLogout }) {
    // Menu yang bisa diakses:
    // - Global Dashboard selalu terlihat oleh semua role
    // - Menu role spesifik: tampil sesuai role akun yang login (Manager bisa lihat semua sebagai admin pengawas)
    const menus = ROLE_MENUS.filter(m => {
        if (m.role === 'all') return true;
        if (user?.role === 'manager') return true;
        return m.role === user?.role;
    });

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
            {/* Top Brand Bar */}
            <div className="container-fluid px-4 py-2.5 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom">
                <div className="d-flex align-items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                        P
                    </div>
                    <div>
                        <div className="font-extrabold text-slate-900 leading-tight" style={{ fontSize: '1.05rem' }}>
                            PCM PIPING SUITE <span className="badge bg-slate-100 text-slate-700 border ms-1 font-semibold" style={{ fontSize: '0.68rem' }}>Job 2428</span>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Multi-Role Piping Project Control System
                        </small>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                    {/* User Profile Card */}
                    <div className="d-flex align-items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border text-slate-700 font-bold flex items-center justify-center text-xs">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="text-start">
                            <div className="fw-bold text-slate-900 lh-1" style={{ fontSize: '0.85rem' }}>
                                {user?.name || 'User'}
                            </div>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase mt-0.5" style={{ fontSize: '0.65rem' }}>
                                ROLE: {user?.role || 'GUEST'}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons: Refresh & Wajib Logout murni (tanpa switch akun) */}
                    <div className="d-flex align-items-center gap-2 border-start ps-3">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn btn-sm btn-light border text-slate-700 d-flex align-items-center gap-1.5 py-1 px-2.5"
                            title={`Terakhir refresh: ${lastRefresh || '-'}`}
                        >
                            <i className="cs-sort" style={{ fontSize: '0.8rem' }}></i>
                            <span className="d-none d-md-inline" style={{ fontSize: '0.75rem' }}>Refresh</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={onLogout}
                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1.5 py-1 px-2.5 fw-bold"
                            title="Keluar dari akun dan kembali ke portal login"
                        >
                            <i className="cs-close" style={{ fontSize: '0.8rem' }}></i>
                            <span style={{ fontSize: '0.75rem' }}>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar / Top Role-Based Navigation Bar */}
            <div className="container-fluid px-4 bg-slate-50 overflow-auto">
                <nav className="d-flex flex-nowrap py-1.5 gap-1">
                    {menus.map((m) => {
                        const isActive = activeTab === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setActiveTab(m.id)}
                                className={`btn btn-sm px-3 py-1.5 rounded-lg text-start d-flex align-items-center gap-2 transition whitespace-nowrap ${
                                    isActive
                                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-semibold'
                                }`}
                                style={{ fontSize: '0.8rem' }}
                            >
                                <i className={m.icon}></i>
                                <span>{m.label}</span>
                                {m.id === 'overview' && (
                                    <span className={`badge px-1.5 py-0.5 ms-1 ${isActive ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'}`} style={{ fontSize: '0.62rem' }}>
                                        Global
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
