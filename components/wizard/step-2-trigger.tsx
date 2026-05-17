'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

export default function Step2Trigger() {
  const { playbook, setPlaybook } = useSoarStore();
  const { trigger } = playbook;

  const handleUpdate = (field: string, value: string) => {
    setPlaybook({
      ...playbook,
      trigger: {
        ...trigger,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 2: Trigger Event</h1>
        <p className="text-muted-foreground">
          Define what event or condition triggers this playbook to execute.
        </p>
      </div>

      {/* Trigger Type */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" />
          <span className="font-semibold">Trigger Type</span>
        </label>
        <Input
          value={trigger.type}
          onChange={(e) => handleUpdate('type', e.target.value)}
          placeholder="e.g., EDR Alert / SIEM Correlation"
          className="mb-2"
        />
        <p className="text-xs text-muted-foreground">
          Describes the event type that initiates the playbook (e.g., EDR alert, SIEM rule, webhook, manual).
        </p>
      </Card>

      {/* Source System */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Source System</label>
        <Input
          value={trigger.sourceSystem}
          onChange={(e) => handleUpdate('sourceSystem', e.target.value)}
          placeholder="e.g., CrowdStrike Falcon, Microsoft Sentinel, QRadar"
          className="mb-2"
        />
        <p className="text-xs text-muted-foreground">
          The origin system sending the alert or event (EDR, SIEM, webhook endpoint, etc.).
        </p>
      </Card>

      {/* Description */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Trigger Description</label>
        <textarea
          value={trigger.description}
          onChange={(e) => handleUpdate('description', e.target.value)}
          placeholder="Detailed description of the trigger condition and expected alert fields..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Include specific alert fields, correlation rules, and expected payload structure.
        </p>
      </Card>

      {/* Preview */}
      <Card className="p-6 bg-muted/30 border-border/50">
        <p className="font-semibold mb-3">Trigger Summary</p>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <span className="ml-2 font-mono text-foreground">{trigger.type || '(not set)'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Source:</span>
            <span className="ml-2 font-mono text-foreground">{trigger.sourceSystem || '(not set)'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
