/**
 * Appearance preferences (Profile menu › Appearance). Same localStorage keys and <html> attributes as the
 * live app: tw-mode (light|dark|system), tw-accent, tw-scene, tw-background-blur. The replica adds
 * tw-replica-wallpaper (a data URL) because it does not port the live IndexedDB/palette logic.
 * APPEARANCE_INIT_SCRIPT runs before paint (see src/app/layout.tsx) so there is no flash.
 */

export type Mode = "light" | "dark" | "system";
export const KEYS = { mode: "tw-mode", accent: "tw-accent", scene: "tw-scene", blur: "tw-background-blur", wallpaper: "tw-replica-wallpaper" } as const;

export const ACCENTS = [
  { accent: "blue", label: "Blue", swatch: "#6271ff" },
  { accent: "pink", label: "Pink", swatch: "#ff4fab" },
  { accent: "emerald", label: "Emerald", swatch: "#0f9d6e" },
  { accent: "amber", label: "Amber", swatch: "#d97706" },
  { accent: "violet", label: "Violet", swatch: "#7c4dff" },
  // The live "Red" swatch maps to the "space" accent.
  { accent: "space", label: "Red", swatch: "#ef4444" },
  { accent: "black", label: "Black", swatch: "#1a1a1a" },
];

export const SCENES = [
  { scene: "none", label: "None", preview: null },
  { scene: "sakura", label: "Sakura", preview: "/sakura-branch.svg" },
  { scene: "ferns", label: "Ferns", preview: "/fern-fronds.svg" },
  { scene: "sunburst", label: "Sunburst", preview: "/sunburst-rays.svg" },
  { scene: "constellation", label: "Constellation", preview: "/constellation.svg" },
  { scene: "space", label: "Space", preview: "/space-satellite.svg" },
  { scene: "grid", label: "Grid", preview: "grid" },
  { scene: "noise", label: "Noise", preview: "/pattern-noise.svg" },
];

export interface Prefs {
  mode: Mode;
  accent: string;
  scene: string;
  blur: number;
  wallpaper: string | null;
}

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* quota / private mode */
  }
};

export function readPrefs(): Prefs {
  return {
    mode: (get(KEYS.mode) as Mode) ?? "system",
    accent: get(KEYS.accent) ?? "blue",
    scene: get(KEYS.scene) ?? "none",
    blur: Number(get(KEYS.blur) ?? 0) || 0,
    wallpaper: get(KEYS.wallpaper),
  };
}

const isDark = (mode: Mode) => mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

export function applyPrefs(p: Prefs) {
  const r = document.documentElement;
  // No explicit choice yet → dark (what the live capture shows), even though the dialog shows "System".
  const dark = get(KEYS.mode) ? isDark(p.mode) : true;
  r.classList.toggle("dark", dark);
  r.setAttribute("data-mode", dark ? "dark" : "light");
  r.setAttribute("data-accent", p.accent);
  r.setAttribute("data-scene", p.scene);
  if (p.blur > 0) {
    r.style.setProperty("--background-blur", `${p.blur}px`);
    r.setAttribute("data-blur", "on");
  } else {
    r.style.removeProperty("--background-blur");
    r.removeAttribute("data-blur");
  }
  if (p.wallpaper) {
    r.style.setProperty("--app-wallpaper", `url("${p.wallpaper}")`);
    r.setAttribute("data-wallpaper", "on");
  } else {
    r.style.removeProperty("--app-wallpaper");
    r.removeAttribute("data-wallpaper");
  }
}

/** Stores only the changed preference, then re-applies everything. */
export function savePref<K extends keyof Prefs>(p: Prefs, key: K, value: Prefs[K]): Prefs {
  const next = { ...p, [key]: value };
  const v = value === null ? null : String(value);
  set(KEYS[key], v);
  applyPrefs(next);
  return next;
}

/**
 * Inline <head> script (string). Defaults reproduce the live capture: dark, blue accent, no scene —
 * the replica treats "system" as dark when nothing was chosen yet, so first loads match the captured screens.
 */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var r=document.documentElement;var m=localStorage.getItem("${KEYS.mode}");var a=localStorage.getItem("${KEYS.accent}")||"blue";var dark=!m||m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.classList.toggle("dark",dark);r.setAttribute("data-mode",dark?"dark":"light");r.setAttribute("data-accent",a);r.setAttribute("data-scene",localStorage.getItem("${KEYS.scene}")||"none");var bl=Number(localStorage.getItem("${KEYS.blur}")||0);if(bl>0){r.style.setProperty("--background-blur",bl+"px");r.setAttribute("data-blur","on");}var w=localStorage.getItem("${KEYS.wallpaper}");if(w){r.style.setProperty("--app-wallpaper",'url("'+w+'")');r.setAttribute("data-wallpaper","on");}}catch(e){}})();`;
