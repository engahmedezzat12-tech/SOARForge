'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Beaker, CheckCircle } from 'lucide-react';

export default function Step8Testing() {
  const { playbook, setPlaybook } = useSoarStore();
  const { testingPlan, status } = playbook;

  const handleUpdateTesting = (field: string, value: string) => {
    setPlaybook({
      ...playbook,
      testingPlan: {
        ...testingPlan,
        [field]: value,
      },
    });
  };

  const handleUpdateStatus = (newStatus: 'draft' | 'testing' | 'approved' | 'deployed') => {
    setPlaybook({
      ...playbook,
      status: newStatus,
    });
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-900/20 border-gray-800/30 text-gray-400',
    testing: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-400',
    approved: 'bg-blue-900/20 border-blue-800/30 text-blue-400',
    deployed: 'bg-green-900/20 border-green-800/30 text-green-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 8: Testing & UAT</h1>
        <p className="text-muted-foreground">
          Define test scenarios, success criteria, and performance targets for the playbook.
        </p>
      </div>

      {/* Status Selector */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4" />
          <span className="font-semibold">Playbook Status</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {(['draft', 'testing', 'approved', 'deployed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleUpdateStatus(s)}
              className={`px-4 py-2 rounded-md border transition-all font-medium text-sm ${
                status === s
                  ? statusColors[s] + ' border-current'
                  : 'border-border hover:border-border/50 text-muted-foreground'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Test Scenarios */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <Beaker className="w-4 h-4" />
          <span className="font-semibold">Test Scenarios</span>
        </label>
        <textarea
          value={testingPlan.scenarios}
          onChange={(e) => handleUpdateTesting('scenarios', e.target.value)}
          placeholder="1. Benign case — expected to skip&#10;2. Medium confidence — expect approval required&#10;3. High confidence — expect auto-action&#10;4. False positive — expect no action&#10;5. Resolved incident — expect skip..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={6}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Define test cases covering happy path, error scenarios, and edge cases (false positives, resolved, etc.).
        </p>
      </Card>

      {/* Success Criteria */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Success Criteria</label>
        <textarea
          value={testingPlan.successCriteria}
          onChange={(e) => handleUpdateTesting('successCriteria', e.target.value)}
          placeholder="- All benign cases produce no action&#10;- Medium-confidence cases trigger approval workflow&#10;- High-confidence cases auto-contain within threshold&#10;- FP/resolved skip cleanly&#10;- No missed alerts&#10;- All connectors respond within timeout..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Define pass/fail criteria for the UAT (User Acceptance Testing) phase.
        </p>
      </Card>

      {/* Performance Targets */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Performance Targets</label>
        <textarea
          value={testingPlan.performanceTargets}
          onChange={(e) => handleUpdateTesting('performanceTargets', e.target.value)}
          placeholder="- Detection to isolation < 2 minutes&#10;- Approval timeout 72 hours&#10;- Connector response < 5 seconds&#10;- Max 5 concurrent playbook executions&#10;- Fallback escalation < 5 minutes..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Define SLA, timeout, throughput, and resource constraints.
        </p>
      </Card>

      {/* Status Badge */}
      <Card className={`p-4 border-2 ${statusColors[status]} border-current`}>
        <p className="text-sm font-medium">
          Current Status: <span className="font-bold capitalize">{status}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'draft' && 'Continue to Step 9 when testing is complete.'}
          {status === 'testing' && 'Conduct UAT with stakeholders.'}
          {status === 'approved' && 'Ready for deployment to FortiSOAR.'}
          {status === 'deployed' && 'Active in production.'}
        </p>
      </Card>
    </div>
  );
}
