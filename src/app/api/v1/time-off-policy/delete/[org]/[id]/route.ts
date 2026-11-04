import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { deletePolicy } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; id: string }> };

/** DELETE /api/v1/time-off-policy/delete/{org}/{id} */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, () => deletePolicy(Number(id)));
}
