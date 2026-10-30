/**
 * ============================================================================
 *  DUMMY DATA for Activity › App and Activity › URLs (fictional, edit freely).
 * ============================================================================
 * App usage and URL visits are derived from the members' time entries (src/mock/store.ts) and
 * the per-day app mix in seed.ts › APPS. This file only adds presentation data:
 *  - APP_DISPLAY_NAMES: desktop-agent process name -> name shown in the App page
 *  - URL_PATHS:         fictional pages per domain (URL visits pick from these)
 *  - ALERT_DOMAINS:     domains counted as "Alerts" on the All URLs grid
 */
import { PROJECTS, TEAMS } from "./seed";

export const APP_DISPLAY_NAMES: Record<string, string> = {
  "Code.exe": "Visual Studio Code",
  "chrome.exe": "Google Chrome",
  "Slack.exe": "Slack",
  "Figma.exe": "Figma",
  "zoom.us": "Zoom",
  "Windows Terminal.exe": "Windows Terminal",
  "Notion.exe": "Notion",
  "Postman.exe": "Postman",
  "Microsoft Excel.exe": "Microsoft Excel",
  "Outlook.exe": "Microsoft Outlook",
  "Spotify.exe": "Spotify",
  "Docker Desktop.exe": "Docker Desktop",
  "Microsoft Teams.exe": "Microsoft Teams",
  "Explorer.exe": "Windows Explorer",
  "Photoshop.exe": "Adobe Photoshop",
  "Notepad.exe": "Notepad",
  "Calculator.exe": "Calculator",
};

/** The tracker itself always shows up with a few seconds per hour (like the live app). */
export const TRACKER_APP = "TimeWorks";

/** Fictional paths per domain ("https://" + domain + path). */
export const URL_PATHS: Record<string, string[]> = {
  "github.com": [
    "/acme-remote/website/pull/412",
    "/acme-remote/website/pull/418/files",
    "/acme-remote/mobile-app/issues/97",
    "/acme-remote/data-pipeline/actions/runs/88213",
    "/acme-remote/website/blob/main/src/pages/index.tsx",
    "/acme-remote/mobile-app/compare/release-2.4...main",
  ],
  "docs.google.com": [
    "/document/d/1aQx-roadmap-q4/edit",
    "/spreadsheets/d/1bR-capacity-plan/edit#gid=0",
    "/presentation/d/1cS-brand-refresh-deck/edit",
    "/document/d/1dT-meeting-notes/edit",
  ],
  "mail.google.com": ["/mail/u/0/#inbox", "/mail/u/0/#sent", "/mail/u/0/#label/clients"],
  "stackoverflow.com": [
    "/questions/7804231/how-to-debounce-a-react-input",
    "/questions/1952464/css-grid-auto-fit-vs-auto-fill",
    "/questions/40453912/typescript-generic-constraints",
  ],
  "figma.com": ["/file/AcmeWebsite/Landing-v3", "/file/AcmeMobile/Onboarding-flow", "/file/AcmeBrand/Style-guide"],
  "jira.acme-remote.example": ["/browse/WEB-231", "/browse/APP-118", "/browse/OPS-42", "/secure/RapidBoard.jspa?rapidView=7"],
  "calendar.google.com": ["/calendar/u/0/r/week", "/calendar/u/0/r/day"],
  "developer.mozilla.org": ["/en-US/docs/Web/CSS/grid-template-columns", "/en-US/docs/Web/API/Intl/DateTimeFormat", "/en-US/docs/Web/HTML/Element/dialog"],
  "linear.app": ["/acme-remote/team/WEB/active", "/acme-remote/issue/WEB-88"],
  "vercel.com": ["/acme-remote/website/deployments", "/acme-remote/website/analytics"],
  "chat.openai.com": ["/c/3f2a-prompt-drafts", "/c/7b1c-sql-help"],
  "youtube.com": ["/watch?v=focus-music-lofi", "/watch?v=conference-keynote-2026"],
  "news.ycombinator.com": ["/", "/item?id=41822913"],
  "linkedin.com": ["/feed/", "/in/acme-remote-co/"],
  "drive.google.com": ["/drive/u/0/folders/acme-shared", "/file/d/1eU-contract-draft/view"],
};

/** Visits to these domains count as alerts (red legend on the All URLs grid). */
export const ALERT_DOMAINS = ["youtube.com"];

/** Client options for the All URLs "Clients" filter (ids are stable indexes). */
export const CLIENTS = [...new Set(PROJECTS.map((p) => p.client).filter((c): c is string => !!c))].map((name, i) => ({ id: i + 1, name }));

export { TEAMS };
