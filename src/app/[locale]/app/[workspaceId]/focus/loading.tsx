import { Card, CardContent, CardHeader } from "@/components/ui/card";

const Loading = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-muted" />
        <div>
          <div className="h-7 w-28 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </div>
      </div>

      {/* Smart Summary */}
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-5 h-5 bg-muted rounded mx-auto" />
                <div className="h-6 w-8 bg-muted rounded mx-auto" />
                <div className="h-3 w-16 bg-muted rounded mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task cards */}
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-40 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-16 bg-muted rounded-xl" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Loading;
