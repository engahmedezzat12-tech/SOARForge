'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { IntelligenceReviewResult } from '@/lib/intelligence/intelligence-types';
import { Button } from '@/components/ui/button';

export function LearningFeedbackPanel({ result }: { result: IntelligenceReviewResult }) {
  const [feedback, setFeedback] = useState<'accepted' | 'rejected' | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div>
        <h3 className="font-semibold">Learning Feedback</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Feedback is tenant-specific. It improves local recommendation confidence without being shared into global intelligence automatically.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={feedback === 'accepted' ? 'default' : 'outline'} onClick={() => setFeedback('accepted')} className="gap-2">
          <ThumbsUp className="w-4 h-4" /> Useful recommendation set
        </Button>
        <Button size="sm" variant={feedback === 'rejected' ? 'default' : 'outline'} onClick={() => setFeedback('rejected')} className="gap-2">
          <ThumbsDown className="w-4 h-4" /> Needs tuning
        </Button>
      </div>

      {feedback && (
        <p className="text-xs text-muted-foreground">
          Feedback captured locally for this review session. Production learning storage can be connected later through the FeedbackEvent model.
        </p>
      )}

      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
        {result.tenantLearningNotes.map((note, idx) => <li key={idx}>{note}</li>)}
      </ul>
    </div>
  );
}
