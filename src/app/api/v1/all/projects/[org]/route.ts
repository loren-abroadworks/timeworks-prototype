import type { NextRequest } from "next/server";
import { allProjects } from "@/mock/engine";
import { respond } from "@/mock/http";

/** GET /api/v1/all/projects/{org} — project options for the project filter. */
export async function GET(req: NextRequest) {
  return respond(req, () => allProjects());
}
