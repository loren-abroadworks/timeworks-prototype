// Generates the fake desktop screenshots (public/mock-screens/*.svg) and member avatars
// (public/mock-avatars/*.svg) used by the mock API. Run: node scripts/generate-mock-assets.mjs
// Everything is drawn from simple shapes — no real screenshots or photos.
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1600;
const H = 900;
const font = `font-family="Segoe UI, Helvetica, Arial, sans-serif"`;

function frame(title, accent, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#1b1d23"/>
  ${body}
  <rect y="${H - 44}" width="${W}" height="44" fill="#0f1115"/>
  <rect x="20" y="${H - 34}" width="24" height="24" rx="4" fill="${accent}"/>
  ${[0, 1, 2, 3, 4].map((i) => `<rect x="${70 + i * 44}" y="${H - 34}" width="24" height="24" rx="5" fill="#2c3038"/>`).join("")}
  <text x="${W - 120}" y="${H - 16}" fill="#9aa1ad" font-size="16" ${font}>${title}</text>
</svg>`;
}

const lines = (x, y, n, colors, maxW = 700, gap = 30, seed = 1) =>
  Array.from({ length: n }, (_, i) => {
    const w = 120 + ((i * 97 + seed * 53) % maxW);
    const indent = ((i * 7 + seed) % 4) * 28;
    return `<rect x="${x + indent}" y="${y + i * gap}" width="${w}" height="12" rx="6" fill="${colors[(i + seed) % colors.length]}" opacity="0.85"/>`;
  }).join("");

const screens = [
  // 1. Code editor
  frame(
    "10:42 AM",
    "#3b82f6",
    `<rect width="${W}" height="38" fill="#2b2d33"/>
     <circle cx="22" cy="19" r="7" fill="#ef4444"/><circle cx="44" cy="19" r="7" fill="#f59e0b"/><circle cx="66" cy="19" r="7" fill="#22c55e"/>
     <text x="${W / 2 - 120}" y="25" fill="#c9ced6" font-size="15" ${font}>onboarding-flow.tsx — mobile-app</text>
     <rect y="38" width="60" height="${H - 82}" fill="#23252b"/>
     ${[0, 1, 2, 3, 4].map((i) => `<rect x="18" y="${70 + i * 56}" width="24" height="24" rx="4" fill="#3a3f48"/>`).join("")}
     <rect x="60" y="38" width="280" height="${H - 82}" fill="#1f2127"/>
     ${lines(84, 70, 22, ["#4b5563", "#6b7280", "#3b82f6"], 160, 32, 2)}
     <rect x="340" y="38" width="${W - 340}" height="42" fill="#24262c"/>
     <rect x="340" y="38" width="220" height="42" fill="#1b1d23"/>
     ${lines(380, 110, 23, ["#c084fc", "#60a5fa", "#fbbf24", "#34d399", "#9ca3af", "#f472b6"], 760, 30, 3)}`,
  ),
  // 2. Browser with analytics dashboard
  frame(
    "11:05 AM",
    "#22c55e",
    `<rect width="${W}" height="86" fill="#2b2d33"/>
     <rect x="16" y="8" width="230" height="30" rx="8" fill="#1b1d23"/><text x="34" y="29" fill="#d1d5db" font-size="14" ${font}>Metrics · Data Pipeline</text>
     <rect x="16" y="46" width="${W - 32}" height="30" rx="15" fill="#1b1d23"/><text x="40" y="66" fill="#9ca3af" font-size="14" ${font}>https://metrics.orbit-logistics.example/dashboard</text>
     <rect x="40" y="110" width="${W - 80}" height="70" rx="12" fill="#23262d"/>
     ${[0, 1, 2, 3].map((i) => `<rect x="${40 + i * 385}" y="200" width="365" height="140" rx="14" fill="#262a32"/><rect x="${64 + i * 385}" y="226" width="140" height="14" rx="7" fill="#6b7280"/><rect x="${64 + i * 385}" y="262" width="${200 - i * 20}" height="34" rx="8" fill="${["#60a5fa", "#34d399", "#f87171", "#fbbf24"][i]}"/>`).join("")}
     <rect x="40" y="360" width="980" height="470" rx="14" fill="#262a32"/>
     <polyline fill="none" stroke="#60a5fa" stroke-width="5" points="${Array.from({ length: 20 }, (_, i) => `${80 + i * 48},${720 - ((i * 37) % 260) - i * 8}`).join(" ")}"/>
     <polyline fill="none" stroke="#34d399" stroke-width="5" points="${Array.from({ length: 20 }, (_, i) => `${80 + i * 48},${760 - ((i * 53) % 180)}`).join(" ")}"/>
     <rect x="1040" y="360" width="520" height="470" rx="14" fill="#262a32"/>
     ${lines(1070, 400, 13, ["#9ca3af", "#4b5563"], 380, 32, 4)}`,
  ),
  // 3. Chat app
  frame(
    "11:31 AM",
    "#a855f7",
    `<rect width="260" height="${H - 44}" fill="#3b1f4a"/>
     <text x="24" y="44" fill="#fff" font-size="20" font-weight="700" ${font}>Acme Remote Co.</text>
     ${["# general", "# design", "# mobile-app", "# support", "# random", "# standup"].map((c, i) => `<text x="28" y="${110 + i * 34}" fill="${i === 2 ? "#fff" : "#cbb7d6"}" font-size="17" ${font}>${c}</text>`).join("")}
     <rect x="260" width="${W - 260}" height="64" fill="#22242a"/><text x="290" y="40" fill="#e5e7eb" font-size="20" font-weight="700" ${font}># mobile-app</text>
     ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="290" y="${100 + i * 112}" width="44" height="44" rx="8" fill="${["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#6366f1", "#14b8a6"][i]}"/><rect x="350" y="${104 + i * 112}" width="${120 + i * 10}" height="14" rx="7" fill="#e5e7eb"/>${lines(350, 130 + i * 112, 2, ["#9ca3af", "#6b7280"], 900, 24, i)}`).join("")}
     <rect x="290" y="${H - 120}" width="${W - 330}" height="56" rx="10" fill="#2a2d34" stroke="#3f444e"/>`,
  ),
  // 4. Design tool
  frame(
    "12:14 PM",
    "#f97316",
    `<rect width="${W}" height="48" fill="#2c2c2c"/>
     ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${20 + i * 44}" y="12" width="26" height="24" rx="5" fill="#4a4a4a"/>`).join("")}
     <text x="${W / 2 - 80}" y="31" fill="#e5e5e5" font-size="15" ${font}>Brand Refresh / Style guide</text>
     <rect y="48" width="240" height="${H - 92}" fill="#252525"/>${lines(20, 80, 18, ["#7a7a7a", "#5a5a5a"], 150, 34, 5)}
     <rect x="${W - 280}" y="48" width="280" height="${H - 92}" fill="#252525"/>${lines(W - 260, 80, 16, ["#7a7a7a", "#5a5a5a"], 180, 38, 6)}
     <rect x="240" y="48" width="${W - 520}" height="${H - 92}" fill="#1e1e1e"/>
     <rect x="340" y="120" width="420" height="300" rx="18" fill="#f8fafc"/><circle cx="550" cy="250" r="80" fill="#6366f1"/><rect x="380" y="360" width="340" height="24" rx="12" fill="#94a3b8"/>
     <rect x="800" y="120" width="420" height="300" rx="18" fill="#0f172a" stroke="#3b82f6" stroke-width="3"/><rect x="840" y="170" width="200" height="30" rx="8" fill="#f97316"/><rect x="840" y="220" width="320" height="16" rx="8" fill="#64748b"/>
     ${["#6366f1", "#f97316", "#10b981", "#ef4444", "#0ea5e9", "#facc15"].map((c, i) => `<rect x="${340 + i * 150}" y="470" width="120" height="120" rx="14" fill="${c}"/>`).join("")}
     <rect x="340" y="630" width="880" height="160" rx="16" fill="#f1f5f9"/>${lines(370, 660, 4, ["#94a3b8", "#cbd5e1"], 600, 30, 7)}`,
  ),
  // 5. Spreadsheet
  frame(
    "01:47 PM",
    "#16a34a",
    `<rect width="${W}" height="96" fill="#1f6f43"/><text x="24" y="40" fill="#fff" font-size="20" font-weight="700" ${font}>Q4 budget.xlsx</text>
     ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${24 + i * 96}" y="58" width="80" height="24" rx="4" fill="#2f8a57"/>`).join("")}
     <rect y="96" width="${W}" height="${H - 140}" fill="#f9fafb"/>
     ${Array.from({ length: 23 }, (_, r) => `<line x1="0" x2="${W}" y1="${130 + r * 32}" y2="${130 + r * 32}" stroke="#e5e7eb"/>`).join("")}
     ${Array.from({ length: 13 }, (_, c) => `<line y1="96" y2="${H - 44}" x1="${60 + c * 128}" x2="${60 + c * 128}" stroke="#e5e7eb"/>`).join("")}
     ${Array.from({ length: 18 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<rect x="${72 + c * 128}" y="${140 + r * 32}" width="${40 + ((r * 31 + c * 17) % 70)}" height="11" rx="5" fill="${c === 0 ? "#374151" : "#9ca3af"}"/>`).join("")).join("")}
     <rect x="${60 + 3 * 128}" y="${130 + 5 * 32}" width="128" height="32" fill="none" stroke="#16a34a" stroke-width="3"/>`,
  ),
  // 6. Terminal + docs side by side
  frame(
    "02:20 PM",
    "#0ea5e9",
    `<rect width="${W / 2}" height="${H - 44}" fill="#0c0f14"/>
     <rect width="${W / 2}" height="34" fill="#1f2329"/><text x="20" y="23" fill="#cbd5e1" font-size="14" ${font}>Terminal — api-integration</text>
     ${Array.from({ length: 24 }, (_, i) => `<text x="22" y="${70 + i * 30}" fill="${i % 5 === 0 ? "#22c55e" : i % 7 === 0 ? "#f59e0b" : "#94a3b8"}" font-size="16" font-family="Consolas, monospace">${i % 5 === 0 ? "$ npm run test -- --watch" : i % 7 === 0 ? "WARN  retrying request (2/3)" : "✓ passes " + ["auth flow", "sync job", "push token", "release notes", "schema check"][i % 5] + " (" + (12 + i * 3) + " ms)"}</text>`).join("")}
     <rect x="${W / 2}" width="${W / 2}" height="${H - 44}" fill="#f8fafc"/>
     <rect x="${W / 2}" width="${W / 2}" height="60" fill="#e2e8f0"/><text x="${W / 2 + 30}" y="38" fill="#0f172a" font-size="18" font-weight="700" ${font}>API Integration Guide</text>
     <rect x="${W / 2 + 40}" y="100" width="420" height="26" rx="6" fill="#0f172a"/>
     ${lines(W / 2 + 40, 160, 18, ["#94a3b8", "#cbd5e1", "#64748b"], 560, 34, 8)}`,
  ),
];

mkdirSync("public/mock-screens", { recursive: true });
screens.forEach((svg, i) => writeFileSync(`public/mock-screens/screen-0${i + 1}.svg`, svg));

function avatar(bg, skin, hair) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="${bg}"/>
  <circle cx="32" cy="70" r="26" fill="#334155"/>
  <circle cx="32" cy="28" r="13" fill="${skin}"/>
  <path d="M18 27 C18 12 46 12 46 27 C42 20 24 20 18 27 Z" fill="${hair}"/>
</svg>`;
}
mkdirSync("public/mock-avatars", { recursive: true });
writeFileSync("public/mock-avatars/avatar-1.svg", avatar("#c7d2fe", "#c68642", "#1f2937"));
writeFileSync("public/mock-avatars/avatar-2.svg", avatar("#fde68a", "#f1c27d", "#7c2d12"));
console.log("Generated", screens.length, "screens and 2 avatars");
