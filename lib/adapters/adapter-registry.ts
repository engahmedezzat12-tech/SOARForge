// ============================================================
// SOARForge — Adapter Registry
// Returns the correct VendorAdapter for a given platform ID
// ============================================================

import type { SoarPlatformId } from '../soar-platforms';
import type { VendorAdapter } from './platform-adapter';

import { FortiSOARAdapter } from './fortisoar-adapter';
import { CortexXSOARAdapter } from './cortex-xsoar-adapter';
import { SplunkSOARAdapter } from './splunk-soar-adapter';
import { SentinelLogicAppsAdapter } from './sentinel-logic-apps-adapter';
import { QRadarSOARAdapter } from './qradar-soar-adapter';
import { ServiceNowSecOpsAdapter } from './servicenow-secops-adapter';
import { TinesAdapter } from './tines-adapter';
import { ShuffleAdapter } from './shuffle-adapter';
import { GenericSOARAdapter } from './generic-soar-adapter';

const ADAPTER_MAP: Record<SoarPlatformId, VendorAdapter> = {
  fortisoar:           new FortiSOARAdapter(),
  cortex_xsoar:        new CortexXSOARAdapter(),
  splunk_soar:         new SplunkSOARAdapter(),
  sentinel_logic_apps: new SentinelLogicAppsAdapter(),
  qradar_soar:         new QRadarSOARAdapter(),
  servicenow_secops:   new ServiceNowSecOpsAdapter(),
  tines:               new TinesAdapter(),
  shuffle:             new ShuffleAdapter(),
  generic_soar:        new GenericSOARAdapter(),
};

/**
 * Get the vendor adapter for a given platform ID.
 * Falls back to generic_soar if platform is unknown.
 */
export function getPlatformAdapter(platformId: SoarPlatformId): VendorAdapter {
  return ADAPTER_MAP[platformId] ?? ADAPTER_MAP.generic_soar;
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): VendorAdapter[] {
  return Object.values(ADAPTER_MAP);
}

export { FortiSOARAdapter };
