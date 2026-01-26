import { Loader2 } from "lucide-react";

const MembersLoading = () => {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
};

export default MembersLoading;
