import type { NextRequest } from "next/server";
import { respond, respondWrite } from "@/mock/http";
import { createSavedFilter, listSavedFilters } from "@/mock/saved-filters";

/** GET /api/v1/saved-filters/{org}?page_key=timesheet — saved filter presets of one page. */
export async function GET(req: NextRequest) {
  return respond(req, () => listSavedFilters(req.nextUrl.searchParams.get("page_key") ?? ""));
}

/** POST /api/v1/saved-filters/{org} — body { page_key, name, description, filters }. */
export async function POST(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => createSavedFilter(body));
}
