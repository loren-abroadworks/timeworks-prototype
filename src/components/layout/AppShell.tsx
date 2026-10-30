"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebarTrigger, PageHeader, type Crumb } from "./PageHeader";

/**
 * Application frame: background scene layers, sidebar, sticky "glass" header that fades in
 * after scrolling 30px, and the scrollable <main>. Markup mirrors the live app 1:1.
 */
export function AppShell({
  title = "Dashboard",
  crumbs,
  headerSlot,
  children,
}: {
  title?: string;
  crumbs?: Crumb[];
  /** Extra content rendered right after the breadcrumb (e.g. the My URLs / All URLs tabs). */
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const mainRef = React.useRef<HTMLElement>(null);
  // Page bodies render client-side only: they default to "today" in the browser time zone, which can differ from the server.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 30);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setScrolled((mainRef.current?.scrollTop ?? 0) > 30), [pathname]);

  // The background scenes react to the pointer position (CSS variables), like the live app.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--pointer-x", `${e.clientX}px`);
        el.style.setProperty("--pointer-y", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative h-dvh w-screen overflow-hidden">
      <div className="app-wallpaper" aria-hidden="true" />
      <div className="app-blob app-blob--top-left" />
      <div className="app-blob app-blob--top-right" />
      <div className="app-blob app-blob--bottom-left" />
      <div className="app-blob app-blob--bottom-right" />
      <div className="scene-pattern pointer-events-none" aria-hidden="true">
        <div className="scene-reveal" />
      </div>
      <div className="scene-decor scene-decor--top-right pointer-events-none" aria-hidden="true" />
      <div className="scene-decor scene-decor--bottom-left pointer-events-none" aria-hidden="true" />
      <div className="scene-satellite pointer-events-none" aria-hidden="true" />
      <div className="space-scene pointer-events-none" aria-hidden="true">
        <div className="space-stars" />
        <div className="space-stars space-stars--twinkle" />
        <div className="space-body-halo" />
        <div className="space-body" />
        <canvas className="space-canvas" aria-hidden="true" />
      </div>
      <div className="scene-particles pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="scene-particle" />
        ))}
      </div>

      <div className="flex h-dvh w-screen overflow-hidden bg-app-gradient">
        <div
          data-slot="sidebar-wrapper"
          className="group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full"
          style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
        >
          <AppSidebar />
          <div className="relative flex flex-col flex-1 min-w-0">
            <div
              className={`transition-all duration-300 ease-in-out z-50 w-full absolute left-0 top-0 ${
                scrolled ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-8 pointer-events-none"
              }`}
              style={{ willChange: "transform, opacity" }}
            >
              <PageHeader title={title} crumbs={crumbs} headerSlot={mounted ? headerSlot : null} className="glass-header py-4 px-8 border-b border-layout-subtle shadow-sm" />
            </div>
            <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4" style={{ position: "relative" }} data-testid="main-scroll">
              <div className="py-2 font-karla">
                <header className="flex items-center shrink-0">
                  <MobileSidebarTrigger />
                  <PageHeader title={title} crumbs={crumbs} headerSlot={mounted ? headerSlot : null} className="py-2" />
                </header>
                {mounted ? children : null}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
