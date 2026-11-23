import React from 'react';
import { ProjectListSection as SharedProjectListSection } from '../material/ProjectListSection';

export function ProjectListSection(props) {
    return (
        <SharedProjectListSection
            {...props}
            description="Pilih satu project untuk membuka data Construction Shop dan Field Erection. Data joint dan progres konstruksi hanya ditampilkan untuk project yang dipilih."
        />
    );
}
