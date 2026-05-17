'use client';

import { useSoarStore } from '@/lib/soar-store';
import { getPlatformById } from '@/lib/soar-platforms';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Circle, AlertTriangle, Info } from 'lucide-react';
import { generateReadinessChecks } from '@/lib/fortisoar-workflow-generator';
import type { FortiSOARReadinessCheck } from '@/lib/fortisoar-types';

/**
 * Step 10: Readiness Checks
 * Displays all readiness checks with Fix buttons for failed items.
 */
export default function Step10Readiness() {
  const { playbook, deploymentProfile, openConnectorModal, setCurrentStep, targetPlatform } = useSoarStore();

  const platform = getPlatformById(targetPlatform);
  const readinessChecks = generateReadinessChecks(playbook, deploymentProfile);

  // Group checks by category
  const grouped = readinessChecks.reduce(
    (acc, check) => {
      if (!acc[check.category]) {
        acc[check.category] = [];
      }
      acc[check.category].push(check);
      return acc;
    },
    {} as Record<string, FortiSOARReadinessCheck[]>
  );

  // Count metrics
  const totalChecks = readinessChecks.length;
  const passedChecks = readinessChecks.filter((c) => c.passed).length;
  const criticalChecks = readinessChecks.filter((c) => c.critical).length;
  const criticalPassed = readinessChecks.filter((c) => c.critical && c.passed).length;

  const categoryLabels: Record<string, string> = {
    template: '📋 Template',
    trigger: '🔔 Trigger',
    entities: '🎯 Entities',
    enrichment: '📊 Enrichment',
    scoring: '📈 Scoring',
    actions: '⚔️ Actions',
    approval: '✅ Approval',
    rollback: '↩️ Rollback',
    testing: '🧪 Testing',
    connectors: '🔗 Connectors',
  };

  const handleFixClick = (check: FortiSOARReadinessCheck) => {
    if (check.fixStepNumber) {
      setCurrentStep(check.fixStepNumber);
    }
    if (check.fixConnectorKey) {
      openConnectorModal(check.fixConnectorKey);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 10: Readiness Assessment</h1>
        <p className="text-muted-foreground">
          Review the readiness checks below. All critical checks must pass before import.
        </p>
      </div>

      {/* Platform-Specific Readiness Warning */}
      {platform && targetPlatform !== 'fortisoar' && (
        <Card className="p-4 border-border/50 bg-amber-900/20 border-amber-800/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-400 mb-1">Platform Export Information</p>
              <p className="text-sm text-amber-200/80">
                {targetPlatform === 'cortex_xsoar' && 'This export will be a blueprint. Verify integrations and commands in your XSOAR tenant after import.'}
                {targetPlatform === 'splunk_soar' && 'This export will be a playbook blueprint with app/action mapping checklist. Create test app assets before importing.'}
                {targetPlatform === 'qradar_soar' && 'This export will be a blueprint only. Manual creation of QRadar SOAR workflows recommended.'}
                {targetPlatform === 'sentinel_logic_apps' && 'This export will be an ARM template and Logic App blueprint. Deploy and configure API connections in your Azure environment.'}
                {targetPlatform === 'servicenow_secops' && 'This export will be a flow blueprint. Adjust spoke/action instances to match your ServiceNow tenant.'}
                {targetPlatform === 'tines' && 'This export will be a story blueprint. Verify agents and webhooks in your Tines workspace.'}
                {targetPlatform === 'generic_soar' && 'This export will be a normalized SOAR JSON blueprint for documentation and comparison purposes.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* FortiSOAR Direct Import Info */}
      {targetPlatform === 'fortisoar' && (
        <Card className="p-4 border-border/50 bg-green-900/20 border-green-800/50">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-400 mb-1">Direct FortiSOAR Import</p>
              <p className="text-sm text-green-200/80">
                This playbook is optimized for direct import to FortiSOAR. All features are fully supported. Replace template placeholders with actual connector UUIDs from your instance.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-muted/50 border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Total Checks
          </p>
          <p className="text-2xl font-bold">{totalChecks}</p>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Passed
          </p>
          <p className="text-2xl font-bold text-green-400">{passedChecks}</p>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Critical
          </p>
          <p className="text-2xl font-bold text-blue-400">{criticalChecks}</p>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Critical Passed
          </p>
          <p className={`text-2xl font-bold ${criticalPassed === criticalChecks ? 'text-green-400' : 'text-yellow-400'}`}>
            {criticalPassed}/{criticalChecks}
          </p>
        </Card>
      </div>

      {/* Grouped Checks */}
      {Object.entries(grouped).map(([category, checks]) => {
        const categoryLabel = categoryLabels[category] || category;
        const categoryPassed = checks.every((c) => c.passed);

        return (
          <Card key={category} className="p-6 border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{categoryLabel}</h2>
              {categoryPassed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>

            <div className="space-y-2.5">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    check.passed
                      ? 'bg-green-900/10 border-green-700/20'
                      : 'bg-yellow-900/10 border-yellow-700/20'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="shrink-0 pt-0.5">
                    {check.passed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : check.critical ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-medium ${check.passed ? 'text-green-300' : 'text-yellow-300'}`}>
                        {check.label}
                      </p>
                      {check.critical && !check.passed && (
                        <span className="px-1.5 py-0.5 text-xs font-mono bg-red-900/30 text-red-300 rounded">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    {check.note && (
                      <p className="text-xs text-muted-foreground">{check.note}</p>
                    )}
                  </div>

                  {/* Fix Button */}
                  {!check.passed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFixClick(check)}
                      className="shrink-0"
                    >
                      Fix
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {/* Status Banner */}
      <Card
        className={`p-4 border-l-4 ${
          passedChecks === totalChecks
            ? 'bg-green-900/20 border-l-green-500 border-green-700/30'
            : criticalPassed === criticalChecks
            ? 'bg-blue-900/20 border-l-blue-500 border-blue-700/30'
            : 'bg-red-900/20 border-l-red-500 border-red-700/30'
        }`}
      >
        <p className={`text-sm font-medium ${
          passedChecks === totalChecks
            ? 'text-green-300'
            : criticalPassed === criticalChecks
            ? 'text-blue-300'
            : 'text-red-300'
        }`}>
          {passedChecks === totalChecks
            ? '✓ All readiness checks passed! Ready for deployment.'
            : criticalPassed === criticalChecks
            ? `✓ Critical checks passed (${passedChecks}/${totalChecks} total). Non-critical items can be addressed later.`
            : `⚠️ ${criticalChecks - criticalPassed} critical check(s) need attention before import.`}
        </p>
      </Card>
    </div>
  );
}
