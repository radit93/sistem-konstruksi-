import React, { useMemo, useState } from 'react';
import { PcmSelect } from '../SearchSelect';

function IconSearch() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" />
        </svg>
    );
}

function IconFolder() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
    );
}

/**
 * Direktori project khusus modul Material Control.
 * Memilih baris di sini menetapkan project aktif untuk seluruh modul
 * (Material, Engineering, PM) sehingga data tidak tercampur.
 */
export function ProjectListSection({
    projects = [],
    activeProjectId = '',
    loading = false,
    onSelectProject,
    description = 'Pilih satu project untuk membuka data Material Control. Data stok, penerimaan, dan pengeluaran hanya ditampilkan untuk project yang dipilih.',
}) {
    const [search, setSearch] = useState('');
    const [filterClient, setFilterClient] = useState('ALL');

    const clientOptions = useMemo(() => {
        return Array.from(
            new Set((projects || []).map((project) => (project.client || '').trim()).filter(Boolean))
        ).sort();
    }, [projects]);

    const filteredProjects = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (projects || []).filter((project) => {
            const matchClient = filterClient === 'ALL'
                || (project.client || '').toLowerCase() === filterClient.toLowerCase();
            const matchSearch = !query
                || (project.name || '').toLowerCase().includes(query)
                || (project.client || '').toLowerCase().includes(query)
                || (project.job_no || '').toLowerCase().includes(query);
            return matchClient && matchSearch;
        });
    }, [projects, search, filterClient]);

    const activeProject = useMemo(
        () => (projects || []).find((project) => String(project.id) === String(activeProjectId)) || null,
        [projects, activeProjectId]
    );

    return (
        <div>
            <div className="mb-4">
                <h2 className="h3 fw-bolder text-dark mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Project List
                </h2>
                <p className="text-muted small mb-0">
                    {description}
                </p>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-6 col-lg-4">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Total Projects</span>
                        <strong className="pcm-tile__value">
                            {projects.length}
                            <span className="pcm-tile__unit">projects</span>
                        </strong>
                    </div>
                </div>
                <div className="col-6 col-lg-4">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Clients</span>
                        <strong className="pcm-tile__value">
                            {clientOptions.length}
                            <span className="pcm-tile__unit">clients</span>
                        </strong>
                    </div>
                </div>
                <div className="col-12 col-lg-4">
                    <div className="pcm-tile">
                        <span className="pcm-tile__label">Active Project</span>
                        <strong className="pcm-tile__value pcm-tile__value--primary" style={{ fontSize: '1rem' }}>
                            {activeProject
                                ? (activeProject.job_no ? `[${activeProject.job_no}] ${activeProject.name}` : activeProject.name)
                                : 'Belum dipilih'}
                        </strong>
                    </div>
                </div>
            </div>

            <div className="pcm-toolbar mb-4">
                <div className="pcm-toolbar__grow">
                    <div className="pcm-search">
                        <span className="pcm-search__icon"><IconSearch /></span>
                        <input
                            type="text"
                            className="form-control form-control-sm pcm-filter-input"
                            placeholder="Cari nama project, client, atau job no..."
                            aria-label="Cari project"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <PcmSelect
                        aria-label="Filter client"
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value)}
                    >
                        <option value="ALL">Semua Client ({clientOptions.length})</option>
                        {clientOptions.map((client) => (
                            <option key={client} value={client}>Client: {client}</option>
                        ))}
                    </PcmSelect>
                </div>
                <span className="pcm-count">
                    Menampilkan <strong>{filteredProjects.length}</strong> dari {projects.length} project
                </span>
            </div>

            {loading && projects.length === 0 && (
                <div className="pcm-state" role="status" aria-live="polite">
                    <span className="spinner-border spinner-border-sm text-primary mb-2" aria-hidden="true" />
                    <p className="pcm-state__title">Memuat daftar project</p>
                    <p className="pcm-state__text">Mengambil data project dari server.</p>
                </div>
            )}

            {!loading && projects.length === 0 && (
                <div className="pcm-state">
                    <span className="pcm-state__icon"><IconFolder /></span>
                    <h2 className="pcm-state__title">Belum ada project</h2>
                    <p className="pcm-state__text">
                        Buat folder project baru di modul Project List (Engineering) atau Project Manager.
                    </p>
                </div>
            )}

            {projects.length > 0 && (
                <div className="pcm-card">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle pcm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col" className="text-center" style={{ width: '140px' }}>
                                        <span className="pcm-th-title">Job No</span>
                                    </th>
                                    <th scope="col" className="text-start ps-3" style={{ minWidth: '260px' }}>
                                        <span className="pcm-th-title">Project Name</span>
                                    </th>
                                    <th scope="col" className="text-start ps-3" style={{ minWidth: '200px' }}>
                                        <span className="pcm-th-title">Client</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '150px' }}>
                                        <span className="pcm-th-title">Status</span>
                                    </th>
                                    <th scope="col" className="text-center" style={{ width: '125px' }}>
                                        <span className="pcm-th-title">Action</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-5 text-center">
                                            <div className="pcm-state border-0 bg-transparent py-3">
                                                <p className="pcm-state__title">Tidak ada project yang cocok</p>
                                                <p className="pcm-state__text mb-3">
                                                    Ubah kata kunci pencarian atau filter client.
                                                </p>
                                                {search && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => setSearch('')}
                                                    >
                                                        Hapus Pencarian
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredProjects.map((project) => {
                                    const isActive = String(project.id) === String(activeProjectId);
                                    return (
                                        <tr
                                            key={project.id}
                                            onClick={() => onSelectProject && onSelectProject(project.id)}
                                            style={{ cursor: 'pointer', backgroundColor: isActive ? '#f0f7ff' : undefined }}
                                        >
                                            <td className="text-center">
                                                <span
                                                    className={`pcm-chip ${isActive ? 'pcm-chip--primary' : 'pcm-chip--neutral'} pcm-code`}
                                                    style={{ fontSize: '0.75rem', padding: '0.18rem 0.55rem' }}
                                                >
                                                    {project.job_no || 'NO JOB'}
                                                </span>
                                            </td>
                                            <td className="text-start ps-3">
                                                <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                                                    {project.name || `Project #${project.id}`}
                                                </div>
                                            </td>
                                            <td className="text-start ps-3">
                                                <span className="fw-semibold" style={{ fontSize: '0.84rem', color: '#334155' }}>
                                                    {project.client || 'General Client'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`pcm-chip ${isActive ? 'pcm-chip--success' : 'pcm-chip--neutral'}`}>
                                                    {isActive ? 'ACTIVE' : 'OPEN'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm fw-bold px-3 py-1"
                                                    style={{
                                                        backgroundColor: '#1e40af',
                                                        borderColor: '#1d4ed8',
                                                        color: '#ffffff',
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onSelectProject) onSelectProject(project.id);
                                                    }}
                                                >
                                                    Buka
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
        </div>
    );
}
