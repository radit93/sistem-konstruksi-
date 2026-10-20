import React, { useEffect, useRef } from 'react';

// Menu operasional: hanya ini yang ikut tersaring saat superadmin memilih
// satu departemen. Dashboard dan menu administrasi selalu tampil.
export const OPERATIONAL_MENU_IDS = [
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
        'engineering',
        'line_service',
        'welding_map',
        'boq',
        'bom',
        'material_standard',
        'document_control'
    ],
    MAT: ['material'],
    CONS: ['fabrication', 'erection'],
    QAQC: ['qaqc', 'testpackage'],
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
        id: 'engineering',
        label: 'Isometric Drawing',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Input Drawing & Berkas CAD/PDF'
    },
    {
        id: 'line_service',
        label: 'Line Service',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Klasifikasi Jalur Pipa & Service'
    },
    {
        id: 'welding_map',
        label: 'Welding Map',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Pemetaan Sambungan & Spool'
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
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Katalog Acuan Standar ASTM'
    },
    {
        id: 'document_control',
        label: 'Document Control',
        perm: 'drawing.view',
        group: 'Engineering',
        desc: 'Riwayat Revisi & Surat Transmittal'
    },
    {
        id: 'material',
        label: 'Material Control',
        perm: 'stock.view',
        desc: 'Kontrol Stok Pipa & Heat No'
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
    onGlobalDashboardLocked
}) {
    const menuRef = useRef(null);
    const allow = (code) => Boolean(user?.is_superadmin) || permissions.includes(code);

    let displayedMenus = ROLE_SIDEBAR_MENUS.filter((menu) =>
        menu.anyOf ? menu.anyOf.some(allow) : allow(menu.perm)
    );

    // Untuk superadmin: susun menu utama dan administrasi secara ringkas.
    // Dropdown departemen ditaruh langsung di dalam menu sidebar, tepat di bawah Departments.
    if (user?.is_superadmin) {
        const adminOrder = ['overview', 'project', 'users', 'roles', 'access', 'departments'];
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

                {/* Navigasi Menu Khusus Role Aktif - Latar Biru, Menu-menunya Putih Kontras Tinggi, Rapat ke Atas */}
                <div className="menu-container flex-grow-1" style={{ borderRadius: 0, order: 1, marginTop: '0.5rem', backgroundColor: '#1e40af' }}>
                    <ul id="menu" ref={menuRef} className="menu show" style={{ borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#1e40af' }}>
                        {displayedMenus.map((menu, index) => {
                            const isActive = activeTab === menu.id;
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
