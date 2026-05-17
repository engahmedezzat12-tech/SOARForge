'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

export default function Step7Fallback() {
  const { playbook, setPlaybook } = useSoarStore();
  const { fallbackProcedure } = playbook;

  const handleUpdate = (field: string, value: string) => {
    setPlaybook({
      ...playbook,
      fallbackProcedure: {
        ...fallbackProcedure,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 7: Fallback Procedures</h1>
        <p className="text-muted-foreground">
          Define manual escalation steps, communication templates, and rollback procedures.
        </p>
      </div>

      {/* Escalation Path */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-semibold">Escalation Path</span>
        </label>
        <Input
          value={fallbackProcedure.escalationPath}
          onChange={(e) => handleUpdate('escalationPath', e.target.value)}
          placeholder="e.g., EDR Team > SOC Lead > CISO > Incident Commander"
          className="mb-2"
        />
        <p className="text-xs text-muted-foreground">
          Define the chain of command for manual escalation when automation fails or analyst intervention is needed.
        </p>
      </Card>

      {/* Manual Steps */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Manual Intervention Steps</label>
        <textarea
          value={fallbackProcedure.manualSteps}
          onChange={(e) => handleUpdate('manualSteps', e.target.value)}
          placeholder="1. Verify machine on EDR console&#10;2. Manually isolate via EDR UI&#10;3. Disable AD account via ADUC&#10;4. Escalate to CISO if C-level..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={6}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Step-by-step instructions for SOC analysts to follow if the automated workflow fails or requires manual intervention.
        </p>
      </Card>

      {/* Communication Template */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Communication Template</label>
        <textarea
          value={fallbackProcedure.communicationTemplate}
          onChange={(e) => handleUpdate('communicationTemplate', e.target.value)}
          placeholder="ALERT: {alert_type} on {hostname}&#10;Action: {action}&#10;Severity: {severity}&#10;Incident: #{incident_id}"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Template for notifying stakeholders. Supports variables like {'{hostname}'}, {'{severity}'}, {'{timestamp}'}.
        </p>
      </Card>

      {/* Preview */}
      <Card className="p-6 bg-muted/30 border-border/50">
        <p className="font-semibold mb-4">Fallback Procedure Summary</p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground font-medium">Escalation Chain:</p>
            <p className="font-mono text-foreground mt-1">{fallbackProcedure.escalationPath || '(not set)'}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Manual Steps Defined:</p>
            <p className="text-foreground mt-1">
              {fallbackProcedure.manualSteps ? `${fallbackProcedure.manualSteps.split('\n').length} steps` : '(not set)'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
