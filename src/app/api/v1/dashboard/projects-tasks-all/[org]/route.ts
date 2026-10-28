import type { NextRequest } from "next/server";
import { projectsTasksAll } from "@/mock/engine";
import { listOf, rangeOf, respond } from "@/mock/http";

/** GET /api/v1/dashboard/projects-tasks-all/{org}?limit&offset&search&project_id&start_date&end_date */
export async function GET(req: NextRequest) {
  const { start, end } = rangeOf(req);
  const list = listOf(req);
  const projectId = req.nextUrl.searchParams.get("project_id") || undefined;
  return respond(req, (ctx) => projectsTasksAll(ctx, { start, end, ...list, projectId }));
}
