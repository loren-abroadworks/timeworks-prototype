import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { userPolicies } from "@/mock/timeoff";

/** GET /api/v1/user-time-off-policy/list/{org} — policies of the logged-in user ("+ Time off" policy select). */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => userPolicies(ctx));
}
