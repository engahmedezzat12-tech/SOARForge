// ============================================================
// SOARForge — Threat Knowledge Update Sources
// Phase 6 design only: fetch -> compare -> propose -> admin approve.
// ============================================================

import type { ThreatKnowledgeUpdateSource } from './threat-knowledge-types';

export const THREAT_KNOWLEDGE_UPDATE_SOURCES: ThreatKnowledgeUpdateSource[] = [
  {
    sourceId: 'src-mitre-attack-stix',
    sourceName: 'MITRE_ATTACK',
    customerFacingName: 'ATT&CK Knowledge Base',
    fetchUrl: 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json',
    format: 'STIX_JSON',
    recommendedFrequencyHours: 168,
    approvalRequired: true,
    updateBehavior: 'fetch_compare_propose_only',
    notes: ['Compare framework version and changed technique IDs.', 'Mark affected templates as Review Recommended.'],
  },
  {
    sourceId: 'src-d3fend-api',
    sourceName: 'MITRE_D3FEND',
    customerFacingName: 'Defensive Countermeasure Knowledge Base',
    fetchUrl: 'https://d3fend.mitre.org/api-docs/',
    format: 'JSON',
    recommendedFrequencyHours: 168,
    approvalRequired: true,
    updateBehavior: 'fetch_compare_propose_only',
    notes: ['Flatten mappings into defensive countermeasure dataset after admin approval.'],
  },
  {
    sourceId: 'src-sigma-hq',
    sourceName: 'SIGMA_HQ',
    customerFacingName: 'Detection Logic Reference',
    fetchUrl: 'https://github.com/SigmaHQ/sigma/releases',
    format: 'GITHUB_RELEASE',
    recommendedFrequencyHours: 168,
    approvalRequired: true,
    updateBehavior: 'fetch_compare_propose_only',
    notes: ['New detection logic should enter Review Recommended state first.'],
  },
  {
    sourceId: 'src-cisa-kev',
    sourceName: 'CISA_KEV',
    customerFacingName: 'Known Exploited Vulnerability Catalog',
    fetchUrl: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    format: 'JSON',
    recommendedFrequencyHours: 24,
    approvalRequired: true,
    updateBehavior: 'fetch_compare_propose_only',
    notes: ['Do not change playbooks automatically; mark vulnerability templates for review.'],
  },
  {
    sourceId: 'src-lolbas',
    sourceName: 'LOLBAS',
    customerFacingName: 'Living-off-the-Land Reference',
    fetchUrl: 'https://lolbas-project.github.io/api/lolbas.csv',
    format: 'CSV',
    recommendedFrequencyHours: 168,
    approvalRequired: true,
    updateBehavior: 'fetch_compare_propose_only',
    notes: ['Use only as defensive detection reference; never generate destructive execution tests.'],
  },
  {
    sourceId: 'src-atomic-red-team',
    sourceName: 'ATOMIC_RED_TEAM',
    customerFacingName: 'Safe Validation Reference',
    fetchUrl: 'https://github.com/redcanaryco/atomic-red-team/releases',
    format: 'GITHUB_RELEASE',
    recommendedFrequencyHours: 168,
    approvalRequired: true,
    updateBehavior: 'fetch_compare_propose_only',
    notes: ['Only approved non-destructive synthetic scenarios should be imported.'],
  },
];
