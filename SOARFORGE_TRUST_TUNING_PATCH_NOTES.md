# SOARForge Trust & Accuracy Tuning Patch

## Purpose
This patch improves customer trust by making the Threat Coverage output more accurate, synchronizing ransomware supporting MITRE indicators between documentation and the FortiSOAR workflow, and improving phishing-specific detection coverage.

## Changes

### 1. Ransomware scoring sync
- Added low-weight FortiSOAR workflow support for:
  - T1059.001 PowerShell / suspicious scripting context (+1)
  - T1048 exfiltration-related context (+1)
- These signals remain supporting evidence only and do not bypass safety gates, approval requirements, or rollback guidance.

### 2. Balanced template hardening
- Template hardening now adds selected optional techniques as low-weight supporting evidence instead of adding every optional MITRE technique into scoring.
- Remaining optional items stay visible as Recommended Enhancements so the report is more honest and does not show 100% too easily.

### 3. Phishing-specific detection logic
Added phishing-focused detection references:
- Suspicious URL Reputation and Click Context
- Attachment Hash and Sandbox Review
- Sender Authentication and Domain Review
- Mailbox Campaign Search and Duplicate Message Guardrail

### 4. Customer documentation enrichment
- Customer implementation guides now include a Threat Coverage Summary section.
- The section includes:
  - Threat Coverage Score
  - Covered Required Techniques
  - Covered Optional Techniques
  - Coverage Gaps
  - Detection Coverage References
  - Recommended Enhancements

### 5. MITRE naming improvements
- Added/fixed customer documentation names for:
  - T1059.001 PowerShell
  - T1566.001 Spearphishing Attachment
  - T1566.002 Spearphishing Link
  - T1048 Exfiltration Over Alternative Protocol
  - T1204 User Execution

## Safety Notes
- No destructive actions are added automatically.
- Knowledge updates remain advisory and require review.
- Tenant-specific connector UUIDs and action names must still be verified before production import.
