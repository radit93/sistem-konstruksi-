import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { PcmSelect } from '../SearchSelect';

const ROLE_OPTIONS = [
    'Welder',
    'Pipe Fitter',
    'Piping Engineer',
    'Material Control',
    'QA/QC Inspector',
    'Test Package Lead',
    'HSE Officer',
    'Project Manager',
];

const ROLE_TEMPLATES = {
    Welder: [
        { time_start: '08:00', time_end: '10:00', activity: 'Persiapan mesin las, elektroda & cek fit-up joint', target_output: 'Siap las' },
        { time_start: '10:00', time_end: '12:00', activity: 'Pengelasan Root Pass & Hot Pass sambungan spool', target_output: '2-3 Joint' },
        { time_start: '13:00', time_end: '15:00', activity: 'Pengelasan Fill & Cap + kontrol interpass temp', target_output: '2-3 Joint selesai' },
        { time_start: '15:00', time_end: '17:00', activity: 'Pembersihan slag, visual self-check & input log', target_output: 'Update status las' },
    ],
    'Pipe Fitter': [
        { time_start: '08:00', time_end: '10:00', activity: 'Baca gambar isometrik & pengukuran potong pipa', target_output: 'Marking spool' },
        { time_start: '10:00', time_end: '12:00', activity: 'Beveling ujung pipa & persiapan fitting/flange', target_output: 'Bevel OK' },
        { time_start: '13:00', time_end: '15:00', activity: 'Fit-up & tack weld spool di workshop/lapangan', target_output: '4 Joint Fit-up' },
        { time_start: '15:00', time_end: '17:00', activity: 'Verifikasi alignment & dimensi sebelum serah ke Welder', target_output: 'Fit-up Check OK' },
    ],
    'Piping Engineer': [
        { time_start: '08:00', time_end: '10:00', activity: 'Review isometrik, line list & spesifikasi material', target_output: '2 Drawing' },
        { time_start: '10:00', time_end: '12:00', activity: 'Pemetaan Welding Map & validasi ukuran sambungan', target_output: 'Welding Map OK' },
        { time_start: '13:00', time_end: '15:00', activity: 'Generate & verifikasi MTO / Bill of Materials (BOM)', target_output: 'BOM terupdate' },
        { time_start: '15:00', time_end: '17:00', activity: 'Sinkronisasi Engineering BOQ & revisi dokumen IFC', target_output: 'IFC Release' },
    ],
    DEFAULT: [
        { time_start: '08:00', time_end: '10:00', activity: 'Briefing pagi, cek area kerja & verifikasi dokumen', target_output: 'Checklist pagi' },
        { time_start: '10:00', time_end: '12:00', activity: 'Eksekusi tugas utama proyek sesi pagi', target_output: '50% target harian' },
        { time_start: '13:00', time_end: '15:00', activity: 'Eksekusi tugas utama proyek sesi siang', target_output: '85% target harian' },
        { time_start: '15:00', time_end: '17:00', activity: 'Pemeriksaan hasil kerja & pelaporan progres harian', target_output: 'Laporan harian' },
    ],
};

function parseMinutes(hhmm) {
    const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
}

function formatMinutes(totalMin) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMin)));
    const h = String(Math.floor(clamped / 60)).padStart(2, '0');
    const m = String(clamped % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function calcSlotHours(startStr, endStr) {
    const s = parseMinutes(startStr);
    const e = parseMinutes(endStr);
    if (s === null || e === null || e <= s) return 0;
    return Math.round(((e - s) / 60) * 100) / 100;
}

function formatHoursLabel(hours) {
    const h = Number(hours) || 0;
    if (h <= 0) return '0 jam';
    const rounded = Math.round(h * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toLocaleString('id-ID')} jam`;
}

function buildHourlyBlocks(targetHours = 8, blockHours = 2) {
    const totalMin = Math.max(60, Math.min(24 * 60, Math.round((Number(targetHours) || 8) * 60)));
    const stepMin = Math.max(30, Math.round((Number(blockHours) || 2) * 60));
    const blocks = [];
    let cursor = 8 * 60; // 08:00
    let remaining = totalMin;

    while (remaining > 0 && cursor < 23 * 60) {
        // Lewati jam istirahat siang 12:00-13:00 bila mulai tepat jam 12:00
        if (cursor === 12 * 60) cursor = 13 * 60;
        const maxBeforeLunch = cursor < 12 * 60 ? 12 * 60 - cursor : 24 * 60 - cursor;
        const dur = Math.min(stepMin, remaining, maxBeforeLunch);
        if (dur <= 0) {
            cursor = 13 * 60;
            continue;
        }
        blocks.push({
            time_start: formatMinutes(cursor),
            time_end: formatMinutes(cursor + dur),
        });
        cursor += dur;
        remaining -= dur;
    }
    return blocks;
}

function addDaysIso(dateStr, daysToAdd) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return '';
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    const dt = new Date(y, m, d + Math.max(0, Number(daysToAdd) || 0));
    if (Number.isNaN(dt.getTime())) return '';
    const ry = dt.getFullYear();
    const rm = String(dt.getMonth() + 1).padStart(2, '0');
    const rd = String(dt.getDate()).padStart(2, '0');
    return `${ry}-${rm}-${rd}`;
}

function diffDaysInclusive(startStr, endStr) {
    if (!startStr || !endStr) return 0;
    const sParts = String(startStr).split('-');
    const eParts = String(endStr).split('-');
    if (sParts.length !== 3 || eParts.length !== 3) return 0;
    const sUtc = Date.UTC(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]));
    const eUtc = Date.UTC(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]));
    if (Number.isNaN(sUtc) || Number.isNaN(eUtc)) return 0;
    return Math.max(1, Math.round((eUtc - sUtc) / 86400000) + 1);
}

function formatDurationBadge(days) {
    const d = Number(days) || 0;
    if (!d) return '—';
    if (d === 30) return '30 Hari (1 Bulan)';
    if (d === 14) return '14 Hari (2 Minggu)';
    if (d === 7) return '7 Hari (1 Minggu)';
    if (d >= 28 && d % 30 === 0) return `${d} Hari (${d / 30} Bulan)`;
    return `${d} Hari`;
}

function defaultRoleForAccount(account) {
    const r = account?.role;
    if (r === 'construction') return 'Welder';
    if (r === 'engineer') return 'Piping Engineer';
    if (r === 'material') return 'Material Control';
    if (r === 'qaqc') return 'QA/QC Inspector';
    if (r === 'testpackage') return 'Test Package Lead';
    if (r === 'hse') return 'HSE Officer';
    return 'Project Manager';
}

function defaultPhaseForAccount(account) {
    const r = account?.role;
    if (r === 'engineer') return 'Engineering';
    if (r === 'material') return 'Procurement';
    if (r === 'qaqc' || r === 'testpackage') return 'Testing';
    return 'Fabrication';
}

export function MilestoneSection({
    project,
    projects = [],
    drawings = [],
    joints = [],
    materialInspections = [],
    inspections = [],
    testPackages = [],
    user,
    onToast,
}) {
    const [milestones, setMilestones] = useState([]);
    const [projectMembers, setProjectMembers] = useState([]);
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionError, setActionError] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterRole, setFilterRole] = useState('ALL');
    const [filterAccount, setFilterAccount] = useState('ALL');

    // Khusus Project Manager: navigasi 3 langkah (Akun dalam Nama -> Project Akun -> Milestone)
    const [pmViewMode, setPmViewMode] = useState('BY_ACCOUNT'); // 'BY_ACCOUNT' | 'BASELINE'
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [selectedPmProjectId, setSelectedPmProjectId] = useState(null);
    const [accountSearch, setAccountSearch] = useState('');
    const [accountRoleFilter, setAccountRoleFilter] = useState('ALL');
    const [pmProjectSearch, setPmProjectSearch] = useState('');

    // Modal Create/Edit
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [selectedDay, setSelectedDay] = useState(1);
    const [activitiesDraft, setActivitiesDraft] = useState([]);

    // Modal Detail / Checklist Harian & Per Jam
    const [scheduleModalItem, setScheduleModalItem] = useState(null);
    const [scheduleModalError, setScheduleModalError] = useState('');
    const [scheduleDayFilter, setScheduleDayFilter] = useState('ALL');
    const [togglingId, setTogglingId] = useState(null);

    const isManager = Boolean(user?.is_superadmin) || user?.role === 'project_manager' || can(user, 'scope.view');
    const canWrite = can(user, 'milestone.write') || can(user, 'scope.write');
    const isPmAccountFlow = isManager && pmViewMode === 'BY_ACCOUNT';

    const defaultRoleForUser = () => defaultRoleForAccount(user);

    const [form, setForm] = useState({
        code: '',
        name: '',
        user_id: '',
        project_role: 'Welder',
        phase: 'Fabrication',
        start_date: '',
        estimated_days: 30,
        target_date: '',
        actual_date: '',
        work_hours_per_day: 8,
        weight_pct: 10,
        status: 'PENDING',
        is_hold_point: false,
        pic_lead: '',
        remarks: ''
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        setActionError('');
        try {
            if (isManager) {
                const [msRes, memRes] = await Promise.allSettled([
                    api.get('/project-milestones'),
                    api.get('/project-members'),
                ]);
                const rawMs = msRes.status === 'fulfilled' && Array.isArray(msRes.value) ? msRes.value : [];
                const rawMem = memRes.status === 'fulfilled' && Array.isArray(memRes.value) ? memRes.value : [];
                setMilestones(rawMs);
                setProjectMembers(rawMem);
            } else {
                const url = project?.id ? `/project-milestones?project_id=${project.id}` : '/project-milestones';
                const data = await api.get(url);
                const raw = Array.isArray(data) ? data : [];
                const filtered = project?.id
                    ? raw.filter(m => Number(m.project_id) === Number(project.id) || (!m.project_id && Number(project.id) === 1))
                    : raw;
                setMilestones(filtered);
            }
        } catch (err) {
            console.error('Failed to load project milestones:', err);
            setActionError(err.message || 'Gagal memuat data milestone proyek.');
        } finally {
            setLoading(false);
        }
    }, [project?.id, isManager]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!isManager || !can(user, 'user.view')) return undefined;
        let alive = true;
        api.get('/admin/users')
            .then((rows) => {
                if (alive && Array.isArray(rows)) setUserList(rows);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [isManager, user]);

    // Katalog akun lengkap (dari /admin/users + fallback user yang sudah punya milestone)
    const accountDirectory = useMemo(() => {
        if (!isManager) return [];
        const map = new Map();
        userList.forEach(u => {
            map.set(Number(u.id), {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                role_name: u.role_name || u.role,
                department: u.department || null,
                is_active: u.is_active !== false,
            });
        });
        milestones.forEach(m => {
            if (m.user?.id && !map.has(Number(m.user.id))) {
                map.set(Number(m.user.id), {
                    id: m.user.id,
                    name: m.user.name,
                    email: m.user.email || '',
                    role: m.user.role || '',
                    role_name: m.project_role || m.user.role || '',
                    department: null,
                    is_active: true,
                });
            }
        });

        return Array.from(map.values())
            .filter(acc => acc.is_active || milestones.some(m => Number(m.user_id) === Number(acc.id)))
            .map(acc => {
                const accMs = milestones.filter(m => Number(m.user_id) === Number(acc.id));
                const accMem = projectMembers.filter(pm => Number(pm.user_id) === Number(acc.id));
                const projIdSet = new Set();
                accMs.forEach(m => {
                    const pid = Number(m.project_id || (projects[0]?.id || 0));
                    if (pid > 0) projIdSet.add(pid);
                });
                accMem.forEach(pm => {
                    if (Number(pm.project_id) > 0) projIdSet.add(Number(pm.project_id));
                });
                const completed = accMs.filter(m => m.status === 'COMPLETED').length;
                const inProgress = accMs.filter(m => m.status === 'IN_PROGRESS').length;
                const totalSlots = accMs.reduce((s, m) => s + (m.activities?.length || 0), 0);
                const doneSlots = accMs.reduce((s, m) => s + ((m.activities || []).filter(a => a.is_done).length), 0);
                return {
                    ...acc,
                    projectCount: projIdSet.size,
                    milestoneCount: accMs.length,
                    completedCount: completed,
                    inProgressCount: inProgress,
                    totalSlots,
                    doneSlots,
                };
            })
            .sort((a, b) => (b.milestoneCount - a.milestoneCount) || a.name.localeCompare(b.name));
    }, [isManager, userList, milestones, projectMembers, projects]);

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId) return null;
        return accountDirectory.find(a => Number(a.id) === Number(selectedAccountId)) || null;
    }, [accountDirectory, selectedAccountId]);

    const accountRoleOptions = useMemo(() => {
        const seen = new Map();
        accountDirectory.forEach(a => {
            if (a.role) seen.set(a.role, a.role_name || a.role);
        });
        return Array.from(seen.entries()).map(([code, label]) => ({ code, label }));
    }, [accountDirectory]);

    const filteredAccounts = useMemo(() => {
        const q = accountSearch.trim().toLowerCase();
        return accountDirectory.filter(a => {
            const matchRole = accountRoleFilter === 'ALL' || a.role === accountRoleFilter;
            const matchQ = !q ||
                (a.name || '').toLowerCase().includes(q) ||
                (a.email || '').toLowerCase().includes(q) ||
                (a.role_name || '').toLowerCase().includes(q) ||
                (a.department?.name || a.department?.code || '').toLowerCase().includes(q);
            return matchRole && matchQ;
        });
    }, [accountDirectory, accountSearch, accountRoleFilter]);

    // Daftar project milik akun terpilih (dari milestone yang dibuat akun tsb / penugasan project_members)
    const accountProjects = useMemo(() => {
        if (!selectedAccount) return [];
        const projMap = new Map();

        const ensureProj = (pid, fallbackProj = null) => {
            const numId = Number(pid);
            if (!numId) return null;
            if (!projMap.has(numId)) {
                const master = projects.find(p => Number(p.id) === numId) || fallbackProj || {
                    id: numId,
                    job_no: '-',
                    name: `Project #${numId}`,
                    client: '-',
                };
                projMap.set(numId, {
                    id: numId,
                    job_no: master.job_no || '-',
                    name: master.name || `Project #${numId}`,
                    client: master.client || 'Client Umum',
                    milestones: [],
                    memberRole: '',
                });
            }
            return projMap.get(numId);
        };

        milestones
            .filter(m => Number(m.user_id) === Number(selectedAccount.id))
            .forEach(m => {
                const pid = Number(m.project_id || (projects[0]?.id || 1));
                const entry = ensureProj(pid, m.project);
                if (entry) entry.milestones.push(m);
            });

        projectMembers
            .filter(pm => Number(pm.user_id) === Number(selectedAccount.id))
            .forEach(pm => {
                const entry = ensureProj(pm.project_id, pm.project);
                if (entry && pm.project_role) entry.memberRole = pm.project_role;
            });

        return Array.from(projMap.values()).map(entry => {
            const ms = entry.milestones;
            const totalSlots = ms.reduce((s, m) => s + (m.activities?.length || 0), 0);
            const doneSlots = ms.reduce((s, m) => s + ((m.activities || []).filter(a => a.is_done).length), 0);
            const completedCount = ms.filter(m => m.status === 'COMPLETED').length;
            const inProgressCount = ms.filter(m => m.status === 'IN_PROGRESS').length;
            const holdPointCount = ms.filter(m => m.is_hold_point).length;
            const rolesSet = new Set(ms.map(m => m.project_role).filter(Boolean));
            if (entry.memberRole) rolesSet.add(entry.memberRole);
            const pct = totalSlots > 0
                ? Math.round((doneSlots / totalSlots) * 100)
                : (ms.length > 0 ? Math.round((completedCount / ms.length) * 100) : 0);
            return {
                ...entry,
                milestoneCount: ms.length,
                completedCount,
                inProgressCount,
                holdPointCount,
                totalSlots,
                doneSlots,
                pct,
                rolesUsed: Array.from(rolesSet),
            };
        });
    }, [selectedAccount, milestones, projectMembers, projects]);

    const filteredAccountProjects = useMemo(() => {
        const q = pmProjectSearch.trim().toLowerCase();
        if (!q) return accountProjects;
        return accountProjects.filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.job_no || '').toLowerCase().includes(q) ||
            (p.client || '').toLowerCase().includes(q)
        );
    }, [accountProjects, pmProjectSearch]);

    const otherProjectsForAccount = useMemo(() => {
        const existingIds = new Set(accountProjects.map(p => Number(p.id)));
        return projects.filter(p => !existingIds.has(Number(p.id)));
    }, [projects, accountProjects]);

    const selectedPmProject = useMemo(() => {
        if (!selectedPmProjectId) return null;
        return accountProjects.find(p => Number(p.id) === Number(selectedPmProjectId))
            || projects.find(p => Number(p.id) === Number(selectedPmProjectId))
            || null;
    }, [selectedPmProjectId, accountProjects, projects]);

    // Dataset milestone aktif sesuai tampilan saat ini:
    // - PM mode BY_ACCOUNT (Level 3): milestone akun terpilih pada proyek terpilih
    // - PM mode BASELINE: semua milestone pada proyek aktif (termasuk baseline PMO user_id=null)
    // - Worker non-PM: milestone akun sendiri pada proyek aktif
    const scopedMilestones = useMemo(() => {
        if (isPmAccountFlow) {
            if (!selectedAccountId || !selectedPmProjectId) return [];
            return milestones.filter(m =>
                Number(m.user_id) === Number(selectedAccountId) &&
                (Number(m.project_id) === Number(selectedPmProjectId) || (!m.project_id && Number(selectedPmProjectId) === 1))
            );
        }
        if (isManager) {
            if (!project?.id) return milestones;
            return milestones.filter(m =>
                Number(m.project_id) === Number(project.id) || (!m.project_id && Number(project.id) === 1)
            );
        }
        return milestones;
    }, [isPmAccountFlow, isManager, selectedAccountId, selectedPmProjectId, project?.id, milestones]);

    const stats = useMemo(() => {
        const total = scopedMilestones.length;
        const completed = scopedMilestones.filter(m => m.status === 'COMPLETED').length;
        const inProgress = scopedMilestones.filter(m => m.status === 'IN_PROGRESS').length;
        const allSlots = scopedMilestones.reduce((acc, m) => acc + (m.activities?.length || 0), 0);
        const doneSlots = scopedMilestones.reduce((acc, m) => acc + ((m.activities || []).filter(a => a.is_done).length), 0);
        return { total, completed, inProgress, allSlots, doneSlots };
    }, [scopedMilestones]);

    const liveGates = useMemo(() => {
        if (!isManager) return [];
        const dwgTotal = drawings.length;
        const dwgIfc = drawings.filter(d => ['IFC', 'ACTIVE'].includes((d.status || '').toUpperCase())).length;
        const ifcPct = dwgTotal > 0 ? Math.round((dwgIfc / dwgTotal) * 100) : 0;

        const matTotal = materialInspections.length;
        const matPass = materialInspections.filter(m => ['PASS', 'ACCEPTED'].includes((m.result || m.status || '').toUpperCase())).length;
        const matPct = matTotal > 0 ? Math.round((matPass / matTotal) * 100) : 0;

        const jTotal = joints.length;
        const jWelded = joints.filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes((j.status || '').toUpperCase())).length;
        const weldPct = jTotal > 0 ? Math.round((jWelded / jTotal) * 100) : 0;

        const tpTotal = testPackages.length;
        const tpPass = testPackages.filter(t => ['PASSED', 'TESTED', 'COMPLETED', 'REINSTATED'].includes((t.status || '').toUpperCase())).length;
        const tpPct = tpTotal > 0 ? Math.round((tpPass / tpTotal) * 100) : 0;

        const visualPass = joints.filter(j => (j.visual || '').toUpperCase() === 'PASS').length;
        const inspPass = inspections.length > 0
            ? inspections.filter(i => (i.result || '').toUpperCase() === 'PASS').length
            : visualPass;
        const inspTotal = inspections.length > 0 ? inspections.length : jTotal;

        return [
            { code: 'HP-1', title: 'Engineering IFC Drawing', pct: ifcPct, detail: `${dwgIfc}/${dwgTotal} drawings` },
            { code: 'HP-2', title: 'Material & MTC QC Pass', pct: matPct, detail: `${matPass}/${matTotal} lot` },
            { code: 'HP-3', title: 'Welding & Visual/NDT', pct: weldPct, detail: `${jWelded}/${jTotal} joints (QC Pass: ${inspPass}/${inspTotal})` },
            { code: 'HP-4', title: 'Hydrotest & Test Package', pct: tpPct, detail: `${tpPass}/${tpTotal} packages` },
        ];
    }, [isManager, drawings, materialInspections, joints, inspections, testPackages]);

    const roleOptionsFilter = useMemo(() => {
        return Array.from(new Set(scopedMilestones.map(m => m.project_role).filter(Boolean))).sort();
    }, [scopedMilestones]);

    const accountOptionsFilter = useMemo(() => {
        const map = new Map();
        scopedMilestones.forEach(m => {
            if (m.user?.id) map.set(String(m.user.id), m.user.name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [scopedMilestones]);

    const filteredMilestones = useMemo(() => {
        const q = search.toLowerCase();
        return scopedMilestones.filter(m => {
            const matchStatus = filterStatus === 'ALL' ||
                (filterStatus === 'HOLD_POINT' ? m.is_hold_point : m.status === filterStatus);
            const matchRole = filterRole === 'ALL' || (m.project_role || '') === filterRole;
            const matchAccount = filterAccount === 'ALL' || String(m.user_id || '') === String(filterAccount);
            const matchSearch = !q ||
                (m.code || '').toLowerCase().includes(q) ||
                (m.name || '').toLowerCase().includes(q) ||
                (m.project_role || '').toLowerCase().includes(q) ||
                (m.user?.name || m.pic_lead || '').toLowerCase().includes(q);
            return matchStatus && matchRole && matchAccount && matchSearch;
        });
    }, [scopedMilestones, search, filterStatus, filterRole, filterAccount]);

    const handleOpenModal = (item = null) => {
        setFormError('');
        setSelectedDay(1);
        const today = new Date().toISOString().split('T')[0];
        const targetOwner = (isPmAccountFlow && selectedAccount) ? selectedAccount : user;

        if (item) {
            setEditingItem(item);
            const estDays = item.estimated_days || diffDaysInclusive(item.start_date, item.target_date) || 7;
            setForm({
                code: item.code || '',
                name: item.name || '',
                user_id: item.user_id ? String(item.user_id) : String(targetOwner?.id || ''),
                project_role: item.project_role || defaultRoleForAccount(targetOwner),
                phase: item.phase || 'Fabrication',
                start_date: item.start_date || today,
                estimated_days: estDays,
                target_date: item.target_date || addDaysIso(item.start_date || today, estDays - 1),
                actual_date: item.actual_date || '',
                work_hours_per_day: item.work_hours_per_day || 8,
                weight_pct: item.weight_pct || 10,
                status: item.status || 'PENDING',
                is_hold_point: Boolean(item.is_hold_point),
                pic_lead: item.pic_lead || targetOwner?.name || '',
                remarks: item.remarks || ''
            });
            setActivitiesDraft((item.activities || []).map(a => ({ ...a })));
        } else {
            setEditingItem(null);
            const rolePreset = defaultRoleForAccount(targetOwner);
            const estDays = 30;
            setForm({
                code: `M-${String(scopedMilestones.length + 1).padStart(2, '0')}`,
                name: '',
                user_id: String(targetOwner?.id || ''),
                project_role: rolePreset,
                phase: defaultPhaseForAccount(targetOwner),
                start_date: today,
                estimated_days: estDays,
                target_date: addDaysIso(today, estDays - 1),
                actual_date: '',
                work_hours_per_day: 8,
                weight_pct: 10,
                status: 'PENDING',
                is_hold_point: false,
                pic_lead: targetOwner?.name || '',
                remarks: ''
            });
            const tpl = ROLE_TEMPLATES[rolePreset] || ROLE_TEMPLATES.DEFAULT;
            const initSlots = [];
            const populateDays = estDays <= 7 ? estDays : 1;
            for (let d = 1; d <= populateDays; d++) {
                tpl.forEach(t => {
                    initSlots.push({ day_number: d, ...t, is_done: false });
                });
            }
            setActivitiesDraft(initSlots);
        }
        setShowModal(true);
    };

    const updateDurationDays = (daysVal) => {
        if (daysVal === '' || daysVal === null) {
            setForm(prev => ({ ...prev, estimated_days: '' }));
            return;
        }
        const parsed = parseInt(daysVal, 10);
        const days = Math.max(1, Math.min(180, Number.isNaN(parsed) ? 1 : parsed));
        setForm(prev => ({
            ...prev,
            estimated_days: days,
            target_date: prev.start_date ? addDaysIso(prev.start_date, days - 1) : prev.target_date,
        }));
        if (selectedDay > days) setSelectedDay(days);

        // Jika milestone singkat (<= 7 hari) dan hari lain masih kosong, otomatis isi pola 8 jam
        if (days <= 7) {
            const tpl = ROLE_TEMPLATES[form.project_role] || ROLE_TEMPLATES.DEFAULT;
            setActivitiesDraft(prev => {
                const filledDays = new Set(prev.map(a => Number(a.day_number)));
                const next = [...prev];
                for (let d = 1; d <= days; d++) {
                    if (!filledDays.has(d)) {
                        tpl.forEach(t => next.push({ day_number: d, ...t, is_done: false }));
                    }
                }
                return next;
            });
        }
    };

    const updateStartDate = (startStr) => {
        setForm(prev => ({
            ...prev,
            start_date: startStr,
            target_date: startStr && prev.estimated_days ? addDaysIso(startStr, Number(prev.estimated_days) - 1) : prev.target_date,
        }));
    };

    const currentDaySlots = useMemo(() => {
        return activitiesDraft
            .map((act, idx) => ({ ...act, _idx: idx }))
            .filter(act => Number(act.day_number) === Number(selectedDay));
    }, [activitiesDraft, selectedDay]);

    const currentDayHours = useMemo(() => {
        const sum = currentDaySlots.reduce((acc, s) => acc + calcSlotHours(s.time_start, s.time_end), 0);
        return Math.round(sum * 100) / 100;
    }, [currentDaySlots]);

    const filledDaysSet = useMemo(() => {
        return new Set(activitiesDraft.filter(a => (a.activity || '').trim()).map(a => Number(a.day_number)));
    }, [activitiesDraft]);

    const handleAddSlot = () => {
        const last = currentDaySlots[currentDaySlots.length - 1];
        let startMin = 8 * 60;
        if (last) {
            const lastEnd = parseMinutes(last.time_end);
            if (lastEnd !== null) {
                startMin = lastEnd === 12 * 60 ? 13 * 60 : lastEnd;
            }
        }
        if (startMin >= 22 * 60) startMin = 8 * 60;
        const endMin = Math.min(23 * 60, startMin + 120);
        setActivitiesDraft(prev => [
            ...prev,
            {
                day_number: selectedDay,
                time_start: formatMinutes(startMin),
                time_end: formatMinutes(endMin),
                activity: '',
                target_output: '',
                is_done: false,
            },
        ]);
    };

    const handleSplitDayBlocks = () => {
        const blocks = buildHourlyBlocks(form.work_hours_per_day || 8, 2);
        const existing = currentDaySlots;
        const tpl = ROLE_TEMPLATES[form.project_role] || ROLE_TEMPLATES.DEFAULT;
        setActivitiesDraft(prev => [
            ...prev.filter(a => Number(a.day_number) !== Number(selectedDay)),
            ...blocks.map((blk, idx) => ({
                day_number: selectedDay,
                time_start: blk.time_start,
                time_end: blk.time_end,
                activity: existing[idx]?.activity || tpl[idx]?.activity || `Aktivitas blok ${idx + 1} (${formatHoursLabel(calcSlotHours(blk.time_start, blk.time_end))})`,
                target_output: existing[idx]?.target_output || tpl[idx]?.target_output || '',
                is_done: Boolean(existing[idx]?.is_done),
            })),
        ]);
    };

    const handleSlotChange = (globalIdx, field, val) => {
        setActivitiesDraft(prev => prev.map((row, idx) => (idx === globalIdx ? { ...row, [field]: val } : row)));
    };

    const handleRemoveSlot = (globalIdx) => {
        setActivitiesDraft(prev => prev.filter((_, idx) => idx !== globalIdx));
    };

    const handleApplyRoleTemplate = () => {
        const tpl = ROLE_TEMPLATES[form.project_role] || ROLE_TEMPLATES.DEFAULT;
        setActivitiesDraft(prev => [
            ...prev.filter(a => Number(a.day_number) !== Number(selectedDay)),
            ...tpl.map(t => ({ day_number: selectedDay, ...t, is_done: false })),
        ]);
    };

    const handleCopyDayToAllDays = () => {
        const daySlots = activitiesDraft.filter(a => Number(a.day_number) === Number(selectedDay) && (a.activity || '').trim());
        if (daySlots.length === 0) {
            setFormError(`Isi minimal 1 slot jam di Hari ${selectedDay} sebelum menyalin ke semua hari.`);
            return;
        }
        setFormError('');
        const totalDays = Math.max(1, Number(form.estimated_days) || 1);
        const generated = [];
        for (let d = 1; d <= totalDays; d++) {
            daySlots.forEach(s => {
                generated.push({
                    day_number: d,
                    time_start: s.time_start,
                    time_end: s.time_end,
                    activity: s.activity,
                    target_output: s.target_output || '',
                    is_done: false,
                });
            });
        }
        setActivitiesDraft(generated);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.code.trim() || !form.name.trim()) {
            setFormError('Kode dan Nama Milestone wajib diisi.');
            return;
        }

        const targetProjectId = (isPmAccountFlow && selectedPmProject)
            ? selectedPmProject.id
            : project?.id;

        setFormLoading(true);
        try {
            const selectedUser = userList.find(u => String(u.id) === String(form.user_id));
            const payload = {
                ...form,
                start_date: form.start_date || null,
                target_date: form.target_date || null,
                actual_date: form.actual_date || null,
                user_id: form.user_id ? Number(form.user_id) : user?.id,
                pic_lead: selectedUser?.name || form.pic_lead || user?.name,
                project_id: targetProjectId || null,
                activities: activitiesDraft
                    .filter(a => (a.activity || '').trim() !== '')
                    .map(a => ({
                        day_number: Number(a.day_number) || 1,
                        time_start: a.time_start || '08:00',
                        time_end: a.time_end || '17:00',
                        activity: a.activity.trim(),
                        target_output: a.target_output || '',
                        is_done: Boolean(a.is_done),
                        notes: a.notes || null,
                    })),
            };

            if (editingItem) {
                await api.put(`/project-milestones/${editingItem.id}`, payload);
                if (onToast) onToast('Milestone & jadwal kerja berhasil diperbarui.');
            } else {
                await api.post('/project-milestones', payload);
                if (onToast) onToast('Milestone & jadwal kerja baru berhasil disimpan.');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan milestone.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!window.confirm(`Hapus milestone "${editingItem.code} - ${editingItem.name}"?`)) return;
        setFormLoading(true);
        try {
            await api.delete(`/project-milestones/${editingItem.id}`);
            if (onToast) onToast('Milestone berhasil dihapus.');
            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.message || 'Gagal menghapus milestone.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleMarkComplete = async (item) => {
        const today = new Date().toISOString().split('T')[0];
        setActionError('');
        try {
            await api.put(`/project-milestones/${item.id}`, {
                status: 'COMPLETED',
                actual_date: item.actual_date || today
            });
            if (onToast) onToast(`Milestone ${item.code} disahkan selesai.`);
            loadData();
        } catch (err) {
            setActionError(err.message || 'Gagal mengubah status milestone.');
        }
    };

    const handleToggleActivity = async (activity) => {
        setTogglingId(activity.id);
        setScheduleModalError('');
        try {
            const updatedMilestone = await api.patch(`/milestone-activities/${activity.id}/toggle`, {
                is_done: !activity.is_done,
            });
            setMilestones(prev => prev.map(m => (m.id === updatedMilestone.id ? updatedMilestone : m)));
            setScheduleModalItem(updatedMilestone);
        } catch (err) {
            setScheduleModalError(err.message || 'Gagal memperbarui status aktivitas.');
        } finally {
            setTogglingId(null);
        }
    };

    const groupedScheduleDays = useMemo(() => {
        if (!scheduleModalItem) return [];
        const map = new Map();
        (scheduleModalItem.activities || []).forEach(a => {
            const d = Number(a.day_number) || 1;
            if (scheduleDayFilter !== 'ALL' && d !== Number(scheduleDayFilter)) return;
            if (!map.has(d)) map.set(d, { day: d, date: a.work_date || '', items: [] });
            map.get(d).items.push(a);
        });
        return Array.from(map.values()).sort((a, b) => a.day - b.day);
    }, [scheduleModalItem, scheduleDayFilter]);

    const showAccountDirectory = isPmAccountFlow && !selectedAccount;
    const showAccountProjects = isPmAccountFlow && selectedAccount && !selectedPmProject;
    const showMilestoneTable = !isPmAccountFlow || (selectedAccount && selectedPmProject);

    return (
        <div>
            {/* Header & Action Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">
                        {showAccountDirectory
                            ? 'Project Milestone — Monitoring Per Akun'
                            : showAccountProjects
                                ? `Proyek Dikerjakan: ${selectedAccount.name}`
                                : (isPmAccountFlow && selectedAccount && selectedPmProject)
                                    ? `Milestone: ${selectedAccount.name} — ${selectedPmProject.name}`
                                    : 'Project Milestone & Rencana Kerja Per Akun'}
                    </h2>
                    <p className="text-muted small mb-0">
                        {showAccountDirectory
                            ? 'Pilih nama akun untuk melihat daftar proyek yang dikerjakan dan rincian milestonenya.'
                            : showAccountProjects
                                ? `Pilih proyek milik ${selectedAccount.name} (${selectedAccount.role_name}) untuk memeriksa daftar milestone dan jadwal kerjanya.`
                                : isManager
                                    ? 'Pantau target estimasi durasi penyelesaian serta rincian aktivitas harian & per jam.'
                                    : 'Input milestone pribadi Anda di proyek ini: peran, estimasi lama selesai (misal 1 bulan), serta rincian tugas per hari dan per jam.'}
                    </p>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    {isManager && (
                        <div className="btn-group btn-group-sm" role="group" aria-label="Mode Tampilan Milestone">
                            <button
                                type="button"
                                className={`btn fw-semibold ${pmViewMode === 'BY_ACCOUNT' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setPmViewMode('BY_ACCOUNT')}
                            >
                                Per Akun
                            </button>
                            <button
                                type="button"
                                className={`btn fw-semibold ${pmViewMode === 'BASELINE' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setPmViewMode('BASELINE')}
                            >
                                Baseline &amp; Gerbang Proyek
                            </button>
                        </div>
                    )}
                    {canWrite && showMilestoneTable && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm fw-bold px-3 py-2"
                            style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                            onClick={() => handleOpenModal()}
                        >
                            + Input Milestone &amp; Jadwal Kerja
                        </button>
                    )}
                </div>
            </div>

            {actionError && (
                <div className="alert alert-danger py-2 small mb-3 d-flex justify-content-between align-items-center">
                    <span>{actionError}</span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setActionError('')}></button>
                </div>
            )}

            {/* ============================================================
                LEVEL 1 (KHUSUS PM): DAFTAR AKUN BERDASARKAN NAMA & ROLE
                ============================================================ */}
            {showAccountDirectory && (
                <div>
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Total Akun Terdaftar</span>
                                <strong className="pcm-tile__value pcm-tile__value--primary">
                                    {accountDirectory.length}
                                    <span className="pcm-tile__unit">akun</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Akun Aktif Input Milestone</span>
                                <strong className="pcm-tile__value text-success">
                                    {accountDirectory.filter(a => a.milestoneCount > 0).length}
                                    <span className="pcm-tile__unit">akun</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Total Milestone Pekerja</span>
                                <strong className="pcm-tile__value" style={{ color: '#b45309' }}>
                                    {accountDirectory.reduce((s, a) => s + a.milestoneCount, 0)}
                                    <span className="pcm-tile__unit">rencana</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Total Slot Harian Selesai</span>
                                <strong className="pcm-tile__value">
                                    {accountDirectory.reduce((s, a) => s + a.doneSlots, 0)} / {accountDirectory.reduce((s, a) => s + a.totalSlots, 0)}
                                    <span className="pcm-tile__unit">slot</span>
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <div style={{ width: '280px', maxWidth: '100%' }}>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Cari nama akun, role, departemen..."
                                value={accountSearch}
                                onChange={(e) => setAccountSearch(e.target.value)}
                                style={{ borderRadius: 'var(--pcm-radius-control)', height: '38px', padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}
                            />
                        </div>
                        {accountRoleOptions.length > 0 && (
                            <div style={{ width: '240px', maxWidth: '100%' }}>
                                <PcmSelect
                                    searchable={false}
                                    clearable={false}
                                    value={accountRoleFilter}
                                    onChange={(e) => setAccountRoleFilter(e.target.value)}
                                >
                                    <option value="ALL">Semua Role ({accountDirectory.length})</option>
                                    {accountRoleOptions.map(r => (
                                        <option key={r.code} value={r.code}>{r.label}</option>
                                    ))}
                                </PcmSelect>
                            </div>
                        )}
                    </div>

                    <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.85rem', borderColor: '#cbd5e1' }}>
                                <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                    <tr>
                                        <th className="ps-3 py-3" style={{ width: '50px' }}>No</th>
                                        <th className="py-3">Nama Akun</th>
                                        <th className="py-3" style={{ width: '210px' }}>Role &amp; Departemen</th>
                                        <th className="py-3 text-center" style={{ width: '120px' }}>Project</th>
                                        <th className="py-3 text-center" style={{ width: '140px' }}>Milestone</th>
                                        <th className="py-3" style={{ width: '170px' }}>Progres Slot</th>
                                        <th className="text-end pe-3 py-3" style={{ width: '150px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                Memuat daftar akun...
                                            </td>
                                        </tr>
                                    ) : filteredAccounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                Tidak ada akun yang cocok dengan filter pencarian.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAccounts.map((acc, idx) => {
                                            const slotPct = acc.totalSlots > 0 ? Math.round((acc.doneSlots / acc.totalSlots) * 100) : 0;
                                            return (
                                                <tr
                                                    key={acc.id}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setSelectedAccountId(acc.id);
                                                        setSelectedPmProjectId(null);
                                                        setPmProjectSearch('');
                                                    }}
                                                >
                                                    <td className="ps-3 text-muted fw-bold">{idx + 1}</td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{acc.name}</div>
                                                        <div className="text-muted small">{acc.email}</div>
                                                    </td>
                                                    <td>
                                                        <span className="badge px-2 py-1 fw-semibold text-dark border me-1" style={{ backgroundColor: '#f1f5f9', borderRadius: 'var(--pcm-radius-chip)' }}>
                                                            {acc.role_name}
                                                        </span>
                                                        {acc.department?.code && (
                                                            <span className="text-muted small font-monospace">{acc.department.code}</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center font-monospace fw-bold">
                                                        {acc.projectCount} proyek
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="fw-bold text-dark font-monospace">{acc.milestoneCount}</span>
                                                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                            {acc.completedCount} selesai &bull; {acc.inProgressCount} aktif
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex justify-content-between small fw-bold mb-1">
                                                            <span>{acc.totalSlots > 0 ? `${acc.doneSlots}/${acc.totalSlots}` : '—'}</span>
                                                            <span>{acc.totalSlots > 0 ? `${slotPct}%` : '—'}</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '6px', backgroundColor: '#e2e8f0' }}>
                                                            <div
                                                                className={`progress-bar ${slotPct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                                style={{ width: `${slotPct}%` }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                    <td className="text-end pe-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm px-3 py-1 fw-bold"
                                                            style={{ borderRadius: 'var(--pcm-radius-chip)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedAccountId(acc.id);
                                                                setSelectedPmProjectId(null);
                                                                setPmProjectSearch('');
                                                            }}
                                                        >
                                                            Cek Project &rarr;
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                LEVEL 2 (KHUSUS PM): PILIH PROJECT DARI AKUN YANG DIKLIK
                ============================================================ */}
            {showAccountProjects && (
                <div>
                    <div
                        className="mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-white border"
                        style={{ borderRadius: 'var(--pcm-radius-card)', boxShadow: 'var(--pcm-elev-1)', borderColor: 'var(--pcm-line-soft)' }}
                    >
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm fw-semibold"
                                onClick={() => {
                                    setSelectedAccountId(null);
                                    setSelectedPmProjectId(null);
                                }}
                            >
                                &larr; Daftar Akun
                            </button>
                            <span className="fw-bold text-dark">{selectedAccount.name}</span>
                            <span className="pcm-chip pcm-chip--primary">{selectedAccount.role_name}</span>
                            {selectedAccount.department?.name && (
                                <span className="pcm-chip pcm-chip--neutral">{selectedAccount.department.name}</span>
                            )}
                        </div>
                        <div className="small text-muted font-monospace">
                            {accountProjects.length} proyek &bull; {selectedAccount.milestoneCount} milestone
                        </div>
                        {canWrite && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                                style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                onClick={() => {
                                    const targetProjId = accountProjects[0]?.id || projects[0]?.id;
                                    if (targetProjId) setSelectedPmProjectId(targetProjId);
                                    handleOpenModal();
                                }}
                            >
                                + Input Milestone untuk {selectedAccount.name}
                            </button>
                        )}
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <div style={{ width: '320px', maxWidth: '100%' }}>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={`Cari proyek milik ${selectedAccount.name} (Job No, Nama Proyek, Client)...`}
                                value={pmProjectSearch}
                                onChange={(e) => setPmProjectSearch(e.target.value)}
                                style={{ borderRadius: 'var(--pcm-radius-control)', height: '38px', padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.85rem', borderColor: '#cbd5e1' }}>
                                <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                    <tr>
                                        <th className="ps-3 py-3" style={{ width: '110px' }}>Job No</th>
                                        <th className="py-3">Nama Proyek &amp; Client</th>
                                        <th className="py-3" style={{ width: '170px' }}>Peran di Proyek</th>
                                        <th className="py-3 text-center" style={{ width: '140px' }}>Milestone</th>
                                        <th className="py-3" style={{ width: '175px' }}>Progres Slot</th>
                                        <th className="text-end pe-3 py-3" style={{ width: '165px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAccountProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-4 text-muted">
                                                <div className="mb-2">
                                                    Akun <strong>{selectedAccount.name}</strong> belum memiliki milestone pada proyek mana pun.
                                                </div>
                                                {canWrite && projects.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm fw-bold px-3 py-1.5"
                                                        style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                        onClick={() => {
                                                            setSelectedPmProjectId(projects[0].id);
                                                            handleOpenModal();
                                                        }}
                                                    >
                                                        + Buat Milestone Pertama untuk {selectedAccount.name}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAccountProjects.map((proj) => (
                                            <tr
                                                key={proj.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedPmProjectId(proj.id)}
                                            >
                                                <td className="ps-3 font-monospace fw-bold text-primary">{proj.job_no}</td>
                                                <td>
                                                    <div className="fw-bold text-dark">{proj.name}</div>
                                                    <div className="text-muted small">{proj.client}</div>
                                                </td>
                                                <td>
                                                    {proj.rolesUsed.length > 0 ? proj.rolesUsed.map(r => (
                                                        <span key={r} className="badge px-2 py-0.5 text-dark border me-1" style={{ backgroundColor: '#f1f5f9', fontSize: '0.72rem' }}>
                                                            {r}
                                                        </span>
                                                    )) : (
                                                        <span className="text-muted small">{selectedAccount.role_name}</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <span className="fw-bold font-monospace text-dark">{proj.milestoneCount}</span>
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                        {proj.completedCount} selesai &bull; {proj.inProgressCount} aktif
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex justify-content-between small fw-bold mb-1">
                                                        <span>{proj.totalSlots > 0 ? `${proj.doneSlots}/${proj.totalSlots} slot` : 'Belum ada slot'}</span>
                                                        <span>{proj.pct}%</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '6px', backgroundColor: '#e2e8f0' }}>
                                                        <div
                                                            className={`progress-bar ${proj.pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                            style={{ width: `${proj.pct}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="text-end pe-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm px-3 py-1 fw-bold"
                                                        style={{ borderRadius: 'var(--pcm-radius-chip)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedPmProjectId(proj.id);
                                                        }}
                                                    >
                                                        Lihat Milestone &rarr;
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {canWrite && otherProjectsForAccount.length > 0 && (
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 bg-light border rounded">
                            <span className="small text-muted">
                                Ingin membuka atau menambahkan milestone untuk <strong>{selectedAccount.name}</strong> di proyek lain?
                            </span>
                            <PcmSelect
                                searchable={false}
                                clearable={false}
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) setSelectedPmProjectId(Number(e.target.value));
                                }}
                            >
                                <option value="">-- Pilih Proyek Lain --</option>
                                {otherProjectsForAccount.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.job_no ? `[${p.job_no}] ` : ''}{p.name}
                                    </option>
                                ))}
                            </PcmSelect>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================
                LEVEL 3 (PM) / BASELINE VIEW / WORKER VIEW: TABEL MILESTONE
                ============================================================ */}
            {showMilestoneTable && (
                <div>
                    {isPmAccountFlow && selectedAccount && selectedPmProject && (
                        <div
                            className="mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-white border"
                            style={{ borderRadius: 'var(--pcm-radius-card)', boxShadow: 'var(--pcm-elev-1)', borderColor: 'var(--pcm-line-soft)' }}
                        >
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm fw-semibold"
                                    onClick={() => setSelectedPmProjectId(null)}
                                >
                                    &larr; Daftar Project ({selectedAccount.name})
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => {
                                        setSelectedAccountId(null);
                                        setSelectedPmProjectId(null);
                                    }}
                                >
                                    Ganti Akun
                                </button>
                                <span className="pcm-chip pcm-chip--primary pcm-code">
                                    JOB: {selectedPmProject.job_no || '-'}
                                </span>
                                <span className="fw-bold text-dark">{selectedPmProject.name}</span>
                            </div>
                            <span className="pcm-chip pcm-chip--neutral">
                                {selectedAccount.name} ({selectedAccount.role_name})
                            </span>
                        </div>
                    )}

                    {/* Metric Summary Tiles */}
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Total Milestone</span>
                                <strong className="pcm-tile__value pcm-tile__value--primary">
                                    {stats.total}
                                    <span className="pcm-tile__unit">rencana</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Milestone Selesai</span>
                                <strong className="pcm-tile__value text-success">
                                    {stats.completed}
                                    <span className="pcm-tile__unit">selesai</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Sedang Berjalan</span>
                                <strong className="pcm-tile__value" style={{ color: '#b45309' }}>
                                    {stats.inProgress}
                                    <span className="pcm-tile__unit">aktif</span>
                                </strong>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="pcm-tile h-100">
                                <span className="pcm-tile__label">Slot Kerja Per Jam</span>
                                <strong className="pcm-tile__value">
                                    {stats.doneSlots} / {stats.allSlots}
                                    <span className="pcm-tile__unit">slot selesai</span>
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Auto Hold-Point Readiness Tracker (Khusus Mode Baseline Proyek) */}
                    {isManager && pmViewMode === 'BASELINE' && liveGates.length > 0 && (
                        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', borderLeft: '4px solid #1e40af' }}>
                            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <span className="small fw-bold text-uppercase text-primary">
                                    Kesiapan Gerbang Proyek Otomatis (Live Data Lintas Departemen)
                                </span>
                                <span className="badge px-2.5 py-1 fw-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                                    Auto-Synced
                                </span>
                            </div>
                            <div className="card-body py-3 px-4">
                                <div className="row g-3">
                                    {liveGates.map(g => (
                                        <div key={g.code} className="col-12 col-sm-6 col-md-3">
                                            <div className="p-3 rounded border bg-light h-100">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="badge px-2 py-1 fw-bold" style={{ backgroundColor: '#1e40af', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                                                        {g.code}
                                                    </span>
                                                    <strong className="small text-dark font-monospace">{g.pct}%</strong>
                                                </div>
                                                <div className="fw-bold small text-dark mb-1">{g.title}</div>
                                                <div className="progress mb-1" style={{ height: '6px', backgroundColor: '#e2e8f0' }}>
                                                    <div
                                                        className={`progress-bar ${g.pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                        style={{ width: `${g.pct}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{g.detail}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search & Filter Toolbar */}
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <div style={{ width: '280px', maxWidth: '100%' }}>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Cari Milestone, Peran (Welder/Fitter), Nama Akun..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ borderRadius: 'var(--pcm-radius-control)', height: '38px', padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}
                            />
                        </div>
                        {isManager && pmViewMode === 'BASELINE' && accountOptionsFilter.length > 0 && (
                            <div style={{ width: '200px', maxWidth: '100%' }}>
                                <PcmSelect
                                    searchable={false}
                                    clearable={false}
                                    value={filterAccount}
                                    onChange={(e) => setFilterAccount(e.target.value)}
                                >
                                    <option value="ALL">Semua Akun ({accountOptionsFilter.length})</option>
                                    {accountOptionsFilter.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </PcmSelect>
                            </div>
                        )}
                        {roleOptionsFilter.length > 0 && (
                            <div style={{ width: '180px', maxWidth: '100%' }}>
                                <PcmSelect
                                    searchable={false}
                                    clearable={false}
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                >
                                    <option value="ALL">Semua Peran</option>
                                    {roleOptionsFilter.map(r => <option key={r} value={r}>{r}</option>)}
                                </PcmSelect>
                            </div>
                        )}
                        <div style={{ width: '180px', maxWidth: '100%' }}>
                            <PcmSelect
                                key="milestone-status-filter"
                                searchable={false}
                                clearable={false}
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="ALL">Semua Status</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="PENDING">PENDING</option>
                                <option value="HOLD_POINT">Hold Point Kritis</option>
                            </PcmSelect>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.84rem', borderColor: '#cbd5e1' }}>
                                <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                    <tr>
                                        <th className="ps-3 py-3" style={{ width: '100px' }}>Kode</th>
                                        <th className="py-3">Target Pekerjaan / Milestone</th>
                                        <th className="py-3" style={{ width: '185px' }}>Akun &amp; Peran Proyek</th>
                                        <th className="py-3" style={{ width: '185px' }}>Estimasi &amp; Jadwal</th>
                                        <th className="py-3" style={{ width: '165px' }}>Progres Harian/Jam</th>
                                        <th className="py-3 text-center" style={{ width: '105px' }}>Status</th>
                                        <th className="text-end pe-3 py-3" style={{ width: '215px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                Memuat data milestone proyek...
                                            </td>
                                        </tr>
                                    ) : filteredMilestones.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                Belum ada milestone pada proyek ini. Klik "+ Input Milestone &amp; Jadwal Kerja" untuk menambahkan rencana kerja.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMilestones.map((m) => {
                                            const isDone = m.status === 'COMPLETED';
                                            const isInProgress = m.status === 'IN_PROGRESS';
                                            const acts = m.activities || [];
                                            const doneCount = acts.filter(a => a.is_done).length;
                                            const actPct = acts.length > 0 ? Math.round((doneCount / acts.length) * 100) : (isDone ? 100 : 0);
                                            const estDays = m.estimated_days || diffDaysInclusive(m.start_date, m.target_date);
                                            const canModifyThis = canWrite && (isManager || Number(m.user_id) === Number(user?.id));

                                            return (
                                                <tr key={m.id}>
                                                    <td className="ps-3">
                                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                                            <span className="fw-bold font-monospace text-dark">{m.code}</span>
                                                            {m.is_hold_point && (
                                                                <span className="badge bg-danger" style={{ fontSize: '0.62rem' }}>HP</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold text-dark">{m.name}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.73rem' }}>
                                                            {m.phase}{m.remarks ? ` — ${m.remarks}` : ''}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{m.user?.name || m.pic_lead || '—'}</div>
                                                        <span className="badge px-2 py-0.5 text-dark border" style={{ backgroundColor: '#f1f5f9', fontSize: '0.7rem' }}>
                                                            {m.project_role || 'Team Member'}
                                                        </span>
                                                    </td>
                                                    <td className="font-monospace small">
                                                        <div className="fw-bold text-primary">
                                                            {estDays ? formatDurationBadge(estDays) : '—'}
                                                        </div>
                                                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                            {m.start_date ? `${m.start_date} s/d ` : 'Target: '}{m.target_date || '—'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex justify-content-between small fw-bold mb-1">
                                                            <span>{acts.length > 0 ? `${doneCount}/${acts.length} slot` : 'Belum ada slot'}</span>
                                                            <span>{actPct}%</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '6px', backgroundColor: '#e2e8f0' }}>
                                                            <div
                                                                className={`progress-bar ${actPct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                                style={{ width: `${actPct}%` }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span
                                                            className={`badge px-2.5 py-1 fw-bold ${
                                                                isDone
                                                                    ? 'bg-success text-white'
                                                                    : isInProgress
                                                                        ? 'text-white'
                                                                        : 'text-dark border'
                                                            }`}
                                                            style={{
                                                                backgroundColor: isInProgress ? '#1e40af' : (!isDone ? '#f1f5f9' : undefined),
                                                                borderRadius: 'var(--pcm-radius-chip)'
                                                            }}
                                                        >
                                                            {m.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-end pe-3">
                                                        <div className="d-inline-flex gap-1">
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm px-2 py-1 fw-bold"
                                                                style={{ borderRadius: 'var(--pcm-radius-chip)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                                                                onClick={() => {
                                                                    setScheduleDayFilter('ALL');
                                                                    setScheduleModalError('');
                                                                    setScheduleModalItem(m);
                                                                }}
                                                            >
                                                                Jadwal ({acts.length})
                                                            </button>
                                                            {canModifyThis && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm px-2 py-1 fw-bold"
                                                                    style={{ borderRadius: 'var(--pcm-radius-chip)' }}
                                                                    onClick={() => handleOpenModal(m)}
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                            {canModifyThis && !isDone && isManager && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-success btn-sm px-2 py-1 fw-bold"
                                                                    style={{ borderRadius: 'var(--pcm-radius-chip)' }}
                                                                    onClick={() => handleMarkComplete(m)}
                                                                    title="Sahkan Milestone Selesai"
                                                                >
                                                                    Sahkan
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL & CHECKLIST JADWAL HARIAN + PER JAM */}
            {scheduleModalItem && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', zIndex: 1065 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <div className="modal-header border-bottom">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        {scheduleModalItem.code} &mdash; {scheduleModalItem.name}
                                    </h5>
                                    <div className="small text-muted mt-1">
                                        Akun: <strong className="text-dark">{scheduleModalItem.user?.name || scheduleModalItem.pic_lead}</strong> &bull;{' '}
                                        Peran: <strong className="text-primary">{scheduleModalItem.project_role || 'Team Member'}</strong> &bull;{' '}
                                        Estimasi: <strong>{formatDurationBadge(scheduleModalItem.estimated_days || diffDaysInclusive(scheduleModalItem.start_date, scheduleModalItem.target_date))}</strong>
                                    </div>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setScheduleModalItem(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {scheduleModalError && (
                                    <div className="alert alert-danger py-2 small mb-3">{scheduleModalError}</div>
                                )}
                                {(scheduleModalItem.activities || []).length === 0 ? (
                                    <div className="text-center py-4 text-muted">
                                        <p className="mb-2">Milestone ini belum memiliki rincian kegiatan harian &amp; per jam.</p>
                                        {canWrite && (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm fw-bold"
                                                onClick={() => {
                                                    const target = scheduleModalItem;
                                                    setScheduleModalItem(null);
                                                    handleOpenModal(target);
                                                }}
                                            >
                                                Isi Jadwal Harian &amp; Jam Sekarang
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Filter per Hari */}
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="small fw-bold text-muted">Filter Hari:</span>
                                                <PcmSelect
                                                    searchable={false}
                                                    clearable={false}
                                                    value={scheduleDayFilter}
                                                    onChange={(e) => setScheduleDayFilter(e.target.value)}
                                                >
                                                    <option value="ALL">Semua Hari ({Array.from(new Set(scheduleModalItem.activities.map(a => a.day_number))).length} hari)</option>
                                                    {Array.from(new Set(scheduleModalItem.activities.map(a => Number(a.day_number))))
                                                        .sort((a, b) => a - b)
                                                        .map(d => (
                                                            <option key={d} value={String(d)}>Hari ke-{d}</option>
                                                        ))}
                                                </PcmSelect>
                                            </div>
                                            <div className="small text-muted">
                                                Centang kotak di kanan/kiri untuk menandai aktivitas sudah dikerjakan.
                                            </div>
                                        </div>

                                        {groupedScheduleDays.map(group => {
                                            const dayDone = group.items.filter(i => i.is_done).length;
                                            const dayHours = group.items.reduce((acc, i) => acc + calcSlotHours(i.time_start, i.time_end), 0);
                                            return (
                                                <div key={group.day} className="card border mb-3" style={{ borderRadius: 'var(--pcm-radius-control)', overflow: 'hidden' }}>
                                                    <div className="card-header bg-light py-2 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                                                        <span className="fw-bold text-dark small">
                                                            Hari ke-{group.day} {group.date ? `(${group.date})` : ''}
                                                        </span>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="badge bg-primary font-monospace" style={{ backgroundColor: '#1e40af' }}>
                                                                Total {formatHoursLabel(dayHours)} ({group.items.length} blok)
                                                            </span>
                                                            <span className="badge bg-white text-dark border font-monospace">
                                                                {dayDone} / {group.items.length} selesai
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="table-responsive">
                                                        <table className="table table-bordered table-sm align-middle mb-0" style={{ fontSize: '0.84rem', borderColor: '#cbd5e1' }}>
                                                            <thead className="table-light small text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>
                                                                <tr>
                                                                    <th className="text-center" style={{ width: '56px' }}>Cek</th>
                                                                    <th style={{ width: '140px' }}>Jam Kerja</th>
                                                                    <th className="text-center" style={{ width: '90px' }}>Durasi</th>
                                                                    <th>Aktivitas / Pekerjaan</th>
                                                                    <th style={{ width: '190px' }}>Target Output</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {group.items.map(act => {
                                                                    const slotHrs = calcSlotHours(act.time_start, act.time_end);
                                                                    return (
                                                                        <tr
                                                                            key={act.id}
                                                                            style={{ cursor: canWrite ? 'pointer' : 'default', backgroundColor: act.is_done ? '#f0fdf4' : '#ffffff' }}
                                                                            onClick={() => { if (canWrite && togglingId !== act.id) handleToggleActivity(act); }}
                                                                        >
                                                                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="form-check-input"
                                                                                    checked={Boolean(act.is_done)}
                                                                                    disabled={togglingId === act.id || !canWrite}
                                                                                    onChange={() => handleToggleActivity(act)}
                                                                                />
                                                                            </td>
                                                                            <td className="font-monospace fw-bold text-primary">
                                                                                {act.time_start} - {act.time_end}
                                                                            </td>
                                                                            <td className="text-center font-monospace">
                                                                                <span className="badge bg-light text-dark border">
                                                                                    {slotHrs > 0 ? formatHoursLabel(slotHrs) : '—'}
                                                                                </span>
                                                                            </td>
                                                                            <td className={`fw-semibold ${act.is_done ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                                                                <div>{act.activity}</div>
                                                                                {act.notes && (
                                                                                    <div className="mt-1 px-2 py-1 rounded border small" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                                                                                        <strong>Note / Teguran PM:</strong> {act.notes}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="text-muted small">
                                                                                {act.target_output || '—'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-top bg-light">
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setScheduleModalItem(null)}>
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADD / EDIT MILESTONE + RENCANA PER HARI & PER JAM */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <form onSubmit={handleSave}>
                                <div className="modal-header border-bottom">
                                    <h5 className="modal-title fw-bold text-dark">
                                        {editingItem ? 'Edit Milestone & Jadwal Kerja' : 'Input Milestone & Rencana Kerja Harian / Jam'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    {formError && (
                                        <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                                    )}

                                    {/* Bagian 1: Identitas Peran & Estimasi Lama Selesai */}
                                    <div className="pcm-modal p-3 border rounded bg-light mb-4">
                                        <div className="small fw-bold text-uppercase text-primary mb-3">
                                            1. Peran Proyek &amp; Estimasi Durasi Penyelesaian
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Kode *</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm font-monospace"
                                                    value={form.code}
                                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label className="form-label small fw-bold">Peran di Proyek *</label>
                                                <PcmSelect
                                                    searchable={false}
                                                    clearable={false}
                                                    value={form.project_role || ROLE_OPTIONS[0]}
                                                    onChange={(e) => {
                                                        setForm({ ...form, project_role: e.target.value });
                                                    }}
                                                >
                                                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    {form.project_role && !ROLE_OPTIONS.includes(form.project_role) && (
                                                        <option value={form.project_role}>{form.project_role}</option>
                                                    )}
                                                </PcmSelect>
                                            </div>
                                            <div className="col-12 col-md-7">
                                                <label className="form-label small fw-bold">Target Pekerjaan / Milestone *</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Contoh: Pengelasan Spool Carbon Steel 24 Joint"
                                                    value={form.name}
                                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            {/* Baris Estimasi Durasi */}
                                            <div className="col-12 col-md-4">
                                                <label className="form-label small fw-bold">Preset Estimasi Selesai</label>
                                                <div className="btn-group btn-group-sm w-100" role="group">
                                                    <button type="button" className={`btn ${Number(form.estimated_days) === 2 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => updateDurationDays(2)}>2 Hari</button>
                                                    <button type="button" className={`btn ${Number(form.estimated_days) === 7 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => updateDurationDays(7)}>1 Minggu</button>
                                                    <button type="button" className={`btn ${Number(form.estimated_days) === 14 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => updateDurationDays(14)}>2 Minggu</button>
                                                    <button type="button" className={`btn ${Number(form.estimated_days) === 30 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => updateDurationDays(30)}>1 Bulan</button>
                                                </div>
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Lama (Hari)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="180"
                                                    className="form-control form-control-sm font-monospace fw-bold"
                                                    value={form.estimated_days}
                                                    onChange={(e) => updateDurationDays(e.target.value)}
                                                    onBlur={() => {
                                                        if (!form.estimated_days || Number(form.estimated_days) < 1) {
                                                            updateDurationDays(1);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Jam / Hari</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="1"
                                                    max="24"
                                                    className="form-control form-control-sm font-monospace"
                                                    value={form.work_hours_per_day}
                                                    onChange={(e) => setForm({ ...form, work_hours_per_day: e.target.value })}
                                                    onBlur={() => {
                                                        const num = parseFloat(form.work_hours_per_day);
                                                        setForm(prev => ({
                                                            ...prev,
                                                            work_hours_per_day: (!num || num < 1) ? 8 : Math.min(24, num)
                                                        }));
                                                    }}
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Mulai</label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm font-monospace"
                                                    value={form.start_date}
                                                    onChange={(e) => updateStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label small fw-bold">Target Selesai</label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm font-monospace"
                                                    value={form.target_date}
                                                    onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                                                />
                                            </div>

                                            {/* Baris Akun, Fase, Status */}
                                            {isManager && userList.length > 0 && (
                                                <div className="col-12 col-md-4">
                                                    <label className="form-label small fw-bold">Akun Pemilik</label>
                                                    <PcmSelect
                                                        searchable={false}
                                                        clearable={false}
                                                        value={form.user_id}
                                                        onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                                    >
                                                        {userList.map(u => (
                                                            <option key={u.id} value={u.id}>{`${u.name} (${u.role_name || u.role})`}</option>
                                                        ))}
                                                    </PcmSelect>
                                                </div>
                                            )}
                                            <div className="col-6 col-md-3">
                                                <label className="form-label small fw-bold">Fase Proyek</label>
                                                <PcmSelect
                                                    searchable={false}
                                                    clearable={false}
                                                    value={form.phase}
                                                    onChange={(e) => setForm({ ...form, phase: e.target.value })}
                                                >
                                                    <option value="Initiation">Initiation</option>
                                                    <option value="Engineering">Engineering</option>
                                                    <option value="Procurement">Procurement</option>
                                                    <option value="Fabrication">Fabrication</option>
                                                    <option value="Erection">Erection</option>
                                                    <option value="Testing">Testing</option>
                                                    <option value="Closing">Closing</option>
                                                </PcmSelect>
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label className="form-label small fw-bold">Status</label>
                                                <PcmSelect
                                                    searchable={false}
                                                    clearable={false}
                                                    value={form.status}
                                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                                >
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                    <option value="COMPLETED">COMPLETED</option>
                                                    <option value="DELAYED">DELAYED</option>
                                                </PcmSelect>
                                            </div>
                                            <div className="col-12 col-md-2 d-flex align-items-end pb-1">
                                                {isManager && (
                                                    <div className="form-check">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id="isHoldPointCheck"
                                                            checked={form.is_hold_point}
                                                            onChange={(e) => setForm({ ...form, is_hold_point: e.target.checked })}
                                                        />
                                                        <label className="form-check-label small fw-bold text-danger" htmlFor="isHoldPointCheck">
                                                            Hold Point
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bagian 2: Rencana Kegiatan Per Hari & Per Jam */}
                                    <div className="p-3 border rounded bg-white">
                                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                            <div>
                                                <div className="small fw-bold text-uppercase text-primary">
                                                    2. Rencana Pekerjaan Per Hari &amp; Per Jam ({filledDaysSet.size} / {form.estimated_days} hari terisi)
                                                </div>
                                                <div className="text-muted small">
                                                    Pecah jam kerja per hari (misal {form.work_hours_per_day || 8} jam menjadi blok 2 jam: ngapain saja tiap sesi).
                                                </div>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2">
                                                <button type="button" className="btn btn-outline-primary btn-sm fw-semibold" onClick={handleSplitDayBlocks}>
                                                    Bagi Blok 2 Jam ({form.work_hours_per_day || 8} Jam)
                                                </button>
                                                <button type="button" className="btn btn-outline-primary btn-sm fw-semibold" onClick={handleApplyRoleTemplate}>
                                                    Isi Template {form.project_role || 'Kerja'}
                                                </button>
                                                <button type="button" className="btn btn-outline-success btn-sm fw-semibold" onClick={handleCopyDayToAllDays}>
                                                    Salin Hari {selectedDay} ke Hari 1&ndash;{form.estimated_days}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Pemilih Hari */}
                                        <div className="d-flex flex-wrap gap-1 mb-3 p-2 bg-light rounded border" style={{ maxHeight: '115px', overflowY: 'auto' }}>
                                            {Array.from({ length: Math.max(1, Number(form.estimated_days) || 1) }, (_, i) => i + 1).map(dayNo => {
                                                const active = Number(selectedDay) === dayNo;
                                                const hasContent = filledDaysSet.has(dayNo);
                                                return (
                                                    <button
                                                        key={dayNo}
                                                        type="button"
                                                        onClick={() => setSelectedDay(dayNo)}
                                                        className={`btn btn-sm px-2 py-1 font-monospace ${
                                                            active
                                                                ? 'btn-primary fw-bold'
                                                                : hasContent
                                                                    ? 'btn-outline-success fw-semibold bg-white'
                                                                    : 'btn-outline-secondary bg-white'
                                                        }`}
                                                        style={{ fontSize: '0.75rem' }}
                                                        title={form.start_date ? addDaysIso(form.start_date, dayNo - 1) : `Hari ${dayNo}`}
                                                    >
                                                        H{dayNo}{hasContent ? ' \u2713' : ''}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Ringkasan & Slot Jam untuk Hari Terpilih */}
                                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 p-2 rounded border bg-light">
                                            <div className="d-flex flex-wrap align-items-center gap-2">
                                                <strong className="small text-dark">
                                                    Hari ke-{selectedDay} {form.start_date ? `(${addDaysIso(form.start_date, selectedDay - 1)})` : ''}
                                                </strong>
                                                {(() => {
                                                    const targetHrs = Number(form.work_hours_per_day) || 8;
                                                    const diff = Math.round((currentDayHours - targetHrs) * 10) / 10;
                                                    const badgeClass = Math.abs(diff) < 0.05
                                                        ? 'bg-success text-white'
                                                        : diff < 0
                                                            ? 'bg-warning text-dark'
                                                            : 'bg-danger text-white';
                                                    const statusLabel = Math.abs(diff) < 0.05
                                                        ? `Lengkap ${formatHoursLabel(targetHrs)}`
                                                        : diff < 0
                                                            ? `Sisa ${formatHoursLabel(Math.abs(diff))}`
                                                            : `Lebih ${formatHoursLabel(diff)}`;
                                                    return (
                                                        <>
                                                            <span className="badge bg-white text-dark border font-monospace">
                                                                Terjadwal: {formatHoursLabel(currentDayHours)} / {formatHoursLabel(targetHrs)} ({currentDaySlots.length} blok)
                                                            </span>
                                                            <span className={`badge font-monospace ${badgeClass}`}>
                                                                {statusLabel}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <button type="button" className="btn btn-primary btn-sm px-2.5 py-1 fw-bold" style={{ backgroundColor: '#1e40af' }} onClick={handleAddSlot}>
                                                + Tambah Blok Jam
                                            </button>
                                        </div>

                                        {currentDaySlots.length === 0 ? (
                                            <div className="text-center py-3 bg-light rounded border text-muted small">
                                                Belum ada blok jam di Hari ke-{selectedDay}. Klik "+ Tambah Blok Jam" atau "Bagi Blok 2 Jam ({form.work_hours_per_day || 8} Jam)".
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-bordered table-sm align-middle mb-0" style={{ borderColor: '#cbd5e1' }}>
                                                    <thead className="table-light small text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                                                        <tr>
                                                            <th className="text-center" style={{ width: '44px' }}>No</th>
                                                            <th style={{ width: '115px' }}>Jam Mulai</th>
                                                            <th style={{ width: '115px' }}>Jam Selesai</th>
                                                            <th className="text-center" style={{ width: '85px' }}>Durasi</th>
                                                            <th>Aktivitas / Pekerjaan yang Dilakukan</th>
                                                            <th style={{ width: '170px' }}>Target Output</th>
                                                            <th className="text-center" style={{ width: '56px' }}>Hapus</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentDaySlots.map((slot, slotIdx) => {
                                                            const slotHrs = calcSlotHours(slot.time_start, slot.time_end);
                                                            return (
                                                                <tr key={slot._idx}>
                                                                    <td className="text-center font-monospace fw-bold text-muted">{slotIdx + 1}</td>
                                                                    <td>
                                                                        <input
                                                                            type="time"
                                                                            className="form-control form-control-sm font-monospace"
                                                                            value={slot.time_start}
                                                                            onChange={(e) => handleSlotChange(slot._idx, 'time_start', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="time"
                                                                            className="form-control form-control-sm font-monospace"
                                                                            value={slot.time_end}
                                                                            onChange={(e) => handleSlotChange(slot._idx, 'time_end', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center font-monospace">
                                                                        <span className={`badge border ${slotHrs > 0 ? 'bg-light text-primary' : 'bg-danger-subtle text-danger'}`}>
                                                                            {slotHrs > 0 ? formatHoursLabel(slotHrs) : 'Invalid'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder="Contoh: Pengelasan Root & Hot Pass Joint #1-#4"
                                                                            value={slot.activity}
                                                                            onChange={(e) => handleSlotChange(slot._idx, 'activity', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder="Misal: 4 Joint / 16 DI"
                                                                            value={slot.target_output || ''}
                                                                            onChange={(e) => handleSlotChange(slot._idx, 'target_output', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline-danger btn-sm px-2 py-0.5"
                                                                            onClick={() => handleRemoveSlot(slot._idx)}
                                                                            title="Hapus slot jam"
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                                    {editingItem ? (
                                        <button type="button" className="btn btn-outline-danger btn-sm fw-bold" onClick={handleDelete} disabled={formLoading}>
                                            Hapus Milestone
                                        </button>
                                    ) : <div />}
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} disabled={formLoading}>
                                            {formLoading ? 'Menyimpan...' : 'Simpan Milestone & Jadwal'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
