import React from 'react';
import { BoqContractSection } from './pm/BoqContractSection';
import { SCurveSection } from './pm/SCurveSection';
import { BudgetCostSection } from './pm/BudgetCostSection';
import { DailyLogSection } from './pm/DailyLogSection';
import { MilestoneSection } from './pm/MilestoneSection';
import { ExecutiveReportSection } from './pm/ExecutiveReportSection';

export function ProjectManagerTab({
    currentSection = 'schedule',
    scopes = [],
    joints = [],
    stockMoves = [],
    overview = null,
    user,
    onReload
}) {
    return (
        <div className="container-fluid px-4 py-4">
            {currentSection === 'schedule' && (
                <BoqContractSection scopes={scopes} user={user} onReload={onReload} />
            )}
            {currentSection === 'pm_scurve' && (
                <SCurveSection scopes={scopes} user={user} />
            )}
            {currentSection === 'pm_budget' && (
                <BudgetCostSection user={user} onToast={onReload} />
            )}
            {currentSection === 'pm_daily' && (
                <DailyLogSection scopes={scopes} user={user} onReload={onReload} />
            )}
            {currentSection === 'pm_milestone' && (
                <MilestoneSection user={user} onToast={onReload} />
            )}
            {currentSection === 'report' && (
                <ExecutiveReportSection
                    overview={overview}
                    joints={joints}
                    stockMoves={stockMoves}
                    scopes={scopes}
                    user={user}
                />
            )}
        </div>
    );
}
