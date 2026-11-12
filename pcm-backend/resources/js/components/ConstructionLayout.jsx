import React, { useState, useMemo, useCallback } from 'react';
import { can } from '../auth';
import { FabricationTab } from './FabricationTab';
import { ProjectGuard } from './ProjectGuard';

export function ConstructionLayout({ projects, joints, user, onReload, activeProjectId, onSetActiveProject, onSelectTab }) {
    const [search, setSearch] = useState('');

    const canEdit = can(user, 'joint.write');

    const activeProject = useMemo(() => {
        return projects.find((p) => String(p.id) === String(activeProjectId)) || null;
    }, [projects, activeProjectId]);

    const filteredJoints = useMemo(() => {
        let items = joints || [];
        if (activeProjectId) {
            items = items.filter(j => {
                const jointProjectId = j.project_id ? String(j.project_id) : '';
                return jointProjectId === String(activeProjectId)
                    || (!j.project_id && activeProjectId === String((projects[0]?.id)));
            });
        }
        const q = search.toLowerCase();
        return items.filter(j => {
            if (!q) return true;
            return (j.drawing_no || '').toLowerCase().includes(q)
                || (j.line_no || '').toLowerCase().includes(q)
                || (j.spool_no || '').toLowerCase().includes(q)
                || String(j.seq || '').includes(q);
        });
    }, [joints, activeProjectId, search, projects]);

    if (!activeProjectId) {
        return (
            <ProjectGuard
                sectionLabel="Construction Shop"
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={onSetActiveProject}
                onOpenProjectList={() => onSelectTab?.('construction_project_list')}
            />
        );
    }

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="fw-bold text-dark mb-1">
                        Construction — {activeProject?.name || activeProject?.job_no || `Project #${activeProjectId}`}
                    </h3>
                    <p className="text-muted mb-0">
                        Proyek konstruksi piping aktif · Joint: {filteredJoints.length}
                    </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <select
                        className="form-select form-select-sm"
                        style={{ width: '240px' }}
                        value={activeProjectId}
                        onChange={(e) => onSetActiveProject(e.target.value)}
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.job_no || `Project #${p.id}`}
                            </option>
                        ))}
                    </select>
                    <input
                        type="search"
                        className="form-control form-control-sm"
                        style={{ width: '220px' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari drawing, line, spool, seq..."
                        aria-label="Cari joint Construction"
                    />
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => onSetActiveProject('')}
                    >
                        Ganti Project
                    </button>
                    {!canEdit && (
                        <span className="badge bg-light text-muted border p-2">
                            Mode Baca (Akses edit: Construction / Manager)
                        </span>
                    )}
                </div>
            </div>

            <FabricationTab
                joints={filteredJoints}
                user={user}
                onReload={onReload}
                activeProjectId={activeProjectId}
            />
        </div>
    );
}
