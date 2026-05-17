'use client';

import { useSoarStore } from '@/lib/soar-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, X } from 'lucide-react';

const ENTITY_CATALOG = [
  { id: 'hostname', label: 'Hostname', category: 'Computer', normalizedField: 'computer_name' },
  { id: 'machine_id', label: 'Machine ID / UUID', category: 'Computer', normalizedField: 'asset_id' },
  { id: 'username', label: 'Username', category: 'Identity', normalizedField: 'user_account' },
  { id: 'command_line', label: 'Command Line', category: 'Process', normalizedField: 'cmd' },
  { id: 'file_hash', label: 'File Hash (MD5/SHA256)', category: 'File', normalizedField: 'file_sha256' },
  { id: 'ip_address', label: 'IP Address (Source)', category: 'Network', normalizedField: 'src_ip' },
  { id: 'domain', label: 'Domain', category: 'Network', normalizedField: 'domain_name' },
  { id: 'email', label: 'Email Address', category: 'Identity', normalizedField: 'email_from' },
  { id: 'url', label: 'URL', category: 'Network', normalizedField: 'url' },
  { id: 'process_id', label: 'Process ID', category: 'Process', normalizedField: 'process_id' },
  { id: 'registry_key', label: 'Registry Key', category: 'Computer', normalizedField: 'registry_path' },
  { id: 'file_path', label: 'File Path', category: 'File', normalizedField: 'file_path' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Computer: 'bg-purple-900/20 border-purple-800/30 text-purple-400',
  Identity: 'bg-blue-900/20 border-blue-800/30 text-blue-400',
  Process: 'bg-green-900/20 border-green-800/30 text-green-400',
  File: 'bg-orange-900/20 border-orange-800/30 text-orange-400',
  Network: 'bg-red-900/20 border-red-800/30 text-red-400',
};

export default function Step3Entities() {
  const { playbook, setPlaybook } = useSoarStore();

  const handleAddEntity = (entityId: string) => {
    if (!playbook.entities.includes(entityId)) {
      setPlaybook({
        ...playbook,
        entities: [...playbook.entities, entityId],
      });
    }
  };

  const handleRemoveEntity = (entityId: string) => {
    setPlaybook({
      ...playbook,
      entities: playbook.entities.filter((e) => e !== entityId),
    });
  };

  const selectedEntities = ENTITY_CATALOG.filter((e) => playbook.entities.includes(e.id));
  const availableEntities = ENTITY_CATALOG.filter((e) => !playbook.entities.includes(e.id));
  const grouped = availableEntities.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {} as Record<string, typeof availableEntities>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Step 3: Entities</h1>
        <p className="text-muted-foreground">
          Select the input fields your playbook will extract from alerts and enrich.
        </p>
      </div>

      {/* Selected Entities */}
      {selectedEntities.length > 0 && (
        <Card className="p-6 border-border/50 bg-green-900/5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" />
            <h2 className="font-semibold">Selected Entities ({selectedEntities.length})</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedEntities.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md border ${CATEGORY_COLORS[e.category]}`}
              >
                <span className="text-sm">{e.label}</span>
                <button
                  onClick={() => handleRemoveEntity(e.id)}
                  className="hover:opacity-70 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Entities */}
      <div>
        <h2 className="font-semibold mb-4">Available Entities</h2>
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, entities]) => (
            <Card key={category} className="p-4 border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">{category}</p>
              <div className="space-y-2">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{entity.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Normalized: <span className="font-mono">{entity.normalizedField}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddEntity(entity.id)}
                      className="gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
