import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { updateStatus } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; id: string }> };

/** PATCH /api/v1/status-update/time-off/{org}/{id} — body { status: approved|denied, reason_notes, timezone }. PUT / POST accepted too. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, (_ctx, body) => updateStatus(Number(id), body));
}
export const PUT = PATCH;
export const POST = PATCH;
