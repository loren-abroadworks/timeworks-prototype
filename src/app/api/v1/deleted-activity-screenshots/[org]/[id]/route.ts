import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { permanentlyDelete } from "@/mock/screenshots";

type Params = { params: Promise<{ org: string; id: string }> };

/** DELETE /api/v1/deleted-activity-screenshots/{org}/{id} — permanently delete one soft-deleted screenshot. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, () => ({ status: "success", message: "Screenshot permanently deleted", count: permanentlyDelete(Number(id)) }));
}
