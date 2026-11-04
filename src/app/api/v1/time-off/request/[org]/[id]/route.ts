import type { NextRequest } from "next/server";
import { respondForm, respondWrite } from "@/mock/http";
import { deleteRequest, updateRequest } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; id: string }> };

/** PUT /api/v1/time-off/request/{org}/{id} — edit a pending request (same FormData as create). */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondForm(req, (_ctx, data, files) => updateRequest(Number(id), data, files));
}

/** DELETE /api/v1/time-off/request/{org}/{id} — body { timezone, deleted_notes }. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, (_ctx, body) => deleteRequest(Number(id), body));
}
