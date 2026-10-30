import type { NextRequest } from "next/server";
import { respond } from "@/mock/http";
import { projectTasks } from "@/mock/timesheets";

type Params = { params: Promise<{ org: string; project: string }> };

/** GET /api/v1/project/tasks/{org}/{project} — tasks of a project: {items:[{id,name}]}. */
export async function GET(req: NextRequest, { params }: Params) {
  const { project } = await params;
  return respond(req, () => projectTasks(project));
}
