import { Card } from "@/components/ui/card";

const Loading = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded mt-2 animate-pulse" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <Card className="animate-pulse">
        <div className="p-4 space-y-4">
          <div className="h-10 bg-muted rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded" />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Loading;
