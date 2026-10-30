import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { restoreScreenshot } from "@/mock/screenshots";

type Params = { params: Promise<{ org: string; id: string }> };

/** POST /api/v1/deleted-activity-screenshots/{org}/{id}/restore — restores the screenshot's slot (time + screenshots). PUT/PATCH accepted too. */
async function handle(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, () => ({ status: "success", message: "Screenshot restored", restored: restoreScreenshot(Number(id)) }));
}

export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
