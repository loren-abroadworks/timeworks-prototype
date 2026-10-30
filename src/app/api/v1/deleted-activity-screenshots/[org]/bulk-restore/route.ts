import type { NextRequest } from "next/server";
import { ApiError, respondWrite } from "@/mock/http";
import { idsFromBody, restoreScreenshot } from "@/mock/screenshots";
import { getStore } from "@/mock/store";

/** POST /api/v1/deleted-activity-screenshots/{org}/bulk-restore — body { ids: number[] }. PUT/PATCH accepted too. */
async function handle(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => {
    const ids = idsFromBody(body);
    if (!ids.length) throw new ApiError(422, "ids is required");
    let restored = 0;
    for (const id of ids) {
      if (getStore().deletedScreenshots.some((d) => d.id === id && d.deletionType === "soft_deleted")) restored += restoreScreenshot(id);
    }
    return { status: "success", message: `${restored} screenshot(s) restored`, restored };
  });
}

export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
