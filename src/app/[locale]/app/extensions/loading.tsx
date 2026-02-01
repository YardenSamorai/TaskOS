import { Skeleton } from "@/components/ui/skeleton";

export default function ExtensionsLoading() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  );
}
