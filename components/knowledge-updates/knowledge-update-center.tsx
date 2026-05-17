'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  FileDiff,
  GitBranch,
  Layers,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import type { KnowledgeUpdateReview, KnowledgeImpactLevel } from '@/lib/knowledge-updates/knowledge-update-types';

type TabId = 'summary' | 'sources' | 'impact' | 'diff' | 'approval' | 'timeline' | 'offline' | 'advanced';

function pretty(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function impactClass(impact: KnowledgeImpactLevel | string): string {
  if (impact === 'critical' || impact === 'high') return 'border-red-800/40 bg-red-900/20 text-red-300';
  if (impact === 'medium') return 'border-yellow-800/40 bg-yellow-900/20 text-yellow-300';
  if (impact === 'low') return 'border-blue-800/40 bg-blue-900/20 text-blue-300';
  return 'border-green-800/40 bg-green-900/20 text-green-300';
}

function statusClass(status: string): string {
  if (['applied', 'approved', 'reachable', 'offline_ready'].includes(status)) return 'border-green-800/40 bg-green-900/20 text-green-300';
  if (['review_required', 'update_available', 'staged', 'partially_approved', 'proxy_required'].includes(status)) return 'border-yellow-800/40 bg-yellow-900/20 text-yellow-300';
  if (['failed', 'rejected'].includes(status)) return 'border-red-800/40 bg-red-900/20 text-red-300';
  return 'border-slate-800/40 bg-slate-900/20 text-slate-300';
}

function Card({ title, icon, children, description }: { title: string; icon: ReactNode; children: ReactNode; description?: string }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 text-accent">{icon}</div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-accent/60 bg-accent/15 text-accent' : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

export function KnowledgeUpdateCenter({ review }: { review: KnowledgeUpdateReview }) {
  const [tab, setTab] = useState<TabId>('summary');
  const highImpact = review.templateImpacts.filter((item) => item.impact === 'high' || item.impact === 'critical').length;
  const reviewRecommended = review.templateImpacts.filter((item) => item.reviewRecommended).length;

  return (
    <div className="space-y-4">
      <Card title="Live Knowledge Update Center" icon={<UploadCloud className="h-4 w-4" />} description="Controlled trusted-source update workflow. Summary first, technical diff only when expanded.">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Status</p>
            <span className={`mt-1 inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusClass(review.status)}`}>{pretty(review.status)}</span>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Mode</p>
            <p className="mt-1 font-semibold">{pretty(review.mode)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Diff Items</p>
            <p className="mt-1 font-semibold">{review.diffItems.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Review Templates</p>
            <p className="mt-1 font-semibold">{reviewRecommended}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase text-muted-foreground">High Impact</p>
            <p className="mt-1 font-semibold">{highImpact}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{review.summary}</p>
        <p className="mt-2 text-xs text-accent">Next action: {review.nextRecommendedAction}</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>Summary</TabButton>
        <TabButton active={tab === 'sources'} onClick={() => setTab('sources')}>Source Health</TabButton>
        <TabButton active={tab === 'impact'} onClick={() => setTab('impact')}>Template Impact</TabButton>
        <TabButton active={tab === 'diff'} onClick={() => setTab('diff')}>Diff Viewer</TabButton>
        <TabButton active={tab === 'approval'} onClick={() => setTab('approval')}>Approval Queue</TabButton>
        <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')}>Version Timeline</TabButton>
        <TabButton active={tab === 'offline'} onClick={() => setTab('offline')}>Offline Mode</TabButton>
        <TabButton active={tab === 'advanced'} onClick={() => setTab('advanced')}>Advanced</TabButton>
      </div>

      {tab === 'summary' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="What This Engine Checks" icon={<Database className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Trusted source versions and source health.</li>
              <li>• Added, modified, deprecated, revoked, or mapping-changed knowledge objects.</li>
              <li>• Affected SOARForge templates and customer export notes.</li>
              <li>• Approval state, rollback points, and audit timeline.</li>
              <li>• Strict separation between global knowledge and tenant-specific learning.</li>
            </ul>
          </Card>
          <Card title="Safety Boundaries" icon={<ShieldCheck className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {review.safetyRules.map((rule, idx) => <li key={idx}>• {rule}</li>)}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'sources' && (
        <Card title="Knowledge Source Health" icon={<RefreshCw className="h-4 w-4" />} description="Online mode can check sources directly; offline mode imports approved bundles in restricted environments.">
          <div className="grid gap-3 md:grid-cols-2">
            {review.sourceHealth.map((source) => (
              <div key={source.sourceId} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{source.displayName}</p>
                  <span className={`rounded border px-2 py-0.5 text-[11px] ${statusClass(source.status)}`}>{pretty(source.status)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{source.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Local: {source.localVersion} · Latest: {source.latestKnownVersion ?? 'Not checked'} · Mode: {pretty(source.mode)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'impact' && (
        <Card title="Template Impact Analyzer" icon={<AlertTriangle className="h-4 w-4" />} description="Affected templates are marked Review Recommended. Production playbooks are not changed silently.">
          <div className="space-y-3">
            {review.templateImpacts.map((impact) => (
              <div key={impact.templateId} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{impact.templateName}</p>
                  <span className={`rounded border px-2 py-0.5 text-xs ${impactClass(impact.impact)}`}>{pretty(impact.impact)} impact</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{impact.reason}</p>
                <p className="mt-2 text-xs text-accent">Action: {impact.recommendedAction}</p>
                {impact.affectedTechniques.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Techniques: {impact.affectedTechniques.join(', ')}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'diff' && (
        <Card title="Knowledge Diff Viewer" icon={<FileDiff className="h-4 w-4" />} description="Technical changes are visible on demand. Customer-facing views stay concise.">
          <div className="space-y-3">
            {review.diffItems.map((diff) => (
              <details key={diff.id} className="rounded-lg border border-border bg-background/40 p-3">
                <summary className="cursor-pointer">
                  <span className={`mr-2 rounded border px-2 py-0.5 text-[11px] ${impactClass(diff.impactLevel)}`}>{pretty(diff.type)}</span>
                  <span className="font-medium text-sm">{diff.title}</span>
                </summary>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>{diff.summary}</p>
                  <p><strong className="text-foreground">Object:</strong> {diff.objectId} · {diff.objectType ?? 'unknown'}</p>
                  <p><strong className="text-foreground">Fields:</strong> {diff.affectedFields.join(', ') || 'n/a'}</p>
                  <p><strong className="text-foreground">Customer wording:</strong> {diff.customerFacingChange}</p>
                  <p><strong className="text-foreground">Recommended action:</strong> {diff.recommendedAction}</p>
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}

      {tab === 'approval' && (
        <Card title="Admin Approval Queue" icon={<CheckCircle2 className="h-4 w-4" />} description="The queue prevents unreviewed knowledge from changing local datasets.">
          <div className="space-y-3">
            {review.approvalQueue.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className={`rounded border px-2 py-0.5 text-xs ${statusClass(item.state)}`}>{pretty(item.state)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">Diffs: {item.diffCount} · Affected templates: {item.affectedTemplateCount} · Internal state: {pretty(item.internalState)}</p>
                <p className="mt-2 text-xs text-accent">{item.safetySummary}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'timeline' && (
        <Card title="Knowledge Version Timeline" icon={<Clock3 className="h-4 w-4" />} description="Tracks active/staged versions, review points, and rollback anchors.">
          <ol className="space-y-3">
            {review.versionTimeline.map((event) => (
              <li key={event.id} className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-sm font-semibold">{event.title} <span className={`ml-2 rounded border px-2 py-0.5 text-[11px] ${statusClass(event.state)}`}>{pretty(event.state)}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{event.timestamp} · {event.sourceId} · actor: {event.actor}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {tab === 'offline' && (
        <Card title="Offline / Air-Gapped Update Flow" icon={<UploadCloud className="h-4 w-4" />} description="For restricted SOC environments that cannot fetch the internet directly.">
          <div className="grid gap-3 md:grid-cols-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-background/40 p-3"><strong className="text-foreground">1. Build Bundle</strong><br />Generate approved update bundle on an internet-connected bastion host.</div>
            <div className="rounded-lg border border-border bg-background/40 p-3"><strong className="text-foreground">2. Transfer</strong><br />Move signed bundle into the restricted environment using customer-approved process.</div>
            <div className="rounded-lg border border-border bg-background/40 p-3"><strong className="text-foreground">3. Stage</strong><br />Upload bundle, validate signature/checksum, parse schema, and stage diffs.</div>
            <div className="rounded-lg border border-border bg-background/40 p-3"><strong className="text-foreground">4. Approve</strong><br />Admin reviews impact and approves selected knowledge updates.</div>
          </div>
        </Card>
      )}

      {tab === 'advanced' && (
        <Card title="Data Separation and Version State" icon={<Layers className="h-4 w-4" />} description="Advanced implementation detail shown only when expanded.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/40 p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Global vs Tenant Separation</p>
              <p className="mt-1">Global knowledge separated: {review.globalKnowledgeSeparated ? 'Yes' : 'No'}</p>
              <p>Tenant learning separated: {review.tenantLearningSeparated ? 'Yes' : 'No'}</p>
              <p className="mt-2 text-xs text-accent">Tenant runtime evidence changes tenant confidence only; it is not promoted globally without review.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Source Versions</p>
              <ul className="mt-2 space-y-1 text-xs">
                {review.sourceVersions.slice(0, 8).map((source) => <li key={source.sourceId}>• {source.sourceId}: active {source.activeVersion}{source.stagedVersion ? ` → staged ${source.stagedVersion}` : ''}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
