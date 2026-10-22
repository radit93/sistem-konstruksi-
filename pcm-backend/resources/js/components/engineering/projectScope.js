import { useEffect, useState } from 'react';

/**
 * Saat user sudah masuk ke satu folder proyek, data tidak boleh lintas proyek.
 * activeProjectId bisa berupa id proyek, string "unassigned", atau kosong.
 */
export function isProjectLocked(activeProjectId) {
    return Boolean(activeProjectId && activeProjectId !== 'ALL');
}

export function projectScopeKey(activeProjectId, filterProject) {
    return isProjectLocked(activeProjectId)
        ? String(activeProjectId)
        : String(filterProject || 'ALL');
}

export function rowMatchesProject(row, activeProjectId, filterProject) {
    const scope = projectScopeKey(activeProjectId, filterProject);
    if (scope === 'ALL') return true;
    if (scope === 'unassigned') return !row?.project_id;
    return String(row?.project_id) === scope;
}

export function scopeRows(rows, activeProjectId, filterProject) {
    return (Array.isArray(rows) ? rows : [])
        .filter((row) => rowMatchesProject(row, activeProjectId, filterProject));
}

export function defaultProjectId(activeProjectId, filterProject, projects = []) {
    const scope = projectScopeKey(activeProjectId, filterProject);
    if (scope === 'unassigned') return '';
    if (scope !== 'ALL') return scope;
    return projects[0]?.id != null ? String(projects[0].id) : '';
}

/**
 * filterProject tetap dipakai untuk dropdown saat belum masuk proyek.
 * Begitu activeProjectId terisi, filter dipaksa ke proyek tersebut.
 */
export function useProjectFilter(activeProjectId) {
    const [filterProject, setFilterProject] = useState(
        () => (isProjectLocked(activeProjectId) ? String(activeProjectId) : 'ALL')
    );

    useEffect(() => {
        setFilterProject(isProjectLocked(activeProjectId) ? String(activeProjectId) : 'ALL');
    }, [activeProjectId]);

    return [filterProject, setFilterProject];
}
