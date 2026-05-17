'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

/**
 * Modal for editing connector configuration UUIDs and operations.
 * Shown from Step 11 Export when user clicks "Configure" on a connector.
 */
export default function ConnectorConfigModal() {
  const { deploymentProfile, connectorModal, updateConnectorConfig, updateConnectorOperation, closeConnectorModal } = useSoarStore();
  const [editMode, setEditMode] = useState<'config' | 'operation'>('config');

  if (!connectorModal.open || !connectorModal.focusKey) {
    return null;
  }

  const focusConnector = deploymentProfile.connectors[connectorModal.focusKey];
  if (!focusConnector) return null;

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const configUuid = String(formData.get('config-uuid') || '');
    updateConnectorConfig(connectorModal.focusKey!, configUuid);
  };

  const handleSaveOperation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const operation = String(formData.get('operation') || '');
    const operationTitle = String(formData.get('operation-title') || '');
    updateConnectorOperation(connectorModal.focusKey!, operation, operationTitle);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Configure {focusConnector.displayName}
          </h2>
          <button
            onClick={closeConnectorModal}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setEditMode('config')}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              editMode === 'config'
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Config UUID
          </button>
          <button
            onClick={() => setEditMode('operation')}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              editMode === 'operation'
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Operation
          </button>
        </div>

        {/* Config UUID Form */}
        {editMode === 'config' && (
          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                FortiSOAR Config Instance UUID
              </label>
              <Input
                name="config-uuid"
                type="text"
                placeholder="e.g., {{CUSTOMER_CROWDSTRIKE_CONFIG_UUID}} or 12345678-1234-1234-1234-123456789012"
                defaultValue={focusConnector.config}
                className="text-xs font-mono"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Enter the FortiSOAR config instance UUID or a template variable like{' '}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {`{{CUSTOMER_${connectorModal.focusKey?.toUpperCase()}_CONFIG_UUID}}`}
                </code>
              </p>
            </div>

            <div className="flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
              <p className="text-xs text-yellow-200">
                {focusConnector.isConfigured
                  ? 'Configuration UUID is set'
                  : 'Configuration UUID is a template variable'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="flex-1 gap-2"
              >
                <Check className="w-4 h-4" />
                Save UUID
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeConnectorModal}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Operation Form */}
        {editMode === 'operation' && (
          <form onSubmit={handleSaveOperation} className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Operation Path
              </label>
              <Input
                name="operation"
                type="text"
                placeholder="e.g., /api/v4/connectors/crowdstrike_falcon/fetch_endpoint_data"
                defaultValue={focusConnector.operation || ''}
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Operation Title
              </label>
              <Input
                name="operation-title"
                type="text"
                placeholder="e.g., Fetch Endpoint Data"
                defaultValue={focusConnector.operationTitle || ''}
              />
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border">
              The operation is the specific action this connector will invoke in FortiSOAR workflows.
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="flex-1 gap-2"
              >
                <Check className="w-4 h-4" />
                Save Operation
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeConnectorModal}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
