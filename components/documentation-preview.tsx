'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download, Copy, CheckCircle, AlertTriangle, XCircle, Info, FileText,
  Printer, ExternalLink, ChevronDown, ChevronRight, Shield, Target, Zap,
} from 'lucide-react';
import type { CustomerDocument, DocumentExportFormat } from '@/lib/documentation/documentation-types';
import { exportToMarkdown, exportToHTML, BETA_LOGO_BASE64 } from '@/lib/documentation/customer-documentation-generator';
import { generateArchitectureDiagramSVG, generateDecisionFlowSVG } from '@/lib/documentation/diagram-generator';

interface DocumentationPreviewProps {
  document: CustomerDocument;
}

type PreviewSection =
  | 'summary'
  | 'workflow'
  | 'scoring'
  | 'connectors'
  | 'actions'
  | 'testing'
  | 'deployment';

export function DocumentationPreview({ document: doc }: DocumentationPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<PreviewSection>>(
    new Set(['summary', 'workflow', 'scoring'])
  );

  const toggleSection = (section: PreviewSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const markdown = useMemo(() => exportToMarkdown(doc), [doc]);
  const html = useMemo(() => exportToHTML(doc, true), [doc]);
  const archDiagram = useMemo(() => generateArchitectureDiagramSVG(doc), [doc]);
  const decisionDiagram = useMemo(() => generateDecisionFlowSVG(doc), [doc]);

  const handleCopy = (format: DocumentExportFormat) => {
    const content = format === 'markdown' ? markdown : html;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: DocumentExportFormat) => {
    const content = format === 'markdown' ? markdown : html;
    const ext = format === 'markdown' ? 'md' : 'html';
    const mime = format === 'markdown' ? 'text/markdown' : 'text/html';
    const slug = doc.metadata.playbookName.toLowerCase().replace(/\s+/g, '-');
    const filename = `${slug}_customer_documentation.${ext}`;

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const isExpanded = (section: PreviewSection) => expandedSections.has(section);

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{doc.metadata.playbookName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Customer Implementation Guide
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2 py-0.5 text-xs rounded border bg-accent/10 border-accent/30 text-accent">
                  {doc.metadata.platformName}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded border ${
                  doc.metadata.directImportSupported 
                    ? 'bg-green-900/20 border-green-800/30 text-green-400'
                    : 'bg-blue-900/20 border-blue-800/30 text-blue-400'
                }`}>
                  {doc.metadata.exportType === 'direct_import' ? 'Direct Import' : 'Blueprint Only'}
                </span>
                <span className="px-2 py-0.5 text-xs rounded border bg-muted/50 border-border text-muted-foreground">
                  v{doc.metadata.version}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy('markdown')}>
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy MD'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownload('markdown')}>
              <Download className="w-4 h-4" />
              Download MD
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownload('printable_html')}>
              <Download className="w-4 h-4" />
              Download HTML
            </Button>
            <Button size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Branding Bar */}
      <Card className="p-4 bg-gradient-to-r from-[#1e3a5f] to-[#0d47a1]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={BETA_LOGO_BASE64}
              alt="Beta Integrated Solutions"
              className="h-10 rounded"
            />
            <div>
              <p className="text-white font-semibold">SOARForge Professional</p>
              <p className="text-white/70 text-sm">Beta Integrated Solutions</p>
            </div>
          </div>
          <div className="text-right text-white/70 text-sm">
            <p>Generated: {doc.metadata.generatedAt}</p>
            <p>Classification: {doc.metadata.classification}</p>
          </div>
        </div>
      </Card>

      {/* Architecture Diagram */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          Architecture Overview
        </h4>
        <div 
          className="bg-muted/30 rounded-lg p-4 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: archDiagram }}
        />
      </Card>

      {/* Decision Flow Diagram */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          Decision Flow
        </h4>
        <div 
          className="bg-muted/30 rounded-lg p-4 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: decisionDiagram }}
        />
      </Card>

      {/* Executive Summary */}
      <CollapsibleSection
        title="Executive Summary"
        icon={<Info className="w-4 h-4" />}
        isExpanded={isExpanded('summary')}
        onToggle={() => toggleSection('summary')}
      >
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {doc.executiveSummary}
          </div>
        </div>
      </CollapsibleSection>

      {/* Configuration Summary */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Configuration Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoItem label="Playbook Name" value={doc.configurationSummary.playbookName} />
          <InfoItem label="Use Case" value={doc.configurationSummary.useCase} />
          <InfoItem label="Target Platform" value={doc.configurationSummary.targetPlatform} />
          <InfoItem label="Export Mode" value={doc.configurationSummary.exportMode} />
          <InfoItem label="Severity" value={doc.configurationSummary.severity} />
          <InfoItem label="Owner" value={doc.configurationSummary.owner} />
        </div>
      </Card>

      {/* Workflow Steps */}
      <CollapsibleSection
        title={`Workflow Steps (${doc.workflowSteps.length})`}
        icon={<Shield className="w-4 h-4" />}
        isExpanded={isExpanded('workflow')}
        onToggle={() => toggleSection('workflow')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Step Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Purpose</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Verify</th>
              </tr>
            </thead>
            <tbody>
              {doc.workflowSteps.map((step) => (
                <tr key={step.stepNumber} className="border-b border-border/50">
                  <td className="px-3 py-2 text-muted-foreground">{step.stepNumber}</td>
                  <td className="px-3 py-2 font-medium">{step.name}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-muted border border-border">
                      {step.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs max-w-xs truncate">
                    {step.purpose}
                  </td>
                  <td className="px-3 py-2">
                    {step.tenantVerification ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Scoring Model */}
      <CollapsibleSection
        title="Scoring Model"
        icon={<Target className="w-4 h-4" />}
        isExpanded={isExpanded('scoring')}
        onToggle={() => toggleSection('scoring')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{doc.scoringModel.type}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Max Score:</span>
            <span className="font-medium">{doc.scoringModel.maxScore}</span>
          </div>

          <div>
            <h5 className="text-sm font-medium mb-2">Scoring Rules</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rule</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Condition</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Points</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">MITRE</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.scoringModel.rules.map((rule, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{rule.rule}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{rule.condition}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">
                          +{rule.points}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{rule.mitre || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium mb-2">Decision Thresholds</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Score Range</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Decision</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.scoringModel.thresholds.map((t, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-2 font-mono">{t.scoreRange}</td>
                      <td className="px-3 py-2 font-medium">{t.decision}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.action}</td>
                      <td className="px-3 py-2">
                        {t.approvalRequired ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-orange-900/20 text-orange-400 border border-orange-800/30">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Connector Matrix */}
      <CollapsibleSection
        title={`Connector Matrix (${doc.connectorMatrix.length})`}
        icon={<ExternalLink className="w-4 h-4" />}
        isExpanded={isExpanded('connectors')}
        onToggle={() => toggleSection('connectors')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Connector</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Used For</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Platform Equivalent</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {doc.connectorMatrix.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-3 py-2 font-medium">{c.connector}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-muted border border-border">
                      {c.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.usedFor}</td>
                  <td className="px-3 py-2 text-xs font-mono">{c.platformEquivalent}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-900/20 text-blue-400 border border-blue-800/30">
                      {c.verificationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Response Actions */}
      <CollapsibleSection
        title={`Response Actions (${doc.responseActions.length})`}
        icon={<Zap className="w-4 h-4" />}
        isExpanded={isExpanded('actions')}
        onToggle={() => toggleSection('actions')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Destructive</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Approval</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rollback</th>
              </tr>
            </thead>
            <tbody>
              {doc.responseActions.map((a, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-3 py-2 font-medium">{a.action}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-muted border border-border">
                      {a.category}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {a.destructive ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.approvalRecommended ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-orange-900/20 text-orange-400 border border-orange-800/30">
                        Recommended
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{a.rollbackAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Testing Plan */}
      <CollapsibleSection
        title={`Testing Plan (${doc.testCases.length} cases)`}
        icon={<CheckCircle className="w-4 h-4" />}
        isExpanded={isExpanded('testing')}
        onToggle={() => toggleSection('testing')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">ID</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Scenario</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Expected Result</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pass Criteria</th>
              </tr>
            </thead>
            <tbody>
              {doc.testCases.map((t) => (
                <tr key={t.testId} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono text-accent">{t.testId}</td>
                  <td className="px-3 py-2 font-medium">{t.scenario}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.expectedResult}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.passCriteria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Deployment Checklist */}
      <CollapsibleSection
        title={`Deployment Checklist (${doc.deploymentChecklist.length} items)`}
        icon={<AlertTriangle className="w-4 h-4" />}
        isExpanded={isExpanded('deployment')}
        onToggle={() => toggleSection('deployment')}
      >
        <div className="space-y-2">
          {doc.deploymentChecklist.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/30">
              <div className="w-5 h-5 border-2 border-muted-foreground rounded flex-shrink-0" />
              <span className="text-sm">{item.step}</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Readiness Summary */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Readiness Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {doc.readinessChecks.map((check, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded bg-muted/30 border border-border/50">
              {check.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
              {check.status === 'fail' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{check.check}</p>
                <p className="text-xs text-muted-foreground truncate">{check.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Limitations */}
      <Card className="p-6 border-yellow-900/30">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Limitations & Assumptions
        </h4>
        <div className="space-y-3">
          {doc.limitations.map((l, i) => (
            <div key={i} className="p-3 rounded bg-yellow-900/10 border border-yellow-900/20">
              <p className="text-sm font-medium text-yellow-400">{l.category}</p>
              <p className="text-sm text-muted-foreground mt-1">{l.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Footer */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <p><strong>Prepared by:</strong> {doc.metadata.preparedBy}</p>
            <p><strong>Prepared for:</strong> {doc.metadata.preparedFor}</p>
          </div>
          <div className="text-right">
            <p><strong>Document Version:</strong> {doc.metadata.version}</p>
            <p><strong>Generated:</strong> {doc.metadata.generatedAt}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Helper Components ───────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded bg-muted/30 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-accent">{icon}</span>
          <h4 className="font-semibold text-left">{title}</h4>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4">
          {children}
        </div>
      )}
    </Card>
  );
}

export default DocumentationPreview;
