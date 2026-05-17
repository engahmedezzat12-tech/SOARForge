import { z } from 'zod';

export const TenantCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
});

export const ValidationUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'PASSED', 'FAILED', 'NOT_APPLICABLE']),
  evidence: z.string().max(4000).optional(),
  validatedBy: z.string().max(120).optional(),
});

export const ExportRecordSchema = z.object({
  playbookId: z.string().min(1),
  exportType: z.string().min(1).max(100),
  platform: z.string().min(1).max(100),
  fileName: z.string().max(255).optional(),
  readinessScore: z.number().min(0).max(100).optional(),
  threatCoverageScore: z.number().min(0).max(100).optional(),
  intelligenceScore: z.number().min(0).max(100).optional(),
});

export const KnowledgeApprovalSchema = z.object({
  updateId: z.string().min(1),
  selectedDiffIds: z.array(z.string()).default([]),
  comment: z.string().max(1000).optional(),
});

export function parseJsonBody<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body);
}
