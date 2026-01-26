import { Card, CardContent } from "@/components/ui/card";

export const BoardSkeleton = () => {
  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col w-72 min-w-72 bg-muted/30 rounded-xl border border-border animate-pulse"
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <div className="h-5 w-20 bg-muted rounded" />
              <div className="h-5 w-8 bg-muted rounded-full" />
            </div>
          </div>

          {/* Tasks */}
          <div className="flex-1 p-2 space-y-2">
            {[...Array(3 - Math.floor(i / 2))].map((_, j) => (
              <Card key={j}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex gap-1">
                    <div className="h-4 w-12 bg-muted rounded-full" />
                    <div className="h-4 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-muted" />
                      <div className="w-6 h-6 rounded-full bg-muted" />
                    </div>
                    <div className="h-3 w-12 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
