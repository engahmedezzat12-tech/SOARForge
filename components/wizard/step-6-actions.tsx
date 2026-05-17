'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Zap, Lock, RotateCcw } from 'lucide-react';
import {
  FORTISOAR_ACTION_REGISTRY,
  FORTISOAR_CONNECTOR_TEMPLATES,
} from '@/lib/fortisoar-action-registry';

const CATEGORY_ORDER = [
  'EDR',
  'Identity',
  'Firewall',
  'Email',
  'Threat Intel',
  'Sandbox',
  'Ticketing',
  'Notification',
  'SIEM',
];

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-900/20 border-red-800/30 text-red-400',
  high: 'bg-orange-900/20 border-orange-800/30 text-orange-400',
  medium: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-400',
  low: 'bg-blue-900/20 border-blue-800/30 text-blue-400',
};

const getRegistryActions = () =>
  [...FORTISOAR_ACTION_REGISTRY].sort((a, b) => {
    const categoryA = CATEGORY_ORDER.indexOf(a.category);
    const categoryB = CATEGORY_ORDER.indexOf(b.category);
    const safeCategoryA = categoryA === -1 ? CATEGORY_ORDER.length : categoryA;
    const safeCategoryB = categoryB === -1 ? CATEGORY_ORDER.length : categoryB;

    if (safeCategoryA !== safeCategoryB) return safeCategoryA - safeCategoryB;
    return a.displayName.localeCompare(b.displayName);
  });

export default function Step6Actions() {
  const { playbook, setPlaybook } = useSoarStore();

  const handleAddAction = (actionId: string) => {
    if (!playbook.actions.includes(actionId)) {
      setPlaybook({
        ...playbook,
        actions: [...playbook.actions, actionId],
      });
    }
  };

  const handleRemoveAction = (actionId: string) => {
    setPlaybook({
      ...playbook,
      actions: playbook.actions.filter((a) => a !== actionId),
    });
  };

  const registryActions = getRegistryActions();
  const selectedActions = registryActions.filter((action) => playbook.actions.includes(action.actionId));
  const availableActions = registryActions.filter((action) => !playbook.actions.includes(action.actionId));

  const grouped = availableActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, typeof availableActions>);

  const groupedCategories = Object.keys(grouped).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    const safeIndexA = indexA === -1 ? CATEGORY_ORDER.length : indexA;
    const safeIndexB = indexB === -1 ? CATEGORY_ORDER.length : indexB;
    return safeIndexA - safeIndexB || a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 6: Response Actions</h1>
        <p className="text-muted-foreground">
          Select the automated and manual actions this playbook will execute in response to alerts.
        </p>
      </div>

      {/* Selected Actions */}
      {selectedActions.length > 0 && (
        <Card className="p-6 border-border/50 bg-green-900/5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-green-400" />
            <h2 className="font-semibold">Selected Actions ({selectedActions.length})</h2>
          </div>
          <div className="space-y-2">
            {selectedActions.map((action) => {
              const connector = FORTISOAR_CONNECTOR_TEMPLATES[action.connectorKey];

              return (
                <div key={action.actionId} className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{action.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.actionId} · {connector?.displayName ?? action.connectorKey}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge className={RISK_COLORS[action.riskLevel]}>
                        {action.riskLevel.toUpperCase()}
                      </Badge>
                      {action.approvalRequired && (
                        <Badge className="bg-blue-900/20 border-blue-800/30 text-blue-400">
                          <Lock className="w-3 h-3 mr-1 inline" /> Approval
                        </Badge>
                      )}
                      {action.rollbackAction && (
                        <Badge variant="outline" className="text-xs">
                          <RotateCcw className="w-3 h-3 mr-1 inline" /> Rollback
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAction(action.actionId)}
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Available Actions */}
      <div>
        <h2 className="font-semibold mb-4">Available Actions</h2>
        <div className="space-y-4">
          {groupedCategories.map((category) => (
            <Card key={category} className="p-4 border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">{category}</p>
              <div className="space-y-2">
                {grouped[category].map((action) => {
                  const connector = FORTISOAR_CONNECTOR_TEMPLATES[action.connectorKey];

                  return (
                    <div
                      key={action.actionId}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted/30 transition"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{action.displayName}</p>
                          <Badge className={RISK_COLORS[action.riskLevel]}>
                            {action.riskLevel.toUpperCase()}
                          </Badge>
                          {action.approvalRequired && (
                            <Badge className="bg-blue-900/20 border-blue-800/30 text-blue-400">
                              <Lock className="w-3 h-3 mr-1 inline" /> Approval
                            </Badge>
                          )}
                          {action.rollbackAction && (
                            <Badge variant="outline" className="text-xs">
                              <RotateCcw className="w-3 h-3 mr-1 inline" /> Rollback
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.actionId} · {connector?.displayName ?? action.connectorKey} · {action.operationTitle}
                        </p>
                        {action.requiredParams.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Required: {action.requiredParams.join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddAction(action.actionId)}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Info */}
      <Card className="p-4 bg-blue-900/10 border-blue-800/30">
        <p className="text-sm font-medium text-blue-400 mb-2">Registry-Based Actions</p>
        <p className="text-xs text-muted-foreground">
          This step now reads directly from the FortiSOAR action registry. Selected action IDs match the generated
          workflow, connector checklist, rollback metadata, and documentation output.
        </p>
      </Card>
    </div>
  );
}
