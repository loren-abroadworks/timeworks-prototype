import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { allClients } from "@/mock/timeoff";

/** GET /api/v1/all/clients/{org} — [{ id, name }] (Linked Client picker). */
export async function GET(req: NextRequest) {
  return respond(req, (ctx) => allClients(ctx));
}
