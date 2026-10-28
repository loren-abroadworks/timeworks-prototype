import { NextResponse } from "next/server";
import { resetStore } from "@/mock/store";

/**
 * POST /api/__reset — regenerate the in-memory mock data from src/mock/seed.ts.
 * (The folder is named "%5F%5Freset" because Next.js treats folders starting with "_" as private.)
 */
export async function POST() {
  const store = resetStore();
  return NextResponse.json({ status: "ok", generatedAt: store.generatedAt });
}
