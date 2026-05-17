'use client';

// ============================================================
// SOARForge — Threat Coverage Panel
// Customer-friendly MITRE/D3FEND coverage summary.
// ============================================================

import type { ThreatCoverageResult } from '@/lib/threat-knowledge/threat-knowledge-types';

function statusText(status: ThreatCoverageResult['status']): string {
  switch (status) {
    case 'strong':
      return 'Strong Coverage';
    case 'ready_with_review':
      return 'Ready with Review';
    case 'recommended_enhancement':
      return 'Recommended Enhancement';
    case 'limited':
      return 'Limited Coverage';
    default:
      return 'Review Recommended';
  }
}

function scoreClass(score: number): string {
  if (score >= 85) return 'bg-emerald-500/10 text-emerald-400 border-emerald-700/40';
  if (score >= 70) return 'bg-blue-500/10 text-blue-400 border-blue-700/40';
  if (score >= 50) return 'bg-yellow-500/10 text-yellow-400 border-yellow-700/40';
  return 'bg-red-500/10 text-red-400 border-red-700/40';
}

function ListBlock({ title, items, emptyText, tone = 'default' }: {
  title: string;
  items: string[];
  emptyText: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const toneClass = tone === 'warning'
    ? 'border-yellow-800/30 bg-yellow-900/10'
    : tone === 'success'
      ? 'border-emerald-800/30 bg-emerald-900/10'
      : 'border-border bg-card/40';

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="font-semibold text-sm mb-2">{title}</div>
      {items.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
          {items.slice(0, 6).map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

export function ThreatCoveragePanel({ result }: { result: ThreatCoverageResult }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Threat Coverage</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {result.incidentDisplayName} · {statusText(result.status)}
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-sm font-bold ${scoreClass(result.score)}`}>
          {result.score}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs uppercase text-muted-foreground">Required Coverage</div>
          <div className="font-semibold">{result.coveredRequiredTechniques.length}/{result.coveredRequiredTechniques.length + result.coverageGaps.length}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs uppercase text-muted-foreground">Detection References</div>
          <div className="font-semibold">{result.detectionCoverage.length}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs uppercase text-muted-foreground">Countermeasures</div>
          <div className="font-semibold">{result.defensiveCountermeasures.length}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs uppercase text-muted-foreground">Safe Tests</div>
          <div className="font-semibold">{result.testCoverage.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ListBlock
          title="Covered Techniques"
          items={[...result.coveredRequiredTechniques, ...result.coveredOptionalTechniques]}
          emptyText="No technique coverage has been mapped yet."
          tone="success"
        />
        <ListBlock
          title="Coverage Gaps / Recommended Enhancements"
          items={[...result.coverageGaps, ...result.optionalEnhancements].map((id) => `${id} — recommended enhancement`)}
          emptyText="No required coverage gaps identified."
          tone={result.coverageGaps.length > 0 ? 'warning' : 'success'}
        />
        <ListBlock
          title="Detection Coverage"
          items={result.detectionCoverage}
          emptyText="No detection references mapped yet."
        />
        <ListBlock
          title="Defensive Countermeasures"
          items={result.defensiveCountermeasures.map((c) => `${c.name} (${c.tactic})`)}
          emptyText="No countermeasure mappings available yet."
        />
      </div>

      {result.recommendedEnhancements.length > 0 && (
        <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-3">
          <div className="font-semibold text-sm mb-2">Recommended Enhancements</div>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
            {result.recommendedEnhancements.slice(0, 8).map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
