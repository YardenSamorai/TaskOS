import { Card, CardContent, CardHeader } from "@/components/ui/card";

const Loading = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-8 w-96 bg-muted rounded" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-muted rounded-full" />
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Details card */}
          <Card>
            <CardHeader>
              <div className="h-5 w-16 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-20 bg-muted rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>

          {/* Process mode card */}
          <Card>
            <CardHeader>
              <div className="h-5 w-28 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-xl" />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity sidebar */}
        <Card>
          <CardHeader>
            <div className="h-5 w-20 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Loading;
