/* Hallmark · macrostructure: Workbench · theme: Acorn-Blue · tone: utilitarian
 * disciplines: honest-copy · locked-tokens · mobile-responsive · typography-purity
 * states: default · hover · focus · active · disabled
 * metrics: PCM 2428 Job No · 8 joints · 2 welded · 3 fitup · DWG-2428-ISO-001 · TP-2428-01
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import { Sidebar, ROLE_SIDEBAR_MENUS, OPERATIONAL_MENU_IDS, DEPARTMENT_MENUS } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { OverviewTab } from './components/OverviewTab';
import { EngineeringTab } from './components/EngineeringTab';
import { MaterialTab } from './components/MaterialTab';
import { FabricationTab } from './components/FabricationTab';
import { FieldErectionTab } from './components/FieldErectionTab';
import { ConstructionLayout } from './components/ConstructionLayout';
import { QaqcTab } from './components/QaqcTab';
import { TestPackageTab } from './components/TestPackageTab';
import { HseTab } from './components/HseTab';
import { AdminTab } from './components/AdminTab';
import { ProjectManagerTab } from './components/ProjectManagerTab';

// Pemetaan role pengguna ke tab awal saat pertama login (Global Dashboard belum bisa dibuka)
const ROLE_DEFAULT_TABS = {
    superadmin: 'overview',
    project_manager: 'overview',
    engineer: 'engineering',
    material: 'material',
    construction: 'construction',
    qaqc: 'qaqc',
    testpackage: 'testpackage',
    hse: 'hse'
};

function App() {
    const [user, setUser] = useState(api.getUser());
    const [token, setToken] = useState(api.getToken());
    // Daftar izin dari database. Sidebar dan tombol memakai ini, bukan nama role.
    const [permissions, setPermissions] = useState(() => api.getUser()?.permissions || []);
    // Cakupan departemen, hanya untuk superadmin. null = semua departemen.
    const [departments, setDepartments] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState(() => api.getDepartmentFilter());
    const [activeTab, setActiveTabState] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) return hash;
        const u = api.getUser();
        return u ? (ROLE_DEFAULT_TABS[u.role] || 'engineering') : 'engineering';
    });

    const setActiveTab = useCallback((tab) => {
        window.location.hash = tab;
        setActiveTabState(tab);
    }, []);

    useEffect(() => {
        const handleHash = () => {
            const h = window.location.hash.replace('#', '');
            if (h) setActiveTabState(h);
        };
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);
    const [lastRefresh, setLastRefresh] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [showGlobalLockedModal, setShowGlobalLockedModal] = useState(false);

    // State data proyek
    const [overview, setOverview] = useState(null);
    const [drawings, setDrawings] = useState([]);
    const [joints, setJoints] = useState([]);
    const [stockMoves, setStockMoves] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [testPackages, setTestPackages] = useState([]);
    const [hseLogs, setHseLogs] = useState([]);
    const [scopes, setScopes] = useState([]);
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(() => localStorage.getItem('pcm_active_project_id') || '');

    const handleSetActiveProject = (id) => {
        if (id) {
            localStorage.setItem('pcm_active_project_id', String(id));
            setActiveProjectId(String(id));
        } else {
            localStorage.removeItem('pcm_active_project_id');
            setActiveProjectId('');
        }
    };

    const activeProject = useMemo(() => {
        return (projects || []).find((p) => String(p.id) === String(activeProjectId)) || null;
    }, [projects, activeProjectId]);

    // Status pemuatan data global, dipakai modul untuk state loading dan error (R-27)
    const [dataLoading, setDataLoading] = useState(false);
    const [dataError, setDataError] = useState('');

    // Bersihkan stale active project di localStorage bila project sudah tidak ada di database setelah load selesai
    useEffect(() => {
        if (!dataLoading && projects.length > 0 && activeProjectId) {
            const exists = projects.some((p) => String(p.id) === String(activeProjectId));
            if (!exists) {
                localStorage.removeItem('pcm_active_project_id');
                setActiveProjectId('');
            }
        }
    }, [projects, activeProjectId, dataLoading]);

    // Notifikasi Toast
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4000);
    };

    // Load data dari API
    const loadData = useCallback(async () => {
        if (!api.getToken()) return;
        setDataLoading(true);
        try {
            const [
                ovRes,
                dwRes,
                jtRes,
                smRes,
                inRes,
                tpRes,
                hsRes,
                scRes,
                pjRes
            ] = await Promise.all([
                api.get('/overview'),
                api.get('/drawings'),
                api.get('/joints'),
                api.get('/stock'),
                api.get('/inspections'),
                api.get('/test-packages'),
                api.get('/hse'),
                api.get('/scopes'),
                api.get('/projects')
            ]);

            setOverview(ovRes);
            setDrawings(dwRes);
            setJoints(jtRes);
            setStockMoves(smRes);
            setInspections(inRes);
            setTestPackages(tpRes);
            setHseLogs(hsRes);
            setScopes(scRes);
            setProjects(pjRes || []);
            setLastRefresh(new Date().toLocaleTimeString('id-ID'));
            setDataError('');
        } catch (err) {
            console.error('Error fetching data:', err);
            setDataError(err.message || 'Tidak dapat menghubungi server.');
        } finally {
            setDataLoading(false);
        }
    }, []);

    // Listen auth change
    useEffect(() => {
        const handleAuthChange = () => {
            const u = api.getUser();
            const t = api.getToken();
            setUser(u);
            setToken(t);
            setPermissions(u?.permissions || []);
            if (u && ROLE_DEFAULT_TABS[u.role]) {
                setActiveTab(ROLE_DEFAULT_TABS[u.role]);
            }
        };
        window.addEventListener('pcm-auth-changed', handleAuthChange);
        return () => window.removeEventListener('pcm-auth-changed', handleAuthChange);
    }, []);

    // Izin bisa berubah dari layar Hak Akses. Ambil ulang saat sesi dimuat supaya
    // menu tidak bergantung pada salinan localStorage yang mungkin sudah basi.
    useEffect(() => {
        if (!token) return undefined;
        let alive = true;
        api.get('/me')
            .then((fresh) => {
                if (!alive || !fresh) return;
                api.setUser(fresh);
                setUser(fresh);
                setPermissions(fresh.permissions || []);
            })
            .catch(() => {
                // 401 sudah ditangani api.request; kegagalan lain dibiarkan
                // memakai izin terakhir yang tersimpan.
            });
        return () => {
            alive = false;
        };
    }, [token]);

    // Daftar departemen untuk pemilih cakupan. Hanya superadmin yang butuh.
    useEffect(() => {
        if (!user?.is_superadmin) {
            setDepartments([]);
            setDepartmentFilter((current) => {
                if (current === null) return current;
                api.setDepartmentFilter(null);
                return null;
            });
            return undefined;
        }

        let alive = true;
        api.get('/admin/departments')
            .then((list) => {
                if (!alive) return;
                const rows = Array.isArray(list) ? list : [];
                setDepartments(rows);
                // Departemen yang sudah dihapus tidak boleh menyandera filter.
                setDepartmentFilter((current) => {
                    if (current === null) return current;
                    if (rows.some((d) => d.id === Number(current))) return current;
                    api.setDepartmentFilter(null);
                    return null;
                });
            })
            .catch(() => {
                if (alive) setDepartments([]);
            });

        return () => {
            alive = false;
        };
    }, [user?.is_superadmin]);

    // Mengganti cakupan departemen tidak boleh meninggalkan layar modul yang
    // sudah tidak terlihat di sidebar. Kalau tab aktif bukan milik departemen
    // baru, pindah ke modul pertama departemen itu.
    const changeDepartment = useCallback((id) => {
        api.setDepartmentFilter(id);
        setDepartmentFilter(id);

        if (!id) return;

        const department = departments.find((d) => d.id === Number(id));
        const modules = department ? DEPARTMENT_MENUS[department.code] || [] : [];

        if (OPERATIONAL_MENU_IDS.includes(activeTab) && !modules.includes(activeTab)) {
            setActiveTab(modules[0] || 'overview');
        }
    }, [departments, activeTab, setActiveTab]);

    // Tab yang tidak diizinkan (misal dari hash lama) dialihkan ke menu pertama
    // yang boleh dibuka role ini, dan yang masih berada dalam cakupan departemen.
    useEffect(() => {
        if (!token || !user) return;

        const allowed = (menu) => (menu.anyOf
            ? menu.anyOf.some((code) => user.is_superadmin || permissions.includes(code))
            : user.is_superadmin || permissions.includes(menu.perm));

        const inScope = (menu) => {
            if (!user.is_superadmin || !departmentFilter) return true;
            if (!OPERATIONAL_MENU_IDS.includes(menu.id)) return true;
            const department = departments.find((d) => d.id === Number(departmentFilter));
            return department
                ? (DEPARTMENT_MENUS[department.code] || []).includes(menu.id)
                : false;
        };

        /* Menu bisa berada di dalam sub-menu (children). Izin & cakupan
           departemen mengikuti menu induknya, jadi id anak harus diresolusi
           dulu — kalau tidak, tab anak akan dianggap tidak dikenal dan
           pengguna terlempar ke Global Dashboard. */
        const resolveMenu = (id) => {
            const top = ROLE_SIDEBAR_MENUS.find((m) => m.id === id);
            if (top) return { target: top, owner: top };
            const parent = ROLE_SIDEBAR_MENUS.find(
                (m) => Array.isArray(m.children) && m.children.some((c) => c.id === id)
            );
            if (!parent) return null;
            return { target: parent.children.find((c) => c.id === id), owner: parent };
        };

        const resolved = resolveMenu(activeTab);
        if (resolved && allowed(resolved.owner) && inScope(resolved.owner)) return;

        const fallback = ROLE_SIDEBAR_MENUS.find((m) => allowed(m) && inScope(m))?.id || 'overview';
        setActiveTab(fallback);
    }, [activeTab, token, user, permissions, departmentFilter, departments, setActiveTab]);

    // Acorn's icons and Nav are initialised by /js/scripts.js, not from here.
    // Both are declared as top level `class` in their own scripts, so they exist
    // as lexical globals and never as window properties: `window.AcornIcons` and
    // `window.Nav` are always undefined. The menu ownership fix lives in
    // /js/base/pcm-menu.js.

    // Initial load & Polling tiap 30 detik. Cakupan departemen ikut jadi
    // pemicu: mengganti departemen harus langsung memuat ulang angkanya.
    useEffect(() => {
        if (token) {
            loadData();
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }
    }, [token, loadData, departmentFilter]);

    const handleLogout = async () => {
        await api.logout();
        api.setDepartmentFilter(null);
        setDepartmentFilter(null);
        setUser(null);
        setToken('');
    };

    if (!token || !user) {
        return <LoginModal onLoginSuccess={() => loadData()} />;
    }

    const activeDepartment = departmentFilter
        ? departments.find((d) => d.id === Number(departmentFilter))
        : null;
    const scopeCode = user.is_superadmin
        ? (activeDepartment ? activeDepartment.code : 'Semua')
        : (user.department?.code || null);
    const scopeLabel = user.is_superadmin
        ? (activeDepartment ? `Dept. ${activeDepartment.code}` : 'Semua departemen')
        : `Dept. ${user.department?.code || '—'}`;

    return (
        <>
            {/* Navigasi Acorn Template (#nav) */}
            <Sidebar
                user={user}
                permissions={permissions}
                departments={departments}
                departmentFilter={departmentFilter}
                onDepartmentChange={changeDepartment}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                onLogout={handleLogout}
                onGlobalDashboardLocked={() => setActiveTab('overview')}
                activeProject={activeProject}
                activeProjectId={activeProjectId}
                onSetActiveProject={handleSetActiveProject}
            />

            {/* Layout Utama Acorn Template (main > container) */}
            <main>
                <div className="container">
                    {/* Header Judul Halaman & Breadcrumb */}
                    <Header
                        activeTab={activeTab}
                        user={user}
                        scopeCode={scopeCode}
                        onRefresh={() => {
                            loadData();
                            showToast('Data diperbarui dari database');
                        }}
                        lastRefresh={lastRefresh}
                        onSelectTab={setActiveTab}
                        onLogout={handleLogout}
                        onGlobalDashboardLocked={() => setActiveTab('overview')}
                        activeProject={activeProject}
                        onSetActiveProject={handleSetActiveProject}
                        isAtRisk={
                            (hseLogs || []).some(l => (l.status || '').toLowerCase() === 'open') ||
                            (overview?.ndt_reject_pct !== undefined && overview?.ndt_reject_pct !== null && overview.ndt_reject_pct > 5)
                        }
                    />

                    {/* Konten Halaman Sesuai Tab Aktif */}
                    {activeTab === 'overview' && (
                        <OverviewTab
                            overview={overview}
                            joints={joints}
                            scopes={scopes}
                            drawings={drawings}
                            stockMoves={stockMoves}
                            inspections={inspections}
                            testPackages={testPackages}
                            hseLogs={hseLogs}
                            projects={projects}
                            user={user}
                            scopeLabel={scopeLabel}
                            loading={dataLoading}
                            error={dataError}
                            onSelectTab={setActiveTab}
                            onReload={() => {
                                loadData();
                                showToast('Data Global Dashboard diperbarui');
                            }}
                        />
                    )}
                    {['project_list', 'engineering', 'line_service', 'welding_map', 'boq', 'bom', 'material_standard', 'material_pipe', 'material_fitting', 'material_additional', 'pipe_schedule', 'pipe_table', 'fitting_table', 'document_control'].includes(activeTab) && (
                        <EngineeringTab
                            currentSection={activeTab}
                            drawings={drawings}
                            projects={projects}
                            activeProject={activeProject}
                            activeProjectId={activeProjectId}
                            onSetActiveProject={handleSetActiveProject}
                            onSelectTab={setActiveTab}
                            loading={dataLoading}
                            error={dataError}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Data Engineering berhasil diperbarui');
                            }}
                        />
                    )}
                    {['material', 'mat_requirement', 'mat_receiving', 'mat_inspection', 'mat_storing', 'mat_warehouse', 'mat_openyard', 'mat_issuing'].includes(activeTab) && (
                        <MaterialTab
                            currentSection={activeTab}
                            stockMoves={stockMoves}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Data Material Control diperbarui');
                            }}
                        />
                    )}
                    {activeTab === 'fabrication' && (
                        <FabricationTab
                            joints={joints}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Status Spool Shop diperbarui');
                            }}
                        />
                    )}
                    {activeTab === 'erection' && (
                        <FieldErectionTab
                            projects={projects}
                            joints={joints}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Status Field Erection diperbarui');
                            }}
                        />
                    )}
                    {activeTab === 'construction' && (
                        <ConstructionLayout
                            projects={projects}
                            joints={joints}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Status Konstruksi diperbarui');
                            }}
                        />
                    )}
                    {activeTab === 'qaqc' && (
                        <QaqcTab
                            joints={joints}
                            inspections={inspections}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Laporan QC & Joint Status diperbarui');
                            }}
                        />
                    )}
                    {activeTab === 'testpackage' && (
                        <TestPackageTab
                            testPackages={testPackages}
                            joints={joints}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Test Package diperbarui');
                            }}
                        />
                    )}
                    {activeTab === 'hse' && (
                        <HseTab
                            hseLogs={hseLogs}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Log HSE diperbarui');
                            }}
                        />
                    )}
                    {['schedule', 'pm_scurve', 'pm_budget', 'pm_daily', 'pm_milestone', 'report'].includes(activeTab) && (
                        <ProjectManagerTab
                            currentSection={activeTab}
                            projects={projects}
                            drawings={drawings}
                            scopes={scopes}
                            joints={joints}
                            stockMoves={stockMoves}
                            overview={overview}
                            user={user}
                            onReload={() => {
                                loadData();
                                showToast('Data Project Management diperbarui');
                            }}
                        />
                    )}
                    {['project', 'users', 'roles', 'access', 'departments', 'parameters'].includes(activeTab) && (
                        <AdminTab
                            key={activeTab}
                            section={activeTab}
                            user={user}
                            onReload={loadData}
                            onToast={showToast}
                        />
                    )}
                </div>
            </main>

            {/* Footer Resmi Acorn Template */}
            <footer>
                <div className="footer-content">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 col-sm-6">
                                <p className="mb-0 text-muted text-medium">
                                    &copy; 2026 PCM Piping Suite &bull; Job No. 2428 Multi-Role Unified System
                                </p>
                            </div>
                            <div className="col-sm-6 d-none d-sm-block text-end">
                                <ul className="breadcrumb pt-0 pe-0 mb-0 float-end">
                                    <li className="breadcrumb-item mb-0 text-medium">
                                        <span className="badge bg-outline-primary me-2">MySQL 3306</span>
                                    </li>
                                    <li className="breadcrumb-item mb-0 text-medium">
                                        <span className="badge bg-outline-success">Sanctum Token</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Modal Global Dashboard Belum Bisa Dibuka */}
            {showGlobalLockedModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <span className="text-warning">🔒</span>
                                    <span>Global Dashboard Belum Bisa Dibuka</span>
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowGlobalLockedModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body pt-3">
                                <p className="text-muted mb-2">
                                    Fitur <strong>Global Dashboard</strong> saat ini belum dapat dibuka karena sedang dalam tahap standardisasi integrasi data konsolidasi multi-role.
                                </p>
                                <p className="text-muted mb-0">
                                    Anda saat ini masuk sebagai <strong>{user?.name}</strong> (<span className="text-uppercase fw-bold text-primary">{user?.role}</span>). Silakan gunakan modul kerja khusus role Anda di menu navigasi.
                                </p>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        setShowGlobalLockedModal(false);
                                        if (ROLE_DEFAULT_TABS[user?.role]) {
                                            setActiveTab(ROLE_DEFAULT_TABS[user?.role]);
                                        }
                                    }}
                                >
                                    Mengerti
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className="position-fixed bottom-0 end-0 p-3"
                    style={{ zIndex: 1070 }}
                >
                    <div className="toast show align-items-center text-white bg-primary border-0 shadow" role="alert">
                        <div className="d-flex">
                            <div className="toast-body fw-bold">
                                {toastMessage}
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white me-2 m-auto"
                                onClick={() => setToastMessage('')}
                            ></button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
