'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Button } from '@/components/ui/button';
import { ChevronRight, Shield, RotateCcw } from 'lucide-react';

interface StepItem {
  id: number;
  title: string;
  subtitle: string;
}

interface SidebarProps {
  steps: StepItem[];
  currentStep: number;
}

export default function Sidebar({ steps, currentStep }: SidebarProps) {
  const { setCurrentStep, resetPlaybook, playbook } = useSoarStore();

  // Determine which steps have been meaningfully started
  function isStepComplete(stepId: number): boolean {
    switch (stepId) {
      case 1:  return !!playbook.name && !!playbook.description;
      case 2:  return !!playbook.trigger.type && !!playbook.trigger.description;
      case 3:  return playbook.entities.length > 0;
      case 4:  return playbook.enrichmentConnectors.length > 0;
      case 5:  return !!playbook.scoringModel.type;
      case 6:  return playbook.actions.length > 0;
      case 7:  return !!playbook.fallbackProcedure.escalationPath;
      case 8:  return !!playbook.testingPlan.scenarios;
      case 9:  return !!playbook.approvalSignOff.approvedBy;
      case 10: return false; // readiness is always dynamic
      case 11: return false;
      default: return false;
    }
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden">
      {/* Branding */}
      <div className="px-5 py-5 border-b border-sidebar-border bg-gradient-to-br from-sidebar-primary/10 to-sidebar-accent/5">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-sidebar-primary" />
          <div>
            <h2 className="text-sm font-bold tracking-tight leading-tight">SOARForge</h2>
            <p className="text-xs text-muted-foreground">Professional v1.1</p>
          </div>
        </div>
        {playbook.name && (
          <p className="text-xs text-muted-foreground mt-3 truncate">
            {playbook.name}
          </p>
        )}
      </div>

      {/* Step navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isDone = isStepComplete(step.id) && step.id < currentStep;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md transition-all duration-200 flex items-center gap-3 group ${
                isActive
                  ? 'bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30 font-medium'
                  : isDone
                  ? 'text-sidebar-accent hover:bg-sidebar-accent/10'
                  : 'text-sidebar-foreground hover:bg-sidebar-border/50'
              }`}
            >
              {/* Step number / done indicator */}
              <span
                className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-all ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : isDone
                    ? 'bg-sidebar-accent/30 text-sidebar-accent'
                    : 'bg-sidebar-border text-muted-foreground'
                }`}
              >
                {isDone ? '✓' : step.id}
              </span>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium leading-tight truncate ${isActive ? 'text-foreground' : ''}`}>
                  {step.title}
                </p>
              </div>

              {isActive && (
                <ChevronRight className="w-3 h-3 text-accent shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (confirm('Reset all playbook data? This cannot be undone.')) {
              resetPlaybook();
            }
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Playbook
        </Button>
      </div>
    </aside>
  );
}
