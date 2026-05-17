'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { getScoringPreset, getPresetLabel } from '@/lib/soar-scoring-presets';
import type { ScoringRule, ScoringThreshold, ScoringType } from '@/lib/soar-types';

const SCORING_METHODS = [
  { id: 'additive' as const, label: 'Additive', description: 'Sum points from matching rules.', icon: '➕' },
  { id: 'weighted' as const, label: 'Weighted', description: 'Weighted average across factors.', icon: '⚖️' },
  { id: 'consensus' as const, label: 'Consensus', description: 'Agreement across multiple sources.', icon: '🤝' },
  { id: 'severity' as const, label: 'Severity-Based', description: 'Map alert severity to action.', icon: '⚡' },
  { id: 'mitre' as const, label: 'MITRE-Based', description: 'Score by MITRE technique coverage.', icon: '🎯' },
  { id: 'asset_criticality' as const, label: 'Asset Criticality', description: 'Adjust by asset tier.', icon: '💎' },
  { id: 'user_risk' as const, label: 'User Risk', description: 'Score by user risk profile.', icon: '👤' },
  { id: 'hybrid' as const, label: 'Hybrid', description: 'Combine multiple scoring methods.', icon: '🔀' },
  { id: 'none' as const, label: 'No Scoring', description: 'Rule-based without numeric scoring.', icon: '◯' },
] as const;

export default function Step5Scoring() {
  const { playbook, setPlaybook } = useSoarStore();
  const { scoringModel, templateId, name: playbookName } = playbook;
  const [notification, setNotification] = useState<string | null>(null);

  /**
   * Apply full scoring preset: REPLACES entire scoring model
   */
  const applyFullScoringPreset = (scoringType: ScoringType) => {
    const templateIdToUse = playbook.templateId || playbook.generatorType || 'ransomware';
    const preset = getScoringPreset(templateIdToUse, scoringType);

    const nextScoringModel = {
      type: scoringType,
      severity: preset.severity || playbook.severity || 'medium',
      rules: (preset.rules || []).map((rule) => ({ ...rule })),
      thresholds: (preset.thresholds || []).map((threshold) => ({ ...threshold })),
      approvalRecommendation: preset.approvalRecommendation || '',
      actionRecommendation: preset.actionRecommendation || '',
      decisionLogic: preset.decisionLogic || '',
      mitreMapping: [...(preset.mitreMapping || [])],
    };

    setPlaybook({
      ...playbook,
      scoringModel: nextScoringModel,
    });

    const scoreTypeName = SCORING_METHODS.find((m) => m.id === scoringType)?.label;
    setNotification(`Scoring method changed to ${scoreTypeName}.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateScoringModel = (field: string, value: any) => {
    setPlaybook({
      ...playbook,
      scoringModel: { ...scoringModel, [field]: value },
    });
  };

  const handleAddRule = () => {
    const newRule: ScoringRule = {
      id: `r${Date.now()}`,
      label: 'New Rule',
      condition: '',
      points: 1,
      mitre: '',
    };
    handleUpdateScoringModel('rules', [...(scoringModel.rules || []), newRule]);
  };

  const handleUpdateRule = (ruleId: string, field: string, value: any) => {
    const updated = (scoringModel.rules || []).map((r) =>
      r.id === ruleId ? { ...r, [field]: value } : r
    );
    handleUpdateScoringModel('rules', updated);
  };

  const handleDeleteRule = (ruleId: string) => {
    handleUpdateScoringModel('rules', (scoringModel.rules || []).filter((r) => r.id !== ruleId));
  };

  const handleAddThreshold = () => {
    const newThreshold: ScoringThreshold = {
      label: 'New Threshold',
      minScore: 0,
      maxScore: 10,
      action: 'skip',
      description: '',
    };
    handleUpdateScoringModel('thresholds', [...(scoringModel.thresholds || []), newThreshold]);
  };

  const handleUpdateThreshold = (index: number, field: string, value: any) => {
    const updated = (scoringModel.thresholds || []).map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    handleUpdateScoringModel('thresholds', updated);
  };

  const handleDeleteThreshold = (index: number) => {
    handleUpdateScoringModel('thresholds', (scoringModel.thresholds || []).filter((_, i) => i !== index));
  };

  const totalMaxScore = (scoringModel.rules || []).reduce((sum, r) => sum + r.points, 0);
  const isNoScoring = scoringModel.type === 'none';
  const isWeighted = scoringModel.type === 'weighted';
  const isHybrid = scoringModel.type === 'hybrid';
  const isMitre = scoringModel.type === 'mitre';
  const presetLabel = getPresetLabel(playbookName || templateId || 'Custom', (scoringModel.type || 'additive') as ScoringType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 5: Scoring Model</h1>
        <p className="text-muted-foreground">Define the risk scoring rules and decision thresholds for this playbook.</p>
        <p className="text-xs text-muted-foreground mt-2">
          Current preset: <span className="font-semibold">{presetLabel}</span>
        </p>
        <p className="text-xs text-cyan-400 mt-1">
          Rules loaded: {(scoringModel.rules || []).map((r) => r.label).join(', ') || 'None'}
        </p>
      </div>

      {notification && (
        <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-400">{notification}</p>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Scoring Method</h2>
        <div className="grid grid-cols-3 gap-3">
          {SCORING_METHODS.map((method) => {
            const selected = scoringModel.type === method.id;
            return (
              <button
                key={method.id}
                onClick={() => applyFullScoringPreset(method.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selected ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400' : 'border-border hover:border-cyan-700/50 bg-card'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-lg">{method.icon}</span>
                  {selected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="font-medium text-sm mb-1">{method.label}</p>
                <p className="text-xs text-muted-foreground leading-tight">{method.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {isNoScoring && (
        <div className="p-4 bg-amber-900/20 border border-amber-800/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400 mb-1">No numeric scoring is enabled</p>
            <p className="text-xs text-amber-300/80">
              Decisions will use fixed routing, approvals, or manual workflow branches. Numeric thresholds will not be used in export.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-border/50">
          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Severity Level</label>
          <select
            value={scoringModel.severity}
            onChange={(e) => handleUpdateScoringModel('severity', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Card>
        <Card className="p-4 border-border/50">
          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Decision Logic</label>
          <Input
            value={scoringModel.decisionLogic || ''}
            onChange={(e) => handleUpdateScoringModel('decisionLogic', e.target.value)}
            placeholder="e.g., Auto-isolate if score >= 8"
            className="text-sm"
          />
        </Card>
      </div>

      {!isNoScoring && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Scoring Rules{' '}
              {totalMaxScore > 0 && (isWeighted || isHybrid)
                ? `(Total Weight: ${totalMaxScore}%)`
                : totalMaxScore > 0
                  ? `(Max: ${totalMaxScore})`
                  : ''}
            </h2>
            <Button size="sm" onClick={handleAddRule} className="gap-1">
              <Plus className="w-3 h-3" /> Add Rule
            </Button>
          </div>
          <div className="space-y-3">
            {(scoringModel.rules || []).map((rule) => (
              <Card key={rule.id} className="p-4 border-border/50 bg-muted/20">
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <Input
                    value={rule.label}
                    onChange={(e) => handleUpdateRule(rule.id, 'label', e.target.value)}
                    placeholder="Rule label"
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    value={rule.points}
                    onChange={(e) => handleUpdateRule(rule.id, 'points', parseInt(e.target.value) || 0)}
                    placeholder={isWeighted || isHybrid ? 'Weight %' : 'Points'}
                    className="text-sm"
                  />
                  {isMitre && (
                    <Input
                      value={rule.mitre || ''}
                      onChange={(e) => handleUpdateRule(rule.id, 'mitre', e.target.value)}
                      placeholder="MITRE Tactic"
                      className="text-sm"
                    />
                  )}
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  value={rule.condition || ''}
                  onChange={(e) => handleUpdateRule(rule.id, 'condition', e.target.value)}
                  placeholder="Condition"
                  className="text-xs"
                />
              </Card>
            ))}
            {(scoringModel.rules || []).length === 0 && (
              <p className="text-xs text-muted-foreground p-4 text-center rounded border border-dashed border-border">
                No rules configured for this method.
              </p>
            )}
          </div>
        </div>
      )}

      {!isNoScoring && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Decision Thresholds</h2>
            <Button size="sm" onClick={handleAddThreshold} className="gap-1">
              <Plus className="w-3 h-3" /> Add Threshold
            </Button>
          </div>
          <div className="space-y-3">
            {(scoringModel.thresholds || []).map((threshold, idx) => (
              <Card key={idx} className="p-4 border-border/50 bg-muted/20">
                <div className="grid grid-cols-5 gap-3 mb-3">
                  <Input
                    value={threshold.label}
                    onChange={(e) => handleUpdateThreshold(idx, 'label', e.target.value)}
                    placeholder="Label"
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    value={threshold.minScore}
                    onChange={(e) => handleUpdateThreshold(idx, 'minScore', parseInt(e.target.value) || 0)}
                    placeholder="Min"
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    value={threshold.maxScore}
                    onChange={(e) => handleUpdateThreshold(idx, 'maxScore', parseInt(e.target.value) || 100)}
                    placeholder="Max"
                    className="text-sm"
                  />
                  <select
                    value={threshold.action}
                    onChange={(e) => handleUpdateThreshold(idx, 'action', e.target.value)}
                    className="px-2 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                  >
                    <option value="skip">Skip</option>
                    <option value="analyst_approval">Approval</option>
                    <option value="auto_contain">Auto Contain</option>
                    <option value="escalate">Escalate</option>
                    <option value="monitor">Monitor</option>
                    <option value="ticket">Ticket</option>
                  </select>
                  <button
                    onClick={() => handleDeleteThreshold(idx)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  value={threshold.description}
                  onChange={(e) => handleUpdateThreshold(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="text-xs"
                />
              </Card>
            ))}
            {(scoringModel.thresholds || []).length === 0 && (
              <p className="text-xs text-muted-foreground p-4 text-center rounded border border-dashed border-border">
                No thresholds configured for this method.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-border/50">
          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Approval Recommendation</label>
          <textarea
            value={scoringModel.approvalRecommendation || ''}
            onChange={(e) => handleUpdateScoringModel('approvalRecommendation', e.target.value)}
            placeholder="Guidance for approval step"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-xs"
            rows={3}
          />
        </Card>
        <Card className="p-4 border-border/50">
          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Action Recommendation</label>
          <textarea
            value={scoringModel.actionRecommendation || ''}
            onChange={(e) => handleUpdateScoringModel('actionRecommendation', e.target.value)}
            placeholder="Recommended actions for each threshold"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-xs"
            rows={3}
          />
        </Card>
      </div>
    </div>
  );
}
