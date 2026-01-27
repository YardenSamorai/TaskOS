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
        
        // Convert hex to RGB and HSL
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          if (!result) return { r: 99, g: 102, b: 241, str: "99, 102, 241" };
          const r = parseInt(result[1], 16);
          const g = parseInt(result[2], 16);
          const b = parseInt(result[3], 16);
          return { r, g, b, str: `${r}, ${g}, ${b}` };
        };
        
        const rgbToHsl = (r: number, g: number, b: number) => {
          r /= 255; g /= 255; b /= 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h = 0, s = 0;
          const l = (max + min) / 2;
          
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
              case g: h = ((b - r) / d + 2) / 6; break;
              case b: h = ((r - g) / d + 4) / 6; break;
            }
          }
          
          return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };
        
        const rgb = hexToRgb(appearance.accentColor);
        root.style.setProperty("--accent-color-rgb", rgb.str);
        
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        root.style.setProperty("--accent-color-hsl", hsl);
        root.style.setProperty("--primary", hsl);
        root.setAttribute("data-accent", "true");
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
        var r = parseInt(hex.substring(0,2), 16);
        var g = parseInt(hex.substring(2,4), 16);
        var b = parseInt(hex.substring(4,6), 16);
        root.style.setProperty("--accent-color-rgb", r + ', ' + g + ', ' + b);
        
        // Convert to HSL for primary color
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          else if (max === g) h = ((b - r) / d + 2) / 6;
          else h = ((r - g) / d + 4) / 6;
        }
        var hsl = Math.round(h * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
        root.style.setProperty("--accent-color-hsl", hsl);
        root.style.setProperty("--primary", hsl);
        root.setAttribute("data-accent", "true");
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
