import React from 'react';
import { ProjectListSection as SharedProjectListSection } from '../material/ProjectListSection';

export function QaqcProjectListSection(props) {
    return (
        <SharedProjectListSection
            {...props}
            description="Pilih satu project untuk membuka data inspeksi QA/QC. Data joint, visual check, dan hasil pengujian NDT hanya ditampilkan untuk project yang dipilih."
        />
    );
}
