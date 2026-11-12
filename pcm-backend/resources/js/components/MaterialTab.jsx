import React from 'react';
import { PcmSelect } from './SearchSelect';
import { isProjectLocked, useProjectFilter } from './engineering/projectScope';
import { MaterialRequirementSection } from './material/MaterialRequirementSection';
import { MaterialReceivingSection } from './material/MaterialReceivingSection';
import { MaterialInspectionSection } from './material/MaterialInspectionSection';
import { MaterialStoringSection } from './material/MaterialStoringSection';
import { WarehousingSection } from './material/WarehousingSection';
import { OpenYardSection } from './material/OpenYardSection';
import { MaterialIssuingSection } from './material/MaterialIssuingSection';

export function MaterialTab({
    currentSection = 'material',
    stockMoves = [],
    projects = [],
    activeProject = null,
    activeProjectId = '',
    onSetActiveProject,
    user,
    onReload,
}) {
    // Sama seperti modul Engineering: begitu masuk satu project (workspace),
    // semua halaman material terkunci ke project itu. Kalau belum masuk,
    // user memilih project lewat dropdown di bar bawah ini.
    const [filterProject, setFilterProject] = useProjectFilter(activeProjectId);
    const projectLocked = isProjectLocked(activeProjectId);

    const projectLabel = activeProject
        ? `${activeProject.name || 'Project'}${activeProject.job_no ? ` • JOB ${activeProject.job_no}` : ''}`
        : '';

    const sectionProps = {
        user,
        onToast: onReload,
        projects,
        activeProjectId,
        filterProject,
    };

    return (
        <div className="container-fluid px-4 py-4">
            {/* Project scope bar: konteks data material selalu terlihat */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span
                            className="text-muted fw-bold text-uppercase"
                            style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}
                        >
                            Project
                        </span>

                        {projectLocked ? (
                            <>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                    {projectLabel || 'Project aktif'}
                                </span>
                                <span className="text-muted small">
                                    Data material terkunci ke project ini.
                                </span>
                                {onSetActiveProject && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link p-0 ms-1 text-decoration-none"
                                        onClick={() => onSetActiveProject('')}
                                    >
                                        Ganti Project
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <PcmSelect
                                    value={filterProject}
                                    onChange={(e) => setFilterProject(e.target.value)}
                                    style={{ width: 'auto', minWidth: '260px' }}
                                    searchable={false}
                                    aria-label="Pilih project data material"
                                >
                                    <option value="ALL">Semua Project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.client ? `[${project.client}] ` : ''}
                                            {project.name}
                                            {project.job_no ? ` (JOB: ${project.job_no})` : ''}
                                        </option>
                                    ))}
                                </PcmSelect>
                                <span className="text-muted small">
                                    Pilih project untuk memfilter data; data baru mengikuti project yang dipilih.
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {(currentSection === 'material' || currentSection === 'mat_storing') && (
                <MaterialStoringSection {...sectionProps} />
            )}
            {currentSection === 'mat_requirement' && (
                <MaterialRequirementSection {...sectionProps} />
            )}
            {currentSection === 'mat_receiving' && (
                <MaterialReceivingSection {...sectionProps} />
            )}
            {currentSection === 'mat_inspection' && (
                <MaterialInspectionSection {...sectionProps} />
            )}
            {currentSection === 'mat_warehouse' && (
                <WarehousingSection {...sectionProps} />
            )}
            {currentSection === 'mat_openyard' && (
                <OpenYardSection {...sectionProps} />
            )}
            {currentSection === 'mat_issuing' && (
                <MaterialIssuingSection {...sectionProps} />
            )}
        </div>
    );
}
