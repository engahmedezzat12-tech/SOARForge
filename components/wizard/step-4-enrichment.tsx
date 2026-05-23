'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, CheckCircle } from 'lucide-react';
import { FORTISOAR_CONNECTOR_TEMPLATES } from '@/lib/fortisoar-action-registry';
import { cleanupSelectionsByContract, getVisibleConnectorKeys } from '@/lib/capability-contract';

const CATEGORY_ORDER = [
  'EDR',
  'SIEM',
  'Threat Intel',
  'Identity',
  'Firewall',
  'Email',
  'Email Security',
  'Sandbox',
  'Notification',
  'Ticketing',
];

const formatCategory = (category: string) => category.toUpperCase();

const getConnectorEntries = () =>
  Object.entries(FORTISOAR_CONNECTOR_TEMPLATES)
    .map(([id, template]) => ({ id, ...template }))
    .sort((a, b) => {
      const categoryA = CATEGORY_ORDER.indexOf(a.category);
      const categoryB = CATEGORY_ORDER.indexOf(b.category);
      const safeCategoryA = categoryA === -1 ? CATEGORY_ORDER.length : categoryA;
      const safeCategoryB = categoryB === -1 ? CATEGORY_ORDER.length : categoryB;

      if (safeCategoryA !== safeCategoryB) return safeCategoryA - safeCategoryB;
      return a.displayName.localeCompare(b.displayName);
    });

export default function Step4Enrichment() {
  const { playbook, setPlaybook } = useSoarStore();

  const handleAddConnector = (connectorId: string) => {
    if (!playbook.enrichmentConnectors.includes(connectorId)) {
      setPlaybook(cleanupSelectionsByContract({
        ...playbook,
        enrichmentConnectors: [...playbook.enrichmentConnectors, connectorId],
      }));
    }
  };

  const handleRemoveConnector = (connectorId: string) => {
    setPlaybook(cleanupSelectionsByContract({
      ...playbook,
      enrichmentConnectors: playbook.enrichmentConnectors.filter((c) => c !== connectorId),
    }));
  };

  const visibleConnectorKeys = new Set(getVisibleConnectorKeys(playbook));
  const connectors = getConnectorEntries().filter((c) => visibleConnectorKeys.has(c.id));
  const selectedConnectors = connectors.filter((connector) =>
    playbook.enrichmentConnectors.includes(connector.id)
  );

  const availableConnectors = connectors.filter(
    (connector) => !playbook.enrichmentConnectors.includes(connector.id)
  );

  const groupedConnectors = availableConnectors.reduce((acc, connector) => {
    if (!acc[connector.category]) acc[connector.category] = [];
    acc[connector.category].push(connector);
    return acc;
  }, {} as Record<string, typeof availableConnectors>);

  const groupedCategories = Object.keys(groupedConnectors).sort((a, b) => {
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
        <h1 className="text-2xl font-bold mb-2">Step 4: Enrichment Sources</h1>
        <p className="text-muted-foreground">
          Select connectors to enrich alerts with external threat intelligence and asset data.
        </p>
      </div>

      {/* Selected Connectors */}
      {selectedConnectors.length > 0 && (
        <Card className="p-6 border-border/50 bg-green-900/5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <h2 className="font-semibold">Selected Enrichment Connectors ({selectedConnectors.length})</h2>
          </div>
          <div className="space-y-2">
            {selectedConnectors.map((connector) => (
              <div key={connector.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                <div>
                  <p className="text-sm font-medium">{connector.displayName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{connector.id}</p>
                    <Badge variant="outline" className="text-xs">
                      {connector.category}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveConnector(connector.id)}
                  className="hover:opacity-70 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Connectors by Category */}
      <div>
        <h2 className="font-semibold mb-4">Available Connectors</h2>
        <div className="space-y-4">
          {groupedCategories.map((category) => {
            const connectorsInCategory = groupedConnectors[category];

            return (
              <Card key={category} className="p-4 border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                  {formatCategory(category)}
                </p>
                <div className="space-y-2">
                  {connectorsInCategory.map((connector) => (
                    <div
                      key={connector.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 transition"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{connector.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {connector.id} · {connector.connector} · v{connector.version}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddConnector(connector.id)}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <Card className="p-4 bg-blue-900/10 border-blue-800/30">
        <p className="text-sm font-medium text-blue-400 mb-2">Registry-Based Enrichment</p>
        <p className="text-xs text-muted-foreground">
          This step now reads directly from the FortiSOAR connector registry. Connector IDs stay aligned with
          export packages, readiness checks, and generated documentation.
        </p>
      </Card>
    </div>
  );
}
