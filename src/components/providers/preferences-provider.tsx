"use client";

// User preferences provider - wraps children with preferences context
import { UserPreferencesProvider } from "@/lib/hooks/use-user-preferences";
import { useEffect } from "react";

// Initialize preferences on page load (to prevent flash of unstyled content)
function initializePreferences() {
  if (typeof window === "undefined") return;
  
  try {
    // Load appearance preferences
    const savedAppearance = localStorage.getItem("taskos-appearance");
    if (savedAppearance) {
      const appearance = JSON.parse(savedAppearance);
      const root = document.documentElement;
      
      // Apply accent color
      if (appearance.accentColor) {
        root.style.setProperty("--accent-color", appearance.accentColor);
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          if (!result) return "99, 102, 241";
          return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
        };
        root.style.setProperty("--accent-color-rgb", hexToRgb(appearance.accentColor));
      }
      
      // Apply font size
      if (appearance.fontSize) {
        const fontSizes: Record<string, string> = { small: "14px", medium: "16px", large: "18px" };
        root.style.fontSize = fontSizes[appearance.fontSize] || "16px";
        root.classList.add(`font-${appearance.fontSize}`);
      }
      
      // Apply compact mode
      if (appearance.compactMode) {
        root.classList.add("compact-mode");
      }
      
      // Apply reduced motion
      if (appearance.reducedMotion) {
        root.classList.add("reduce-motion");
      }
    }
  } catch (e) {
    console.warn("Could not initialize preferences from localStorage", e);
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // Initialize preferences on mount (client-side only)
  useEffect(() => {
    initializePreferences();
  }, []);

  return (
    <UserPreferencesProvider>
      {children}
    </UserPreferencesProvider>
  );
}

// Script to run on page load (before React hydration)
export const preferencesInitScript = `
(function() {
  try {
    var appearance = localStorage.getItem("taskos-appearance");
    if (appearance) {
      var prefs = JSON.parse(appearance);
      var root = document.documentElement;
      
      if (prefs.accentColor) {
        root.style.setProperty("--accent-color", prefs.accentColor);
        var hex = prefs.accentColor.replace('#', '');
        var rgb = parseInt(hex.substring(0,2), 16) + ', ' + parseInt(hex.substring(2,4), 16) + ', ' + parseInt(hex.substring(4,6), 16);
        root.style.setProperty("--accent-color-rgb", rgb);
      }
      
      if (prefs.fontSize) {
        var sizes = { small: "14px", medium: "16px", large: "18px" };
        root.style.fontSize = sizes[prefs.fontSize] || "16px";
        root.classList.add("font-" + prefs.fontSize);
      }
      
      if (prefs.compactMode) root.classList.add("compact-mode");
      if (prefs.reducedMotion) root.classList.add("reduce-motion");
    }
  } catch(e) {}
})();
`;
