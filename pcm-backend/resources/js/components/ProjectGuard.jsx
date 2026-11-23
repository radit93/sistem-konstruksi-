import React from 'react';
import { PcmSelect } from './SearchSelect';

/* -------------------------------------------------------------------------
 * ProjectGuard
 * Satu layar penjaga untuk modul yang datanya terisolasi per project.
 * Dipakai saat user membuka modul tanpa konteks project: data tidak
 * ditampilkan sama sekali, user diarahkan ke Project List.
 * ---------------------------------------------------------------------- */

function IconLock() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 118 0v3" />
            <path d="M12 15v2.5" />
        </svg>
    );
}

export function ProjectGuard({
    sectionLabel = 'Modul ini',
    projects = [],
    activeProjectId = '',
    onSelectProject,
    onOpenProjectList,
    description,
    loading = false,
}) {
    const hasProjects = Array.isArray(projects) && projects.length > 0;

    return (
        <div
            className="bg-white border rounded-3 shadow-sm p-4 p-md-5"
            role="region"
            aria-label="Pilih project terlebih dahulu"
        >
            <div className="d-flex flex-column flex-md-row align-items-md-start gap-3 gap-md-4">
                <div
                    className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                >
                    <IconLock />
                </div>

                <div className="flex-grow-1 min-w-0">
                    <span
                        className="d-block text-uppercase text-primary fw-bold mb-1"
                        style={{ fontSize: '0.6875rem', letterSpacing: '0.08em' }}
                    >
                        Project Guard
                    </span>
                    <h2 className="h5 fw-bold text-dark mb-2">Pilih Project Terlebih Dahulu</h2>
                    <p className="text-secondary mb-3" style={{ maxWidth: '760px' }}>
                        {description
                            || `${sectionLabel} hanya menampilkan data dari satu project. Data baru tidak dimuat sebelum project dipilih, supaya tidak tercampur antar project.`}
                    </p>

                    <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
                        <button
                            type="button"
                            className="btn btn-primary fw-bold px-3 py-2"
                            style={{ backgroundColor: '#1e40af', borderColor: '#1d4ed8' }}
                            onClick={onOpenProjectList}
                        >
                            Buka Project List
                        </button>

                        {onSelectProject && hasProjects && (
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small text-nowrap">atau pilih cepat:</span>
                                <PcmSelect
                                    value={activeProjectId || ''}
                                    onChange={(e) => onSelectProject(e.target.value)}
                                    style={{ width: 'auto', minWidth: '240px' }}
                                    aria-label="Pilih project"
                                >
                                    <option value="">-- Pilih Project --</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.job_no ? `[${project.job_no}] ` : ''}
                                            {project.name || `Project #${project.id}`}
                                        </option>
                                    ))}
                                </PcmSelect>
                            </div>
                        )}

                        {!hasProjects && (
                            <span className="text-muted small">
                                {loading
                                    ? 'Memuat daftar project...'
                                    : 'Belum ada project. Buat folder project baru di Project List.'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
