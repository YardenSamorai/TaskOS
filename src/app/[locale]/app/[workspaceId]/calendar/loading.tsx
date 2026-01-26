import { Card, CardContent } from "@/components/ui/card";

const Loading = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded-full" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="h-[500px] bg-muted rounded" />
        </CardContent>
      </Card>
    </div>
  );
};

export default Loading;
