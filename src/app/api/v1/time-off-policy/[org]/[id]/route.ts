import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { policyDetail } from "@/mock/timeoff";

type Params = { params: Promise<{ org: string; id: string }> };

/** GET /api/v1/time-off-policy/{org}/{id} — policy + assigned_users (Edit Policy form). */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return respondWrite(req, () => policyDetail(Number(id)));
}
