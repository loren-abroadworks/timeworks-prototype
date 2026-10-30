import type { NextRequest } from "next/server";
import { ApiError, respondWrite } from "@/mock/http";
import { idsFromBody, permanentlyDelete } from "@/mock/screenshots";

/** POST (or DELETE) /api/v1/deleted-activity-screenshots/{org}/bulk-permanent-delete — body { ids: number[] }. */
async function handle(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => {
    const ids = idsFromBody(body);
    if (!ids.length) throw new ApiError(422, "ids is required");
    const deleted = ids.reduce((n, id) => n + permanentlyDelete(id), 0);
    return { status: "success", message: `${deleted} screenshot(s) permanently deleted`, deleted };
  });
}

export const POST = handle;
export const DELETE = handle;
