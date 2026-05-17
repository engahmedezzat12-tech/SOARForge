'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, FileText } from 'lucide-react';

export default function Step9Approval() {
  const { playbook, setPlaybook } = useSoarStore();
  const { approvalSignOff } = playbook;

  const handleUpdate = (field: string, value: string) => {
    setPlaybook({
      ...playbook,
      approvalSignOff: {
        ...approvalSignOff,
        [field]: value,
      },
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 9: Approval & Sign-Off</h1>
        <p className="text-muted-foreground">
          Document approval by stakeholders and compliance requirements.
        </p>
      </div>

      {/* Approved By */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4" />
          <span className="font-semibold">Approved By</span>
        </label>
        <Input
          value={approvalSignOff.approvedBy}
          onChange={(e) => handleUpdate('approvedBy', e.target.value)}
          placeholder="Name and title (e.g., SOC Manager, Security Lead)"
          className="mb-2"
        />
        <p className="text-xs text-muted-foreground">
          Individual or role responsible for approving this playbook for production deployment.
        </p>
      </Card>

      {/* Approval Date */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4" />
          <span className="font-semibold">Approval Date</span>
        </label>
        <Input
          type="date"
          value={approvalSignOff.approvalDate}
          onChange={(e) => handleUpdate('approvalDate', e.target.value)}
          className="mb-2"
          max={today}
        />
        <p className="text-xs text-muted-foreground">
          Date when this playbook was formally approved for deployment.
        </p>
      </Card>

      {/* Compliance Notes */}
      <Card className="p-6 border-border/50">
        <label className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4" />
          <span className="font-semibold">Compliance & Policy Notes</span>
        </label>
        <textarea
          value={approvalSignOff.complianceNotes}
          onChange={(e) => handleUpdate('complianceNotes', e.target.value)}
          placeholder="e.g., Complies with IR policy, GDPR Article 33, ISO 27035, SOC2 Type II"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Reference relevant policies, standards, and regulations this playbook aligns with.
        </p>
      </Card>

      {/* Review History */}
      <Card className="p-6 border-border/50">
        <label className="block font-semibold mb-4">Review History & Notes</label>
        <textarea
          value={approvalSignOff.reviewHistory}
          onChange={(e) => handleUpdate('reviewHistory', e.target.value)}
          placeholder="e.g., Initial SOARForge generation — reviewed by SOC Manager. Tested against 50 real alerts. Approved 2024-01-15. Next review: 2024-06-15."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Document review cycles, changes, stakeholder feedback, and deployment notes.
        </p>
      </Card>

      {/* Approval Summary */}
      <Card className="p-6 bg-green-900/10 border-green-800/30">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <h2 className="font-semibold text-green-400">Approval Sign-Off Summary</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Approved By:</span>
            <span className="font-mono">{approvalSignOff.approvedBy || '(pending)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-mono">{approvalSignOff.approvalDate || '(pending)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Compliance:</span>
            <span className="text-right">
              {approvalSignOff.complianceNotes
                ? `${approvalSignOff.complianceNotes.split(',').length} compliance refs`
                : '(none)'}
            </span>
          </div>
        </div>
      </Card>

      {/* Next Steps */}
      <Card className="p-4 bg-blue-900/10 border-blue-800/30">
        <p className="text-sm font-medium text-blue-400 mb-2">Next Steps</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Proceed to Step 10 (Readiness) to validate all required connectors and fields</li>
          <li>Step 11 (Export) will generate the FortiSOAR import package</li>
          <li>Deploy the package to your FortiSOAR instance</li>
          <li>Schedule next review date in review history</li>
        </ul>
      </Card>
    </div>
  );
}
