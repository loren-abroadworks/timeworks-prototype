# Figma vs Live: Time Off QA (2026-10-30)

Source: Figma file `gqYWCu1K6dJ9gESXtgNeCi` ("TimeWorks Design System"), page **Timeworks Web** (`27823:196653`). This was a read-only review; nothing in Figma was edited.

Most frames sit in section **"Absence & Leave💎"** (`29375:1011731`), which also holds the already-compared Pending modal `29381:1032211`. The Screenshots leave frames are in **"Screenshots — Approved Leave"** (`31124:399845`). An older section, **"Time off request💎"** (`30277:1192083`), holds the only Approved-state request modal.

**Limitation:** the Figma MCP Collab-seat rate limit was hit partway through. I couldn't screenshot the Approved modal (f) or alternate frames `29505:256774` and `31133:408033`. Findings for (f) come from layer names only.

Light vs dark theme differences are ignored throughout.

Legend: ✅ match · ❌ mismatch · ⚠️ can't tell / not specified

---

## (a) Calendar: Month view

- **Figma:** `29375:1011732` "Absence & Leave — Calendar (Month)". The day-overflow popover is in `32786:154846` "Calendar (Month · Day Overflow)".
- **PNGs:** `FIGMA_29375-1011732_calendar-month.png`, `FIGMA_32786-154846_calendar-month-day-overflow.png`

| Element | Figma | Live | |
|---|---|---|---|
| Month/Week toggle | Present | Present | ✅ |
| Prev / Next arrows + month picker | ‹ [June, 2026] › | ‹ [October, 2026] › | ✅ |
| **Today button** | **Present** ("Button / Today", right of › ) | **Absent** | ❌ |
| Grid/List view toggle | Absent | Present (left of ‹) | ❌ (extra in live) |
| Filters | Inline dropdowns (All Teams, All Policies, Leave Type, Status, Jun 2026) + removable chips + Clear All | "Filters" button + EDT chip | ❌ (different pattern) |
| Summary counters | "3 Out Today · 4 Pending · 18 Approved" pills | Approved / Pending / **All** toggle pills | ❌ |
| **Legend** | Colour per leave type (Vacation/PTO, Sick, Personal, Parental, Unpaid, Other) + "• Solid = Approved ⌐ Dashed = Pending" | No leave-type legend; only Approved/Pending/All pills | ❌ |
| Chip style | Filled bar coloured by leave type, avatar + "Name · Type"; pending = dashed outline | Filled bar coloured by status (green approved, amber pending), avatar + "Name · Policy" | ❌ (colour is by type in Figma, by status in live) |
| **"+N More" overflow** | "+1 More" / "+2 More" text under 3 chips | "+1 more" (per `TIMEW-1716_plus-more-popover.png`) | ✅ |
| +N More popover | Modal-like card "Friday, June 19 · 4 People On Leave" with chip + hours rows, Close / **View In Requests** | Popover per live screenshot | ⚠️ (check live has a "View In Requests" button) |

**Verdict for TIMEW-1716:**
- **Today button:** Figma has one and live doesn't, so live deviates from the design. This is a **real bug** (or an unlogged design change). If the test case expects a Today button, it's correct.
- **Legend:** Figma's legend is leave-type colours plus a solid/dashed key. Live only has Approved/Pending/All status pills, so live deviates (**bug or design drift**). If the test case expects the Approved/Pending/All legend, it matches live but **not** Figma. Confirm with design which is intended.
- **+N More:** Figma and live agree. The test case is valid. Also check the popover's "View In Requests" button.

---

## (b) Calendar: Week view

- **Figma:** `29377:1012879` "Absence & Leave — Calendar (Week)"
- **PNG:** `FIGMA_29377-1012879_calendar-week.png`

| Element | Figma | Live | |
|---|---|---|---|
| **Today button** | **Present** | **Absent** | ❌ |
| Week range picker | "June, 2026" field | "25 Oct – 31 Oct, 2026" | ⚠️ (label format differs) |
| Header/filters/legend/counters | Same as Month (type legend, Out Today/Pending/Approved) | Filters button + Approved/Pending/All pills | ❌ (same as a) |
| Layout | One row per member (avatar, name, team) × 7 day columns | One row per member × 7 days | ✅ |
| Leave rendering | Continuous bars spanning several days; label = leave type; pending = dashed pink outline | Per-day chips; label = policy name; colour by status | ❌ (spanning bar vs per-day chip) |
| Multiple leaves in a member-day | Not shown (one bar per row) | Stacked chips in the cell (John, Mon 26) | ⚠️ |
| **"+N More"** | **Absent** in Week | Absent | ✅ |

**Verdict for TIMEW-1717:**
- **Today:** live is missing a button that Figma shows, so this is a **real bug / design drift**.
- **+N More:** Figma has no "+N More" in Week view either. Figma agrees with live, so **a test case expecting +N More in Week is wrong**.
- Chip styling also differs (Figma uses multi-day spanning bars coloured by leave type). Log it as a design deviation if in scope.

---

## (c) Balances page

- **Figma:** `29377:1015294` "Absence & Leave — Balances" and `29481:40507` "Absence & Leave — Balances" with the "Adjust Balance" modal.
- **PNGs:** `FIGMA_29377-1015294_balances.png`, `FIGMA_29481-40507_balances-adjust-modal.png`
- These Figma frames are clearly an **older design** than what shipped (no Client/Projects/Teams columns, no Policy Balances chips).

| Element | Figma | Live | |
|---|---|---|---|
| Columns | ☐ · Member · **one column per policy** (Vacation / Sick / Parental) · Actions ("Edit") | ☐ · Member · Client · Projects · Teams · **Policy Balances** (chips) | ❌ |
| Policy Balances cell | N/A. Each policy is its own column with "56h Remaining · 104h of 160h used (7 of 20 days)" | Single cell, 4 chips + "+N"; doesn't scroll | ⚠️ (no Figma spec for chip overflow) |
| Filters | Search + All Teams / Policies / Clients / Projects dropdowns | Search + Filters button | ❌ |
| Date range + Today | Present (‹ May 31 – Jun 30, 2026 › Today) | Absent | ❌ |
| **Export / Import** | **Not present** anywhere in the frame | In top-right ⋮ menu | ⚠️ (not designed) |
| View Audit Trail button | **Not present** (Audit Trail is a separate frame reached via the Balances tab) | Top-right "View Audit Trail →" | ⚠️ |
| Pagination | "Showing 1-20 of 30", pages, per-page select | Same pattern | ✅ |
| **Adjust modal** title/subtitle | "Adjust Balance / Manually adjust this member's balance — change is logged." | Identical | ✅ |
| Adjust modal member header | Avatar, name, "Vacation · 96 Hours Remaining (12 Days)" | Avatar, name, policy, "4 Hours Remaining" | ✅ (no day equivalent in live) |
| Adjust modal Policy dropdown | **Present** (choose a policy inside the modal) | Absent (policy fixed by the clicked chip) | ❌ |
| New balance input | "New Balance" field + "≈ 7 days" helper | "Set New Balance [ ] Hours" + "Before & After 4 hrs → 4 hrs" | ❌ (layout differs) |
| Reason (required *) | Present | Present | ✅ |
| Balance Summary block | Current Balance / Balance After (hours + days) | Replaced by inline Before & After | ❌ |
| Buttons | Cancel / Save Adjustment | Cancel / Save Adjustment | ✅ |

**Verdict for TIMEW-1918:**
- **Layout:** live doesn't match Figma, but the Figma frame is an older per-policy-column design. The shipped Client/Projects/Teams/Policy Balances layout has **no Figma counterpart**. Treat as "design out of date". Test against the ticket's acceptance criteria, not Figma. Don't log it as a bug based on Figma.
- **Chip overflow (4 + "+N", no scroll):** Figma doesn't specify it. Figma can't settle whether the test case or live is right; use the AC.
- **Export/Import in the ⋮ menu:** not designed in Figma. Can't tell.
- **Adjust modal:** title, copy, Reason and buttons match. Figma also has a **Policy dropdown**, a "≈ N days" helper and a Balance Summary block, which live lacks. These are possible minor deviations; confirm whether the chip-launched flow intentionally dropped the policy selector.

---

## (d) Audit Trail page

- **Figma:** `29377:1016489` "Absence & Leave — Balances (audit trail)"
- **PNG:** `FIGMA_29377-1016489_audit-trail.png`

| Element | Figma | Live | |
|---|---|---|---|
| Columns | Member · Policy · Accrued · Used · Remaining · **Actions** (edit pencil) | Member · Policy · Total Accrued · Total Used · Balance Remaining · **Last Adjusted** | ❌ (Actions vs Last Adjusted; label wording) |
| Row granularity | One row per member × policy | One row per member ("8 policies"), expands per policy | ❌ |
| Remaining progress bar | Present (blue/green bar, red dot at 0h) | Present (blue bar) | ✅ |
| **Back button** | **None** (no Back in page; navigation via Balances tab) | None | ✅ |
| Filters / header | All Teams / All Policies dropdowns; no date range | Search + Filters + date range ‹ › + Today | ❌ (live has more) |
| Primary CTA | "Request Time Off" | (not visible) | ⚠️ |
| Expanded rows | "Adjustment History — <member> · <policy>" as **cards**: "80h → 56h (10 → 7 days) −24h", actor · type, reason, date | Per-policy group with a summary line, then rows: Adjustment / From / To / Reason / Adjusted by / Adjusted on | ❌ (cards vs table rows; same data) |
| **Negative colour** | **−24h in red** | −16h / −70h in red | ✅ |
| **Positive colour** | **+13.6h in green** | Green (per `TIMEW-1930_positive-adjustments.png`) | ✅ |

**Verdict for TIMEW-1930:**
- **Back button:** Figma has no in-page Back button, and neither does live. **Figma agrees with live.** A test case expecting a Back button is wrong, unless the AC asks for one.
- **Colours:** red for negative, green for positive. **Figma agrees with live.** Pass.
- **Layout:** the columns and expanded-row style differ (Figma: Actions column, history cards; live: Last Adjusted column, tabular history, date range + Today). This is a **design deviation**. The data is the same. Decide whether to log it as a bug or treat Figma as stale.

---

## (e) Screenshots page: leave indicator banner

- **Figma:** `31133:407064` "Screenshots — Partial-Day Approved Leave" and `31137:410018` "Screenshots — Full-Day Approved Leave (10 Min Grid)", in section `31124:399845`.
- Older versions: `31022:349166` / `31022:349920` in the "SCREENSHOTS💎" section. `31133:408033` (All View compact cards) wasn't captured because of the rate limit.
- **PNGs:** `FIGMA_31133-407064_screenshots-partial-leave.png`, `FIGMA_31137-410018_screenshots-full-leave.png`

| Element | Figma | Live | |
|---|---|---|---|
| Banner placement/style | Full-width blue banner under the toolbar, beach icon | Same | ✅ |
| Title | "AW Holiday Time Off · All Day" / "· Half Day" | "<Policy> · Full Day" | ⚠️ ("All Day" vs "Full Day" wording) |
| Subtitle | "Screenshots Are Not Captured During Approved Time Off" (full day); "9:30 AM – 1:30 PM · Screenshots…" (partial) | "9:00 AM – 5:00 PM · Screenshots are not captured…" on a full day | ✅ (minor: Figma shows no time range on a full day) |
| Paid badge | Green "Paid" pill beside the title (full-day frame) | Green "Paid" pill | ✅ |
| **Unpaid variant** | **Not designed** (Figma only shows Paid) | Dark "Unpaid" pill | ⚠️ |
| "View Request" link | Right-aligned link | Right-aligned link | ✅ |
| **View Request target** | Not specified (static design, no prototype link visible) | Generic requests list | ⚠️ |
| Slot cards | "On Leave · Full/Half Day", policy chip, "Paid" | Same | ✅ |
| Time Off stat tile | "8h 00m · AW Holiday Time Off · Paid" | "8h 00m · <policy> · Paid/Unpaid" | ✅ |

**Verdict for TIMEW-1239:**
- The banner matches Figma, including the Paid pill. Unpaid isn't designed, so the live Unpaid pill can't be checked against Figma.
- **View Request target:** Figma doesn't define where it goes. Figma can't confirm or contradict the test case. If the AC says it should deep-link to the specific request, the live generic-list behaviour is a bug, but that rests on the AC, not Figma.

---

## (f) Time Off Request modal: Approved state

- **Figma:** **No Approved variant in the current "Absence & Leave💎" section.** The modal frames there (`29381:1032211`, `29498:240830`) are both **Pending**. `29498:240830` is saved as `FIGMA_29498-240830_requests-detail-modal.png`, but its footer is cut off below the frame.
- The older section "Time off request💎" (`30277:1192083`) has instances named **"Request Details — Approved"** (`30746:4484273`, 840×810) and **"Modal Body / Time Off Detail (Approved)"** (`30746:4480017`). "My time off💎" has another "Request Details — Approved" (`30746:4480018`). These are pre-DS-alignment designs.
- **Not screenshotted:** the Figma MCP rate limit blocked it, so no PNG was saved.

| Element | Figma | Live | |
|---|---|---|---|
| Approved badge | Exists as a design (older section) | "Approved" pill next to "Request" | ⚠️ |
| **Deny button in Approved state** | Unknown (couldn't render) | Shown | ⚠️ |
| **Back button in Approved state** | Unknown | Shown | ⚠️ |

**Verdict for TIMEW-1715:** **Can't tell from Figma yet.** No current DS-aligned Approved variant exists. The only candidates are older instances `30746:4484273` / `30746:4480017`, which need a manual look in Figma (or a rerun after the MCP quota resets). Until then, decide whether Approved should show Deny/Back from the AC, not Figma.

---

## Summary

| Ticket | Item | Figma vs Live | Meaning |
|---|---|---|---|
| TIMEW-1716 | Today button | Figma has it, live doesn't | **Live bug / drift** |
| TIMEW-1716 | Legend | Figma: leave-type colours + solid/dashed; live: Approved/Pending/All | **Live deviates**; confirm intended legend |
| TIMEW-1716 | +N More | Match | Test case valid |
| TIMEW-1717 | Today button | Figma has it, live doesn't | **Live bug / drift** |
| TIMEW-1717 | +N More | Neither has it | **Test case wrong** if it expects +N More |
| TIMEW-1918 | Layout | Figma is an older per-policy-column design | Figma stale; use the AC |
| TIMEW-1918 | Chip overflow | Not in Figma | Can't tell |
| TIMEW-1918 | Adjust modal | Mostly matches; Figma also has Policy dropdown, days helper, Balance Summary | Minor deviation; confirm |
| TIMEW-1918 | Export/Import in ⋮ | Not in Figma | Can't tell |
| TIMEW-1930 | Back button | Neither has it | **Figma agrees with live**; test case wrong if it expects Back |
| TIMEW-1930 | +/− colours | Match (red / green) | Pass |
| TIMEW-1930 | Layout | Columns and expanded-row style differ | Design deviation (low) |
| TIMEW-1239 | Banner (paid) | Match | Pass |
| TIMEW-1239 | View Request target | Not specified in Figma | Can't tell; use the AC |
| TIMEW-1715 | Approved-state buttons | No current Approved frame; older instance not rendered | Can't tell; check `30746:4484273` manually |
