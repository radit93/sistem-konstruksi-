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

                {/* Top Action: Reload Button (Hitam & Ikon Besar) */}
                <div className="col-12 col-md-5 d-flex align-items-center justify-content-end gap-2 pt-2 pt-md-0">
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center"
                        style={{
                            width: '52px',
                            height: '52px',
                            padding: 0,
                            borderRadius: '10px',
                            color: '#000000',
                            borderColor: '#64748b',
                            backgroundColor: '#ffffff'
                        }}
                        title={lastRefresh ? `Terakhir update: ${lastRefresh}` : 'Muat data terbaru'}
                        aria-label="Refresh Data"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="36"
                            height="36"
                            fill="none"
                            stroke="#000000"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
