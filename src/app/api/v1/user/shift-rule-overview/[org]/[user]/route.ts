import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { shiftRuleOverview } from "@/mock/schedules";

type Params = { params: Promise<{ org: string; user: string }> };

/** GET /api/v1/user/shift-rule-overview/{org}/{user} */
export async function GET(req: NextRequest, { params }: Params) {
  const { user } = await params;
  return respond(req, () => shiftRuleOverview(user));
}
