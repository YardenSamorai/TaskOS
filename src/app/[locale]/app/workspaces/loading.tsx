import { WorkspacesSkeleton } from "@/components/workspaces/workspaces-skeleton";

const Loading = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-muted rounded animate-pulse" />
      </div>
      <WorkspacesSkeleton />
    </div>
  );
};

export default Loading;
