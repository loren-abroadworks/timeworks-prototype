"use client";

import * as React from "react";
import { Slider } from "radix-ui";
import { Ban, Check, ImagePlus, Monitor, Moon, Palette, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/filters/toast";
import { ACCENTS, readPrefs, savePref, SCENES, type Mode, type Prefs } from "./appearance";

const CAPTION = "text-xs leading-normal whitespace-normal text-secondary-foreground font-medium uppercase";
const OPTION_ON = "border-primary bg-primary-highlighted text-primary";
const OPTION_OFF = "border-layout-subtle text-icon hover:bg-primary-selected";

/** Profile menu › Appearance — theme, accent, background elements, wallpaper, blur. Works locally (localStorage). */
export function AppearanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [p, setP] = React.useState<Prefs>({ mode: "system", accent: "blue", scene: "none", blur: 0, wallpaper: null });
  const fileRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (open) setP(readPrefs());
  }, [open]);
  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => setP((cur) => savePref(cur, key, value));
  const canBlur = !!p.wallpaper || p.scene !== "none";

  const onFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image file");
    const reader = new FileReader();
    reader.onload = () => update("wallpaper", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background dark:bg-background dark:backdrop-blur-none dark:border dark:border-subtle-layout sm:max-w-2xl border-0" data-testid="appearance-dialog">
        <div data-slot="dialog-header" className="flex flex-col gap-2 text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2">
            <Palette size={18} className="text-primary" />
            Appearance
          </DialogTitle>
          <DialogDescription>Choose how TimeWorks looks — theme, accent colour, background elements and wallpaper.</DialogDescription>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className={CAPTION}>Theme</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["light", "Light", Sun],
                  ["dark", "Dark", Moon],
                  ["system", "System", Monitor],
                ] as [Mode, string, typeof Sun][]
              ).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update("mode", mode)}
                  className={cn("flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors", p.mode === mode ? OPTION_ON : OPTION_OFF)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className={CAPTION}>Accent</span>
            <div className="flex flex-wrap items-center gap-3">
              {ACCENTS.map((a) => {
                const on = p.accent === a.accent;
                return (
                  <button
                    key={a.accent}
                    type="button"
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => update("accent", a.accent)}
                    className={cn("flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-all", on ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover" : "hover:opacity-80")}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border" style={{ backgroundColor: a.swatch }}>
                      {on && <Check size={14} className="text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className={CAPTION}>Background elements</span>
            <div className="grid grid-cols-8 gap-1">
              {SCENES.map((s) => (
                <button
                  key={s.scene}
                  type="button"
                  title={s.label}
                  onClick={() => {
                    update("scene", s.scene);
                    if (s.scene === "grid") update("blur", 2);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-0.5 rounded-md border p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    p.scene === s.scene ? OPTION_ON : OPTION_OFF,
                  )}
                >
                  <span className="flex h-6 w-full items-center justify-center overflow-hidden rounded bg-primary-surface">
                    {s.preview === null ? (
                      <Ban size={14} className="text-icon" />
                    ) : s.preview === "grid" ? (
                      <span
                        className="h-full w-full"
                        style={{
                          backgroundImage: "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
                          backgroundSize: "9px 9px",
                        }}
                      />
                    ) : (
                      <span
                        className={cn("bg-primary", s.scene === "noise" ? "h-6 w-full" : "h-5 w-7")}
                        style={{
                          maskImage: `url("${s.preview}")`,
                          maskRepeat: s.scene === "noise" ? "repeat" : "no-repeat",
                          maskSize: s.scene === "noise" ? "14px auto" : "contain",
                          maskPosition: "center center",
                        }}
                      />
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-medium">{s.label}</span>
                </button>
              ))}
            </div>
            <span className="text-xs leading-normal normal-case whitespace-normal text-muted-foreground">Elements take their colour from the accent, so any set works with any accent.</span>
          </div>
          <div className="space-y-1.5">
            <span className={CAPTION}>Wallpaper</span>
            {p.wallpaper ? (
              <div className="flex items-center gap-3 rounded-lg border border-layout-subtle p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.wallpaper} alt="Wallpaper" className="h-14 w-24 rounded-md object-cover" />
                <div className="ml-auto flex gap-2">
                  <button type="button" className="h-8 rounded-lg border border-ui-border bg-secondary-surface px-3 text-sm font-medium hover:bg-muted" onClick={() => fileRef.current?.click()}>
                    Replace
                  </button>
                  <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-3 text-sm font-medium text-negative hover:bg-negative/10" onClick={() => update("wallpaper", null)}>
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-4 py-6 text-center transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImagePlus size={18} className="text-muted-foreground" />
                <p className="text-sm text-foreground">
                  <span className="font-medium text-primary">Choose an image</span> for your background
                </p>
                <p className="text-xs text-muted-foreground">Kept at full quality, stored on this device</p>
              </button>
            )}
            <input ref={fileRef} accept="image/*" className="hidden" type="file" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="space-y-2 rounded-lg border border-layout-subtle p-2.5">
            <div className="space-y-0.5">
              <p className="text-sm leading-relaxed normal-case whitespace-normal text-foreground">Blur the background</p>
              <span className="text-xs leading-normal normal-case whitespace-normal text-muted-foreground block">
                {p.wallpaper
                  ? "Softens the image behind your content."
                  : canBlur
                    ? "Softens the background elements behind your content."
                    : "Pick background elements or a wallpaper to soften."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Slider.Root
                data-slot="slider"
                value={[p.blur]}
                min={0}
                max={24}
                step={1}
                disabled={!canBlur}
                onValueChange={([v]) => update("blur", v ?? 0)}
                className="relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 flex-1"
              >
                <Slider.Track data-slot="slider-track" className="relative grow overflow-hidden rounded-full h-1.5 w-full bg-muted">
                  <Slider.Range data-slot="slider-range" className="absolute h-full bg-primary" />
                </Slider.Track>
                <Slider.Thumb
                  data-slot="slider-thumb"
                  aria-label="Blur"
                  className="block shrink-0 rounded-full bg-background shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 border-2 border-primary size-4 focus-visible:outline-hidden"
                />
              </Slider.Root>
              <span className="w-10 text-right text-xs font-medium text-secondary-foreground">{p.blur}px</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
