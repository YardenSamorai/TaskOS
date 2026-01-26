import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getUserUsageStats } from "@/lib/auth/plan-check";
import { AccountSettings } from "@/components/account/account-settings";
import { Loader2 } from "lucide-react";

const AccountPage = async () => {
  const user = await getCurrentUser();
  const usageStats = await getUserUsageStats();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AccountSettings user={user} usageStats={usageStats} />
    </Suspense>
  );
};

export default AccountPage;
