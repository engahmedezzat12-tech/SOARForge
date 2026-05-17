// ============================================================
// SOARForge — Entity and Data Source Mapping
// ECS/OCSF-style normalization hints for playbook quality.
// ============================================================

import type { EntityDataSourceMapping } from './threat-knowledge-types';

export const ENTITY_DATA_SOURCE_MAPPINGS: Record<string, EntityDataSourceMapping> = {
  hostname: {
    entityId: 'hostname',
    displayName: 'Hostname',
    type: 'endpoint',
    description: 'Endpoint hostname or device name used for asset and EDR lookup.',
    vendorAliases: ['host', 'computer_name', 'deviceName', 'DeviceName', 'agent.hostname'],
    ecsField: 'host.name',
    ocsfField: 'device.hostname',
    usedByTechniques: ['T1486', 'T1490', 'T1003', 'T1059', 'T1071'],
    usedByIncidentTypes: ['ransomware', 'malware_hash', 'malicious_ip'],
    usedByActions: ['isolate_endpoint', 'collect_forensics'],
  },
  machine_id: {
    entityId: 'machine_id',
    displayName: 'Machine ID',
    type: 'endpoint',
    description: 'EDR-specific endpoint identifier used for containment or asset lookup.',
    vendorAliases: ['device_id', 'asset_id', 'agent_id', 'endpoint_id', 'machineId'],
    ecsField: 'host.id',
    ocsfField: 'device.uid',
    usedByTechniques: ['T1486', 'T1003', 'T1562.001'],
    usedByIncidentTypes: ['ransomware', 'malware_hash'],
    usedByActions: ['isolate_endpoint', 'unisolate_endpoint'],
  },
  username: {
    entityId: 'username',
    displayName: 'Username',
    type: 'identity',
    description: 'User identity involved in endpoint, email, cloud, or authentication activity.',
    vendorAliases: ['user', 'userName', 'AccountName', 'UserPrincipalName', 'actor.user.name'],
    ecsField: 'user.name',
    ocsfField: 'actor.user.name',
    usedByTechniques: ['T1078', 'T1110.003', 'T1003', 'T1098'],
    usedByIncidentTypes: ['ransomware', 'suspicious_login', 'phishing'],
    usedByActions: ['disable_ad_user', 'revoke_sessions', 'reset_password'],
  },
  command_line: {
    entityId: 'command_line',
    displayName: 'Command Line',
    type: 'process',
    description: 'Process command line used to support behavior and detection context.',
    vendorAliases: ['CommandLine', 'ProcessCommandLine', 'cmd', 'process.command_line'],
    ecsField: 'process.command_line',
    ocsfField: 'process.cmd_line',
    usedByTechniques: ['T1059', 'T1059.001', 'T1490', 'T1562.001'],
    usedByIncidentTypes: ['ransomware', 'malware_hash'],
    usedByActions: ['collect_process_tree', 'create_ticket'],
  },
  file_hash: {
    entityId: 'file_hash',
    displayName: 'File Hash',
    type: 'file',
    description: 'SHA256/SHA1/MD5 indicator used for reputation and sandbox enrichment.',
    vendorAliases: ['sha256', 'fileHash', 'FileHash', 'hash', 'file.hash.sha256'],
    ecsField: 'file.hash.sha256',
    ocsfField: 'file.hashes.value',
    usedByTechniques: ['T1566.001', 'T1059', 'T1003'],
    usedByIncidentTypes: ['ransomware', 'phishing', 'malware_hash'],
    usedByActions: ['submit_file_to_sandbox', 'quarantine_file'],
  },
  source_ip: {
    entityId: 'source_ip',
    displayName: 'Source IP',
    type: 'network',
    description: 'Source network address used for identity, WAF, firewall, and threat-intel context.',
    vendorAliases: ['src_ip', 'sourceAddress', 'IPAddress', 'client_ip', 'source.ip'],
    ecsField: 'source.ip',
    ocsfField: 'src_endpoint.ip',
    usedByTechniques: ['T1078', 'T1110.003', 'T1190', 'T1071'],
    usedByIncidentTypes: ['suspicious_login', 'waf_attack', 'malicious_ip'],
    usedByActions: ['block_ip_with_context', 'threat_intel_lookup'],
  },
  url: {
    entityId: 'url',
    displayName: 'URL',
    type: 'network',
    description: 'URL observed in email, proxy, WAF, or web security events.',
    vendorAliases: ['request_url', 'target_url', 'url.original', 'Url', 'uri'],
    ecsField: 'url.full',
    ocsfField: 'url.url_string',
    usedByTechniques: ['T1566.002', 'T1190'],
    usedByIncidentTypes: ['phishing', 'waf_attack'],
    usedByActions: ['block_url', 'url_reputation'],
  },
  message_id: {
    entityId: 'message_id',
    displayName: 'Message ID',
    type: 'email',
    description: 'Email message identifier used for quarantine, release, and campaign search.',
    vendorAliases: ['internetMessageId', 'MessageID', 'message_id', 'email.message_id'],
    ecsField: 'email.message_id',
    ocsfField: 'email.message_uid',
    usedByTechniques: ['T1566', 'T1566.001', 'T1566.002'],
    usedByIncidentTypes: ['phishing'],
    usedByActions: ['quarantine_email', 'release_email', 'search_similar_emails'],
  },
};

export function getEntityMappings(entityIds: string[]): EntityDataSourceMapping[] {
  return entityIds.map((id) => ENTITY_DATA_SOURCE_MAPPINGS[id]).filter((e): e is EntityDataSourceMapping => Boolean(e));
}
