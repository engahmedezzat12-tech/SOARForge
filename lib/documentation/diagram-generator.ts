// ============================================================
// SOARForge Professional — Diagram Generator
// Threshold-driven layouts. Fixed coordinates. No arrows
// through node boxes. No NaN. No generic-only fallback when
// real thresholds exist.
// ============================================================

import type { CustomerDocument } from './documentation-types';

// ── Color Palette ────────────────────────────────────────────
const C = {
  trigger:    '#3b82f6',
  context:    '#3b82f6',
  enrichment: '#8b5cf6',
  scoring:    '#06b6d4',
  decision:   '#16a34a',
  approval:   '#f97316',
  action:     '#ef4444',
  autoblock:  '#b91c1c',
  monitor:    '#6b7280',
  notify:     '#475569',
  final:      '#374151',
  approved:   '#15803d',
  rejected:   '#dc2626',
  edge:       '#94a3b8',
  bg:         '#f8fafc',
  text:       '#1f2937',
  white:      '#ffffff',
};

// ── Types ────────────────────────────────────────────────────
interface Pt { x: number; y: number; }

interface DiagramNode {
  id:      string;
  label:   string;
  label2?: string;
  x:       number;
  y:       number;
  w:       number;
  h:       number;
  color:   string;
  shape?:  'rect' | 'diamond';
}

interface DiagramEdge {
  fromX:     number;
  fromY:     number;
  toX:       number;
  toY:       number;
  label?:    string;
  labelX?:   number;
  labelY?:   number;
  dashed?:   boolean;
  waypoints?: Pt[];
}

// ── Terminology normalisation ────────────────────────────────
function norm(text: string): string {
  return String(text ?? '')
    .replace(/\bGroupib\b/gi,           'Group-IB')
    .replace(/\bVirustotal\b/gi,        'VirusTotal')
    .replace(/\bAbuseipdb\b/gi,         'AbuseIPDB')
    .replace(/\bPaloalto\b/gi,          'Palo Alto')
    .replace(/\bServicenow\b/gi,        'ServiceNow')
    .replace(/\bBlock Ip\b/gi,          'Block IP')
    .replace(/\bAD User\b/gi,           'Active Directory User')
    .replace(/\bDisable AD User\b/gi,   'Disable Active Directory User')
    .replace(/\bEdr\b/g,                'EDR')
    .replace(/\bSoc\b/g,                'SOC')
    .replace(/\bMitre\b/g,              'MITRE')
    .replace(/\bFortinet FortiSOAR\b/g, 'FortiSOAR');
}

function normalizeActionKey(action: string): string {
  return String(action ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
    .replace(/__+/g, '_');
}

function esc(s: string): string {
  return norm(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Action label normalisation ───────────────────────────────
function actionLabel(action: string): string {
  const key = normalizeActionKey(action);

  const map: Record<string, string> = {
    skip:               'Skip / No Action',
    close:              'Close / No Action',
    no_action:          'Skip / No Action',
    monitor:            'Monitor',
    log:                'Monitor',

    analyst_approval:   'Analyst Approval',
    manual_review:      'Analyst Approval',
    analyst_review:     'Analyst Approval',
    approval:           'Analyst Approval',

    auto_contain:       'Auto Contain',
    auto_block:         'Auto Block',
    auto_response:      'Auto Response',
    auto_remediate:     'Auto Remediate',
    block:              'Auto Block',
  };

  return map[key] ?? norm(action).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Anchor helpers ───────────────────────────────────────────
function top(n: DiagramNode): Pt { return { x: n.x + n.w / 2, y: n.y }; }
function bot(n: DiagramNode): Pt { return { x: n.x + n.w / 2, y: n.y + n.h }; }
function lft(n: DiagramNode): Pt { return { x: n.x,           y: n.y + n.h / 2 }; }
function rgt(n: DiagramNode): Pt { return { x: n.x + n.w,     y: n.y + n.h / 2 }; }

// Diamond anchors (polygon tip extends ~14px beyond bounding box)
function dTop(n: DiagramNode): Pt { return { x: n.x + n.w / 2, y: n.y - 14 }; }
function dBot(n: DiagramNode): Pt { return { x: n.x + n.w / 2, y: n.y + n.h + 14 }; }
function dLft(n: DiagramNode): Pt { return { x: n.x - 14,       y: n.y + n.h / 2 }; }
function dRgt(n: DiagramNode): Pt { return { x: n.x + n.w + 14, y: n.y + n.h / 2 }; }

// ── Node renderer ────────────────────────────────────────────
function rNode(n: DiagramNode): string {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;

  if (n.shape === 'diamond') {
    const hw = n.w / 2 + 14;
    const hh = n.h / 2 + 14;
    const pts = `${cx},${n.y - 14} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
    return `<g filter="url(#fs)">
  <polygon points="${pts}" fill="${n.color}"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.white}">${esc(n.label)}</text>
</g>`;
  }

  if (n.label2) {
    return `<g filter="url(#fs)">
  <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${n.color}"/>
  <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="12" font-weight="500" fill="${C.white}">${esc(n.label)}</text>
  <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="11" fill="${C.white}" opacity="0.88">${esc(n.label2)}</text>
</g>`;
  }

  return `<g filter="url(#fs)">
  <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${n.color}"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" font-weight="500" fill="${C.white}">${esc(n.label)}</text>
</g>`;
}

// ── Edge renderer ────────────────────────────────────────────
function rEdge(e: DiagramEdge): string {
  const dash   = e.dashed ? 'stroke-dasharray="6 4"' : '';
  const marker = 'marker-end="url(#arr)"';

  let pathD: string;
  if (e.waypoints && e.waypoints.length > 0) {
    const pts = [{ x: e.fromX, y: e.fromY }, ...e.waypoints, { x: e.toX, y: e.toY }];
    pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' ');
  } else {
    pathD = `M ${e.fromX.toFixed(0)} ${e.fromY.toFixed(0)} L ${e.toX.toFixed(0)} ${e.toY.toFixed(0)}`;
  }

  let lx: number, ly: number;
  if (e.labelX !== undefined && e.labelY !== undefined) {
    lx = e.labelX;
    ly = e.labelY;
  } else if (e.waypoints && e.waypoints.length > 0) {
    lx = (e.fromX + e.waypoints[0].x) / 2;
    ly = Math.min(e.fromY, e.waypoints[0].y) + Math.abs(e.waypoints[0].y - e.fromY) / 2 - 7;
  } else {
    lx = (e.fromX + e.toX) / 2;
    ly = (e.fromY + e.toY) / 2 - 7;
  }

  return `<path d="${pathD}" fill="none" stroke="${C.edge}" stroke-width="2" ${dash} ${marker}/>
${e.label ? `  <text x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" text-anchor="middle" font-size="11" font-weight="500" fill="#475569">${esc(e.label)}</text>` : ''}`;
}

// ── Edge constructors ────────────────────────────────────────
function arrow(from: Pt, to: Pt, label = ''): DiagramEdge {
  return { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, label };
}

function elbow(
  from: Pt, to: Pt, laneY: number,
  label = '', dashed = false,
  labelX?: number, labelY?: number,
): DiagramEdge {
  return {
    fromX: from.x, fromY: from.y,
    toX:   to.x,   toY:   to.y,
    label, dashed, labelX, labelY,
    waypoints: [
      { x: from.x, y: laneY },
      { x: to.x,   y: laneY },
    ],
  };
}

function bypass(from: Pt, to: Pt, gutterX: number, label = '', dashed = true): DiagramEdge {
  return {
    fromX: from.x, fromY: from.y,
    toX:   to.x,   toY:   to.y,
    label, dashed,
    waypoints: [
      { x: gutterX, y: from.y },
      { x: gutterX, y: to.y   },
    ],
  };
}

// ── SVG wrapper ──────────────────────────────────────────────
function svgWrap(vw: number, vh: number, title: string, content: string): string {
  return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg"
     style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:100%;display:block;">
  <defs>
    <marker id="arr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
      <polygon points="0 0,9 3.5,0 7" fill="${C.edge}"/>
    </marker>
    <filter id="fs" x="-12%" y="-18%" width="124%" height="136%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.13"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${C.bg}"/>
  <text x="${vw / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="${C.text}">${esc(title)}</text>
  ${content}
</svg>`;
}

// ── Node factory ─────────────────────────────────────────────
function mk(
  id: string, label: string,
  x: number, y: number, w: number, h: number,
  color: string,
  shape?: 'rect' | 'diamond',
  label2?: string,
): DiagramNode {
  return { id, label, label2, x, y, w, h, color, shape: shape ?? 'rect' };
}

// ── Text wrap helper ─────────────────────────────────────────
function wrap(s: string, max: number): [string, string | undefined] {
  const n = norm(s);
  if (n.length <= max) return [n, undefined];
  const mid = Math.floor(n.length / 2);
  const after  = n.indexOf(' ', mid);
  const before = n.lastIndexOf(' ', mid);
  const split  = after !== -1 ? after : before !== -1 ? before : max;
  return [n.slice(0, split).trim(), n.slice(split).trim()];
}

// ── Threshold classifier ──────────────────────────────────────
type ThresholdKind = 'monitor' | 'approval' | 'auto';

function thresholdKind(action: string, approvalRequired?: boolean): ThresholdKind {
  const key = normalizeActionKey(action);

  if (approvalRequired === true) return 'approval';

  if (['skip','close','no_action','monitor','log'].includes(key)) {
    return 'monitor';
  }

  if (['analyst_approval','manual_review','analyst_review','approval'].includes(key)) {
    return 'approval';
  }

  return 'auto';
}

function colorForKind(kind: ThresholdKind, action: string): string {
  const key = normalizeActionKey(action);

  if (kind === 'monitor')  return C.monitor;
  if (kind === 'approval') return C.approval;
  if (key === 'auto_block' || key === 'auto_contain' || key === 'block') return C.autoblock;
  return C.action;
}

function thresholdDisplayLabel(t: { decision?: string; action: string }): string {
  return norm(t.decision || actionLabel(t.action));
}

// ============================================================
// ARCHITECTURE DIAGRAM
// Entry point: routes to template-specific or threshold-driven
// ============================================================

export function generateArchitectureDiagramSVG(doc: CustomerDocument): string {
  const id = doc.metadata.templateId ?? '';
  if (id === 'ransomware_auto_containment') return ransomwareArchSVG(doc);
  // All other templates use the threshold-driven generic layout
  return thresholdArchSVG(doc);
}

// ── Ransomware Architecture (fixed coordinates) ───────────────
function ransomwareArchSVG(doc: CustomerDocument): string {
  const VW = 1100;
  const VH = 1040;
  const NW  = 210;
  const NWM = 180;
  const NWS = 160;
  const NH  = 52;
  const NHD = 44;

  // Row Y positions (top edges)
  const Y0  =  40;   // start
  const Y1  = 130;   // context | entities
  const Y2  = 240;   // enrichment sources
  const Y3  = 360;   // score behavior
  const Y4  = 460;   // safety gates
  const Y5  = 590;   // branch nodes: skip | approval | autocontain
  const Y6  = 700;   // approved | rejected
  const Y7  = 810;   // isolate endpoint | disable AD user
  const Y8  = 900;   // notify SOC / create ticket
  const Y9  = 970;   // finalize

  const CX = (VW - NW) / 2; // 445

  const N: Record<string, DiagramNode> = {
    start:       mk('start',       'Start / Alert Received',       CX,          Y0,  NW,  NH,  C.trigger),
    context:     mk('context',     'Build Context',                 155,         Y1,  NWM, NH,  C.context),
    entities:    mk('entities',    'Extract Entities',              720,         Y1,  NWM, NH,  C.context),
    groupib:     mk('groupib',     'Group-IB EDR',                  120,         Y2,  NWM, NH,  C.enrichment),
    virustotal:  mk('virustotal',  'VirusTotal',                    545,         Y2,  NWS, NH,  C.enrichment),
    score:       mk('score',       'Score Behavior',                CX,          Y3,  NW,  NH,  C.scoring),
    gates:       mk('gates',       'Safety Gates',                  CX,          Y4,  NW,  NH,  C.decision, 'diamond'),
    skip:        mk('skip',        'Skip / No Action',              35,          Y5,  NWM, NH,  C.final),
    approval:    mk('approval',    'Analyst Approval',              CX,          Y5,  NW,  NH,  C.approval),
    autocontain: mk('autocontain', 'Auto Contain',                  855,         Y5,  NWM, NH,  C.action),
    approved:    mk('approved',    'Approved',                      345,         Y6,  NWS, NHD, C.approved),
    rejected:    mk('rejected',    'Rejected',                      595,         Y6,  NWS, NHD, C.rejected),
    isolate:     mk('isolate',     'Isolate Endpoint',              215,         Y7,  NWM, NH,  C.action),
    disablead:   mk('disablead',   'Disable AD User',               565,         Y7,  NWM, NH,  C.action),
    notify:      mk('notify',      'Notify SOC',                    CX,          Y8,  NW,  NH,  C.notify, 'rect', 'Create Ticket'),
    finalize:    mk('finalize',    'Finalize',                      CX,          Y9,  NW,  NH,  C.final),
  };

  const thresholds = doc.scoringModel?.thresholds ?? [];
  const skipT    = thresholds.find(t => thresholdKind(t.action, t.approvalRequired) === 'monitor');
  const approveT = thresholds.find(t => thresholdKind(t.action, t.approvalRequired) === 'approval');
  const autoT    = thresholds.find(t => thresholdKind(t.action, t.approvalRequired) === 'auto');

  const skipRange    = skipT?.scoreRange    ? `Score ${skipT.scoreRange}`    : 'Score 0\u20131';
  const approveRange = approveT?.scoreRange ? `Score ${approveT.scoreRange}` : 'Score 2\u20137';
  const autoRange    = autoT?.scoreRange    ? `Score ${autoT.scoreRange}`    : 'Score \u22658';

  const E: DiagramEdge[] = [];

  // start -> context + entities
  const lane01 = Y0 + NH + 22;
  E.push(elbow(bot(N.start), top(N.context),    lane01));
  E.push(elbow(bot(N.start), top(N.entities),   lane01));

  // context + entities -> enrichment nodes
  const lane12 = Y1 + NH + 22;
  E.push(elbow(bot(N.context),  top(N.groupib),    lane12));
  E.push(elbow(bot(N.context),  top(N.virustotal), lane12));
  E.push(elbow(bot(N.entities), top(N.virustotal), lane12));

  // enrichment -> score
  const lane23 = Y2 + NH + 22;
  E.push(elbow(bot(N.groupib),    top(N.score), lane23));
  E.push(elbow(bot(N.virustotal), top(N.score), lane23));

  // score -> gates
  E.push(arrow(bot(N.score), dTop(N.gates)));

  // gates -> 3 branches
  const laneGates = Y4 + NH + 14 + 30;
  E.push(elbow(dLft(N.gates),  top(N.skip),        laneGates, skipRange,    false, N.skip.x + NWM / 2,         laneGates - 12));
  E.push(arrow( dBot(N.gates), top(N.approval),                approveRange));
  E.push(elbow(dRgt(N.gates),  top(N.autocontain), laneGates, autoRange,    false, N.autocontain.x + NWM / 2,  laneGates - 12));

  // approval -> approved / rejected
  const laneAB = Y5 + NH + 22;
  E.push(elbow(bot(N.approval), top(N.approved), laneAB, 'Approved', false, N.approved.x + NWS / 2,  laneAB - 12));
  E.push(elbow(bot(N.approval), top(N.rejected), laneAB, 'Rejected', false, N.rejected.x + NWS / 2,  laneAB - 12));

  // approved + autocontain -> isolate + disablead
  const laneContain = Y6 + NHD + 22;
  E.push(elbow(bot(N.approved),    top(N.isolate),   laneContain));
  E.push(elbow(bot(N.approved),    top(N.disablead), laneContain));
  E.push(elbow(bot(N.autocontain), top(N.isolate),   laneContain));
  E.push(elbow(bot(N.autocontain), top(N.disablead), laneContain));

  // isolate + disablead -> notify
  const laneNotify = Y7 + NH + 22;
  E.push(elbow(bot(N.isolate),   top(N.notify), laneNotify));
  E.push(elbow(bot(N.disablead), top(N.notify), laneNotify));

  // notify -> finalize
  E.push(arrow(bot(N.notify), top(N.finalize)));

  // skip -> finalize: left gutter bypass
  E.push(bypass(lft(N.skip),     lft(N.finalize), 14, '', true));
  // rejected -> finalize: right gutter bypass
  E.push(bypass(rgt(N.rejected), rgt(N.finalize), VW - 14, '', true));

  const content = [...E.map(rEdge), ...Object.values(N).map(rNode)].join('\n');
  return svgWrap(VW, VH, `${esc(doc.metadata.playbookName)} \u2014 Architecture Overview`, content);
}

// ── Threshold-Driven Architecture SVG ────────────────────────
// Used for all non-ransomware templates.
// Reads thresholds, enrichment connectors, and response actions
// from the CustomerDocument to produce an accurate diagram.
function thresholdArchSVG(doc: CustomerDocument): string {
  const VW = 1200;
  const NW = 220;
  const NWM = 190;
  const NWS = 155;
  const NH = 52;
  const NHD = 44;
  const CX = (VW - NW) / 2;

  const thresholds = doc.scoringModel?.thresholds ?? [];
  const hasThresholds = thresholds.length > 0;

  const enrichmentConnectors = (doc.connectorMatrix ?? [])
    .filter(c => {
      const category = String(c.category ?? '').toLowerCase();
      const usedFor = String(c.usedFor ?? '').toLowerCase();
      return category.includes('enrich') || category.includes('threat') || usedFor.includes('enrich');
    })
    .map(c => norm(c.connector))
    .filter(Boolean);

  const enrichmentLabels = enrichmentConnectors.length > 0
    ? enrichmentConnectors
    : ['Threat Intel Enrichment'];

  const responseLabels = (doc.responseActions ?? [])
    .map(a => norm(a.action))
    .filter(Boolean);

  const actionLabels = responseLabels.length > 0
    ? responseLabels
    : ['Response Action'];

  const nodes: DiagramNode[] = [];
  const N: Record<string, DiagramNode> = {};
  const E: DiagramEdge[] = [];

  function add(n: DiagramNode): DiagramNode {
    nodes.push(n);
    N[n.id] = n;
    return n;
  }

  function grid(
    prefix: string,
    labels: string[],
    y: number,
    color: string,
    maxCols = 3,
    w = NWM,
    h = NH,
  ): DiagramNode[] {
    const count = Math.max(labels.length, 1);
    const cols = count === 4 ? 2 : Math.min(maxCols, count);
    const gapX = 28;
    const gapY = 24;
    const out: DiagramNode[] = [];

    labels.forEach((label, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const itemsInRow = Math.min(cols, count - row * cols);
      const rowWidth = itemsInRow * w + (itemsInRow - 1) * gapX;
      const x0 = (VW - rowWidth) / 2;
      const x = x0 + col * (w + gapX);
      const [l1, l2] = wrap(label, 22);
      out.push(add(mk(`${prefix}${i + 1}`, l1, x, y + row * (h + gapY), w, h, color, 'rect', l2)));
    });

    return out;
  }

  // Top rows
  const start = add(mk('start', 'Start / Alert Received', CX, 40, NW, NH, C.trigger));
  const context = add(mk('context', 'Build Context', CX, 130, NW, NH, C.context, 'rect', 'Extract Entities'));

  const enrichY = 230;
  const enrichNodes = grid('enrich', enrichmentLabels, enrichY, C.enrichment, 3, NWM, NH);
  const enrichRows = Math.ceil(enrichNodes.length / (enrichNodes.length === 4 ? 2 : Math.min(3, enrichNodes.length)));
  const enrichBottom = enrichY + enrichRows * NH + (enrichRows - 1) * 24;

  const scoreY = enrichBottom + 80;
  const gatesY = scoreY + 100;
  const branchY = gatesY + 130;

  const score = add(mk('score', 'Score Behavior', CX, scoreY, NW, NH, C.scoring));
  const gates = add(mk('gates', 'Safety Gates', CX, gatesY, NW, NH, C.decision, 'diamond'));

  // Build threshold branches dynamically from the actual selected scoring thresholds.
  const branchSpecs = hasThresholds
    ? thresholds.map((t, index) => {
        const kind = thresholdKind(t.action, t.approvalRequired);
        return {
          id: `branch${index + 1}`,
          label: thresholdDisplayLabel(t),
          range: t.scoreRange ? `Score ${t.scoreRange}` : '',
          kind,
          color: colorForKind(kind, t.action),
        };
      })
    : [{ id: 'execresp', label: 'Execute Response', range: '', kind: 'auto' as ThresholdKind, color: C.action }];

  const branchNodes = grid('branch', branchSpecs.map(b => b.label), branchY, C.monitor, 3, NWM, NH);
  branchNodes.forEach((node, i) => {
    const spec = branchSpecs[i];
    node.color = spec.color;
    node.id = spec.id;
    N[spec.id] = node;
  });

  const approvalBranches = branchSpecs
    .map((spec, index) => ({ spec, node: branchNodes[index] }))
    .filter(item => item.spec.kind === 'approval');

  const approvedRejectedY = branchY + NH + 78;
  const approvalSubNodes: { approved: DiagramNode; rejected: DiagramNode; parent: DiagramNode }[] = [];

  if (approvalBranches.length > 0) {
    approvalBranches.forEach((item, index) => {
      const baseX = item.node.x + item.node.w / 2;
      const approved = add(mk(`approved${index + 1}`, 'Approved', baseX - NWS - 15, approvedRejectedY, NWS, NHD, C.approved));
      const rejected = add(mk(`rejected${index + 1}`, 'Rejected', baseX + 15, approvedRejectedY, NWS, NHD, C.rejected));
      approvalSubNodes.push({ approved, rejected, parent: item.node });
    });
  }

  const actionY = approvalBranches.length > 0 ? approvedRejectedY + NHD + 76 : branchY + NH + 90;
  const actionNodes = grid('action', actionLabels, actionY, C.action, 3, NWM, NH);
  const actionRows = Math.ceil(actionNodes.length / (actionNodes.length === 4 ? 2 : Math.min(3, actionNodes.length)));
  const actionBottom = actionY + actionRows * NH + (actionRows - 1) * 24;

  const notify = add(mk('notify', 'Notify SOC', CX, actionBottom + 70, NW, NH, C.notify, 'rect', 'Create Ticket'));
  const finalize = add(mk('finalize', 'Finalize', CX, actionBottom + 150, NW, NH, C.final));

  // Edges: Start -> Context
  E.push(arrow(bot(start), top(context)));

  // Context -> all enrichment nodes
  const laneContextEnrich = context.y + context.h + 20;
  for (const en of enrichNodes) {
    E.push(elbow(bot(context), top(en), laneContextEnrich));
  }

  // All enrichment nodes -> Score
  const laneEnrichScore = enrichBottom + 28;
  for (const en of enrichNodes) {
    E.push(elbow(bot(en), top(score), laneEnrichScore));
  }

  // Score -> Gates
  E.push(arrow(bot(score), dTop(gates)));

  // Gates -> every threshold branch
  const laneGates = gates.y + gates.h + 44;
  branchNodes.forEach((branch, i) => {
    const spec = branchSpecs[i];
    const from = i === 0 ? dLft(gates) : i === branchNodes.length - 1 ? dRgt(gates) : dBot(gates);
    if (i === 0 && branchNodes.length > 1) {
      E.push(elbow(from, top(branch), laneGates, spec.range, false, branch.x + branch.w / 2, laneGates - 12));
    } else if (i === branchNodes.length - 1 && branchNodes.length > 1) {
      E.push(elbow(from, top(branch), laneGates, spec.range, false, branch.x + branch.w / 2, laneGates - 12));
    } else {
      E.push(arrow(dBot(gates), top(branch), spec.range));
    }
  });

  // Approval branch internals
  for (const item of approvalSubNodes) {
    const lane = item.parent.y + item.parent.h + 22;
    E.push(elbow(bot(item.parent), top(item.approved), lane, 'Approved', false, item.approved.x + item.approved.w / 2, lane - 12));
    E.push(elbow(bot(item.parent), top(item.rejected), lane, 'Rejected', false, item.rejected.x + item.rejected.w / 2, lane - 12));
  }

  // Threshold branch routing:
  // - monitor/skip branches bypass to Finalize.
  // - approval approved branch goes to actions; rejected bypasses to Finalize.
  // - auto branches go to actions.
  branchSpecs.forEach((spec, i) => {
    const node = branchNodes[i];

    if (spec.kind === 'monitor') {
      const gutter = node.x < VW / 2 ? 14 : VW - 14;
      E.push(bypass(lft(node), lft(finalize), gutter, '', true));
      return;
    }

    if (spec.kind === 'approval') {
      const sub = approvalSubNodes.find(x => x.parent.id === node.id);
      if (sub) {
        const laneAct = actionY - 26;
        for (const an of actionNodes) {
          E.push(elbow(bot(sub.approved), top(an), laneAct));
        }
        E.push(bypass(rgt(sub.rejected), rgt(finalize), VW - 14, '', true));
      }
      return;
    }

    const laneAct = actionY - 26;
    for (const an of actionNodes) {
      E.push(elbow(bot(node), top(an), laneAct));
    }
  });

  // Action nodes -> Notify -> Finalize
  const laneNotify = actionBottom + 24;
  for (const an of actionNodes) {
    E.push(elbow(bot(an), top(notify), laneNotify));
  }
  E.push(arrow(bot(notify), top(finalize)));

  const content = [...E.map(rEdge), ...nodes.map(rNode)].join('\n');
  return svgWrap(VW, finalize.y + finalize.h + 32, `${esc(doc.metadata.playbookName)} \u2014 Architecture Overview`, content);
}


// ============================================================
// DECISION FLOW DIAGRAM
// Entry point: routes to template-specific or threshold-driven
// ============================================================

export function generateDecisionFlowSVG(doc: CustomerDocument): string {
  const id = doc.metadata.templateId ?? '';
  if (id === 'ransomware_auto_containment') return ransomwareDecisionSVG(doc);
  // All other templates: threshold-driven generic decision flow
  return thresholdDecisionSVG(doc);
}

// ── Ransomware Decision Flow (fixed coordinates) ──────────────
function ransomwareDecisionSVG(doc: CustomerDocument): string {
  const VW = 1100;
  const VH = 760;
  const NW  = 220;
  const NWM = 190;
  const NWS = 160;
  const NH  = 52;
  const NHD = 44;

  const thresholds = doc.scoringModel?.thresholds ?? [];
  const skipT    = thresholds.find(t => thresholdKind(t.action, t.approvalRequired) === 'monitor');
  const approveT = thresholds.find(t => thresholdKind(t.action, t.approvalRequired) === 'approval');
  const autoT    = thresholds.find(t => thresholdKind(t.action, t.approvalRequired) === 'auto');

  const skipRange    = skipT?.scoreRange    ? `Score ${skipT.scoreRange}`    : 'Score 0\u20131';
  const approveRange = approveT?.scoreRange ? `Score ${approveT.scoreRange}` : 'Score 2\u20137';
  const autoRange    = autoT?.scoreRange    ? `Score ${autoT.scoreRange}`    : 'Score \u22658';

  const Y0 =  36;  // calculate score
  const Y1 = 140;  // safety gates
  const Y2 = 290;  // branches
  const Y3 = 400;  // approved | rejected
  const Y4 = 510;  // containment actions
  const Y5 = 610;  // notify
  const Y6 = 700;  // finalize

  const CX_SKIP  = 50;
  const CX_APPR  = (VW - NW) / 2;  // 440
  const CX_AUTO  = VW - NWM - 50;  // 860

  const N: Record<string, DiagramNode> = {
    score:       mk('score',       'Calculate Score',            (VW - NW) / 2,   Y0, NW,  NH,  C.scoring),
    gates:       mk('gates',       'Safety Gates',               (VW - NW) / 2,   Y1, NW,  NH,  C.decision, 'diamond'),
    skip:        mk('skip',        'Skip / No Action',           CX_SKIP,          Y2, NWM, NH,  C.final),
    approval:    mk('approval',    'Analyst Approval',           CX_APPR,          Y2, NW,  NH,  C.approval),
    autocontain: mk('autocontain', 'Auto Contain',               CX_AUTO,          Y2, NWM, NH,  C.action),
    approved:    mk('approved',    'Approved',                   345,              Y3, NWS, NHD, C.approved),
    rejected:    mk('rejected',    'Rejected',                   600,              Y3, NWS, NHD, C.rejected),
    isolate:     mk('isolate',     'Isolate Endpoint',            210,              Y4, NWM, NH,  C.action),
    disablead:   mk('disablead',   'Disable AD User',             570,              Y4, NWM, NH,  C.action),
    notify:      mk('notify',      'Notify SOC / Create Ticket', (VW - NW) / 2,   Y5, NW,  NH,  C.notify),
    finalize:    mk('finalize',    'Finalize',                   (VW - NW) / 2,   Y6, NW,  NH,  C.final),
  };

  const E: DiagramEdge[] = [];

  E.push(arrow(bot(N.score), dTop(N.gates)));

  const laneG = Y1 + NH + 14 + 30;
  E.push(elbow(dLft(N.gates), top(N.skip),        laneG, skipRange,    false, N.skip.x + NWM / 2,        laneG - 12));
  E.push(arrow( dBot(N.gates), top(N.approval),         approveRange));
  E.push(elbow(dRgt(N.gates), top(N.autocontain), laneG, autoRange,    false, N.autocontain.x + NWM / 2, laneG - 12));

  const laneAB = Y2 + NH + 22;
  E.push(elbow(bot(N.approval), top(N.approved), laneAB, 'Approved', false, N.approved.x + NWS / 2,  laneAB - 12));
  E.push(elbow(bot(N.approval), top(N.rejected), laneAB, 'Rejected', false, N.rejected.x + NWS / 2,  laneAB - 12));

  const laneContain = Y3 + NHD + 22;
  E.push(elbow(bot(N.approved),    top(N.isolate),   laneContain));
  E.push(elbow(bot(N.approved),    top(N.disablead), laneContain));
  E.push(elbow(bot(N.autocontain), top(N.isolate),   laneContain));
  E.push(elbow(bot(N.autocontain), top(N.disablead), laneContain));

  const laneNotify = Y4 + NH + 22;
  E.push(elbow(bot(N.isolate),   top(N.notify), laneNotify));
  E.push(elbow(bot(N.disablead), top(N.notify), laneNotify));
  E.push(arrow(bot(N.notify), top(N.finalize)));

  E.push(bypass(lft(N.skip),     lft(N.finalize), 14,        '', true));
  E.push(bypass(rgt(N.rejected), rgt(N.finalize), VW - 14, '', true));

  const content = [...E.map(rEdge), ...Object.values(N).map(rNode)].join('\n');
  return svgWrap(VW, VH, 'Decision Flow \u2014 Scoring Thresholds', content);
}

// ── Threshold-Driven Decision Flow ───────────────────────────
// Builds branches from doc.scoringModel.thresholds.
// Each threshold becomes a branch from the Decision Gate.
// Approval thresholds get Approved/Rejected sub-branches.
// Auto thresholds route directly to response actions.
// Monitor/skip thresholds bypass to Finalize.
function thresholdDecisionSVG(doc: CustomerDocument): string {
  const VW = 1200;
  const NW = 220;
  const NWM = 190;
  const NWS = 155;
  const NH = 52;
  const NHD = 44;
  const CX = VW / 2;

  const thresholds = doc.scoringModel?.thresholds ?? [];
  const hasThresholds = thresholds.length > 0;

  const responseLabels = (doc.responseActions ?? [])
    .map(a => norm(a.action))
    .filter(Boolean);

  const actionLabels = responseLabels.length > 0
    ? responseLabels
    : ['Response Action'];

  const nodes: DiagramNode[] = [];
  const N: Record<string, DiagramNode> = {};
  const E: DiagramEdge[] = [];

  function add(n: DiagramNode): DiagramNode {
    nodes.push(n);
    N[n.id] = n;
    return n;
  }

  function grid(
    prefix: string,
    labels: string[],
    y: number,
    color: string,
    maxCols = 3,
    w = NWM,
    h = NH,
  ): DiagramNode[] {
    const count = Math.max(labels.length, 1);
    const cols = count === 4 ? 2 : Math.min(maxCols, count);
    const gapX = 28;
    const gapY = 24;
    const out: DiagramNode[] = [];

    labels.forEach((label, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const itemsInRow = Math.min(cols, count - row * cols);
      const rowWidth = itemsInRow * w + (itemsInRow - 1) * gapX;
      const x0 = (VW - rowWidth) / 2;
      const x = x0 + col * (w + gapX);
      const [l1, l2] = wrap(label, 22);
      out.push(add(mk(`${prefix}${i + 1}`, l1, x, y + row * (h + gapY), w, h, color, 'rect', l2)));
    });

    return out;
  }

  const score = add(mk('score', 'Evaluate Score', CX - NW / 2, 40, NW, NH, C.scoring));
  const gates = add(mk('gates', 'Decision Gate', CX - NW / 2, 150, NW, NH, C.decision, 'diamond'));

  const branchSpecs = hasThresholds
    ? thresholds.map((t, index) => {
        const kind = thresholdKind(t.action, t.approvalRequired);
        return {
          id: `branch${index + 1}`,
          label: thresholdDisplayLabel(t),
          range: t.scoreRange ? `Score ${t.scoreRange}` : '',
          kind,
          color: colorForKind(kind, t.action),
        };
      })
    : [{ id: 'execresp', label: 'Execute Response', range: '', kind: 'auto' as ThresholdKind, color: C.action }];

  const branchY = 300;
  const branchNodes = grid('branch', branchSpecs.map(b => b.label), branchY, C.monitor, 3, NWM, NH);
  branchNodes.forEach((node, i) => {
    const spec = branchSpecs[i];
    node.color = spec.color;
    node.id = spec.id;
    N[spec.id] = node;
  });

  const approvalBranches = branchSpecs
    .map((spec, index) => ({ spec, node: branchNodes[index] }))
    .filter(item => item.spec.kind === 'approval');

  const approvedRejectedY = branchY + NH + 68;
  const approvalSubNodes: { approved: DiagramNode; rejected: DiagramNode; parent: DiagramNode }[] = [];

  if (approvalBranches.length > 0) {
    approvalBranches.forEach((item, index) => {
      const baseX = item.node.x + item.node.w / 2;
      const approved = add(mk(`approved${index + 1}`, 'Approved', baseX - NWS - 15, approvedRejectedY, NWS, NHD, C.approved));
      const rejected = add(mk(`rejected${index + 1}`, 'Rejected', baseX + 15, approvedRejectedY, NWS, NHD, C.rejected));
      approvalSubNodes.push({ approved, rejected, parent: item.node });
    });
  }

  const actionY = approvalBranches.length > 0 ? approvedRejectedY + NHD + 76 : branchY + NH + 90;
  const actionNodes = grid('action', actionLabels, actionY, C.action, 3, NWM, NH);
  const actionRows = Math.ceil(actionNodes.length / (actionNodes.length === 4 ? 2 : Math.min(3, actionNodes.length)));
  const actionBottom = actionY + actionRows * NH + (actionRows - 1) * 24;

  const notify = add(mk('notify', 'Notify SOC / Create Ticket', CX - 125, actionBottom + 70, 250, NH, C.notify));
  const finalize = add(mk('finalize', 'Finalize', CX - NW / 2, actionBottom + 150, NW, NH, C.final));

  // score -> gate
  E.push(arrow(bot(score), dTop(gates)));

  // gate -> threshold branches
  const laneG = gates.y + gates.h + 44;
  branchNodes.forEach((branch, i) => {
    const spec = branchSpecs[i];
    const from = i === 0 ? dLft(gates) : i === branchNodes.length - 1 ? dRgt(gates) : dBot(gates);
    if (i === 0 && branchNodes.length > 1) {
      E.push(elbow(from, top(branch), laneG, spec.range, false, branch.x + branch.w / 2, laneG - 12));
    } else if (i === branchNodes.length - 1 && branchNodes.length > 1) {
      E.push(elbow(from, top(branch), laneG, spec.range, false, branch.x + branch.w / 2, laneG - 12));
    } else {
      E.push(arrow(dBot(gates), top(branch), spec.range));
    }
  });

  // approval -> approved/rejected
  for (const item of approvalSubNodes) {
    const lane = item.parent.y + item.parent.h + 22;
    E.push(elbow(bot(item.parent), top(item.approved), lane, 'Approved', false, item.approved.x + item.approved.w / 2, lane - 12));
    E.push(elbow(bot(item.parent), top(item.rejected), lane, 'Rejected', false, item.rejected.x + item.rejected.w / 2, lane - 12));
  }

  // branch routing
  branchSpecs.forEach((spec, i) => {
    const node = branchNodes[i];

    if (spec.kind === 'monitor') {
      const gutter = node.x < VW / 2 ? 14 : VW - 14;
      E.push(bypass(lft(node), lft(finalize), gutter, '', true));
      return;
    }

    if (spec.kind === 'approval') {
      const sub = approvalSubNodes.find(x => x.parent.id === node.id);
      if (sub) {
        const laneAct = actionY - 26;
        for (const an of actionNodes) {
          E.push(elbow(bot(sub.approved), top(an), laneAct));
        }
        E.push(bypass(rgt(sub.rejected), rgt(finalize), VW - 14, '', true));
      }
      return;
    }

    const laneAct = actionY - 26;
    for (const an of actionNodes) {
      E.push(elbow(bot(node), top(an), laneAct));
    }
  });

  // actions -> notify -> finalize
  const laneNotify = actionBottom + 24;
  for (const an of actionNodes) {
    E.push(elbow(bot(an), top(notify), laneNotify));
  }
  E.push(arrow(bot(notify), top(finalize)));

  const content = [...E.map(rEdge), ...nodes.map(rNode)].join('\n');
  return svgWrap(VW, finalize.y + finalize.h + 32, 'Decision Flow \u2014 Scoring Thresholds', content);
}


// ============================================================
// VALIDATION
// ============================================================

export interface DiagramValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

export function validateArchitectureDiagram(svg: string, isRansomware = false): DiagramValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  if (!svg.includes('viewBox'))  errors.push('Missing viewBox');
  if (!svg.includes('Finalize')) errors.push('Missing Finalize node');
  if (svg.includes('NaN'))       errors.push('SVG contains NaN coordinates');
  if (svg.includes('undefined')) errors.push('SVG contains undefined labels');
  if (/d=""/.test(svg))          errors.push('SVG contains empty path d=""');
  if (/\uFFFD/.test(svg))        errors.push('SVG contains corrupted characters');

  if (isRansomware) {
    const checks: [RegExp, string][] = [
      [/Score 0/,          'Score 0\u20131 label missing'],
      [/Score 2/,          'Score 2\u20137 label missing'],
      [/\u2265|Score 8|Score \u2265/, 'Score \u22658 label missing'],
      [/Skip/,             'Skip node missing'],
      [/Analyst Approval/, 'Analyst Approval node missing'],
      [/Approved/,         'Approved node missing'],
      [/Rejected/,         'Rejected node missing'],
      [/Auto Contain/,     'Auto Contain node missing'],
      [/Isolate/,          'Isolate Endpoint node missing'],
      [/Disable/,          'Disable AD User node missing'],
      [/Finalize/,         'Finalize node missing'],
    ];
    for (const [re, msg] of checks) if (!re.test(svg)) warnings.push(msg);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateDecisionDiagram(svg: string, doc: CustomerDocument): DiagramValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  if (!svg.includes('viewBox'))  errors.push('Missing viewBox');
  if (!svg.includes('Finalize')) errors.push('Missing Finalize node');
  if (svg.includes('NaN'))       errors.push('SVG contains NaN coordinates');
  if (svg.includes('undefined')) errors.push('SVG contains undefined labels');
  if (/d=""/.test(svg))          errors.push('SVG contains empty path d=""');
  if (/\uFFFD/.test(svg))        errors.push('SVG contains corrupted characters');

  const templateId    = doc.metadata.templateId ?? '';
  const thresholds    = doc.scoringModel?.thresholds ?? [];
  const isRansomware  = templateId === 'ransomware_auto_containment';
  const hasApproval   = thresholds.some(t => thresholdKind(t.action, t.approvalRequired) === 'approval');

  if (isRansomware) {
    const checks: [RegExp, string][] = [
      [/Score 0/,          'Score 0\u20131 label missing'],
      [/Score 2/,          'Score 2\u20137 label missing'],
      [/\u2265|Score 8|Score \u2265/, 'Score \u22658 label missing'],
      [/Analyst Approval/, 'Analyst Approval node missing'],
      [/Approved/,         'Approved node missing'],
      [/Rejected/,         'Rejected node missing'],
      [/Auto Contain/,     'Auto Contain node missing'],
      [/Isolate/,          'Isolate Endpoint missing'],
      [/Disable/,          'Disable AD User missing'],
      [/Finalize/,         'Finalize node missing'],
    ];
    for (const [re, msg] of checks) if (!re.test(svg)) warnings.push(msg);
  } else {
    // WAF and all other templates: validate real threshold labels appear
    for (const t of thresholds) {
      if (t.scoreRange && !svg.includes(t.scoreRange)) {
        warnings.push(`Score range "${t.scoreRange}" not found in diagram`);
      }
      const lbl = actionLabel(t.action);
      if (!svg.includes(lbl) && !svg.includes(t.action)) {
        warnings.push(`Action label "${lbl}" not found in diagram`);
      }
    }
    if (hasApproval) {
      if (!svg.includes('Approved')) warnings.push('Approved node not found');
      if (!svg.includes('Rejected')) warnings.push('Rejected node not found');
    }
    // Specifically check WAF template
    if (templateId === 'waf_attack_response') {
      const wafChecks: [RegExp, string][] = [
        [/Monitor/,            'Monitor node missing'],
        [/Analyst Approval/,   'Analyst Approval node missing'],
        [/Auto Block/,         'Auto Block node missing'],
        [/Approved/,           'Approved node missing'],
        [/Rejected/,           'Rejected node missing'],
        [/Finalize/,           'Finalize node missing'],
        [/Block IP|Block\s/,   'Block IP action missing'],
        [/ServiceNow|Incident/, 'ServiceNow Incident action missing'],
      ];
      for (const [re, msg] of wafChecks) if (!re.test(svg)) warnings.push(msg);
      // Must NOT be purely generic
      if (/>Execute Response</.test(svg) && !/Monitor|Auto Block/.test(svg)) {
        errors.push('WAF diagram shows generic "Execute Response" instead of real threshold branches');
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
