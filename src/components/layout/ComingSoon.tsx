import Link from "next/link";
import { Construction } from "lucide-react";
import { DEMO_USER_ID } from "@/mock/seed";

/** Placeholder for every sidebar page that is not part of this Dashboard replica. */
export function ComingSoon({ path }: { path: string }) {
  return (
    <div className="font-karla pt-2 pb-6">
      <div className="bg-secondary-surface border border-layout-subtle rounded-xl shadow-sm p-10 flex flex-col items-center text-center gap-3" data-testid="coming-soon">
        <div className="rounded-full bg-primary/15 p-4">
          <Construction className="size-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Coming soon in replica</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This page is not part of the replica yet (built so far: Dashboard, Timesheets › View &amp; Edit and the Activity pages). The live app would show{" "}
          <code className="text-foreground">{path}</code> here.
        </p>
        <Link href={`/dashboard/${DEMO_USER_ID}/my_dashboard`} className="text-sm font-medium text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

/** "settings/organization/audit_logs" -> "Audit Logs" */
export function titleFromPath(segments: string[]) {
  const last = segments[segments.length - 1] ?? "";
  return last.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
