"use client";

import { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Bot, ArrowRight, Brain, Puzzle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  metadata?: string | null;
  createdAt: string;
  user?: { id: string; name: string | null } | null;
  task?: { id: string; title: string } | null;
}

interface AgentSummaryCardProps {
  activity: ActivityLog[];
  reviewCount: number;
}

export const AgentSummaryCard = ({ activity, reviewCount }: AgentSummaryCardProps) => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const workspaceId = params.workspaceId as string;

  const agentStats = useMemo(() => {
    let processed = 0;
    activity.forEach((a) => {
      try {
        const meta = a.metadata ? JSON.parse(a.metadata) : null;
        if (meta?.agentProcessed || meta?.agent) processed++;
      } catch {
        // ignore
      }
    });
    return { processed };
  }, [activity]);

  const hasActivity = agentStats.processed > 0 || reviewCount > 0;

  const summaryText = hasActivity
    ? `Agent processed ${agentStats.processed} task${agentStats.processed !== 1 ? "s" : ""} recently.${reviewCount > 0 ? ` ${reviewCount} need${reviewCount !== 1 ? "" : "s"} your review.` : ""}`
    : "Assign tasks to the Agent from your IDE extension to get started.";

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-violet-500/[0.03]" />
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base">AI Agent</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 leading-relaxed">
                {summaryText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {reviewCount > 0 && (
              <Button
                size="sm"
                onClick={() => router.push(`/${locale}/app/${workspaceId}/tasks?status=review`)}
                className="gap-1.5"
              >
                <Brain className="w-3.5 h-3.5" />
                Review
                <span className="ml-0.5 text-xs bg-primary-foreground/20 px-1.5 rounded-full">
                  {reviewCount}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${locale}/app/${workspaceId}/focus-mode`)}
              className="gap-1.5"
            >
              Focus
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${locale}/app/extensions`)}
              className="gap-1.5"
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">IDE</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
