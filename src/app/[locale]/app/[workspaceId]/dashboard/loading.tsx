import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

const Loading = () => {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
      </div>

      {/* Stats */}
      <DashboardSkeleton type="stats" />

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardSkeleton type="tasks" />
        </div>
        <div>
          <DashboardSkeleton type="activity" />
        </div>
      </div>
    </div>
  );
};

export default Loading;
