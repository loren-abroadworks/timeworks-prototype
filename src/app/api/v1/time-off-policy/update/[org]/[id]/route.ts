import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { updatePolicy } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; id: string }> };

/** PUT /api/v1/time-off-policy/update/{org}/{id} — schedule of accrual and accrual year stay locked. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, (_ctx, body) => updatePolicy(Number(id), body));
}
