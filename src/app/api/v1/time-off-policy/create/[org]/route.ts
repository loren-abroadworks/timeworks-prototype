import type { NextRequest } from "next/server";
import { respondWrite } from "@/mock/http";
import { createPolicy } from "@/mock/timeoff";

/** POST /api/v1/time-off-policy/create/{org} — 400 "Policy name is required, Client is required" when invalid. */
export async function POST(req: NextRequest) {
  return respondWrite(req, (_ctx, body) => createPolicy(body));
}
