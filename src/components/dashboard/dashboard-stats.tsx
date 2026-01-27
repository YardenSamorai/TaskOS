"use client";

import { CheckCircle2, Clock, AlertCircle, ListTodo, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspaceStats } from "@/lib/hooks/use-tasks";

interface DashboardStatsProps {
  workspaceId: string;
}

export const DashboardStats = ({ workspaceId }: DashboardStatsProps) => {
  const { data: stats, isLoading } = useWorkspaceStats(workspaceId);

  if (isLoading || !stats) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-2" />
                <div className="h-8 bg-muted rounded w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Total Tasks",
      value: stats.total,
      icon: ListTodo,
      color: "accent-text",
      bg: "accent-bg-light",
      isAccent: true,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <Card key={item.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-bold mt-1">{item.value}</p>
                </div>
                <div 
                  className={`p-3 rounded-xl ${(item as any).isAccent ? '' : item.bg}`}
                  style={(item as any).isAccent ? { backgroundColor: 'rgba(var(--accent-color-rgb), 0.1)' } : undefined}
                >
                  <item.icon 
                    className={`w-6 h-6 ${(item as any).isAccent ? '' : item.color}`} 
                    style={(item as any).isAccent ? { color: 'var(--accent-color)' } : undefined}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
              <span className="font-medium">Completion Rate</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>{completionRate}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${completionRate}%`,
                background: `linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, #8b5cf6))`
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
