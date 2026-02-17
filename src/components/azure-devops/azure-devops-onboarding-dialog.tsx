"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  RefreshCw,
  FolderKanban,
  ArrowRight,
  Check,
  PartyPopper,
  Cloud,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface AzureDevOpsOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkProject?: () => void;
}

const features = [
  {
    icon: FolderKanban,
    title: "Link Projects",
    description: "Connect Azure DevOps projects to your workspaces",
  },
  {
    icon: Download,
    title: "Import Work Items",
    description: "Bring work items into TaskOS as tasks",
  },
  {
    icon: Upload,
    title: "Create Work Items",
    description: "Push tasks to Azure DevOps with one click",
  },
  {
    icon: RefreshCw,
    title: "Two-Way Sync",
    description: "Status changes sync automatically",
  },
];

export const AzureDevOpsOnboardingDialog = ({
  open,
  onOpenChange,
  onLinkProject,
}: AzureDevOpsOnboardingDialogProps) => {
  const [step, setStep] = useState<"welcome" | "done">("welcome");

  const handleGetStarted = () => {
    setStep("done");

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.65 },
      colors: ["#0078D4", "#50E6FF", "#00B7C3", "#005A9E"],
    });
  };

  const handleClose = () => {
    setStep("welcome");
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-md p-0 overflow-hidden">
        {step === "welcome" ? (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#0078D4] to-[#005A9E] p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                <Cloud className="w-8 h-8" />
              </div>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle className="text-xl font-bold text-white text-center">
                  Azure DevOps Connected!
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <p className="text-white/80 text-sm mt-2">
                Your Azure DevOps account is now linked to TaskOS
              </p>
            </div>

            {/* Features */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground font-medium">
                What you can do now:
              </p>
              <div className="space-y-3">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <feature.icon className="w-4 h-4 text-[#0078D4]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="w-full gap-2 bg-[#0078D4] hover:bg-[#005A9E]"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Done */}
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0078D4]/10 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-[#0078D4]" />
              </div>

              <div>
                <h3 className="text-lg font-bold">You&apos;re All Set!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Start by importing work items or linking a project
                </p>
              </div>

              <div className="space-y-2">
                {onLinkProject && (
                  <Button
                    className="w-full gap-2 bg-[#0078D4] hover:bg-[#005A9E]"
                    onClick={() => {
                      handleClose();
                      onLinkProject();
                    }}
                  >
                    <FolderKanban className="w-4 h-4" />
                    Link a Project
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleClose}
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
