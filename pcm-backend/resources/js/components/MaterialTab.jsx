import React from 'react';
import { ProjectGuard } from './ProjectGuard';
import { ProjectListSection } from './material/ProjectListSection';
import { MaterialRequirementSection } from './material/MaterialRequirementSection';
import { MaterialReceivingSection } from './material/MaterialReceivingSection';
import { MaterialInspectionSection } from './material/MaterialInspectionSection';
import { MaterialStoringSection } from './material/MaterialStoringSection';
import { WarehousingSection } from './material/WarehousingSection';
import { OpenYardSection } from './material/OpenYardSection';
import { MaterialIssuingSection } from './material/MaterialIssuingSection';
import { MaterialInventorySection } from './material/MaterialInventorySection';

const SECTION_LABELS = {
    material: 'Material Storing',
    mat_storing: 'Material Storing',
    mat_requirement: 'Kebutuhan Material',
    mat_receiving: 'Material Receiving',
    mat_inspection: 'Material Inspection',
    mat_warehouse: 'Warehousing (Indoor)',
    mat_openyard: 'Open Yard Storage',
    mat_issuing: 'Material Issuing',
    mat_inventory: 'Return & Stock Adjustment',
};

export function MaterialTab({
    currentSection = 'material',
    stockMoves = [],
    projects = [],
    activeProject = null,
    activeProjectId = '',
    onSetActiveProject,
    onSelectTab,
    user,
    onReload,
}) {
    /* Material memakai konteks project yang sama dengan Engineering.
       Tanpa project aktif, data stok/penerimaan/pengeluaran tidak dimuat
       sama sekali supaya tidak tercampur antar project. */
    const projectId = activeProjectId ? String(activeProjectId) : '';
    const hasProject = projectId !== '';

    const projectLabel = activeProject
        ? `${activeProject.name || 'Project'}${activeProject.job_no ? ` • JOB ${activeProject.job_no}` : ''}`
        : '';

    /* Halaman Project List milik Material: tetap bisa dibuka walau belum ada
       project aktif, karena dari sinilah project dipilih. */
    if (currentSection === 'mat_project_list') {
        return (
            <div className="container-fluid px-4 py-4">
                <ProjectListSection
                    projects={projects}
                    activeProjectId={projectId}
                    onSelectProject={(id) => {
                        if (onSetActiveProject) onSetActiveProject(id);
                        if (onSelectTab) onSelectTab('mat_storing');
                    }}
                />
            </div>
        );
    }

    if (!hasProject) {
        return (
            <div className="container-fluid px-4 py-4">
                <ProjectGuard
                    sectionLabel={SECTION_LABELS[currentSection] || 'Material Control'}
                    projects={projects}
                    activeProjectId=""
                    description="Material Control (stok, penerimaan, inspeksi, penyimpanan, dan pengeluaran) hanya menampilkan data dari satu project. Pilih project dulu supaya stok dan pengeluaran tidak tercampur antar project."
                    onSelectProject={(id) => {
                        if (onSetActiveProject) onSetActiveProject(id || '');
                    }}
                    onOpenProjectList={() => {
                        if (onSelectTab) onSelectTab('mat_project_list');
                    }}
                />
            </div>
        );
    }

    const sectionProps = {
        user,
        onToast: onReload,
        projects,
        activeProjectId: projectId,
        filterProject: projectId,
    };

    return (
        <div className="container-fluid px-4 py-4">
            {/* Project context bar: selalu terlihat, data terkunci ke project ini */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span
                            className="text-muted fw-bold text-uppercase"
                            style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}
                        >
                            Project
                        </span>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                            {projectLabel || `Project #${projectId}`}
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
            {currentSection === 'mat_inventory' && (
                <MaterialInventorySection {...sectionProps} />
            )}
        </div>
    );
}
