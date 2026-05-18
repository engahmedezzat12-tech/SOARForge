import { NextResponse } from 'next/server';
import { buildDemoKnowledgeUpdateReview } from '@/lib/knowledge-updates/mock-update-data';
import { getAllowedKnowledgeTransitions } from '@/lib/knowledge-updates/approval-state-machine';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function demoResponse() {
  const review = buildDemoKnowledgeUpdateReview();
  return {
    ok: true,
    mode: 'demo-secured',
    safetyNotice: 'Demo-safe response. No production playbook is modified by this API route.',
    review,
    allowedTransitions: getAllowedKnowledgeTransitions(review.status),
  };
}

export const GET = withSecureApi({
  permission: 'knowledge.read',
  rateLimit: 'generalApi',
  async handler() {
    return NextResponse.json(demoResponse());
  },
});

export const POST = withSecureApi({
  permission: 'knowledge.read',
  rateLimit: 'generalApi',
  async handler() {
    return NextResponse.json(demoResponse());
  },
});
