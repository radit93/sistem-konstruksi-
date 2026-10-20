/* Hallmark · macrostructure: Workbench · theme: Acorn-Blue · tone: utilitarian
 * disciplines: honest-copy · locked-tokens · mobile-responsive · typography-purity
 * states: default · hover · focus · active · disabled
 */

import React from 'react';
import { ROLE_SIDEBAR_MENUS } from './Sidebar';

export function Header({ activeTab, user, scopeCode, onRefresh, lastRefresh, onSelectTab, onLogout, onGlobalDashboardLocked }) {
    const currentMenu = ROLE_SIDEBAR_MENUS.find(m => m.id === activeTab) || ROLE_SIDEBAR_MENUS[0];

    return (
        <div className="page-title-container mb-4">
            <div className="row">
                {/* Title & Breadcrumbs Asli Acorn */}
                <div className="col-12 col-md-7">
                    <h1 className="mb-0 pb-0 display-4" id="title">
                        {currentMenu.label}
                    </h1>
                    <nav className="breadcrumb-container d-inline-block" aria-label="breadcrumb">
                        <ul className="breadcrumb pt-0 mb-0">
                            <li className="breadcrumb-item">
                                <a
                                    href="#overview"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onSelectTab) onSelectTab('overview');
                                    }}
                                >
                                    PCM Piping 2428
                                </a>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                {currentMenu.desc}
                            </li>
                        </ul>
                    </nav>
                </div>

                {/* Top Action Buttons (Rata Ukuran & Lengkap Logout) */}
                <div className="col-12 col-md-5 d-flex align-items-center justify-content-end gap-2 pt-2 pt-md-0">
                    <span className="badge bg-outline-primary d-none d-lg-inline-flex align-items-center px-3 py-1 text-uppercase" style={{ height: '42px', lineHeight: '28px', borderRadius: '8px' }}>
                        Sesi: {user?.role_name || user?.role}{scopeCode ? ` · ${scopeCode}` : ''}
                    </span>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center gap-1.5 fw-bold"
                        style={{ height: '42px', minWidth: '135px', borderRadius: '8px' }}
                        title={lastRefresh ? `Terakhir update: ${lastRefresh}` : 'Muat data terbaru'}
                    >
                        <i data-acorn-icon="refresh" data-acorn-size="14"></i>
                        <span>Refresh Data</span>
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="btn btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center gap-1.5 fw-bold"
                        style={{ height: '42px', minWidth: '110px', borderRadius: '8px' }}
                        title="Keluar dari sesi saat ini"
                    >
                        <i data-acorn-icon="logout" data-acorn-size="14"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
