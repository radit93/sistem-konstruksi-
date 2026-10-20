import React from 'react';
import { MaterialReceivingSection } from './material/MaterialReceivingSection';
import { MaterialInspectionSection } from './material/MaterialInspectionSection';
import { MaterialStoringSection } from './material/MaterialStoringSection';
import { WarehousingSection } from './material/WarehousingSection';
import { OpenYardSection } from './material/OpenYardSection';
import { MaterialIssuingSection } from './material/MaterialIssuingSection';

export function MaterialTab({
    currentSection = 'material',
    stockMoves = [],
    user,
    onReload
}) {
    return (
        <div className="container-fluid px-4 py-4">
            {(currentSection === 'material' || currentSection === 'mat_storing') && (
                <MaterialStoringSection user={user} onToast={onReload} />
            )}
            {currentSection === 'mat_receiving' && (
                <MaterialReceivingSection user={user} onToast={onReload} />
            )}
            {currentSection === 'mat_inspection' && (
                <MaterialInspectionSection user={user} onToast={onReload} />
            )}
            {currentSection === 'mat_warehouse' && (
                <WarehousingSection user={user} onToast={onReload} />
            )}
            {currentSection === 'mat_openyard' && (
                <OpenYardSection user={user} onToast={onReload} />
            )}
            {currentSection === 'mat_issuing' && (
                <MaterialIssuingSection user={user} onToast={onReload} />
            )}
        </div>
    );
}
