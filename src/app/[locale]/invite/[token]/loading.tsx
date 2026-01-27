import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function InviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </CardContent>
      </Card>
    </div>
  );
}
