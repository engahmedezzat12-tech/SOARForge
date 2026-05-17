'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Brain,
  CheckCircle,
  ClipboardCheck,
  Database,
  FileText,
  GitBranch,
  HelpCircle,
  KeyRound,
  Layers,
  ListChecks,
  PackageCheck,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  UploadCloud,
} from 'lucide-react';
import type { IntelligenceReviewResult } from '@/lib/intelligence/intelligence-types';
import { RecommendationCard } from './recommendation-card';
import { ApplyEnhancementPreview } from './apply-enhancement-preview';
import { LearningFeedbackPanel } from './learning-feedback-panel';
import { KnowledgeUpdateCenter } from '@/components/knowledge-updates/knowledge-update-center';

type TabId = 'overview' | 'recommendations' | 'validation' | 'threat' | 'knowledge' | 'delivery' | 'advanced';

function statusClass(status: IntelligenceReviewResult['status']): string {
  switch (status) {
    case 'excellent': return 'bg-emerald-900/20 text-emerald-300 border-emerald-800/40';
    case 'strong': return 'bg-green-900/20 text-green-300 border-green-800/40';
    case 'ready_with_review': return 'bg-yellow-900/20 text-yellow-300 border-yellow-800/40';
    default: return 'bg-red-900/20 text-red-300 border-red-800/40';
  }
}

function riskClass(risk: string): string {
  if (risk === 'critical' || risk === 'high') return 'text-red-300 bg-red-900/20 border-red-800/40';
  if (risk === 'medium_high' || risk === 'medium') return 'text-yellow-300 bg-yellow-900/20 border-yellow-800/40';
  return 'text-green-300 bg-green-900/20 border-green-800/40';
}

function levelClass(level: string): string {
  if (level === 'strong') return 'text-green-300 bg-green-900/20 border-green-800/40';
  if (level === 'good') return 'text-blue-300 bg-blue-900/20 border-blue-800/40';
  if (level === 'needs_validation') return 'text-yellow-300 bg-yellow-900/20 border-yellow-800/40';
  return 'text-orange-300 bg-orange-900/20 border-orange-800/40';
}

function sourceClass(status: string): string {
  if (status === 'loaded') return 'text-green-300 bg-green-900/20 border-green-800/40';
  if (status === 'configured') return 'text-blue-300 bg-blue-900/20 border-blue-800/40';
  if (status === 'review_recommended') return 'text-yellow-300 bg-yellow-900/20 border-yellow-800/40';
  return 'text-slate-300 bg-slate-900/20 border-slate-800/40';
}

function pretty(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function Section({ title, icon, children, description }: { title: string; icon: ReactNode; children: ReactNode; description?: string }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">{icon}{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-lg border border-border bg-background/40 p-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{title}</summary>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}

function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="font-semibold mt-1">{value}</div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
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

export function IntelligenceReviewPanel({ result }: { result: IntelligenceReviewResult }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const topRecommendations = result.recommendations.slice(0, 3);
  const allRecommendations = result.recommendations;

  const analyzedCounts = useMemo(() => ({
    techniques: result.context.mitreTechniques.length,
    detections: result.context.detectionReferences.length,
    connectors: result.context.connectors.length,
    actions: result.context.actions.length,
    highImpact: result.context.destructiveActions.length,
    approvals: result.context.approvals.length,
    rollback: result.context.rollbackActions.length,
  }), [result]);

  return (
    <div className="rounded-2xl border border-accent/25 bg-card p-6 space-y-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-xl bg-accent/10 border border-accent/30 p-2 shrink-0">
            <Brain className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold">SOARForge Intelligence Center</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organized intelligence view with visible analysis depth, tenant validation, threat knowledge, and customer delivery outputs.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusClass(result.status)}`}>
            {result.score.overall}% · {pretty(result.status)}
          </div>
          <p className="text-[11px] text-muted-foreground">No runtime certification until tenant validation is complete.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/35 p-4">
        <div className="grid md:grid-cols-5 gap-3">
          <StatCard label="Overall Status" value={pretty(result.status)} hint="Design maturity status" />
          <StatCard label="Top Priority Fix" value={<span className="text-sm">{result.topPriorityFix ?? result.recommendations[0]?.title ?? 'Complete validation'}</span>} />
          <StatCard label="Primary Blocker" value={<span className="text-sm">{result.primaryBlocker ?? 'Tenant validation required'}</span>} />
          <StatCard label="Risk Level" value={pretty(result.riskLevel ?? 'controlled')} />
          <StatCard label="Knowledge Base" value={result.knowledgeBaseVersion?.threatKnowledge ?? 'local'} hint="Versioned knowledge pack" />
        </div>
        <div className="mt-4 grid md:grid-cols-7 gap-2 text-xs text-muted-foreground">
          <div>Analyzed: <span className="text-foreground font-semibold">{analyzedCounts.techniques}</span> MITRE</div>
          <div><span className="text-foreground font-semibold">{analyzedCounts.detections}</span> detections</div>
          <div><span className="text-foreground font-semibold">{analyzedCounts.connectors}</span> connectors</div>
          <div><span className="text-foreground font-semibold">{analyzedCounts.actions}</span> actions</div>
          <div><span className="text-foreground font-semibold">{analyzedCounts.highImpact}</span> high-impact</div>
          <div><span className="text-foreground font-semibold">{analyzedCounts.approvals}</span> approvals</div>
          <div><span className="text-foreground font-semibold">{analyzedCounts.rollback}</span> rollback refs</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
        <TabButton active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')}>Recommendations</TabButton>
        <TabButton active={activeTab === 'validation'} onClick={() => setActiveTab('validation')}>Validation Center</TabButton>
        <TabButton active={activeTab === 'threat'} onClick={() => setActiveTab('threat')}>Threat & Detection</TabButton>
        <TabButton active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')}>Knowledge Updates</TabButton>
        <TabButton active={activeTab === 'delivery'} onClick={() => setActiveTab('delivery')}>Delivery Pack</TabButton>
        <TabButton active={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')}>Advanced</TabButton>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Section title="Executive Snapshot" icon={<FileText className="w-4 h-4 text-accent" />}>
            <p className="text-sm text-muted-foreground">{result.executiveSummary || result.summary}</p>
          </Section>

          {result.whatSoarForgeAnalyzed && (
            <Section title="What SOARForge Analyzed" icon={<Radar className="w-4 h-4 text-accent" />} description="Visible analysis depth without overwhelming the user.">
              <div className="grid md:grid-cols-2 gap-3">
                {result.whatSoarForgeAnalyzed.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-background/40 p-3">
                    <p className="font-medium text-sm">{item.area}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.analyzed}</p>
                    <p className="text-xs text-accent mt-2">Value: {item.customerValue}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Section title="What SOARForge Understood" icon={<Sparkles className="w-4 h-4 text-accent" />}>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.whatWasUnderstood.map((item, idx) => <li key={idx}>• {item}</li>)}
              </ul>
            </Section>
            <Section title="Design Strengths" icon={<CheckCircle className="w-4 h-4 text-green-400" />}>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.designStrengths.map((item, idx) => <li key={idx}>• {item}</li>)}
              </ul>
            </Section>
          </div>

          {result.intelligenceDepth && (
            <Section title="Intelligence Depth" icon={<Layers className="w-4 h-4 text-accent" />}>
              <div className="grid md:grid-cols-3 gap-3">
                {result.intelligenceDepth.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{item.area}</p>
                      <span className={`rounded border px-2 py-0.5 text-[11px] ${levelClass(item.level)}`}>{pretty(item.level)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{item.summary}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="grid md:grid-cols-4 gap-3">
            <StatCard label="Best-Practice" value={`${result.score.bestPracticeAlignment}%`} />
            <StatCard label="Response Safety" value={`${result.score.responseSafety}%`} />
            <StatCard label="Platform Readiness" value={`${result.score.platformReadiness}%`} />
            <StatCard label="Threat Coverage" value={`${result.score.threatCoverage}%`} />
          </div>

          {result.whyNotPerfect && result.whyNotPerfect.length > 0 && (
            <Section title="Why This Is Not 100% Yet" icon={<AlertTriangle className="w-4 h-4 text-yellow-300" />}>
              <ul className="space-y-2 text-sm text-muted-foreground">{result.whyNotPerfect.map((i, idx) => <li key={idx}>• {i}</li>)}</ul>
            </Section>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <Section title="Top 3 Recommended Fixes" icon={<ListChecks className="w-4 h-4 text-accent" />} description="Priority-focused view to avoid recommendation overload.">
            <div className="space-y-3">
              {topRecommendations.map((rec) => <RecommendationCard key={rec.id} recommendation={rec} />)}
              {topRecommendations.length === 0 && <p className="text-sm text-muted-foreground">No immediate enhancement is required. Continue tenant validation.</p>}
            </div>
          </Section>
          <DetailBlock title={`View all recommendations (${allRecommendations.length})`}>
            <div className="space-y-3">{allRecommendations.slice(3).map((rec) => <RecommendationCard key={rec.id} recommendation={rec} />)}</div>
          </DetailBlock>
          <ApplyEnhancementPreview patches={result.autoHardeningPlan} />
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-4">
          {result.tenantValidationChecklist && (
            <Section title="Tenant Validation Center" icon={<ClipboardCheck className="w-4 h-4 text-accent" />} description="Checklist items can later drive tenant-specific readiness learning.">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground"><tr className="border-b border-border"><th className="text-left py-2 pr-3">Validation Item</th><th className="text-left py-2 pr-3">Status</th><th className="text-left py-2 pr-3">Owner</th><th className="text-left py-2 pr-3">Evidence</th></tr></thead>
                  <tbody>{result.tenantValidationChecklist.map((i) => <tr key={i.id} className="border-b border-border/60"><td className="py-2 pr-3 font-medium">{i.label}</td><td className="py-2 pr-3">{pretty(i.status)}</td><td className="py-2 pr-3 text-muted-foreground">{i.owner}</td><td className="py-2 pr-3 text-muted-foreground">{i.validationEvidence}</td></tr>)}</tbody>
                </table>
              </div>
            </Section>
          )}
          {result.testCaseRecommendations && (
            <Section title="Suggested Validation Tests" icon={<TestTube2 className="w-4 h-4 text-accent" />}>
              <div className="grid md:grid-cols-2 gap-3">
                {result.testCaseRecommendations.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                    <p className="font-medium">{t.scenario}</p>
                    <p className="text-muted-foreground mt-1">Expected: {t.expectedPath}</p>
                    <p className="text-xs text-muted-foreground mt-2">Evidence: {t.expectedEvidence.join(', ')}</p>
                    <p className="text-xs mt-2">Approval: {t.approvalExpected ? 'Yes' : 'No'} · Rollback: {t.rollbackExpected ? 'Yes' : 'No'}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
          <LearningFeedbackPanel result={result} />
        </div>
      )}

      {activeTab === 'threat' && (
        <div className="space-y-4">
          {result.detectionQueryPack && (
            <Section title="Detection Query Pack" icon={<Search className="w-4 h-4 text-accent" />}>
              <div className="space-y-3">
                {result.detectionQueryPack.map((i, idx) => (
                  <DetailBlock key={idx} title={`${i.name} — ${i.logSource}`}>
                    <p><strong>Required fields:</strong> {i.requiredFields.join(', ')}</p>
                    <p className="mt-2"><strong>Sigma idea:</strong> {i.sigmaIdea}</p>
                    <p className="mt-2"><strong>KQL hint:</strong> {i.kqlHint}</p>
                    <p className="mt-2"><strong>SPL hint:</strong> {i.splHint}</p>
                    <p className="mt-2"><strong>False-positive filters:</strong> {i.falsePositiveFilters.join(', ')}</p>
                  </DetailBlock>
                ))}
              </div>
            </Section>
          )}
          {result.actionRiskMatrix && result.actionRiskMatrix.length > 0 && (
            <Section title="Action Risk Matrix" icon={<ShieldAlert className="w-4 h-4 text-accent" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground"><tr className="border-b border-border"><th className="text-left py-2 pr-3">Action</th><th className="text-left py-2 pr-3">Risk</th><th className="text-left py-2 pr-3">Guardrail</th><th className="text-left py-2 pr-3">Rollback</th><th className="text-left py-2 pr-3">Tenant Validation</th></tr></thead>
                  <tbody>{result.actionRiskMatrix.map((a, idx) => <tr key={idx} className="border-b border-border/60"><td className="py-2 pr-3 font-medium">{a.action}</td><td className="py-2 pr-3"><span className={`inline-flex rounded border px-2 py-0.5 text-xs ${riskClass(a.riskLevel)}`}>{pretty(a.riskLevel)}</span></td><td className="py-2 pr-3 text-muted-foreground">{a.requiredGuardrail}</td><td className="py-2 pr-3 text-muted-foreground">{a.rollbackPath}</td><td className="py-2 pr-3 text-muted-foreground">{a.tenantValidation}</td></tr>)}</tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          <Section title="Security Knowledge Base" icon={<Database className="w-4 h-4 text-accent" />} description="Visible source coverage without exposing raw internals or overwhelming the user.">
            <div className="grid md:grid-cols-2 gap-3">
              {(result.knowledgeSources ?? []).map((s, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium text-sm">{s.source}</p><span className={`rounded border px-2 py-0.5 text-[11px] ${sourceClass(s.status)}`}>{pretty(s.status)}</span></div>
                  <p className="text-xs text-muted-foreground mt-1">{s.purpose}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">Version: {s.version} · Last check: {s.lastChecked} · Mode: {pretty(s.updateMode)}</p>
                </div>
              ))}
            </div>
          </Section>
          {result.liveKnowledgeUpdateReview ? (
            <KnowledgeUpdateCenter review={result.liveKnowledgeUpdateReview} />
          ) : result.knowledgeUpdateInsight && (
            <Section title="Knowledge Update Center" icon={<UploadCloud className="w-4 h-4 text-accent" />}>
              <p className="text-sm text-muted-foreground">{result.knowledgeUpdateInsight.summary}</p>
              <div className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-sm">
                <p><strong>Status:</strong> {pretty(result.knowledgeUpdateInsight.status)}</p>
                <p className="mt-1"><strong>Affected templates:</strong> {result.knowledgeUpdateInsight.affectedTemplates.join(', ') || 'None identified'}</p>
                <p className="mt-1"><strong>Recommended action:</strong> {result.knowledgeUpdateInsight.recommendedAction}</p>
              </div>
            </Section>
          )}
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className="space-y-4">
          {result.customerDeliveryPackManifest && (
            <Section title="Customer Delivery Pack" icon={<PackageCheck className="w-4 h-4 text-accent" />} description="Everything needed for customer handover, validation, and presentation.">
              <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {result.customerDeliveryPackManifest.map((i, idx) => <div key={idx} className="rounded-lg border border-border bg-background/40 p-3">✓ <span className="font-medium text-foreground">{i.file}</span><br /><span className="text-xs">{i.purpose}</span></div>)}
              </div>
            </Section>
          )}
          {result.intelligenceViews && (
            <Section title="Executive / Analyst / Engineer Views" icon={<BadgeCheck className="w-4 h-4 text-accent" />}>
              <div className="grid md:grid-cols-3 gap-3">
                {result.intelligenceViews.map((v) => (
                  <div key={v.view} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                    <p className="font-semibold">{v.title}</p>
                    <p className="text-xs text-accent mt-1">{v.focus}</p>
                    <p className="text-xs text-muted-foreground mt-2">{v.summary}</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{v.keyPoints.map((p, idx) => <li key={idx}>• {p}</li>)}</ul>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          {result.analysisTrace && (
            <Section title="SOARForge Analysis Trace" icon={<GitBranch className="w-4 h-4 text-accent" />} description="Shows the reasoning path SOARForge followed to build the assessment.">
              <ol className="space-y-2 text-sm text-muted-foreground">
                {result.analysisTrace.map((t) => <li key={t.step} className="rounded-lg border border-border bg-background/40 p-3"><span className="font-semibold text-foreground">{t.step}. {t.label}</span> <span className="text-xs text-accent">({pretty(t.layer)})</span><br />{t.detail}</li>)}
              </ol>
            </Section>
          )}
          {result.connectorPermissionAdvisor && (
            <Section title="Connector Permission Advisor" icon={<KeyRound className="w-4 h-4 text-accent" />}>
              <div className="grid md:grid-cols-2 gap-3">{result.connectorPermissionAdvisor.map((i, idx) => <div key={idx} className="rounded-lg border border-border bg-background/40 p-3 text-sm"><p className="font-medium">{i.connector}</p><p className="text-xs text-muted-foreground mt-1">{i.requiredPermissions.join('; ')}</p><p className="text-xs text-muted-foreground mt-2">Failure modes: {i.commonFailureModes.join('; ')}</p></div>)}</div>
            </Section>
          )}
          {result.platformCapabilityWarnings && result.platformCapabilityWarnings.length > 0 && (
            <Section title="Platform Capability Notes" icon={<Layers className="w-4 h-4 text-accent" />}>
              <ul className="space-y-2 text-sm text-muted-foreground">{result.platformCapabilityWarnings.map((i, idx) => <li key={idx}>• <span className="font-medium text-foreground">{i.capability}:</span> {i.warning} {i.recommendation}</li>)}</ul>
            </Section>
          )}
          <Section title="Ask SOARForge" icon={<HelpCircle className="w-4 h-4 text-accent" />}>
            <div className="grid md:grid-cols-2 gap-3">
              {(result.askSoarForge ?? []).map((qa, idx) => <div key={idx} className="rounded-lg border border-border bg-background/40 p-3"><p className="font-medium text-sm">{qa.question}</p><p className="text-sm text-muted-foreground mt-1">{qa.answer}</p></div>)}
            </div>
          </Section>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-accent" /> Safety Guardrails</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">{result.safetyGuardrails.map((item, idx) => <li key={idx}>• {item}</li>)}</ul>
          </div>
        </div>
      )}

      {result.knowledgeBaseVersion && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Knowledge Base Version: Threat {result.knowledgeBaseVersion.threatKnowledge} · Platform Compatibility {result.knowledgeBaseVersion.platformCompatibility} · Recommendation Rules {result.knowledgeBaseVersion.recommendationRules}. Advanced sections are available on demand to keep the main workflow focused.
        </p>
      )}
    </div>
  );
}
