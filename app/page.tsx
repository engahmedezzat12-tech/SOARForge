'use client';

import { useEffect, useState } from 'react';
import { useSoarStore } from '@/lib/soar-store';
import Sidebar from '@/components/sidebar';
import Step1Identity from '@/components/wizard/step-1-identity';
import Step2Trigger from '@/components/wizard/step-2-trigger';
import Step3Entities from '@/components/wizard/step-3-entities';
import Step4Enrichment from '@/components/wizard/step-4-enrichment';
import Step5Scoring from '@/components/wizard/step-5-scoring';
import Step6Actions from '@/components/wizard/step-6-actions';
import Step7Fallback from '@/components/wizard/step-7-fallback';
import Step8Testing from '@/components/wizard/step-8-testing';
import Step9Approval from '@/components/wizard/step-9-approval';
import Step10Readiness from '@/components/step-10-readiness';
import ExportCenter from '@/components/export-center';
import ConnectorConfigModal from '@/components/connector-config-modal';
import { PlatformSelector } from '@/components/platform-selector';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WIZARD_STEPS = [
  { id: 1, title: 'Identity', subtitle: 'Basic info' },
  { id: 2, title: 'Trigger', subtitle: 'Event source' },
  { id: 3, title: 'Entities', subtitle: 'Input fields' },
  { id: 4, title: 'Enrichment', subtitle: 'Context sources' },
  { id: 5, title: 'Scoring', subtitle: 'Risk model' },
  { id: 6, title: 'Actions', subtitle: 'Response steps' },
  { id: 7, title: 'Fallback', subtitle: 'Manual steps' },
  { id: 8, title: 'Testing', subtitle: 'Test plan' },
  { id: 9, title: 'Approval', subtitle: 'Sign-off' },
  { id: 10, title: 'Readiness', subtitle: 'Validation' },
  { id: 11, title: 'Export', subtitle: 'Delivery' },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const {
    currentStep,
    setCurrentStep,
    playbook,
    deploymentProfile,
    isExporting,
    setIsExporting,
  } = useSoarStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === WIZARD_STEPS.length;
  const canProceed = currentStep < WIZARD_STEPS.length;
  const canGoBack = currentStep > 1;

  const handlePrevious = () => {
    if (canGoBack) setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (canProceed) setCurrentStep(currentStep + 1);
  };

  const handleExport = () => {
    setIsExporting(true);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar steps={WIZARD_STEPS} currentStep={currentStep} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
        <header className="shrink-0 border-b border-border bg-gradient-to-r from-card via-card to-card/50 px-8 py-4 flex items-center justify-between backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {WIZARD_STEPS[currentStep - 1]?.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStep} of {WIZARD_STEPS.length} · {WIZARD_STEPS[currentStep - 1]?.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Open Phase 1-6 production foundation admin console"
            >
              Admin Console
            </a>
            <PlatformSelector variant="header" />
            <div className="flex gap-1.5">
              {WIZARD_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`h-2 w-6 rounded-full transition-all duration-300 ${
                    step.id <= currentStep 
                      ? 'bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20' 
                      : 'bg-border/50 hover:bg-border/80'
                  }`}
                  title={`${step.title} (${step.id}/${WIZARD_STEPS.length})`}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md">
              {Math.round((currentStep / WIZARD_STEPS.length) * 100)}%
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background via-background/98 to-background/95">
          <div className="px-8 py-8 max-w-5xl">
            <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
              {isExporting ? (
                <ExportCenter />
              ) : currentStep === 1 ? (
                <Step1Identity />
              ) : currentStep === 2 ? (
                <Step2Trigger />
              ) : currentStep === 3 ? (
                <Step3Entities />
              ) : currentStep === 4 ? (
                <Step4Enrichment />
              ) : currentStep === 5 ? (
                <Step5Scoring />
              ) : currentStep === 6 ? (
                <Step6Actions />
              ) : currentStep === 7 ? (
                <Step7Fallback />
              ) : currentStep === 8 ? (
                <Step8Testing />
              ) : currentStep === 9 ? (
                <Step9Approval />
              ) : currentStep === 10 ? (
                <Step10Readiness />
              ) : null}
            </div>
          </div>
        </main>

        {/* Footer with Navigation */}
        <footer className="shrink-0 border-t border-border bg-gradient-to-r from-card via-card to-card/50 px-8 py-4 flex items-center justify-between backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={isFirstStep || isExporting}
            className="gap-2 transition-all hover:bg-muted/50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-medium text-muted-foreground font-mono">
              {playbook.name ? playbook.name : 'Untitled Playbook'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {playbook.templateId && `Template: ${playbook.templateId}`}
            </p>
          </div>

          {isLastStep ? (
            <Button
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Package'}
            </Button>
          ) : (
            <Button
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
              size="sm"
              onClick={handleNext}
              disabled={!canProceed || isExporting}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </footer>
      </div>

      {/* Connector Config Modal */}
      <ConnectorConfigModal />
    </div>
  );
}
