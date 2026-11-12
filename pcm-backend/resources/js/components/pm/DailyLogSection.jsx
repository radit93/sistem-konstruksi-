import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { can } from '../../auth';
import { PcmSelect } from '../SearchSelect';

const TIME_SLOTS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '20:00', '21:00',
];

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

function buildHourlyBlocks(targetHours = 8, blockHours = 2) {
    const totalMin = Math.max(60, Math.min(24 * 60, Math.round((Number(targetHours) || 8) * 60)));
    const stepMin = Math.max(30, Math.round((Number(blockHours) || 2) * 60));
    const blocks = [];
    let cursor = 8 * 60;
    let remaining = totalMin;

    while (remaining > 0 && cursor < 22 * 60) {
        if (cursor === 12 * 60) cursor = 13 * 60;
        const maxBeforeLunch = cursor < 12 * 60 ? 12 * 60 - cursor : 23 * 60 - cursor;
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

export function DailyLogSection({ scopes = [], joints = [], project, user, onReload }) {
    const [logs, setLogs] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionError, setActionError] = useState('');
    const [search, setSearch] = useState('');

    // Filter Timesheet Harian (8 Jam/Hari per Milestone)
    const [selectedAccountId, setSelectedAccountId] = useState('ALL');
    const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
    const [togglingId, setTogglingId] = useState(null);

    // Modal Note / Teguran PM per blok jam kerja
    const [noteModalItem, setNoteModalItem] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [noteError, setNoteError] = useState('');

    // Modal Input Progres Harian (Volume DI)
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState({
        prog_date: new Date().toISOString().split('T')[0],
        scope_id: '',
        qty: 10,
        team: 'project_manager'
    });

    // Modal Atur Timesheet Harian (Blok 2 Jam -> Total 8 Jam/Hari)
    const [showTimesheetModal, setShowTimesheetModal] = useState(false);
    const [tsMilestoneId, setTsMilestoneId] = useState('');
    const [tsDay, setTsDay] = useState(1);
    const [tsSlots, setTsSlots] = useState([]);
    const [tsSaving, setTsSaving] = useState(false);
    const [tsError, setTsError] = useState('');

    const isManager = Boolean(user?.is_superadmin) || user?.role === 'project_manager' || can(user, 'scope.write');
    const canEdit = can(user, 'progress.write');
    const canWriteMilestone = can(user, 'milestone.write') || can(user, 'scope.write');

    const loadData = useCallback(async () => {
        setLoading(true);
        setActionError('');
        try {
            const logUrl = project?.id ? `/daily-progress?project_id=${project.id}` : '/daily-progress';
            const msUrl = project?.id ? `/project-milestones?project_id=${project.id}` : '/project-milestones';
            const [logRes, msRes] = await Promise.allSettled([
                api.get(logUrl),
                api.get(msUrl),
            ]);

            if (logRes.status === 'fulfilled' && Array.isArray(logRes.value)) {
                const filteredLogs = project?.id
                    ? logRes.value.filter(l => Number(l.project_id) === Number(project.id) || (!l.project_id && Number(project.id) === 1))
                    : logRes.value;
                setLogs(filteredLogs);
            }
            if (msRes.status === 'fulfilled' && Array.isArray(msRes.value)) {
                const filteredMs = project?.id
                    ? msRes.value.filter(m => Number(m.project_id) === Number(project.id) || (!m.project_id && Number(project.id) === 1))
                    : msRes.value;
                setMilestones(filteredMs);
            }
        } catch (err) {
            console.error('Failed to load daily progress:', err);
            setActionError(err.message || 'Gagal memuat data daily progress & timesheet.');
        } finally {
            setLoading(false);
        }
    }, [project?.id]);

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

    // Ringkasan aktivitas harian per akun pada proyek ini (khusus PM)
    const accountSummaries = useMemo(() => {
        const map = new Map();
        userList.forEach(u => {
            if (u.is_active === false) return;
            map.set(Number(u.id), {
                id: u.id,
                name: u.name,
                role_name: u.role_name || u.role,
                department: u.department?.code || '',
                milestones: [],
            });
        });
        milestones.forEach(m => {
            if (m.user?.id) {
                const uid = Number(m.user.id);
                if (!map.has(uid)) {
                    map.set(uid, {
                        id: uid,
                        name: m.user.name,
                        role_name: m.project_role || m.user.role || '',
                        department: '',
                        milestones: [],
                    });
                }
                map.get(uid).milestones.push(m);
            }
        });
        return Array.from(map.values())
            .map(acc => {
                const allActs = acc.milestones.flatMap(m => m.activities || []);
                const doneActs = allActs.filter(a => a.is_done).length;
                const notedActs = allActs.filter(a => (a.notes || '').trim() !== '').length;
                const totalHours = Math.round(allActs.reduce((s, a) => s + calcSlotHours(a.time_start, a.time_end), 0) * 10) / 10;
                return {
                    ...acc,
                    milestoneCount: acc.milestones.length,
                    totalSlots: allActs.length,
                    doneSlots: doneActs,
                    notedSlots: notedActs,
                    totalHours,
                };
            })
            .sort((a, b) => (b.milestoneCount - a.milestoneCount) || a.name.localeCompare(b.name));
    }, [userList, milestones]);

    // Daftar akun yang punya milestone pada proyek aktif
    const accountOptions = useMemo(() => {
        return accountSummaries
            .filter(a => a.milestoneCount > 0)
            .map(a => ({ id: String(a.id), label: `${a.name} (${a.role_name})` }));
    }, [accountSummaries]);

    const filteredMilestonesForTs = useMemo(() => {
        if (selectedAccountId === 'ALL') return milestones;
        return milestones.filter(m => String(m.user_id || '') === String(selectedAccountId));
    }, [milestones, selectedAccountId]);

    // Pilih otomatis milestone pertama yang sesuai filter bila belum terpilih / tidak cocok lagi
    useEffect(() => {
        if (filteredMilestonesForTs.length === 0) {
            if (selectedMilestoneId !== '') setSelectedMilestoneId('');
            return;
        }
        const stillValid = filteredMilestonesForTs.some(m => String(m.id) === String(selectedMilestoneId));
        if (!stillValid) {
            // Prioritaskan milestone yang sudah punya aktivitas atau yang punya estimasi hari <= 14
            const preferred = filteredMilestonesForTs.find(m => (m.activities || []).length > 0) || filteredMilestonesForTs[0];
            setSelectedMilestoneId(String(preferred.id));
        }
    }, [filteredMilestonesForTs, selectedMilestoneId]);

    const activeMilestone = useMemo(() => {
        return filteredMilestonesForTs.find(m => String(m.id) === String(selectedMilestoneId)) || null;
    }, [filteredMilestonesForTs, selectedMilestoneId]);

    // Bangun daftar hari 1..totalDays untuk milestone aktif beserta blok 2 jamnya
    const activeMilestoneDays = useMemo(() => {
        if (!activeMilestone) return [];
        const acts = activeMilestone.activities || [];
        const maxActDay = acts.reduce((mx, a) => Math.max(mx, Number(a.day_number) || 1), 0);
        const estDays = activeMilestone.estimated_days || diffDaysInclusive(activeMilestone.start_date, activeMilestone.target_date) || Math.max(1, maxActDay);
        const totalDays = Math.max(estDays, maxActDay, 1);

        const days = [];
        for (let d = 1; d <= totalDays; d++) {
            const items = acts
                .filter(a => Number(a.day_number) === d)
                .sort((a, b) => String(a.time_start).localeCompare(String(b.time_start)));
            const dateLabel = items[0]?.work_date || (activeMilestone.start_date ? addDaysIso(activeMilestone.start_date, d - 1) : '');
            const totalHours = Math.round(items.reduce((acc, i) => acc + calcSlotHours(i.time_start, i.time_end), 0) * 100) / 100;
            const doneCount = items.filter(i => i.is_done).length;
            days.push({
                day: d,
                date: dateLabel,
                items,
                totalHours,
                doneCount,
            });
        }
        return days;
    }, [activeMilestone]);

    const stats = useMemo(() => {
        const totalLogs = logs.length;
        const totalQtyLogged = logs.reduce((acc, l) => acc + (parseFloat(l.qty) || 0), 0);
        const weldedDI = (joints || [])
            .filter(j => ['WELDED', 'VISUAL_OK', 'NDT_OK', 'TESTED'].includes((j.status || '').toUpperCase()))
            .reduce((acc, j) => acc + (parseFloat(j.size_in ?? j.dia_inch) || 0), 0);
        const allTsSlots = milestones.reduce((acc, m) => acc + (m.activities?.length || 0), 0);
        const doneTsSlots = milestones.reduce((acc, m) => acc + ((m.activities || []).filter(a => a.is_done).length), 0);
        return { totalLogs, totalQtyLogged, weldedDI, allTsSlots, doneTsSlots };
    }, [logs, joints, milestones]);

    const jointDailyRecap = useMemo(() => {
        const byDate = {};
        (joints || []).forEach(j => {
            if (j.fit_date) {
                const d = j.fit_date;
                if (!byDate[d]) byDate[d] = { date: d, fitCount: 0, weldCount: 0, weldDI: 0 };
                byDate[d].fitCount += 1;
            }
            if (j.weld_date) {
                const d = j.weld_date;
                if (!byDate[d]) byDate[d] = { date: d, fitCount: 0, weldCount: 0, weldDI: 0 };
                byDate[d].weldCount += 1;
                byDate[d].weldDI += parseFloat(j.size_in ?? j.dia_inch) || 0;
            }
        });
        return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    }, [joints]);

    const filteredLogs = useMemo(() => {
        const q = search.toLowerCase();
        return logs.filter(l => {
            return !q ||
                (l.scope || '').toLowerCase().includes(q) ||
                (l.prog_date || '').toLowerCase().includes(q) ||
                (l.team || '').toLowerCase().includes(q);
        });
    }, [logs, search]);

    const handleOpenModal = () => {
        setFormError('');
        setForm({
            prog_date: new Date().toISOString().split('T')[0],
            scope_id: scopes[0]?.id ? String(scopes[0].id) : '',
            qty: 10,
            team: ['project_manager', 'construction', 'workshop'].includes(user?.role) ? user.role : 'project_manager'
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        const selectedScope = scopes.find(s => s.id === Number(form.scope_id));
        if (!selectedScope) {
            setFormError('Pilih lingkup pekerjaan yang valid.');
            return;
        }

        const qtyNum = parseFloat(form.qty);
        if (!form.qty || Number.isNaN(qtyNum) || qtyNum <= 0) {
            setFormError('Volume progres harian wajib diisi angka lebih besar dari 0.');
            return;
        }

        setFormLoading(true);
        try {
            await api.post('/daily-progress', {
                prog_date: form.prog_date,
                scope: selectedScope.scope,
                qty: qtyNum,
                team: form.team,
                project_id: project?.id
            });

            const newCum = (parseFloat(selectedScope.cumulative_qty) || 0) + qtyNum;
            await api.put(`/scopes/${selectedScope.id}`, {
                cumulative_qty: newCum,
                project_id: project?.id || selectedScope.project_id
            });

            setShowModal(false);
            loadData();
            if (onReload) onReload();
        } catch (err) {
            setFormError(err.message || 'Gagal menyimpan progres harian.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleActivity = async (activity) => {
        setTogglingId(activity.id);
        setActionError('');
        try {
            const updatedMilestone = await api.patch(`/milestone-activities/${activity.id}/toggle`, {
                is_done: !activity.is_done,
            });
            setMilestones(prev => prev.map(m => (m.id === updatedMilestone.id ? updatedMilestone : m)));
        } catch (err) {
            setActionError(err.message || 'Gagal memperbarui status aktivitas timesheet.');
        } finally {
            setTogglingId(null);
        }
    };

    const handleOpenNoteModal = (act, milestoneObj) => {
        setNoteError('');
        setNoteModalItem({ ...act, milestone: milestoneObj });
        setNoteText(act.notes || '');
    };

    const handleSaveNote = async (e, overrideText = null) => {
        if (e) e.preventDefault();
        if (!noteModalItem) return;
        setNoteSaving(true);
        setNoteError('');
        try {
            const payloadNotes = overrideText !== null ? overrideText : noteText;
            const updatedMilestone = await api.patch(`/milestone-activities/${noteModalItem.id}/note`, {
                notes: payloadNotes,
            });
            setMilestones(prev => prev.map(m => (m.id === updatedMilestone.id ? updatedMilestone : m)));
            setNoteModalItem(null);
        } catch (err) {
            setNoteError(err.message || 'Gagal menyimpan note teguran PM.');
        } finally {
            setNoteSaving(false);
        }
    };

    // Buka modal pengisian jadwal 8 jam per hari (4 blok x 2 jam) untuk milestone & hari tertentu
    const loadSlotsIntoTimesheetModal = (milestoneObj, dayNum) => {
        if (!milestoneObj) {
            setTsSlots([]);
            return;
        }
        const existing = (milestoneObj.activities || [])
            .filter(a => Number(a.day_number) === Number(dayNum))
            .sort((a, b) => String(a.time_start).localeCompare(String(b.time_start)))
            .map(a => ({
                time_start: String(a.time_start || '08:00').slice(0, 5),
                time_end: String(a.time_end || '10:00').slice(0, 5),
                activity: a.activity || '',
                target_output: a.target_output || '',
                is_done: Boolean(a.is_done),
                notes: a.notes || '',
            }));
        if (existing.length > 0) {
            setTsSlots(existing);
        } else {
            const blocks = buildHourlyBlocks(milestoneObj.work_hours_per_day || 8, 2);
            setTsSlots(blocks.map(b => ({
                time_start: b.time_start,
                time_end: b.time_end,
                activity: '',
                target_output: '',
                is_done: false,
                notes: '',
            })));
        }
    };

    const handleOpenTimesheetModal = (milestoneObj = activeMilestone, dayNum = 1) => {
        if (!milestoneObj) return;
        setTsError('');
        setTsMilestoneId(String(milestoneObj.id));
        setTsDay(Number(dayNum) || 1);
        loadSlotsIntoTimesheetModal(milestoneObj, Number(dayNum) || 1);
        setShowTimesheetModal(true);
    };

    const tsMilestone = useMemo(() => {
        return milestones.find(m => String(m.id) === String(tsMilestoneId)) || null;
    }, [milestones, tsMilestoneId]);

    const tsTotalDays = useMemo(() => {
        if (!tsMilestone) return 1;
        const maxActDay = (tsMilestone.activities || []).reduce((mx, a) => Math.max(mx, Number(a.day_number) || 1), 0);
        const estDays = tsMilestone.estimated_days || diffDaysInclusive(tsMilestone.start_date, tsMilestone.target_date) || 1;
        return Math.max(1, estDays, maxActDay);
    }, [tsMilestone]);

    const tsCurrentHours = useMemo(() => {
        return Math.round(tsSlots.reduce((acc, s) => acc + calcSlotHours(s.time_start, s.time_end), 0) * 100) / 100;
    }, [tsSlots]);

    const handleTsSplit2Hours = () => {
        const target = tsMilestone?.work_hours_per_day || 8;
        const blocks = buildHourlyBlocks(target, 2);
        setTsSlots(prev => blocks.map((blk, idx) => ({
            time_start: blk.time_start,
            time_end: blk.time_end,
            activity: prev[idx]?.activity || '',
            target_output: prev[idx]?.target_output || '',
            is_done: Boolean(prev[idx]?.is_done),
            notes: prev[idx]?.notes || '',
        })));
    };

    const handleTsAddBlock = () => {
        const last = tsSlots[tsSlots.length - 1];
        let startMin = 8 * 60;
        if (last) {
            const lastEnd = parseMinutes(last.time_end);
            if (lastEnd !== null) {
                startMin = lastEnd === 12 * 60 ? 13 * 60 : lastEnd;
            }
        }
        if (startMin >= 20 * 60) startMin = 8 * 60;
        const endMin = Math.min(21 * 60, startMin + 120);
        setTsSlots(prev => [
            ...prev,
            {
                time_start: formatMinutes(startMin),
                time_end: formatMinutes(endMin),
                activity: '',
                target_output: '',
                is_done: false,
            },
        ]);
    };

    const handleSaveTimesheetDay = async (e) => {
        e.preventDefault();
        if (!tsMilestone) return;
        setTsError('');

        const validDaySlots = tsSlots
            .filter(s => (s.activity || '').trim() !== '')
            .map(s => ({
                day_number: Number(tsDay),
                time_start: s.time_start || '08:00',
                time_end: s.time_end || '10:00',
                activity: s.activity.trim(),
                target_output: (s.target_output || '').trim(),
                is_done: Boolean(s.is_done),
                notes: s.notes || null,
            }));

        if (validDaySlots.length === 0) {
            setTsError(`Isi minimal 1 blok pekerjaan pada Hari ke-${tsDay}.`);
            return;
        }

        // Gabungkan aktivitas hari lain milik milestone ini agar tidak hilang
        const otherDays = (tsMilestone.activities || [])
            .filter(a => Number(a.day_number) !== Number(tsDay))
            .map(a => ({
                day_number: Number(a.day_number) || 1,
                time_start: String(a.time_start || '08:00').slice(0, 5),
                time_end: String(a.time_end || '10:00').slice(0, 5),
                activity: a.activity,
                target_output: a.target_output || '',
                is_done: Boolean(a.is_done),
                notes: a.notes || null,
            }));

        setTsSaving(true);
        try {
            const updated = await api.put(`/project-milestones/${tsMilestone.id}`, {
                activities: [...otherDays, ...validDaySlots],
            });
            setMilestones(prev => prev.map(m => (m.id === updated.id ? updated : m)));
            setShowTimesheetModal(false);
        } catch (err) {
            setTsError(err.message || 'Gagal menyimpan timesheet harian.');
        } finally {
            setTsSaving(false);
        }
    };

    return (
        <div>
            {/* Header Toolbar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Daily Progress Log &amp; Timesheet</h2>
                    <p className="text-muted small mb-0">
                        Rincian pekerjaan harian per milestone (blok 2 jam hingga 8 jam/hari), pencatatan volume progres harian kontrak, dan rekap produksi Construction.
                    </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    {canEdit && activeMilestone && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm fw-bold px-3 py-2"
                            style={{ borderRadius: 'var(--pcm-radius-control)', backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                            onClick={() => handleOpenTimesheetModal(activeMilestone, 1)}
                        >
                            + Atur Timesheet 8 Jam/Hari
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

            {/* Metric Summary Tiles (PCM Design Tokens) */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-4">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Blok Timesheet Terlaksana</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary">
                            {stats.doneTsSlots} / {stats.allTsSlots}
                            <span className="pcm-tile__unit">blok jam selesai</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-md-4">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Total Catatan Jurnal Volume</span>
                        <strong className="pcm-tile__value text-dark">
                            {stats.totalLogs.toLocaleString('id-ID')}
                            <span className="pcm-tile__unit">entri harian</span>
                        </strong>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="pcm-tile h-100">
                        <span className="pcm-tile__label">Volume Terinput / Las Aktual</span>
                        <strong className="pcm-tile__value text-success">
                            {stats.totalQtyLogged.toLocaleString('id-ID')}
                            <span className="pcm-tile__unit">unit total &bull; Las: {stats.weldedDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* ============================================================
                RINGKASAN PEMERIKSAAN HARIAN PER AKUN (KHUSUS PM)
                ============================================================ */}
            {isManager && accountSummaries.length > 0 && (
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                    <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                            <h6 className="fw-bold text-dark mb-0">Pemeriksaan Harian Per Akun (Cek Selesai &amp; Note Teguran)</h6>
                            <div className="text-muted small">
                                Pilih akun untuk memeriksa rincian kegiatan harian (apa yang sudah selesai per blok 2 jam) serta memberi catatan teguran jika lapangan belum sesuai.
                            </div>
                        </div>
                        {selectedAccountId !== 'ALL' && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm fw-semibold"
                                onClick={() => setSelectedAccountId('ALL')}
                            >
                                Tampilkan Semua Akun
                            </button>
                        )}
                    </div>
                    <div className="table-responsive">
                        <table className="table table-bordered table-sm table-hover align-middle mb-0" style={{ fontSize: '0.84rem', borderColor: '#cbd5e1' }}>
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.7rem' }}>
                                <tr>
                                    <th className="ps-3 py-2">Nama Akun</th>
                                    <th className="py-2" style={{ width: '175px' }}>Role</th>
                                    <th className="py-2 text-center" style={{ width: '110px' }}>Milestone</th>
                                    <th className="py-2 text-center" style={{ width: '130px' }}>Blok Selesai</th>
                                    <th className="py-2 text-center" style={{ width: '125px' }}>Total Jam</th>
                                    <th className="py-2 text-center" style={{ width: '130px' }}>Note Teguran</th>
                                    <th className="text-end pe-3 py-2" style={{ width: '135px' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accountSummaries.map(acc => {
                                    const isPicked = String(selectedAccountId) === String(acc.id);
                                    return (
                                        <tr
                                            key={acc.id}
                                            style={{ cursor: 'pointer', backgroundColor: isPicked ? '#eff6ff' : undefined }}
                                            onClick={() => setSelectedAccountId(String(acc.id))}
                                        >
                                            <td className="ps-3 fw-bold text-dark">{acc.name}</td>
                                            <td>
                                                <span className="badge px-2 py-0.5 text-dark border" style={{ backgroundColor: '#f1f5f9', fontSize: '0.72rem' }}>
                                                    {acc.role_name}
                                                </span>
                                            </td>
                                            <td className="text-center font-monospace fw-bold">{acc.milestoneCount}</td>
                                            <td className="text-center font-monospace">
                                                <span className={`badge ${acc.totalSlots > 0 && acc.doneSlots === acc.totalSlots ? 'bg-success text-white' : 'bg-light text-dark border'}`}>
                                                    {acc.doneSlots} / {acc.totalSlots}
                                                </span>
                                            </td>
                                            <td className="text-center font-monospace fw-semibold text-primary">
                                                {formatHoursLabel(acc.totalHours)}
                                            </td>
                                            <td className="text-center">
                                                {acc.notedSlots > 0 ? (
                                                    <span className="badge bg-danger text-white font-monospace">
                                                        {acc.notedSlots} Note
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">—</span>
                                                )}
                                            </td>
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm px-2.5 py-0.5 fw-bold ${isPicked ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAccountId(String(acc.id));
                                                    }}
                                                >
                                                    {isPicked ? 'Terpilih' : 'Cek Harian'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============================================================
                BAGIAN 1: TIMESHEET HARIAN PER MILESTONE (8 JAM / HARI = BLOK 2 JAM)
                ============================================================ */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <h6 className="fw-bold text-dark mb-0">
                            Timesheet Aktivitas Harian Per Milestone (8 Jam / Hari)
                        </h6>
                        <div className="text-muted small">
                            Pilih akun &amp; milestone untuk melihat rincian pekerjaan per hari (misal 2 hari selesai &times; 8 jam/hari: 2 jam ngapain, 2 jam ngapain, dst).
                        </div>
                    </div>
                    {activeMilestone && (
                        <span className="badge px-2.5 py-1 fw-bold font-monospace" style={{ backgroundColor: '#1e40af', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                            {activeMilestone.estimated_days || activeMilestoneDays.length} Hari &times; {activeMilestone.work_hours_per_day || 8} Jam/Hari
                        </span>
                    )}
                </div>

                <div className="card-body p-3">
                    {/* Filter Master Terkunci (Tidak Bisa Ketik Sendiri) */}
                    <div className="row g-2 mb-3">
                        {accountOptions.length > 0 && (
                            <div className="col-12 col-md-4">
                                <label className="form-label small fw-bold text-muted mb-1">Filter Akun Pekerja</label>
                                <PcmSelect
                                    key="ts-account-filter"
                                    searchable={false}
                                    clearable={false}
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                >
                                    <option value="ALL">Semua Akun ({accountOptions.length})</option>
                                    {accountOptions.map(a => (
                                        <option key={a.id} value={a.id}>{a.label}</option>
                                    ))}
                                </PcmSelect>
                            </div>
                        )}
                        <div className={accountOptions.length > 0 ? 'col-12 col-md-8' : 'col-12'}>
                            <label className="form-label small fw-bold text-muted mb-1">Pilih Milestone</label>
                            {filteredMilestonesForTs.length === 0 ? (
                                <div className="form-control form-control-sm bg-light text-muted">
                                    Belum ada milestone pada proyek ini.
                                </div>
                            ) : (
                                <PcmSelect
                                    key="ts-milestone-select"
                                    searchable={false}
                                    clearable={false}
                                    value={selectedMilestoneId}
                                    onChange={(e) => setSelectedMilestoneId(e.target.value)}
                                >
                                    {filteredMilestonesForTs.map(m => {
                                        const d = m.estimated_days || diffDaysInclusive(m.start_date, m.target_date) || 1;
                                        const h = m.work_hours_per_day || 8;
                                        const owner = m.user?.name || m.pic_lead || 'PIC';
                                        return (
                                            <option key={m.id} value={String(m.id)}>
                                                {`[${m.code}] ${m.name} — ${owner} (${d} Hari × ${h} Jam/Hari)`}
                                            </option>
                                        );
                                    })}
                                </PcmSelect>
                            )}
                        </div>
                    </div>

                    {!activeMilestone ? (
                        <div className="text-center py-4 bg-light rounded border text-muted small">
                            Belum ada milestone yang dapat ditampilkan pada proyek ini. Buat milestone di menu <strong>Project Milestone</strong> terlebih dahulu.
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {activeMilestoneDays.map(dayGroup => {
                                const targetHrs = Number(activeMilestone.work_hours_per_day) || 8;
                                const diff = Math.round((dayGroup.totalHours - targetHrs) * 10) / 10;
                                const isFull = dayGroup.items.length > 0 && Math.abs(diff) < 0.05;
                                return (
                                    <div key={dayGroup.day} className="border rounded" style={{ borderColor: '#cbd5e1', overflow: 'hidden' }}>
                                        <div className="bg-light px-3 py-2 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                                            <div className="d-flex flex-wrap align-items-center gap-2">
                                                <span className="fw-bold text-dark small">
                                                    Hari ke-{dayGroup.day} {dayGroup.date ? `(${dayGroup.date})` : ''}
                                                </span>
                                                <span className="badge bg-white text-dark border font-monospace">
                                                    {formatHoursLabel(dayGroup.totalHours)} / {formatHoursLabel(targetHrs)} ({dayGroup.items.length} blok)
                                                </span>
                                                <span className={`badge font-monospace ${isFull ? 'bg-success text-white' : (dayGroup.items.length === 0 ? 'bg-secondary text-white' : 'bg-warning text-dark')}`}>
                                                    {dayGroup.items.length === 0
                                                        ? 'Belum Diisi'
                                                        : isFull
                                                            ? `Lengkap ${formatHoursLabel(targetHrs)}`
                                                            : diff < 0
                                                                ? `Sisa ${formatHoursLabel(Math.abs(diff))}`
                                                                : `Lebih ${formatHoursLabel(diff)}`}
                                                </span>
                                                {dayGroup.items.length > 0 && (
                                                    <span className="badge bg-white text-primary border font-monospace">
                                                        {dayGroup.doneCount} / {dayGroup.items.length} selesai
                                                    </span>
                                                )}
                                            </div>
                                            {canWriteMilestone && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-semibold"
                                                    onClick={() => handleOpenTimesheetModal(activeMilestone, dayGroup.day)}
                                                >
                                                    {dayGroup.items.length === 0 ? `Isi Hari ke-${dayGroup.day}` : `Atur Hari ke-${dayGroup.day}`}
                                                </button>
                                            )}
                                        </div>

                                        {dayGroup.items.length === 0 ? (
                                            <div className="p-3 text-center text-muted small bg-white">
                                                Rincian 8 jam kerja untuk Hari ke-{dayGroup.day} belum diisi. Klik <strong>Isi Hari ke-{dayGroup.day}</strong> untuk membagi blok 2 jam.
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-bordered table-sm align-middle mb-0" style={{ fontSize: '0.84rem', borderColor: '#cbd5e1' }}>
                                                    <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.7rem' }}>
                                                        <tr>
                                                            <th className="text-center" style={{ width: '52px' }}>Cek</th>
                                                            <th className="text-center" style={{ width: '74px' }}>Blok</th>
                                                            <th style={{ width: '135px' }}>Jam Kerja</th>
                                                            <th className="text-center" style={{ width: '85px' }}>Durasi</th>
                                                            <th>Kerjakan Apa Saja (Aktivitas) &amp; Note PM</th>
                                                            <th style={{ width: '175px' }}>Target Output</th>
                                                            <th className="text-center" style={{ width: '90px' }}>Status</th>
                                                            {isManager && (
                                                                <th className="text-center" style={{ width: '110px' }}>Note PM</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dayGroup.items.map((act, idx) => {
                                                            const hrs = calcSlotHours(act.time_start, act.time_end);
                                                            const hasNote = Boolean((act.notes || '').trim());
                                                            return (
                                                                <tr
                                                                    key={act.id}
                                                                    style={{ cursor: canWriteMilestone ? 'pointer' : 'default', backgroundColor: act.is_done ? '#f0fdf4' : '#ffffff' }}
                                                                    onClick={() => { if (canWriteMilestone && togglingId !== act.id) handleToggleActivity(act); }}
                                                                >
                                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input"
                                                                            checked={Boolean(act.is_done)}
                                                                            disabled={togglingId === act.id || !canWriteMilestone}
                                                                            onChange={() => handleToggleActivity(act)}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center font-monospace fw-bold text-muted">
                                                                        Blok {idx + 1}
                                                                    </td>
                                                                    <td className="font-monospace fw-bold text-primary">
                                                                        {String(act.time_start).slice(0, 5)} - {String(act.time_end).slice(0, 5)}
                                                                    </td>
                                                                    <td className="text-center font-monospace">
                                                                        <span className="badge bg-light text-dark border">
                                                                            {hrs > 0 ? formatHoursLabel(hrs) : '—'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div className={`fw-semibold ${act.is_done ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                                                            {act.activity}
                                                                        </div>
                                                                        {hasNote && (
                                                                            <div className="mt-1 px-2 py-1 rounded border small" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                                                                                <strong>Note / Teguran PM:</strong> {act.notes}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-muted small">
                                                                        {act.target_output || '—'}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className={`badge ${act.is_done ? 'bg-success text-white' : 'bg-light text-dark border'}`}>
                                                                            {act.is_done ? 'Selesai' : 'Proses'}
                                                                        </span>
                                                                    </td>
                                                                    {isManager && (
                                                                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                type="button"
                                                                                className={`btn btn-sm px-2 py-0.5 fw-semibold ${hasNote ? 'btn-outline-danger' : 'btn-outline-warning text-dark'}`}
                                                                                onClick={() => handleOpenNoteModal(act, activeMilestone)}
                                                                            >
                                                                                {hasNote ? 'Edit Note' : '+ Note'}
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================
                BAGIAN 2: JURNAL VOLUME PROGRES KONTRAK (DI)
                ============================================================ */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <h6 className="fw-bold text-dark mb-0">Jurnal Volume Progres Harian (Kontrak DI)</h6>
                    <div style={{ minWidth: '240px' }}>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Cari tanggal, lingkup scope, atau tim..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ borderRadius: 'var(--pcm-radius-control)' }}
                        />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.85rem', borderColor: '#cbd5e1' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            <tr>
                                <th className="ps-3 py-3" style={{ width: '130px' }}>Tanggal</th>
                                <th className="py-3">Scope Pekerjaan</th>
                                <th className="py-3 text-end" style={{ width: '150px' }}>Volume Harian</th>
                                <th className="py-3" style={{ width: '160px' }}>Tim Pelaksana</th>
                                <th className="py-3 text-muted" style={{ width: '170px' }}>Waktu Input</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        Memuat data jurnal progres harian...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        Belum ada catatan progres harian yang diinput.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((l, idx) => (
                                    <tr key={l.id || idx}>
                                        <td className="ps-3 font-monospace fw-bold text-dark">{l.prog_date}</td>
                                        <td className="fw-semibold text-primary">{l.scope}</td>
                                        <td className="text-end font-monospace fw-bold text-success">
                                            +{parseFloat(l.qty).toLocaleString('id-ID')}
                                        </td>
                                        <td>
                                            <span className="badge px-2.5 py-1 text-dark border font-monospace" style={{ backgroundColor: '#f1f5f9' }}>
                                                {l.team || 'PMO'}
                                            </span>
                                        </td>
                                        <td className="text-muted small">
                                            {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rekap Output Lapangan Harian (Construction Sync) */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--pcm-radius-card)', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark mb-0">Rekap Produksi Fit-Up &amp; Welding Harian (Otomatis dari Construction)</h6>
                    <span className="badge px-2.5 py-1 fw-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 'var(--pcm-radius-chip)' }}>
                        Cross-Dept Sync
                    </span>
                </div>
                <div className="table-responsive">
                    <table className="table table-bordered table-sm table-hover align-middle mb-0" style={{ fontSize: '0.84rem', borderColor: '#cbd5e1' }}>
                        <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                            <tr>
                                <th className="ps-3 py-2">Tanggal</th>
                                <th className="py-2 text-end">Joint Fit-Up</th>
                                <th className="py-2 text-end">Joint Welded</th>
                                <th className="pe-3 py-2 text-end">Total Dia-Inch Las</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jointDailyRecap.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-3 text-muted">
                                        Belum ada tanggal Fit-Up / Welding tercatat pada Construction Joints proyek ini.
                                    </td>
                                </tr>
                            ) : (
                                jointDailyRecap.map(r => (
                                    <tr key={r.date}>
                                        <td className="ps-3 font-monospace fw-bold text-dark">{r.date}</td>
                                        <td className="text-end font-monospace">{r.fitCount.toLocaleString('id-ID')} joints</td>
                                        <td className="text-end font-monospace text-primary fw-bold">{r.weldCount.toLocaleString('id-ID')} joints</td>
                                        <td className="pe-3 text-end font-monospace text-success fw-bold">
                                            {r.weldDI.toLocaleString('id-ID', { maximumFractionDigits: 1 })} DI
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL ATUR / ISI TIMESHEET HARIAN 8 JAM (BLOK 2 JAM) */}
            {showTimesheetModal && tsMilestone && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', zIndex: 1065 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <form onSubmit={handleSaveTimesheetDay}>
                                <div className="modal-header border-bottom">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">
                                            Timesheet Harian &mdash; {tsMilestone.code} {tsMilestone.name}
                                        </h5>
                                        <div className="small text-muted mt-1">
                                            Pekerja: <strong className="text-dark">{tsMilestone.user?.name || tsMilestone.pic_lead || 'PIC'}</strong> &bull;{' '}
                                            Target: <strong>{tsMilestone.work_hours_per_day || 8} Jam / Hari</strong> ({tsTotalDays} Hari)
                                        </div>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowTimesheetModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    {tsError && (
                                        <div className="alert alert-danger py-2 small mb-3">{tsError}</div>
                                    )}

                                    <div className="pcm-modal row g-3 p-3 border rounded bg-light mb-3">
                                        <div className="col-12 col-md-7">
                                            <label className="form-label small fw-bold">Milestone Terpilih</label>
                                            <PcmSelect
                                                key="modal-ts-milestone"
                                                searchable={false}
                                                clearable={false}
                                                value={tsMilestoneId}
                                                onChange={(e) => {
                                                    const next = milestones.find(m => String(m.id) === String(e.target.value));
                                                    setTsMilestoneId(e.target.value);
                                                    setTsDay(1);
                                                    loadSlotsIntoTimesheetModal(next, 1);
                                                }}
                                            >
                                                {milestones.map(m => (
                                                    <option key={m.id} value={String(m.id)}>
                                                        {`[${m.code}] ${m.name} (${m.user?.name || m.pic_lead || 'PIC'})`}
                                                    </option>
                                                ))}
                                            </PcmSelect>
                                        </div>
                                        <div className="col-12 col-md-5">
                                            <label className="form-label small fw-bold">Hari ke-</label>
                                            <PcmSelect
                                                key="modal-ts-day"
                                                searchable={false}
                                                clearable={false}
                                                value={String(tsDay)}
                                                onChange={(e) => {
                                                    const d = Number(e.target.value) || 1;
                                                    setTsDay(d);
                                                    loadSlotsIntoTimesheetModal(tsMilestone, d);
                                                }}
                                            >
                                                {Array.from({ length: tsTotalDays }, (_, i) => i + 1).map(d => {
                                                    const dStr = tsMilestone.start_date ? ` (${addDaysIso(tsMilestone.start_date, d - 1)})` : '';
                                                    return (
                                                        <option key={d} value={String(d)}>{`Hari ke-${d}${dStr}`}</option>
                                                    );
                                                })}
                                            </PcmSelect>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 p-2 bg-light border rounded">
                                        <div className="d-flex flex-wrap align-items-center gap-2">
                                            <span className="fw-bold small text-dark">
                                                Rincian Hari ke-{tsDay}:
                                            </span>
                                            {(() => {
                                                const target = Number(tsMilestone.work_hours_per_day) || 8;
                                                const diff = Math.round((tsCurrentHours - target) * 10) / 10;
                                                const cls = Math.abs(diff) < 0.05 ? 'bg-success text-white' : diff < 0 ? 'bg-warning text-dark' : 'bg-danger text-white';
                                                const lbl = Math.abs(diff) < 0.05
                                                    ? `Lengkap ${formatHoursLabel(target)}`
                                                    : diff < 0
                                                        ? `Sisa ${formatHoursLabel(Math.abs(diff))}`
                                                        : `Lebih ${formatHoursLabel(diff)}`;
                                                return (
                                                    <>
                                                        <span className="badge bg-white text-dark border font-monospace">
                                                            Terjadwal: {formatHoursLabel(tsCurrentHours)} / {formatHoursLabel(target)} ({tsSlots.length} blok)
                                                        </span>
                                                        <span className={`badge font-monospace ${cls}`}>{lbl}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div className="d-flex flex-wrap gap-2">
                                            <button type="button" className="btn btn-outline-primary btn-sm fw-semibold" onClick={handleTsSplit2Hours}>
                                                Bagi Blok 2 Jam ({tsMilestone.work_hours_per_day || 8} Jam)
                                            </button>
                                            <button type="button" className="btn btn-primary btn-sm fw-bold" style={{ backgroundColor: '#1e40af' }} onClick={handleTsAddBlock}>
                                                + Tambah Blok
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="table table-bordered table-sm align-middle mb-0" style={{ borderColor: '#cbd5e1' }}>
                                            <thead className="table-light small text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                                                <tr>
                                                    <th className="text-center" style={{ width: '48px' }}>Blok</th>
                                                    <th style={{ width: '115px' }}>Jam Mulai</th>
                                                    <th style={{ width: '115px' }}>Jam Selesai</th>
                                                    <th className="text-center" style={{ width: '80px' }}>Durasi</th>
                                                    <th>Kerjakan Apa Saja *</th>
                                                    <th style={{ width: '175px' }}>Target Output</th>
                                                    <th className="text-center" style={{ width: '54px' }}>Hapus</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tsSlots.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="text-center py-3 text-muted small">
                                                            Belum ada blok jam. Klik "Bagi Blok 2 Jam" untuk membagi {tsMilestone.work_hours_per_day || 8} jam otomatis.
                                                        </td>
                                                    </tr>
                                                ) : tsSlots.map((slot, idx) => {
                                                    const hrs = calcSlotHours(slot.time_start, slot.time_end);
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="text-center font-monospace fw-bold text-muted">{idx + 1}</td>
                                                            <td>
                                                                <PcmSelect
                                                                    searchable={false}
                                                                    clearable={false}
                                                                    value={slot.time_start}
                                                                    onChange={(e) => setTsSlots(prev => prev.map((r, i) => i === idx ? { ...r, time_start: e.target.value } : r))}
                                                                >
                                                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    {!TIME_SLOTS.includes(slot.time_start) && <option value={slot.time_start}>{slot.time_start}</option>}
                                                                </PcmSelect>
                                                            </td>
                                                            <td>
                                                                <PcmSelect
                                                                    searchable={false}
                                                                    clearable={false}
                                                                    value={slot.time_end}
                                                                    onChange={(e) => setTsSlots(prev => prev.map((r, i) => i === idx ? { ...r, time_end: e.target.value } : r))}
                                                                >
                                                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    {!TIME_SLOTS.includes(slot.time_end) && <option value={slot.time_end}>{slot.time_end}</option>}
                                                                </PcmSelect>
                                                            </td>
                                                            <td className="text-center font-monospace">
                                                                <span className={`badge border ${hrs > 0 ? 'bg-light text-primary' : 'bg-danger-subtle text-danger'}`}>
                                                                    {hrs > 0 ? formatHoursLabel(hrs) : 'Invalid'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    placeholder="Contoh: Fit-up & tack weld spool Line MPP-AB"
                                                                    value={slot.activity}
                                                                    onChange={(e) => setTsSlots(prev => prev.map((r, i) => i === idx ? { ...r, activity: e.target.value } : r))}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    placeholder="Misal: 4 Joint"
                                                                    value={slot.target_output || ''}
                                                                    onChange={(e) => setTsSlots(prev => prev.map((r, i) => i === idx ? { ...r, target_output: e.target.value } : r))}
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger btn-sm px-2 py-0.5"
                                                                    onClick={() => setTsSlots(prev => prev.filter((_, i) => i !== idx))}
                                                                    title="Hapus blok jam"
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
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowTimesheetModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }} disabled={tsSaving}>
                                        {tsSaving ? 'Menyimpan...' : `Simpan Timesheet Hari ke-${tsDay}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Note / Teguran Project Manager per Blok Jam */}
            {noteModalItem && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 'var(--pcm-radius-card)' }}>
                            <form onSubmit={(e) => handleSaveNote(e)}>
                                <div className="modal-header border-bottom">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">Note / Teguran Project Manager</h5>
                                        <div className="small text-muted mt-1">
                                            {noteModalItem.milestone?.user?.name || noteModalItem.milestone?.pic_lead || 'Pekerja'} &bull;{' '}
                                            Hari ke-{noteModalItem.day_number} ({String(noteModalItem.time_start).slice(0, 5)} - {String(noteModalItem.time_end).slice(0, 5)})
                                        </div>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setNoteModalItem(null)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    {noteError && (
                                        <div className="alert alert-danger py-2 small mb-3">{noteError}</div>
                                    )}
                                    <div className="p-3 rounded border bg-light mb-3 small">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="fw-bold text-dark">Aktivitas Blok Ini:</span>
                                            <span className={`badge ${noteModalItem.is_done ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                                                {noteModalItem.is_done ? 'Di sistem: Selesai' : 'Di sistem: Proses'}
                                            </span>
                                        </div>
                                        <div className="text-dark">{noteModalItem.activity}</div>
                                    </div>

                                    <div className="mb-2">
                                        <span className="form-label small fw-bold d-block">Template Cepat Teguran Lapangan:</span>
                                        <div className="d-flex flex-wrap gap-1">
                                            {[
                                                'Progres di sistem penuh/selesai, namun hasil di lapangan belum beres. Segera selesaikan!',
                                                'Cek lapangan tidak sesuai target blok 2 jam ini. Mohon perbaiki.',
                                                'Output belum memenuhi standar QA/QC, lanjutkan perbaikan.',
                                            ].map((tpl, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm text-start"
                                                    style={{ fontSize: '0.74rem', whiteSpace: 'normal', maxWidth: '100%', lineHeight: 1.35 }}
                                                    onClick={() => setNoteText(tpl)}
                                                >
                                                    {tpl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="form-label small fw-bold">Isi Catatan / Note Teguran PM</label>
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows={3}
                                            placeholder="Contoh: Di sistem 2 jam pertama sudah selesai, tapi cek lapangan jam 10:00 spool belum fit-up. Segera selesaikan."
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light d-flex justify-content-between">
                                    {noteModalItem.notes ? (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            disabled={noteSaving}
                                            onClick={() => handleSaveNote(null, '')}
                                        >
                                            Hapus Note
                                        </button>
                                    ) : <div />}
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setNoteModalItem(null)}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn btn-danger btn-sm fw-bold px-3" disabled={noteSaving}>
                                            {noteSaving ? 'Menyimpan...' : 'Simpan Note Teguran'}
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
