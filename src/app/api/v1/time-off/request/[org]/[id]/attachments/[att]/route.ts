import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { deleteAttachment } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; id: string; att: string }> };

/** DELETE /api/v1/time-off/request/{org}/{id}/attachments/{attachmentId} */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, att } = await params;
  return respondWrite(req, () => deleteAttachment(Number(id), Number(att)));
}
