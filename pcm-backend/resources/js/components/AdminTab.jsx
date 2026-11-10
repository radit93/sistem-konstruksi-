import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { confirmDelete } from '../confirm';
import { PcmSelect } from './SearchSelect';

const SECTIONS = ['project', 'users', 'roles', 'access', 'departments'];

/* Label kategori pada menu Master Parameter. */
const PARAM_CATEGORY_LABELS = {
    plant_area: 'Plant Area',
    distribution_target: 'Target Distribusi',
    material_attribute: 'Label Atribut Material'
};

const GROUP_LABELS = {
    dashboard: 'Dashboard',
    engineering: 'Engineering',
    material: 'Material',
    construction: 'Construction',
    qaqc: 'QA-QC',
    testpackage: 'Test Package',
    hse: 'HSE',
    schedule: 'BOQ dan Jadwal',
    report: 'Laporan',
    project: 'Project',
    users: 'Users',
    role: 'Role',
    access: 'Hak Akses',
    department: 'Department'
};

function Modal({ title, sub, onClose, children, footer }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="modal fade show d-block pcm-modal"
            style={{ zIndex: 1060 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header border-0 pb-0">
                        <div>
                            <h5 className="modal-title fw-bold text-dark">{title}</h5>
                            {sub && <span className="pcm-modal__sub">{sub}</span>}
                        </div>
                        <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
                    </div>
                    <div className="modal-body pt-3">{children}</div>
                    <div className="modal-footer border-0 pt-0">{footer}</div>
                </div>
            </div>
        </div>
    );
}

function State({ kind, children }) {
    return (
        <div className={`pcm-state pcm-state--${kind}`}>
            <p className="pcm-state__text">{children}</p>
        </div>
    );
}

function Section({ toolbar, children }) {
    return (
        <div className="pcm-dash">
            <div className="pcm-card">
                <div className="pcm-card__body">
                    {toolbar && <div className="pcm-toolbar mb-3">{toolbar}</div>}
                    {children}
                </div>
            </div>
        </div>
    );
}

export function AdminTab({ section, user, onReload, onToast }) {
    const permissions = user?.permissions || [];
    const can = useCallback(
        (code) => Boolean(user?.is_superadmin) || permissions.includes(code),
        [user, permissions]
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [rows, setRows] = useState({ projects: [], users: [], roles: [], departments: [], permissions: [], parameters: [] });

    const [dialog, setDialog] = useState(null); // { type, record }
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [search, setSearch] = useState('');

    // Matriks hak akses: roleId -> Set(kode izin)
    const [draft, setDraft] = useState({});
    const [dirtyRoles, setDirtyRoles] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            if (section === 'project') {
                const list = await api.get('/projects');
                setRows((r) => ({ ...r, projects: list || [] }));
            } else if (section === 'users') {
                const [users, roles, departments] = await Promise.all([
                    api.get('/admin/users'),
                    can('role.view') ? api.get('/admin/roles') : Promise.resolve([]),
                    can('department.view') ? api.get('/admin/departments') : Promise.resolve([])
                ]);
                setRows((r) => ({ ...r, users: users || [], roles: roles || [], departments: departments || [] }));
            } else if (section === 'roles') {
                const roles = await api.get('/admin/roles');
                setRows((r) => ({ ...r, roles: roles || [] }));
            } else if (section === 'access') {
                const [permissions, roles] = await Promise.all([
                    api.get('/admin/permissions'),
                    api.get('/admin/roles')
                ]);
                setRows((r) => ({ ...r, permissions: permissions || [], roles: roles || [] }));
                const next = {};
                (roles || []).forEach((role) => {
                    next[role.id] = new Set(role.permission_codes || []);
                });
                setDraft(next);
                setDirtyRoles({});
            } else if (section === 'departments') {
                const list = await api.get('/admin/departments');
                setRows((r) => ({ ...r, departments: list || [] }));
            } else if (section === 'parameters') {
                const list = await api.get('/system-parameters');
                setRows((r) => ({ ...r, parameters: list || [] }));
            }
        } catch (err) {
            setError(err.message || 'Tidak dapat memuat data administrasi.');
        } finally {
            setLoading(false);
        }
    }, [section, can]);

    useEffect(() => {
        load();
    }, [load]);

    const done = (message) => {
        setDialog(null);
        setSaving(false);
        setFormError('');
        if (onToast) onToast(message);
        load();
        if (onReload) onReload();
    };

    const fail = (err) => {
        setSaving(false);
        setFormError(err.message || 'Gagal menyimpan.');
    };

    const openDialog = (type, record = null) => {
        setFormError('');
        setForm(
            record
                ? { ...record, department_id: record.department?.id ?? record.department_id ?? '' }
                : {}
        );
        setDialog({ type, record });
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!dialog) return;
        setSaving(true);
        setFormError('');
        const { type, record } = dialog;
        try {
            if (type === 'project') {
                const body = { name: form.name, client: form.client, job_no: form.job_no };
                if (record) await api.put(`/projects/${record.id}`, body);
                else await api.post('/projects', body);
                return done(record ? 'Project diperbarui' : 'Project dibuat');
            }
            if (type === 'user') {
                const body = {
                    name: form.name,
                    email: form.email,
                    role: form.role,
                    department_id: form.department_id === '' ? null : Number(form.department_id),
                    is_active: form.is_active !== false
                };
                if (record) {
                    await api.put(`/admin/users/${record.id}`, body);
                    return done('User diperbarui');
                }
                body.password = form.password;
                await api.post('/admin/users', body);
                return done('User dibuat');
            }
            if (type === 'password') {
                await api.post(`/admin/users/${record.id}/password`, { password: form.password });
                return done('Password direset, sesi lama dicabut');
            }
            if (type === 'role') {
                const body = {
                    name: form.name,
                    description: form.description || null,
                    level: Number(form.level || 50)
                };
                if (record) {
                    await api.put(`/admin/roles/${record.id}`, body);
                    return done('Role diperbarui');
                }
                body.code = form.code;
                await api.post('/admin/roles', body);
                return done('Role dibuat');
            }
            if (type === 'department') {
                const body = {
                    code: (form.code || '').toUpperCase(),
                    name: form.name,
                    sort: Number(form.sort || 0),
                    is_active: form.is_active !== false
                };
                if (record) await api.put(`/admin/departments/${record.id}`, body);
                else await api.post('/admin/departments', body);
                return done(record ? 'Department diperbarui' : 'Department dibuat');
            }
            if (type === 'parameter') {
                const body = {
                    category: form.category || 'plant_area',
                    name: form.name,
                    code: form.code || null,
                    description: form.description || null,
                    sort_order: Number(form.sort_order || 0),
                    is_active: form.is_active !== false
                };
                if (record) await api.put(`/system-parameters/${record.id}`, body);
                else await api.post('/system-parameters', body);
                return done(record ? 'Parameter diperbarui' : 'Parameter dibuat');
            }
        } catch (err) {
            return fail(err);
        }
    };

    const remove = async (path, message) => {
        if (!(await confirmDelete(message))) return;
        try {
            await api.del(path);
            if (onToast) onToast('Data dihapus');
            load();
            if (onReload) onReload();
        } catch (err) {
            if (onToast) onToast(err.message || 'Gagal menghapus');
        }
    };

    const togglePermission = (roleId, code) => {
        const role = rows.roles.find((r) => r.id === roleId);
        const original = new Set(role?.permission_codes || []);
        const set = new Set(draft[roleId] || []);

        if (set.has(code)) set.delete(code);
        else set.add(code);

        // Tombol Simpan hanya aktif kalau hasil centang benar-benar berbeda
        // dari yang tersimpan, bukan sekadar "pernah disentuh".
        const unchanged = set.size === original.size
            && Array.from(set).every((value) => original.has(value));

        setDraft((prev) => ({ ...prev, [roleId]: set }));
        setDirtyRoles((prev) => ({ ...prev, [roleId]: !unchanged }));
    };

    const saveMatrix = async (role) => {
        try {
            await api.put(`/admin/roles/${role.id}/permissions`, {
                permissions: Array.from(draft[role.id] || [])
            });
            setDirtyRoles((prev) => ({ ...prev, [role.id]: false }));
            if (onToast) onToast(`Hak akses ${role.name} disimpan`);
        } catch (err) {
            if (onToast) onToast(err.message || 'Gagal menyimpan hak akses');
        }
    };

    const filtered = (list, keys) => {
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((row) => keys.some((key) => String(row[key] || '').toLowerCase().includes(q)));
    };

    // Kolom aksi hanya muncul kalau role ini memang punya tombol di dalamnya.
    const hasActions = {
        project: can('project.update') || can('project.delete'),
        users: can('user.update') || can('user.reset-password') || can('user.delete'),
        roles: can('role.update') || can('role.delete'),
        departments: can('department.update') || can('department.delete')
    };

    const searchBox = (
        <div className="pcm-toolbar__grow">
            <input
                className="form-control pcm-search"
                type="search"
                placeholder="Cari…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari data"
            />
        </div>
    );

    if (!SECTIONS.includes(section)) {
        return null;
    }

    return (
        <>
            {error && <div className="pcm-alert mb-3">{error}</div>}

            {section === 'project' && (
                <Section
                    toolbar={
                        <>
                            {searchBox}
                            {can('project.create') && (
                                <button type="button" className="pcm-btn pcm-btn--primary" onClick={() => openDialog('project', null)}>
                                    Project baru
                                </button>
                            )}
                        </>
                    }
                >
                    {loading && <State kind="loading">Memuat data…</State>}
                    {!loading && (
                        <div className="pcm-table-wrap">
                            <table className="table pcm-table">
                                <thead>
                                    <tr>
                                        <th>Job No</th>
                                        <th>Nama</th>
                                        <th>Client</th>
                                        <th className="text-end">Drawing</th>
                                        {hasActions.project && <th aria-label="Aksi" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered(rows.projects, ['job_no', 'name', 'client']).map((row) => (
                                        <tr key={row.id}>
                                            <td className="pcm-cell-strong">{row.job_no}</td>
                                            <td>{row.name}</td>
                                            <td>{row.client || '-'}</td>
                                            <td className="text-end">{row.drawings_count ?? '-'}</td>
                                            {hasActions.project && (
                                            <td className="text-end">
                                                {can('project.update') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm me-1" onClick={() => openDialog('project', row)}>
                                                        Ubah
                                                    </button>
                                                )}
                                                {can('project.delete') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm pcm-btn--danger" onClick={() => remove(`/projects/${row.id}`, 'Yakin ingin menghapus project ini? Drawing terkait tidak dihapus, hanya kehilangan folder project ini.')}>
                                                        Hapus
                                                    </button>
                                                )}
                                            </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered(rows.projects, ['job_no', 'name', 'client']).length === 0 && (
                                <State kind="empty">Belum ada project yang cocok.</State>
                            )}
                        </div>
                    )}
                </Section>
            )}

            {section === 'users' && (
                <Section
                    toolbar={
                        <>
                            {searchBox}
                            {can('user.create') && (
                                <button type="button" className="pcm-btn pcm-btn--primary" onClick={() => openDialog('user', null)}>
                                    User baru
                                </button>
                            )}
                        </>
                    }
                >
                    {loading && <State kind="loading">Memuat data…</State>}
                    {!loading && (
                        <div className="pcm-table-wrap">
                            <table className="table pcm-table">
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Departemen</th>
                                        <th>Status</th>
                                        <th>Login terakhir</th>
                                        {hasActions.users && <th aria-label="Aksi" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered(rows.users, ['name', 'email', 'role', 'role_name']).map((row) => (
                                        <tr key={row.id}>
                                            <td className="pcm-cell-strong">{row.name}</td>
                                            <td>{row.email}</td>
                                            <td>{row.role_name || row.role}</td>
                                            <td>{row.department?.name || <span className="pcm-dash">-</span>}</td>
                                            <td>
                                                <span className={`pcm-chip pcm-chip--${row.is_active ? 'success' : 'danger'}`}>
                                                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="pcm-nowrap">
                                                {row.last_login_at
                                                    ? new Date(row.last_login_at).toLocaleString('id-ID', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : '-'}
                                            </td>
                                            {hasActions.users && (
                                            <td className="text-end">
                                                {can('user.update') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm me-1" onClick={() => openDialog('user', row)}>
                                                        Ubah
                                                    </button>
                                                )}
                                                {can('user.reset-password') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm me-1" onClick={() => openDialog('password', row)}>
                                                        Password
                                                    </button>
                                                )}
                                                {can('user.delete') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm pcm-btn--danger" onClick={() => remove(`/admin/users/${row.id}`, `Yakin ingin menghapus user ${row.email}?`)}>
                                                        Hapus
                                                    </button>
                                                )}
                                            </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered(rows.users, ['name', 'email', 'role', 'role_name']).length === 0 && (
                                <State kind="empty">Belum ada user yang cocok.</State>
                            )}
                        </div>
                    )}
                </Section>
            )}

            {section === 'roles' && (
                <Section
                    toolbar={
                        <>
                            {searchBox}
                            {can('role.create') && (
                                <button type="button" className="pcm-btn pcm-btn--primary" onClick={() => openDialog('role', null)}>
                                    Role baru
                                </button>
                            )}
                        </>
                    }
                >
                    {loading && <State kind="loading">Memuat data…</State>}
                    {!loading && (
                        <div className="pcm-table-wrap">
                            <table className="table pcm-table">
                                <thead>
                                    <tr>
                                        <th>Kode</th>
                                        <th>Nama</th>
                                        <th className="text-end">Level</th>
                                        <th className="text-end">User</th>
                                        <th className="text-end">Izin</th>
                                        <th>Jenis</th>
                                        {hasActions.roles && <th aria-label="Aksi" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered(rows.roles, ['code', 'name']).map((row) => (
                                        <tr key={row.id}>
                                            <td className="pcm-code">{row.code}</td>
                                            <td className="pcm-cell-strong">{row.name}</td>
                                            <td className="text-end">{row.level}</td>
                                            <td className="text-end">{row.users_count}</td>
                                            <td className="text-end">{row.code === 'superadmin' ? 'Semua' : (row.permission_codes || []).length}</td>
                                            <td>
                                                <span className={`pcm-chip pcm-chip--${row.is_system ? 'neutral' : 'primary'}`}>
                                                    {row.is_system ? 'Sistem' : 'Kustom'}
                                                </span>
                                            </td>
                                            {hasActions.roles && (
                                            <td className="text-end">
                                                {can('role.update') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm me-1" onClick={() => openDialog('role', row)}>
                                                        Ubah
                                                    </button>
                                                )}
                                                {can('role.delete') && !row.is_system && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm pcm-btn--danger" onClick={() => remove(`/admin/roles/${row.id}`, `Yakin ingin menghapus role ${row.name}?`)}>
                                                        Hapus
                                                    </button>
                                                )}
                                            </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered(rows.roles, ['code', 'name']).length === 0 && (
                                <State kind="empty">Belum ada role yang cocok.</State>
                            )}
                        </div>
                    )}
                </Section>
            )}

            {section === 'access' && (
                <Section>
                    {loading && <State kind="loading">Memuat matriks…</State>}
                    {!loading && (
                        <AccessMatrix
                            permissions={rows.permissions}
                            roles={rows.roles}
                            draft={draft}
                            dirtyRoles={dirtyRoles}
                            editable={can('access.update')}
                            onToggle={togglePermission}
                            onSave={saveMatrix}
                        />
                    )}
                </Section>
            )}

            {section === 'departments' && (
                <Section
                    toolbar={
                        <>
                            {searchBox}
                            {can('department.create') && (
                                <button type="button" className="pcm-btn pcm-btn--primary" onClick={() => openDialog('department', null)}>
                                    Department baru
                                </button>
                            )}
                        </>
                    }
                >
                    {loading && <State kind="loading">Memuat data…</State>}
                    {!loading && (
                        <div className="pcm-table-wrap">
                            <table className="table pcm-table">
                                <thead>
                                    <tr>
                                        <th>Kode</th>
                                        <th>Nama</th>
                                        <th className="text-end">User</th>
                                        <th className="text-end">Urutan</th>
                                        <th>Status</th>
                                        {hasActions.departments && <th aria-label="Aksi" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered(rows.departments, ['code', 'name']).map((row) => (
                                        <tr key={row.id}>
                                            <td className="pcm-code">{row.code}</td>
                                            <td className="pcm-cell-strong">{row.name}</td>
                                            <td className="text-end">{row.users_count}</td>
                                            <td className="text-end">{row.sort}</td>
                                            <td>
                                                <span className={`pcm-chip pcm-chip--${row.is_active ? 'success' : 'danger'}`}>
                                                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            {hasActions.departments && (
                                            <td className="text-end">
                                                {can('department.update') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm me-1" onClick={() => openDialog('department', row)}>
                                                        Ubah
                                                    </button>
                                                )}
                                                {can('department.delete') && (
                                                    <button type="button" className="pcm-btn pcm-btn--sm pcm-btn--danger" onClick={() => remove(`/admin/departments/${row.id}`, `Yakin ingin menghapus department ${row.name}?`)}>
                                                        Hapus
                                                    </button>
                                                )}
                                            </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered(rows.departments, ['code', 'name']).length === 0 && (
                                <State kind="empty">Belum ada department yang cocok.</State>
                            )}
                        </div>
                    )}
                </Section>
            )}

            {section === 'parameters' && (
                <Section
                    toolbar={
                        <>
                            {searchBox}
                            {user?.is_superadmin && (
                                <button type="button" className="pcm-btn pcm-btn--primary" onClick={() => openDialog('parameter', null)}>
                                    + Parameter Baru
                                </button>
                            )}
                        </>
                    }
                >
                    {loading && <State kind="loading">Memuat parameter…</State>}
                    {!loading && (
                        <div className="pcm-table-wrap">
                            <table className="table pcm-table">
                                <thead>
                                    <tr>
                                        <th>Kategori</th>
                                        <th>Nama Parameter (Opsi Dropdown)</th>
                                        <th>Kode Singkat</th>
                                        <th>Deskripsi</th>
                                        <th className="text-center">Status</th>
                                        {user?.is_superadmin && <th className="text-end" aria-label="Aksi">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered(rows.parameters || [], ['category', 'name', 'code', 'description']).map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <span className={`pcm-chip ${row.category === 'plant_area' ? 'pcm-chip--primary' : row.category === 'material_attribute' ? 'pcm-chip--warning' : 'pcm-chip--neutral'}`}>
                                                    {PARAM_CATEGORY_LABELS[row.category] || row.category}
                                                </span>
                                            </td>
                                            <td className="pcm-cell-strong">{row.name}</td>
                                            <td className="pcm-code">{row.code || '—'}</td>
                                            <td className="pcm-cell-sub">{row.description || '—'}</td>
                                            <td className="text-center">
                                                <span className={`pcm-chip pcm-chip--${row.is_active ? 'success' : 'danger'}`}>
                                                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            {user?.is_superadmin && (
                                                <td className="text-end text-nowrap">
                                                    <button type="button" className="pcm-btn pcm-btn--sm me-1" onClick={() => openDialog('parameter', row)}>
                                                        Ubah
                                                    </button>
                                                    <button type="button" className="pcm-btn pcm-btn--sm pcm-btn--danger" onClick={() => remove(`/system-parameters/${row.id}`, `Yakin ingin menghapus parameter ${row.name}?`)}>
                                                        Hapus
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered(rows.parameters || [], ['category', 'name', 'code', 'description']).length === 0 && (
                                <State kind="empty">Belum ada parameter yang cocok.</State>
                            )}
                        </div>
                    )}
                </Section>
            )}

            {dialog && (
                <Modal
                    title={dialogTitle(dialog)}
                    sub={dialogSub(dialog)}
                    onClose={() => setDialog(null)}
                    footer={
                        <>
                            <button type="button" className="pcm-btn" onClick={() => setDialog(null)}>
                                Batal
                            </button>
                            <button type="submit" form="pcm-admin-form" className="pcm-btn pcm-btn--primary" disabled={saving}>
                                {saving ? 'Menyimpan…' : 'Simpan'}
                            </button>
                        </>
                    }
                >
                    <form id="pcm-admin-form" onSubmit={submit}>
                        {formError && <div className="pcm-alert mb-3">{formError}</div>}
                        <DialogFields
                            dialog={dialog}
                            form={form}
                            setForm={setForm}
                            roles={rows.roles}
                            departments={rows.departments}
                        />
                    </form>
                </Modal>
            )}
        </>
    );
}

function dialogTitle(dialog) {
    const map = {
        project: 'Project',
        user: 'User',
        password: 'Reset Password',
        role: 'Role',
        department: 'Department',
        parameter: 'Master Parameter'
    };
    return `${dialog.record ? 'Ubah' : 'Buat'} ${map[dialog.type] || ''}`.trim();
}

function dialogSub(dialog) {
    if (dialog.type === 'password') return dialog.record?.email;
    if (dialog.type === 'user' && dialog.record) return 'Password tidak diubah di sini. Pakai tombol Password.';
    return '';
}

function DialogFields({ dialog, form, setForm, roles, departments }) {
    const set = (key) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    if (dialog.type === 'password') {
        return (
            <div>
                <label className="form-label pcm-form-label" htmlFor="adm-password">Password baru (min. 8 karakter)</label>
                <input id="adm-password" className="form-control" type="password" minLength={8} required
                    value={form.password || ''} onChange={set('password')} autoComplete="new-password" />
            </div>
        );
    }

    if (dialog.type === 'project') {
        return (
            <div className="pcm-form-grid">
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-job">Job No</label>
                    <input id="adm-job" className="form-control" required value={form.job_no || ''} onChange={set('job_no')} />
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-client">Client</label>
                    <input id="adm-client" className="form-control" value={form.client || ''} onChange={set('client')} />
                </div>
                <div className="pcm-form-grid__full">
                    <label className="form-label pcm-form-label" htmlFor="adm-pname">Nama project</label>
                    <input id="adm-pname" className="form-control" required value={form.name || ''} onChange={set('name')} />
                </div>
            </div>
        );
    }

    if (dialog.type === 'user') {
        return (
            <div className="pcm-form-grid">
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-uname">Nama</label>
                    <input id="adm-uname" className="form-control" required value={form.name || ''} onChange={set('name')} />
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-uemail">Email</label>
                    <input id="adm-uemail" className="form-control" type="email" required value={form.email || ''} onChange={set('email')} />
                </div>
                {!dialog.record && (
                    <div>
                        <label className="form-label pcm-form-label" htmlFor="adm-upass">Password (min. 8)</label>
                        <input id="adm-upass" className="form-control" type="password" minLength={8} required
                            value={form.password || ''} onChange={set('password')} autoComplete="new-password" />
                    </div>
                )}
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-urole">Role</label>
                    <PcmSelect id="adm-urole" required value={form.role || ''} onChange={set('role')}>
                        <option value="">Pilih role…</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.code}>{role.name}</option>
                        ))}
                    </PcmSelect>
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-udept">Departemen</label>
                    <PcmSelect id="adm-udept" value={form.department_id ?? ''} onChange={set('department_id')}>
                        <option value="">Tanpa departemen</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </PcmSelect>
                </div>
                <div className="d-flex align-items-end">
                    <div className="form-check">
                        <input id="adm-uactive" className="form-check-input" type="checkbox"
                            checked={form.is_active !== false} onChange={set('is_active')} />
                        <label className="form-check-label" htmlFor="adm-uactive">Akun aktif</label>
                    </div>
                </div>
            </div>
        );
    }

    if (dialog.type === 'role') {
        return (
            <div className="pcm-form-grid">
                {!dialog.record && (
                    <div>
                        <label className="form-label pcm-form-label" htmlFor="adm-rcode">Kode</label>
                        <input id="adm-rcode" className="form-control" required pattern="[a-z][a-z0-9_]*"
                            value={form.code || ''} onChange={set('code')} placeholder="mis. site_supervisor" />
                    </div>
                )}
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-rname">Nama</label>
                    <input id="adm-rname" className="form-control" required value={form.name || ''} onChange={set('name')} />
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-rlevel">Level (urutan tampil)</label>
                    <input id="adm-rlevel" className="form-control" type="number" min={0} max={999}
                        value={form.level ?? 50} onChange={set('level')} />
                </div>
                <div className="pcm-form-grid__full">
                    <label className="form-label pcm-form-label" htmlFor="adm-rdesc">Keterangan</label>
                    <input id="adm-rdesc" className="form-control" value={form.description || ''} onChange={set('description')} />
                </div>
            </div>
        );
    }

    if (dialog.type === 'department') {
        return (
            <div className="pcm-form-grid">
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-dcode">Kode</label>
                    <input id="adm-dcode" className="form-control" required pattern="[A-Za-z0-9_]+" maxLength={32}
                        value={form.code || ''} onChange={set('code')} placeholder="mis. PIPING" />
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-dname">Nama</label>
                    <input id="adm-dname" className="form-control" required value={form.name || ''} onChange={set('name')} />
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-dsort">Urutan</label>
                    <input id="adm-dsort" className="form-control" type="number" min={0} max={999}
                        value={form.sort ?? 0} onChange={set('sort')} />
                </div>
                <div className="d-flex align-items-end">
                    <div className="form-check">
                        <input id="adm-dactive" className="form-check-input" type="checkbox"
                            checked={form.is_active !== false} onChange={set('is_active')} />
                        <label className="form-check-label" htmlFor="adm-dactive">Aktif</label>
                    </div>
                </div>
            </div>
        );
    }

    if (dialog.type === 'parameter') {
        const isMaterialAttribute = (form.category || 'plant_area') === 'material_attribute';
        return (
            <div className="pcm-form-grid">
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-pcategory">Kategori</label>
                    <PcmSelect id="adm-pcategory" required
                        value={form.category || 'plant_area'} onChange={set('category')}>
                        <option value="plant_area">Plant Area</option>
                        <option value="distribution_target">Target Distribusi</option>
                        <option value="material_attribute">Label Atribut Material</option>
                    </PcmSelect>
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-pcode">
                        {isMaterialAttribute ? 'Kategori Material' : 'Kode Singkat'}
                    </label>
                    <input id="adm-pcode" className="form-control pcm-code" maxLength={64}
                        value={form.code || ''} onChange={set('code')}
                        placeholder={isMaterialAttribute ? 'mis. Fastener' : 'mis. MPP'} />
                </div>
                <div className="pcm-form-grid__full">
                    <label className="form-label pcm-form-label" htmlFor="adm-pname">
                        {isMaterialAttribute ? 'Label Kolom (tampil di form Welding Map)' : 'Nama Parameter (tampil di dropdown)'}
                    </label>
                    <input id="adm-pname" className="form-control" required maxLength={128}
                        value={form.name || ''} onChange={set('name')}
                        placeholder={isMaterialAttribute ? 'mis. Thread & Head' : 'mis. MPP Area'} />
                </div>
                <div className="pcm-form-grid__full">
                    <label className="form-label pcm-form-label" htmlFor="adm-pdesc">Deskripsi</label>
                    <input id="adm-pdesc" className="form-control" maxLength={255}
                        value={form.description || ''} onChange={set('description')}
                        placeholder={isMaterialAttribute ? 'mis. Kolom tipe ulir dan kepala baut' : 'mis. Main Process Plant Area'} />
                </div>
                <div>
                    <label className="form-label pcm-form-label" htmlFor="adm-psort">Urutan</label>
                    <input id="adm-psort" className="form-control" type="number" min={0} max={999}
                        value={form.sort_order ?? 0} onChange={set('sort_order')} />
                </div>
                <div className="d-flex align-items-end">
                    <div className="form-check">
                        <input id="adm-pactive" className="form-check-input" type="checkbox"
                            checked={form.is_active !== false} onChange={set('is_active')} />
                        <label className="form-check-label" htmlFor="adm-pactive">Aktif</label>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

function AccessMatrix({ permissions, roles, draft, dirtyRoles, editable, onToggle, onSave }) {
    const groups = useMemo(() => {
        const map = new Map();
        permissions.forEach((perm) => {
            if (!map.has(perm.group_name)) map.set(perm.group_name, []);
            map.get(perm.group_name).push(perm);
        });
        return Array.from(map.entries());
    }, [permissions]);

    if (permissions.length === 0) {
        return <State kind="empty">Belum ada izin terdaftar.</State>;
    }

    return (
        <div className="pcm-table-wrap">
            <table className="pcm-matrix">
                <thead>
                    <tr>
                        <th scope="col">Izin</th>
                        {roles.map((role) => (
                            <th key={role.id} scope="col">
                                <span className="pcm-matrix__role">{role.name}</span>
                                {role.code === 'superadmin' ? (
                                    <span className="pcm-chip pcm-chip--neutral">Selalu penuh</span>
                                ) : (
                                    editable && (
                                        <button
                                            type="button"
                                            className={`pcm-btn pcm-btn--sm${dirtyRoles[role.id] ? ' pcm-btn--primary' : ''}`}
                                            onClick={() => onSave(role)}
                                            disabled={!dirtyRoles[role.id]}
                                        >
                                            Simpan
                                        </button>
                                    )
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {groups.map(([group, list]) => (
                        <React.Fragment key={group}>
                            <tr className="pcm-matrix__group">
                                <th colSpan={roles.length + 1} scope="rowgroup">
                                    {GROUP_LABELS[group] || group}
                                </th>
                            </tr>
                            {list.map((perm) => (
                                <tr key={perm.code}>
                                    <td>
                                        {perm.label}
                                        <span className="pcm-code pcm-matrix__code">{perm.code}</span>
                                    </td>
                                    {roles.map((role) => {
                                        const locked = role.code === 'superadmin' || !editable;
                                        return (
                                            <td key={role.id} className="text-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    aria-label={`${role.name} - ${perm.label}`}
                                                    checked={
                                                        role.code === 'superadmin'
                                                            ? true
                                                            : Boolean(draft[role.id]?.has(perm.code))
                                                    }
                                                    disabled={locked}
                                                    onChange={() => onToggle(role.id, perm.code)}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
