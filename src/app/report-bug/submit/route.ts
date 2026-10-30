import { NextResponse, type NextRequest } from "next/server";
import { addBugReport, bugReports } from "@/mock/bug-reports";

/**
 * POST /report-bug/submit — multipart FormData { summary*, description*, fullname, email, webInfo?, screenshot[] }.
 * Same path as the live app (a Next route, not /api/v1). Stored in memory; nothing is sent anywhere.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid form data" }, { status: 400 });
  }
  if (!String(form.get("summary") ?? "").trim() || !String(form.get("description") ?? "").trim()) {
    return NextResponse.json({ success: false, message: "Summary and description are required" }, { status: 422 });
  }
  const report = addBugReport(form);
  return NextResponse.json({ success: true, message: "Bug report submitted", id: report.id });
}

/** GET /report-bug/submit — replica-only helper listing the stored reports (for tests / QA). */
export async function GET() {
  return NextResponse.json({ success: true, data: bugReports() });
}
