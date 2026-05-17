'use client';

import type { IntelligenceRecommendation } from '@/lib/intelligence/intelligence-types';

export function WhyThisMattersDrawer({ recommendation }: { recommendation?: IntelligenceRecommendation }) {
  if (!recommendation) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h4 className="font-semibold mb-2">Why This Matters</h4>
      <p className="text-sm text-muted-foreground mb-3">{recommendation.whyItMatters}</p>
      <div className="grid md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-background/50 border border-border p-3">
          <p className="font-medium mb-1">Expected Benefit</p>
          <p className="text-muted-foreground">{recommendation.expectedBenefit}</p>
        </div>
        <div className="rounded-lg bg-background/50 border border-border p-3">
          <p className="font-medium mb-1">Safety Impact</p>
          <p className="text-muted-foreground">{recommendation.safetyImpact}</p>
        </div>
        <div className="rounded-lg bg-background/50 border border-border p-3">
          <p className="font-medium mb-1">Affected Areas</p>
          <p className="text-muted-foreground">{recommendation.affectedSections.join(', ')}</p>
        </div>
      </div>
    </div>
  );
}
