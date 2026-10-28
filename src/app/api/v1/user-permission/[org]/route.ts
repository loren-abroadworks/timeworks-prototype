import type { NextRequest } from "next/server";
import { sidebarPermissions } from "@/mock/engine";
import { respond } from "@/mock/http";

/** GET /api/v1/user-permission/{org} — sidebar navigation tree. */
export async function GET(req: NextRequest) {
  return respond(req, () => sidebarPermissions());
}
