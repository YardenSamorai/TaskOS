"use client";

import { useState, useEffect } from "react";
import { X, Share, Plus, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days after dismissal
      }
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

    if (isIOS && !isInStandaloneMode) {
      // Delay showing iOS prompt
      const timer = setTimeout(() => setShowIOSPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Handle Android/Desktop install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowAndroidPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
  };

  if (isInstalled) return null;

  // iOS Install Instructions
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <Card className="bg-background/95 backdrop-blur-lg border-border shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* App Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="10" r="4" />
                  <path d="M9 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="6" y="17" width="12" height="2" rx="1"/>
                  <rect x="6" y="20" width="8" height="2" rx="1"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base">Install TaskOS</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Add to your home screen for the best experience
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mt-1 -mr-2"
                    onClick={handleDismiss}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* iOS Instructions */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      1
                    </div>
                    <span className="flex items-center gap-1.5">
                      Tap <Share className="w-4 h-4" /> Share button
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      2
                    </div>
                    <span className="flex items-center gap-1.5">
                      Scroll and tap <Plus className="w-4 h-4" /> "Add to Home Screen"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      3
                    </div>
                    <span>Tap "Add" in the top right</span>
                  </div>
                </div>

                {/* Arrow pointing down to share button location */}
                <div className="flex justify-center mt-3">
                  <ArrowDown className="w-5 h-5 text-muted-foreground animate-bounce" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Android/Desktop Install Button
  if (showAndroidPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <Card className="bg-background/95 backdrop-blur-lg border-border shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* App Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="10" r="4" />
                  <path d="M9 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="6" y="17" width="12" height="2" rx="1"/>
                  <rect x="6" y="20" width="8" height="2" rx="1"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">Install TaskOS</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Install our app for a better experience
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  Not now
                </Button>
                <Button size="sm" onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
                  Install
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
