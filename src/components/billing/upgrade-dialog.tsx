"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Crown, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_INFO, PLAN_LIMITS } from "@/lib/plans";
import type { UserPlan } from "@/lib/db/schema";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: UserPlan;
  feature?: string;
  limitType?: "workspaces" | "members" | "files" | "feature";
}

export const UpgradeDialog = ({
  open,
  onOpenChange,
  currentPlan,
  feature,
  limitType,
}: UpgradeDialogProps) => {
  const router = useRouter();

  const getMessage = () => {
    switch (limitType) {
      case "workspaces":
        return `You've reached the limit of ${PLAN_LIMITS[currentPlan].maxWorkspaces} workspaces on your ${PLAN_INFO[currentPlan].name} plan.`;
      case "members":
        return `You've reached the limit of ${PLAN_LIMITS[currentPlan].maxMembersPerWorkspace} members per workspace on your ${PLAN_INFO[currentPlan].name} plan.`;
      case "files":
        return `You've reached the limit of ${PLAN_LIMITS[currentPlan].maxFilesPerTask} files per task on your ${PLAN_INFO[currentPlan].name} plan.`;
      case "feature":
        return `The ${feature} feature is not available on your ${PLAN_INFO[currentPlan].name} plan.`;
      default:
        return `Upgrade to Pro to unlock more features.`;
    }
  };

  const proFeatures = [
    "Unlimited workspaces",
    "Unlimited file uploads",
    "Process Mode",
    "AI Task Enhancement",
    "Advanced filters & search",
    "30-day activity history",
    "Priority support",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="text-center">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">Pro Plan</span>
              </div>
              <div>
                <span className="text-2xl font-bold">$12</span>
                <span className="text-muted-foreground">/user/mo</span>
              </div>
            </div>
            <ul className="space-y-2">
              {proFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500"
              onClick={() => {
                // In the future, redirect to checkout
                // For now, just close and show a message
                onOpenChange(false);
                // router.push("/app/billing");
              }}
            >
              <Sparkles className="w-4 h-4 me-2" />
              Upgrade to Pro
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Maybe later
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            14-day free trial · Cancel anytime · No credit card required
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to easily show upgrade dialog
import { create } from "zustand";

interface UpgradeDialogStore {
  open: boolean;
  currentPlan: UserPlan;
  feature?: string;
  limitType?: "workspaces" | "members" | "files" | "feature";
  showUpgrade: (params: {
    currentPlan: UserPlan;
    feature?: string;
    limitType?: "workspaces" | "members" | "files" | "feature";
  }) => void;
  hideUpgrade: () => void;
}

export const useUpgradeDialog = create<UpgradeDialogStore>((set) => ({
  open: false,
  currentPlan: "free",
  feature: undefined,
  limitType: undefined,
  showUpgrade: (params) =>
    set({
      open: true,
      currentPlan: params.currentPlan,
      feature: params.feature,
      limitType: params.limitType,
    }),
  hideUpgrade: () => set({ open: false }),
}));
