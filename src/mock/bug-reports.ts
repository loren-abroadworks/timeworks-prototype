/**
 * "Report a Bug" submissions (Profile menu › Report a Bug). The live app POSTs multipart FormData to its own
 * Next route /report-bug/submit; the replica keeps the reports in memory (lost on server restart).
 */
import { runtimeId } from "./random";

export interface BugReport {
  id: string;
  summary: string;
  description: string;
  fullname: string;
  email: string;
  webInfo: string | null;
  attachments: { name: string; size: number; type: string }[];
  created_at: string;
}

const g = globalThis as unknown as { __twBugReports?: BugReport[] };
export const bugReports = () => (g.__twBugReports ??= []);

export function addBugReport(form: FormData): BugReport {
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const report: BugReport = {
    id: runtimeId("bug"),
    summary: text("summary"),
    description: text("description"),
    fullname: text("fullname"),
    email: text("email"),
    webInfo: form.get("webInfo") ? text("webInfo") : null,
    attachments: form
      .getAll("screenshot")
      .filter((f): f is File => typeof f === "object" && f !== null && "name" in f)
      .map((f) => ({ name: f.name, size: f.size, type: f.type })),
    created_at: new Date().toISOString(),
  };
  bugReports().push(report);
  return report;
}
