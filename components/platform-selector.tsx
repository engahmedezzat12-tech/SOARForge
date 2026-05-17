'use client';

import { useSoarStore } from '@/lib/soar-store';
import { SOAR_PLATFORMS, getAllPlatforms, type SoarPlatformId } from '@/lib/soar-platforms';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Shield, AlertTriangle } from 'lucide-react';

interface PlatformSelectorProps {
  variant?: 'header' | 'inline';
  showDescription?: boolean;
}

export function PlatformSelector({ variant = 'header', showDescription = false }: PlatformSelectorProps) {
  const { targetPlatform, setTargetPlatform } = useSoarStore();
  const currentPlatform = SOAR_PLATFORMS[targetPlatform];
  const platforms = getAllPlatforms();

  if (variant === 'inline') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Target SOAR Platform</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {platforms.map((platform) => {
            const isSelected = platform.id === targetPlatform;
            return (
              <button
                key={platform.id}
                onClick={() => setTargetPlatform(platform.id)}
                className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-lg">{platform.icon}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="font-medium text-sm leading-tight">{platform.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{platform.vendor}</p>
                {platform.directImportSupported ? (
                  <span className="absolute top-2 right-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                    Direct
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                    Blueprint
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {showDescription && currentPlatform && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-start gap-2">
              <span className="text-lg">{currentPlatform.icon}</span>
              <div>
                <p className="font-medium text-sm">{currentPlatform.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{currentPlatform.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {currentPlatform.directImportSupported ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                      Direct Import Supported
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Blueprint Only - Verify in Tenant
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Header dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[180px] justify-between">
          <div className="flex items-center gap-2">
            <span>{currentPlatform?.icon}</span>
            <span className="truncate">{currentPlatform?.name || 'Select Platform'}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Target SOAR Platform
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {platforms.map((platform) => {
          const isSelected = platform.id === targetPlatform;
          return (
            <DropdownMenuItem
              key={platform.id}
              onClick={() => setTargetPlatform(platform.id)}
              className="flex items-start gap-3 py-2.5 cursor-pointer"
            >
              <span className="text-lg shrink-0 mt-0.5">{platform.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{platform.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{platform.vendor}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {platform.directImportSupported ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      Direct Import
                    </span>
                  ) : (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      Blueprint
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
