'use client';

import { useSoarStore } from '@/lib/soar-store';
import { getCompatibilityBadge, type CompatibilityStatus } from '@/lib/soar-platforms';
import { isActionSupportedOnPlatform, type NormalizedActionType } from '@/lib/normalized-soar-model';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompatibilityBadgeProps {
  status: CompatibilityStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CompatibilityBadge({ status, showLabel = true, size = 'sm' }: CompatibilityBadgeProps) {
  const badge = getCompatibilityBadge(status);
  
  const Icon = {
    supported: Check,
    partial: AlertTriangle,
    verify_in_tenant: Info,
    unsupported: X,
  }[status] || Info;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-1.5 py-0.5' 
    : 'text-sm px-2 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded border ${badge.color} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {showLabel && <span>{badge.label}</span>}
    </span>
  );
}

interface ActionCompatibilityBadgeProps {
  actionType: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ActionCompatibilityBadge({ actionType, showLabel = true, size = 'sm' }: ActionCompatibilityBadgeProps) {
  const { targetPlatform } = useSoarStore();
  
  // Check if action is supported on the target platform
  const isSupported = isActionSupportedOnPlatform(actionType as NormalizedActionType, targetPlatform);
  
  // Determine status based on platform
  let status: CompatibilityStatus = 'unsupported';
  if (targetPlatform === 'fortisoar') {
    status = 'supported';
  } else if (isSupported) {
    status = 'verify_in_tenant';
  } else {
    status = 'partial'; // May work but needs verification
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <CompatibilityBadge status={status} showLabel={showLabel} size={size} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">
            {status === 'supported' && 'Fully supported for direct import'}
            {status === 'verify_in_tenant' && 'Supported - verify integration instance in your tenant'}
            {status === 'partial' && 'May require manual configuration or adapters'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ConnectorCompatibilityBadgeProps {
  connectorCategory: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ConnectorCompatibilityBadge({ connectorCategory, showLabel = true, size = 'sm' }: ConnectorCompatibilityBadgeProps) {
  const { targetPlatform } = useSoarStore();
  
  // FortiSOAR supports all connectors directly
  // Other platforms need verification
  let status: CompatibilityStatus = 'verify_in_tenant';
  if (targetPlatform === 'fortisoar') {
    status = 'supported';
  } else if (targetPlatform === 'generic_soar') {
    status = 'partial';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <CompatibilityBadge status={status} showLabel={showLabel} size={size} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">
            {status === 'supported' && `${connectorCategory} connectors fully supported`}
            {status === 'verify_in_tenant' && `Verify ${connectorCategory} integration in your tenant`}
            {status === 'partial' && `${connectorCategory} may need manual configuration`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PlatformExportBadgeProps {
  platform?: string;
  showDetails?: boolean;
}

export function PlatformExportBadge({ platform, showDetails = false }: PlatformExportBadgeProps) {
  const store = useSoarStore();
  const targetPlatform = platform || store.targetPlatform;
  
  const isDirectImport = targetPlatform === 'fortisoar';
  
  if (isDirectImport) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
          <Check className="w-3 h-3" />
          Direct Import
        </span>
        {showDetails && (
          <span className="text-xs text-muted-foreground">
            Full production import supported
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" />
        Blueprint Export
      </span>
      {showDetails && (
        <span className="text-xs text-muted-foreground">
          Requires tenant verification
        </span>
      )}
    </div>
  );
}
