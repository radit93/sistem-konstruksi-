import React, { useEffect, useRef, useState } from 'react';

// Menu operasional: hanya ini yang ikut tersaring saat superadmin memilih
// satu departemen. Dashboard dan menu administrasi selalu tampil.
export const OPERATIONAL_MENU_IDS = [
    'project_list',
    'engineering',
    'line_service',
    'welding_map',
    'boq',
    'bom',
    'material_standard',
    'document_control',
    'schedule',
    'pm_scurve',
    'pm_budget',
    'pm_daily',
    'pm_milestone',
    'report',
    'material',
    'mat_requirement',
    'mat_receiving',
    'mat_inspection',
    'mat_storing',
    'mat_warehouse',
    'mat_openyard',
    'mat_issuing',
    'fabrication',
    'erection',
    'qaqc',
    'testpackage',
    'hse',
];

// Modul yang dimiliki tiap departemen.
export const DEPARTMENT_MENUS = {
    PMO: [
        'schedule',
        'pm_scurve',
        'pm_budget',
        'pm_daily',
        'pm_milestone',
        'report'
    ],
    ENG: [
        'project_list',
        'engineering',
        'welding_map',
        'line_service',
        'boq',
        'bom',
        'material_standard',
        'master_pipe',
        'document_control'
    ],
    MAT: [
        'material_standard',
        'master_pipe',
        'mat_requirement',
        'mat_receiving',
        'mat_inspection',
        'mat_storing',
        'mat_warehouse',
        'mat_openyard',
        'mat_issuing'
    ],
    CONS: ['material_standard', 'master_pipe', 'fabrication', 'erection'],
    QAQC: ['material_standard', 'master_pipe', 'qaqc', 'testpackage', 'mat_inspection'],
    HSE: ['hse']
};

// Satu menu = satu layar. Visibilitas ditentukan izin dari database.
export const ROLE_SIDEBAR_MENUS = [
    {
        id: 'overview',
        label: 'Global Dashboard',
        perm: 'dashboard.view',
        desc: 'Ringkasan seluruh departemen'
    },
    {
        id: 'project_list',
        label: 'List Project',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Direktori Folder Proyek & Client'
    },
    {
        id: 'engineering',
        label: 'Isometric Drawing',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Register Gambar Isometrik'
    },
    {
        id: 'welding_map',
        label: 'Welding Map',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Pemetaan Sambungan & Spool'
    },
    {
        id: 'line_service',
        label: 'Line Service',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Klasifikasi Jalur Pipa & Service'
    },
    {
        id: 'boq',
        label: 'Bill of Quantity',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Kuantitas Teknis & Total Dia-Inch'
    },
    {
        id: 'bom',
        label: 'Bill of Material',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Material Take Off (MTO) Komponen'
    },
    {
        id: 'material_standard',
        label: 'Material Standart',
        anyOf: ['drawing.view', 'stock.view', 'inspection.view', 'joint.view'],
        group: 'Engineering',
        desc: 'Katalog Acuan Standar ASTM'
    },
    {
        id: 'master_pipe',
        label: 'Master Pipe',
        anyOf: ['drawing.view', 'stock.view', 'inspection.view', 'joint.view'],
        group: 'Engineering',
        desc: 'Master data pipa (ASME B36.10M) dan fitting',
        children: [
            {
                id: 'pipe_table',
                label: 'Pipa',
                desc: 'Dimensi & ketebalan pipa ASME B36.10M'
            },
            {
                id: 'fitting_table',
                label: 'Fitting',
                desc: 'Dimensi & berat fitting (elbow, tee, reducer, weld-o-let)'
            }
        ]
    },
    {
        id: 'document_control',
        label: 'Document Control',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Riwayat Revisi & Surat Transmittal'
    },
    {
        id: 'mat_requirement',
        label: 'Kebutuhan Material',
        perm: 'stock.view',
        group: 'Material Control',
        desc: 'Rekonsiliasi BOM/MTO vs Issuing vs Stok per Drawing & Spool'
    },
    {
        id: 'mat_receiving',
        label: 'Material Receiving',
        perm: 'stock.view',
        group: 'Material Control',
        desc: 'Penerimaan Material, Packing List & Surat Jalan'
    },
    {
        id: 'mat_inspection',
        label: 'Material Inspection',
        perm: 'material_inspection.view',
        group: 'Material Control',
        desc: 'Hold Point Verifikasi QC, Visual, Dimensi, MTC'
    },
    {
        id: 'mat_storing',
        label: 'Material Storing',
        perm: 'stock.view',
        group: 'Material Control',
        desc: 'Rekap Saldo Stok, Safety Stock & Denah PDF'
    },
    {
        id: 'mat_warehouse',
        label: 'Warehousing (Indoor)',
        perm: 'stock.view',
        group: 'Material Control',
        desc: 'Penyimpanan Tertutup: Valve, Flange, Gasket, Fastener'
    },
    {
        id: 'mat_openyard',
        label: 'Open Yard Storage',
        perm: 'stock.view',
        group: 'Material Control',
        desc: 'Penyimpanan Terbuka: Pipa Batangan CS/SS & Spool'
    },
    {
        id: 'mat_issuing',
        label: 'Material Issuing',
        perm: 'stock.view',
        group: 'Material Control',
        desc: 'Distribusi Pengeluaran Material ke Workshop/Spool Fab'
    },
    {
        id: 'fabrication',
        label: 'Construction Shop',
        perm: 'joint.view',
        desc: 'Spool Fabrication & Joint Fit-up'
    },
    {
        id: 'erection',
        label: 'Field Erection',
        perm: 'joint.view',
        desc: 'Pemasangan Spool di Lapangan'
    },
    {
        id: 'qaqc',
        label: 'QA-QC Inspection',
        perm: 'inspection.view',
        desc: 'Inspeksi Visual & NDT'
    },
    {
        id: 'testpackage',
        label: 'Test Package',
        perm: 'testpackage.view',
        desc: 'Hydrotest & Blinds Limits'
    },
    {
        id: 'hse',
        label: 'HSE Safety',
        perm: 'hse.view',
        desc: 'Jam Kerja Aman & Safety Log'
    },
    {
        id: 'schedule',
        label: 'Kontrak & BOQ',
        perm: 'scope.view',
        group: 'Project Management',
        desc: '18 Scopes Kontrak Piping & Target Volume'
    },
    {
        id: 'pm_scurve',
        label: 'S-Curve & Schedule',
        perm: 'scope.view',
        group: 'Project Management',
        desc: 'Kurva S Mingguan & Deviasi Jadwal'
    },
    {
        id: 'pm_budget',
        label: 'Budget vs Actual',
        perm: 'scope.view',
        group: 'Project Management',
        desc: 'Direct & Indirect Cost Control'
    },
    {
        id: 'pm_daily',
        label: 'Daily Progress Log',
        perm: 'scope.view',
        group: 'Project Management',
        desc: 'Jurnal Harian & Akumulasi Kontrak'
    },
    {
        id: 'pm_milestone',
        label: 'Project Milestone',
        perm: 'scope.view',
        group: 'Project Management',
        desc: 'Phase Gates & Hold Point Sign-off'
    },
    {
        id: 'report',
        label: 'Laporan Eksekutif',
        perm: 'report.view',
        group: 'Project Management',
        desc: 'Export CSV & Lembar Pengesahan'
    },
    {
        id: 'project',
        label: 'Project',
        perm: 'project.view',
        group: 'Administrasi',
        desc: 'Job, client, dan folder drawing. Menghapus project tidak menghapus drawing-nya.'
    },
    {
        id: 'users',
        label: 'Users',
        perm: 'user.view',
        group: 'Administrasi',
        desc: 'Akun, role, dan departemen. Password tidak pernah ditampilkan di layar.'
    },
    {
        id: 'roles',
        label: 'Roles',
        perm: 'role.view',
        group: 'Administrasi',
        desc: 'Katalog role. Role sistem tidak bisa dihapus dan kodenya tidak bisa diganti.'
    },
    {
        id: 'access',
        label: 'Hak Akses',
        perm: 'access.view',
        group: 'Administrasi',
        desc: 'Centang izin per role. Perubahan berlaku saat pengguna memuat ulang halaman.'
    },
    {
        id: 'departments',
        label: 'Departments',
        perm: 'department.view',
        group: 'Administrasi',
        desc: 'Unit organisasi pemilik data. Departemen yang masih dipakai user tidak bisa dihapus.'
    },
    {
        id: 'parameters',
        label: 'Master Parameter',
        perm: 'project.create',
        group: 'Administrasi',
        desc: 'Katalog master Plant Area, Target Distribusi, dan parameter global sistem.'
    }
];

export function Sidebar({
    user,
    permissions = [],
    departments = [],
    departmentFilter = null,
    onDepartmentChange,
    activeTab,
    onSelectTab,
    onLogout,
    onGlobalDashboardLocked,
    activeProject = null,
    activeProjectId = '',
    onSetActiveProject
}) {
    const menuRef = useRef(null);
    const allow = (code) => Boolean(user?.is_superadmin) || permissions.includes(code);

    /* --- Sub-menu (parent bisa dibuka/tutup) ---------------------------------
       Status buka-tutup disimpan di localStorage supaya tidak reset saat reload.
       Default: terbuka, agar isi "Master Pipe" langsung terlihat. */
    const SUBMENU_STORAGE_KEY = 'pcm.sidebar.submenus';
    const [openSubmenus, setOpenSubmenus] = useState(() => {
        try {
            const raw = window.localStorage.getItem(SUBMENU_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object' ? parsed : { master_pipe: true };
        } catch (err) {
            return { master_pipe: true };
        }
    });

    const toggleSubmenu = (id) => {
        setOpenSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        try {
            window.localStorage.setItem(SUBMENU_STORAGE_KEY, JSON.stringify(openSubmenus));
        } catch (err) {
            /* localStorage bisa diblokir — abaikan, menu tetap berfungsi. */
        }
    }, [openSubmenus]);

    /* Buka otomatis parent bila salah satu child-nya sedang aktif,
       supaya halaman yang sedang dibuka tidak pernah tersembunyi. */
    useEffect(() => {
        const parent = ROLE_SIDEBAR_MENUS.find(
            (m) => Array.isArray(m.children) && m.children.some((c) => c.id === activeTab)
        );
        if (!parent) return;
        setOpenSubmenus((prev) => (prev[parent.id] ? prev : { ...prev, [parent.id]: true }));
    }, [activeTab]);

    let displayedMenus = ROLE_SIDEBAR_MENUS.filter((menu) =>
        menu.anyOf ? menu.anyOf.some(allow) : allow(menu.perm)
    );

    // Untuk superadmin: susun menu utama dan administrasi secara ringkas.
    // Dropdown departemen ditaruh langsung di dalam menu sidebar, tepat di bawah Departments.
    if (user?.is_superadmin) {
        const adminOrder = ['overview', 'project', 'users', 'roles', 'access', 'departments', 'parameters'];
        const department = departments.find((d) => d.id === Number(departmentFilter));
        const deptModules = department ? DEPARTMENT_MENUS[department.code] || [] : [];

        const baseMenus = adminOrder
            .map((id) => ROLE_SIDEBAR_MENUS.find((m) => m.id === id))
            .filter(Boolean);

        const opMenus = deptModules
            .map((id) => ROLE_SIDEBAR_MENUS.find((m) => m.id === id))
            .filter(Boolean);

        displayedMenus = [...baseMenus, ...opMenus];
    }

    // Scroll otomatis jika daftar menu melebihi tinggi layar.
    useEffect(() => {
        const list = menuRef.current;
        const active = list?.querySelector('a.active');
        const viewport = list?.parentElement;
        if (!list || !active || !viewport) return;

        if (viewport.scrollHeight <= viewport.clientHeight) {
            viewport.scrollTop = 0;
            return;
        }

        const item = active.getBoundingClientRect();
        const box = viewport.getBoundingClientRect();
        if (item.bottom > box.bottom) viewport.scrollTop += item.bottom - box.bottom;
        else if (item.top < box.top) viewport.scrollTop -= box.top - item.top;
    }, [activeTab, departmentFilter]);

    // Jangan pernah merender sidebar kosong: /me bisa belum selesai saat render pertama.
    if (displayedMenus.length === 0) {
        displayedMenus = ROLE_SIDEBAR_MENUS.filter((menu) => menu.id === 'overview');
    }

    // Dipakai label kelompok menu operasional ("Departemen: ...").
    const currentDepartment = departments.find((d) => d.id === Number(departmentFilter));

    return (
        <div id="nav" className="nav-container d-flex" style={{ borderRadius: 0, backgroundColor: '#1e40af', borderRight: '1px solid #1d4ed8' }}>
            <div className="nav-content d-flex" style={{ borderRadius: 0, backgroundColor: '#1e40af' }}>
                {/* Logo Sementara Tetap di Atas (Putih Bersih di Latar Biru) */}
                <div className="logo position-relative" style={{ borderRadius: 0, order: 0, backgroundColor: '#1e40af' }}>
                    <a
                        href="#overview"
                        onClick={(e) => {
                            e.preventDefault();
                            if (onGlobalDashboardLocked) onGlobalDashboardLocked();
                        }}
                    >
                        <div className="img" style={{ filter: 'brightness(0) invert(1)' }}></div>
                    </a>
                </div>

                {/* Active Project Workspace Indicator (Bila Proyek Sedang Dibuka) */}
                {activeProject && (
                    <div
                        style={{
                            margin: '0.5rem 0.85rem',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: '#1d4ed8',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff'
                        }}
                    >
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1' }}>
                            PROJECT WORKSPACE
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeProject.job_no ? `JOB: ${activeProject.job_no}` : activeProject.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeProject.client || activeProject.name}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (onSetActiveProject) onSetActiveProject('');
                            }}
                            className="btn btn-link p-0 text-decoration-none"
                            style={{
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                marginTop: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <span>&larr; Switch Project</span>
                        </button>
                    </div>
                )}

                {/* Navigasi Menu Khusus Role Aktif - Latar Biru, Menu-menunya Putih Kontras Tinggi, Rapat ke Atas */}
                <div className="menu-container flex-grow-1" style={{ borderRadius: 0, order: 1, marginTop: '0.5rem', backgroundColor: '#1e40af' }}>
                    <ul id="menu" ref={menuRef} className="menu show" style={{ borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#1e40af' }}>
                        {displayedMenus.map((menu, index) => {
                            const hasChildren = Array.isArray(menu.children) && menu.children.length > 0;
                            const childActive = hasChildren && menu.children.some((c) => c.id === activeTab);
                            const isActive = activeTab === menu.id || childActive;
                            const isOpen = hasChildren ? Boolean(openSubmenus[menu.id]) : false;
                            const isOperational = OPERATIONAL_MENU_IDS.includes(menu.id);
                            const groupName = menu.group || (isOperational ? (currentDepartment ? `Departemen: ${currentDepartment.name}` : 'Modul Departemen') : null);
                            const previousMenu = index > 0 ? displayedMenus[index - 1] : null;
                            const previousGroup = previousMenu
                                ? (previousMenu.group || (OPERATIONAL_MENU_IDS.includes(previousMenu.id) ? (currentDepartment ? `Departemen: ${currentDepartment.name}` : 'Modul Departemen') : null))
                                : null;
                            const showGroup = Boolean(groupName) && groupName !== previousGroup;

                            return (
                                <React.Fragment key={menu.id}>
                                    {showGroup && (
                                        <li
                                            className="pcm-menu-group"
                                            aria-hidden="true"
                                            style={{
                                                padding: '0.75rem 1.25rem 0.35rem',
                                                fontSize: '0.6875rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                color: 'rgba(255, 255, 255, 0.55)',
                                                backgroundColor: '#1e40af'
                                            }}
                                        >
                                            {groupName}
                                        </li>
                                    )}
                                    {hasChildren ? (
                                        <>
                                            {/* Parent: hanya membuka/menutup, tidak berpindah halaman */}
                                            <li style={{ borderRadius: 0, margin: '2px 0', padding: 0, backgroundColor: '#1e40af' }}>
                                                <a
                                                    href={`#${menu.id}`}
                                                    className={isActive ? 'active' : ''}
                                                    aria-expanded={isOpen}
                                                    aria-controls={`submenu-${menu.id}`}
                                                    style={{
                                                        borderRadius: 0,
                                                        backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                                                        color: '#ffffff',
                                                        borderLeft: isActive ? '4px solid #ffffff' : '4px solid transparent',
                                                        paddingLeft: '1.25rem',
                                                        paddingRight: '1.25rem',
                                                        paddingTop: '0.9rem',
                                                        paddingBottom: '0.9rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '0.5rem',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s ease, border-left 0.2s ease'
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleSubmenu(menu.id);
                                                    }}
                                                >
                                                    <span
                                                        className="label"
                                                        style={{
                                                            color: '#ffffff',
                                                            fontSize: '1rem',
                                                            fontWeight: isActive ? 700 : 600,
                                                            letterSpacing: '-0.01em'
                                                        }}
                                                    >
                                                        {menu.label}
                                                    </span>
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        aria-hidden="true"
                                                        style={{
                                                            flexShrink: 0,
                                                            opacity: 0.85,
                                                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.2s ease'
                                                        }}
                                                    >
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </a>

                                            {/* Child: menu sebenarnya, menjorok ke dalam */}
                                            {isOpen && (
                                                <ul id={`submenu-${menu.id}`} style={{ listStyle: 'none', margin: 0, padding: 0, backgroundColor: '#1e40af' }}>
                                                    {menu.children.map((child) => {
                                                        const childIsActive = activeTab === child.id;
                                                        return (
                                                            <li key={child.id} style={{ margin: 0, padding: 0, backgroundColor: '#1e40af' }}>
                                                                <a
                                                                    href={`#${child.id}`}
                                                                    className={childIsActive ? 'active' : ''}
                                                                    style={{
                                                                        borderRadius: 0,
                                                                        backgroundColor: childIsActive ? '#1d4ed8' : 'transparent',
                                                                        color: '#ffffff',
                                                                        borderLeft: childIsActive ? '4px solid #ffffff' : '4px solid transparent',
                                                                        paddingLeft: '2.5rem',
                                                                        paddingRight: '1.25rem',
                                                                        paddingTop: '0.65rem',
                                                                        paddingBottom: '0.65rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem',
                                                                        transition: 'background-color 0.2s ease, border-left 0.2s ease'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        onSelectTab(child.id);
                                                                    }}
                                                                >
                                                                    <span
                                                                        aria-hidden="true"
                                                                        style={{
                                                                            width: '5px',
                                                                            height: '5px',
                                                                            borderRadius: '50%',
                                                                            flexShrink: 0,
                                                                            backgroundColor: childIsActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'
                                                                        }}
                                                                    />
                                                                    <span
                                                                        className="label"
                                                                        style={{
                                                                            color: '#ffffff',
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: childIsActive ? 700 : 500,
                                                                            letterSpacing: '-0.01em'
                                                                        }}
                                                                    >
                                                                        {child.label}
                                                                    </span>
                                                                </a>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                            </li>
                                        </>
                                    ) : (
                                    <li style={{ borderRadius: 0, margin: '2px 0', padding: 0, backgroundColor: '#1e40af' }}>
                                    <a
                                        href={`#${menu.id}`}
                                        className={isActive ? 'active' : ''}
                                        style={{
                                            borderRadius: 0,
                                            backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                                            color: '#ffffff',
                                            borderLeft: isActive ? '4px solid #ffffff' : '4px solid transparent',
                                            paddingLeft: '1.25rem',
                                            paddingRight: '1.25rem',
                                            paddingTop: '0.9rem',
                                            paddingBottom: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s ease, border-left 0.2s ease'
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onSelectTab(menu.id);
                                        }}
                                    >
                                        <span
                                            className="label"
                                            style={{
                                                color: '#ffffff',
                                                fontSize: '1rem',
                                                fontWeight: isActive ? 700 : 600,
                                                letterSpacing: '-0.01em'
                                            }}
                                        >
                                            {menu.label}
                                        </span>
                                    </a>
                                    </li>
                                    )}

                                    {/* Menu terpisah: List Departement dengan ukuran, font, dan padding sama persis seperti menu lainnya */}
                                    {menu.id === 'departments' && user?.is_superadmin && (
                                        <li
                                            style={{
                                                borderRadius: 0,
                                                margin: '2px 0',
                                                padding: 0,
                                                backgroundColor: '#1e40af',
                                                position: 'relative'
                                            }}
                                        >
                                            <select
                                                id="pcm-scope-dept"
                                                className={`pcm-menu-dept-select ${departmentFilter ? 'active' : ''}`}
                                                value={departmentFilter ?? ''}
                                                onChange={(e) => onDepartmentChange?.(e.target.value ? Number(e.target.value) : null)}
                                                aria-label="List Departement"
                                            >
                                                <option value="" style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>List Departement</option>
                                                {departments.map((d) => (
                                                    <option key={d.id} value={d.id} style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                                                        {d.name} ({d.code})
                                                    </option>
                                                ))}
                                            </select>
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    right: '1.25rem',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    color: '#ffffff',
                                                    pointerEvents: 'none',
                                                    fontSize: '0.75rem',
                                                    opacity: 0.8
                                                }}
                                                aria-hidden="true"
                                            >
                                                ▼
                                            </span>
                                        </li>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </ul>
                </div>

                {/* Tombol Logout di Bagian Bawah - Tombol Putih Kontras, Tanpa Icon & Tanpa Rounded */}
                <div
                    className="nav-logout-container p-3"
                    style={{
                        borderRadius: 0,
                        order: 10,
                        marginTop: 'auto',
                        backgroundColor: '#1e40af',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                >
                    <button
                        type="button"
                        onClick={onLogout}
                        className="btn btn-sm w-100 fw-bold"
                        style={{
                            borderRadius: 0,
                            backgroundColor: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #ffffff',
                            paddingTop: '0.6rem',
                            paddingBottom: '0.6rem',
                            fontSize: '0.875rem'
                        }}
                        title="Logout dari Akun"
                    >
                        Logout
                    </button>
                </div>

                {/* Tombol Mobile Hamburger */}
                <div className="mobile-buttons-container" style={{ order: 11, backgroundColor: '#1e40af' }}>
                    <a href="#" id="mobileMenuButton" className="menu-button" style={{ borderRadius: 0, color: '#ffffff' }}>
                        <i data-acorn-icon="menu"></i>
                    </a>
                </div>
            </div>
            <div className="nav-shadow" style={{ borderRadius: 0, display: 'none' }}></div>
        </div>
    );
}
