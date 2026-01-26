import { BoardSkeleton } from "@/components/board/board-skeleton";

const Loading = () => {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded mt-2 animate-pulse" />
        </div>
      </div>
      <BoardSkeleton />
    </div>
  );
};

export default Loading;
