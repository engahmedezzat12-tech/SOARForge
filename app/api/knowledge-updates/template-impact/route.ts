import { NextResponse } from 'next/server';
import { buildDemoKnowledgeUpdateReview } from '@/lib/knowledge-updates/mock-update-data';
import { getAllowedKnowledgeTransitions } from '@/lib/knowledge-updates/approval-state-machine';

function demoResponse() {
  const review = buildDemoKnowledgeUpdateReview();
  return {
    ok: true,
    mode: 'demo',
    safetyNotice: 'Demo-safe response. No production playbook is modified by this API route.',
    review,
    allowedTransitions: getAllowedKnowledgeTransitions(review.status),
  };
}

export async function GET() {
  return NextResponse.json(demoResponse());
}

export async function POST(request: Request) {
  let body: unknown = null;
  try { body = await request.json(); } catch { body = null; }
  return NextResponse.json({ ...demoResponse(), request: body });
}
