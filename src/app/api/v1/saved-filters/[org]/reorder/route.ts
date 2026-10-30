import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { reorderSavedFilters } from "@/mock/saved-filters";

/** PUT /api/v1/saved-filters/{org}/reorder — body [{ id, position }]. */
export async function PUT(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => reorderSavedFilters(body));
}
