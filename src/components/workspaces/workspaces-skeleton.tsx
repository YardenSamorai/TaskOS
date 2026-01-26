import { Card, CardContent } from "@/components/ui/card";

export const WorkspacesSkeleton = () => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-muted" />
              <div className="w-16 h-5 rounded bg-muted" />
            </div>
            <div className="h-6 w-3/4 rounded bg-muted mb-2" />
            <div className="h-4 w-full rounded bg-muted mb-1" />
            <div className="h-4 w-2/3 rounded bg-muted mb-4" />
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-4 w-4 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
