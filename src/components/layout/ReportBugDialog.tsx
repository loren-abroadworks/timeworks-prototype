"use client";

import * as React from "react";
import { Bug, Upload, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/filters/toast";
import { SURFACE_BUTTON, THEMED_BUTTON } from "@/components/filters/styles";

const LABEL =
  "flex items-center gap-2 text-sm font-medium leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50";
const INPUT =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-ui-border flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-9 text-sm";

const environment = () => ({
  Location: window.location.href,
  "User-Agent": navigator.userAgent,
  "Screen Resolution": `${window.screen.width} x ${window.screen.height}`,
});

/**
 * Profile menu › Report a Bug. Same fields / validation as the live dialog (Summary* and Description* required,
 * Name / Email prefilled, image attachments, optional environment data). POSTs FormData to /report-bug/submit.
 */
export function ReportBugDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useSession();
  const [form, setForm] = React.useState({ summary: "", description: "", fullname: "", email: "" });
  const [errors, setErrors] = React.useState<{ summary?: string; description?: string }>({});
  const [files, setFiles] = React.useState<File[]>([]);
  const [drag, setDrag] = React.useState(false);
  const [includeEnv, setIncludeEnv] = React.useState(false);
  const [env, setEnv] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm({ summary: "", description: "", fullname: user?.full_name ?? "", email: user?.email ?? "" });
    setErrors({});
    setFiles([]);
    setDrag(false);
    setIncludeEnv(false);
    setEnv(environment());
  }, [open, user?.full_name, user?.email]);

  const addFiles = (list: FileList | null | undefined) => {
    const imgs = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) setFiles((cur) => [...cur, ...imgs]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.summary.trim()) errs.summary = "Summary is required";
    if (!form.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    if (errs.summary || errs.description) return;
    const body = new FormData();
    body.append("summary", form.summary);
    body.append("description", form.description);
    body.append("fullname", form.fullname);
    body.append("email", form.email);
    if (includeEnv)
      body.append(
        "webInfo",
        Object.entries(environment())
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      );
    files.forEach((f) => body.append("screenshot", f));
    setSubmitting(true);
    try {
      const res = await fetch("/report-bug/submit", { method: "POST", body });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null;
        toast.error(json?.message || "Failed to submit bug report");
        return;
      }
      toast.success("Thanks! Your report has been submitted.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit bug report");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    name: key,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background dark:bg-background dark:backdrop-blur-none dark:border dark:border-subtle-layout sm:max-w-3xl border-0" data-testid="report-bug-dialog">
        <div data-slot="dialog-header" className="flex flex-col gap-2 text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2">
            <Bug size={18} className="text-primary" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>Found a bug or have a suggestion? Describe what happened and, if it&apos;s a bug, the steps to reproduce it.</DialogDescription>
        </div>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div data-slot="text-field" className="flex flex-col gap-1.5">
            <label data-slot="field-label" className={LABEL} htmlFor="bug-summary">
              Summary<span className="text-negative">*</span>
            </label>
            <div className="relative flex items-center">
              <input id="bug-summary" data-slot="input" className={INPUT} placeholder="Briefly, what went wrong?" aria-invalid={!!errors.summary} {...field("summary")} />
            </div>
            {errors.summary && <p className="text-xs text-negative">{errors.summary}</p>}
          </div>
          <div data-slot="textarea-field" className="flex flex-col gap-1.5">
            <label data-slot="field-label" className={LABEL} htmlFor="bug-description">
              Description<span className="text-negative">*</span>
            </label>
            <textarea
              id="bug-description"
              data-slot="textarea"
              rows={5}
              className="border-input flex w-full resize-y rounded-lg border bg-transparent shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-negative px-4 py-2 text-base"
              placeholder="What happened, what you expected, and the steps to reproduce it..."
              aria-invalid={!!errors.description}
              {...field("description")}
            />
            {errors.description && <p className="text-xs text-negative">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div data-slot="text-field" className="flex flex-col gap-1.5">
              <label data-slot="field-label" className={LABEL} htmlFor="bug-name">
                Name
              </label>
              <div className="relative flex items-center">
                <input id="bug-name" data-slot="input" className={INPUT} placeholder="Your name" {...field("fullname")} />
              </div>
            </div>
            <div data-slot="text-field" className="flex flex-col gap-1.5">
              <label data-slot="field-label" className={LABEL} htmlFor="bug-email">
                Email
              </label>
              <div className="relative flex items-center">
                <input id="bug-email" data-slot="input" type="email" className={INPUT} placeholder="you@example.com" {...field("email")} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground" htmlFor="bug-screenshot">
              Attachments
            </label>
            <label
              htmlFor="bug-screenshot"
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
                drag ? "border-primary bg-primary/5" : "border-input hover:border-foreground",
              )}
            >
              <Upload size={18} className="text-muted-foreground" />
              <p className="text-sm text-foreground">
                <span className="font-medium text-primary">Choose files</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">Images only</p>
              <input id="bug-screenshot" type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                      className="ml-2 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox shape="sharp" checked={includeEnv} onCheckedChange={(v) => setIncludeEnv(v === true)} className="mt-0.5 border-input" aria-label="Include environment data" />
              <span className="text-sm leading-5 text-foreground">
                Include data about your current environment, like the browser and page URL. This helps us understand your feedback better.
              </span>
            </label>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">What is included in the data about my current environment?</p>
              <dl className="space-y-0.5">
                {Object.entries(env).map(([k, v]) => (
                  <div key={k} className="text-xs leading-relaxed">
                    <dt className="inline font-medium text-muted-foreground">{k}: </dt>
                    <dd className="inline break-all text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div data-slot="dialog-footer" className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={SURFACE_BUTTON} onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={THEMED_BUTTON} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
