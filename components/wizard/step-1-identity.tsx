'use client';

import { useSoarStore } from '@/lib/soar-store';
import { PLAYBOOK_TEMPLATES } from '@/lib/soar-templates';
import { PlatformSelector } from '@/components/platform-selector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, Shield, Lock, AlertTriangle } from 'lucide-react';

export default function Step1Identity() {
  const { playbook, setPlaybook, loadTemplate } = useSoarStore();

  const handleTemplateSelect = (templateId: string) => {
    loadTemplate(templateId);
  };

  const handlePlaybookUpdate = (field: string, value: any) => {
    setPlaybook({
      ...playbook,
      [field]: value,
    });
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-900/20 border-red-800/30 text-red-400',
      high: 'bg-orange-900/20 border-orange-800/30 text-orange-400',
      medium: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-400',
      low: 'bg-blue-900/20 border-blue-800/30 text-blue-400',
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 1: Identity & Template</h1>
        <p className="text-muted-foreground">
          Select a predefined template or create a custom playbook. Templates auto-fill all steps with best practices.
        </p>
      </div>

      {/* Platform Selection */}
      <Card className="p-6 border-border/50 bg-muted/30">
        <PlatformSelector variant="inline" showDescription />
      </Card>

      {/* Playbook Details (if template loaded) */}
      {playbook.templateId && (
        <Card className="p-6 border-border/50 bg-muted/30">
          <h2 className="font-semibold mb-4">Playbook Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase">Name</label>
              <Input
                value={playbook.name}
                onChange={(e) => handlePlaybookUpdate('name', e.target.value)}
                className="mt-1"
                placeholder="Playbook name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Owner / Team</label>
              <Input
                value={playbook.owner}
                onChange={(e) => handlePlaybookUpdate('owner', e.target.value)}
                className="mt-1"
                placeholder="Your team name"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground uppercase">Description</label>
              <textarea
                value={playbook.description}
                onChange={(e) => handlePlaybookUpdate('description', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                placeholder="Detailed description of this playbook"
                rows={3}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Template Selection Grid */}
      <div>
        <h2 className="font-semibold mb-4">Available Templates</h2>
        <div className="grid grid-cols-2 gap-4">
          {PLAYBOOK_TEMPLATES.map((tpl) => (
            <Card
              key={tpl.id}
              className={`p-4 cursor-pointer transition-all border-2 ${
                playbook.templateId === tpl.id
                  ? 'border-blue-600/50 bg-blue-900/10'
                  : 'border-border hover:border-border/50 hover:bg-muted/30'
              }`}
              onClick={() => handleTemplateSelect(tpl.id)}
            >
              {/* Template Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground">{tpl.category}</p>
                </div>
                <Badge className={`${getSeverityColor(tpl.severity)}`}>
                  {tpl.severity.toUpperCase()}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {tpl.description}
              </p>

              {/* Metadata */}
              <div className="space-y-1.5 text-xs">
                {/* Required Connectors */}
                {tpl.requiredConnectorKeys && tpl.requiredConnectorKeys.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tpl.requiredConnectorKeys.slice(0, 3).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {tpl.requiredConnectorKeys.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{tpl.requiredConnectorKeys.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* MITRE Mapping */}
                {tpl.scoringModel?.mitreMapping && tpl.scoringModel.mitreMapping.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      MITRE: {tpl.scoringModel.mitreMapping.slice(0, 2).join(', ')}
                      {tpl.scoringModel.mitreMapping.length > 2 ? '...' : ''}
                    </span>
                  </div>
                )}

                {/* Auto-fill badge */}
                <div className="flex items-center gap-1 text-green-400">
                  <Zap className="w-3 h-3" />
                  <span>Auto-fills all steps</span>
                </div>
              </div>

              {/* Selection indicator */}
              {playbook.templateId === tpl.id && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-xs font-semibold text-blue-400">Selected</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Info Box */}
      {!playbook.templateId && (
        <Card className="p-4 bg-blue-900/10 border-blue-800/30">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Get Started</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select a predefined template above to auto-populate all wizard steps with best-practice scoring,
                actions, and thresholds. Or proceed manually to create a custom playbook.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
