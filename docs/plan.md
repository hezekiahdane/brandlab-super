# Brandlab Super MVP — Implementation Plan

**Phase:** Phase 1 – Content Management, Workflow & Scheduling
**Stack:** Next.js 14 (App Router) · Supabase · TypeScript · Tailwind CSS · Ayrshare

Each milestone ends with a concrete "done when" checkpoint so progress is verifiable before moving on.

---

## Milestone 0 — Project Scaffolding & Dev Environment

**Goal:** Bootable Next.js app with Supabase connected, CI-ready repo.

| # | Task | Done When |
|---|------|-----------|
| 0.1 | Initialize Next.js 14 App Router project with TypeScript, Tailwind CSS, ESLint, Prettier | `npm run dev` shows the default page at `localhost:3000` |
| 0.2 | Set up project folder structure: `src/app`, `src/components`, `src/lib`, `src/types`, `src/hooks`, `src/utils` | Folders exist and a barrel `index.ts` works in each |
| 0.3 | Create Supabase project (dev environment), install `@supabase/supabase-js` and `@supabase/ssr` | `supabaseClient.from('workspaces').select('*')` runs without connection error |
| 0.4 | Add environment variables (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Env vars load in both server and client contexts |
| 0.5 | Create Supabase client helpers: `createBrowserClient()` and `createServerClient()` in `src/lib/supabase/` | Import and call from a test route without error |
| 0.6 | Initialize git repo, add `.gitignore`, create `main` branch, push to GitHub | `git log` shows initial commit; GitHub repo accessible |
| 0.7 | Add shared UI primitives: install `shadcn/ui`, configure `components.json`, add Button, Input, Card, Dialog, Badge, Dropdown, Popover, Tooltip | Components render in a test page |

---

## Milestone 1 — Authentication & User Management

**Goal:** Users can sign up, log in, and have sessions persisted across pages.

| # | Task | Done When |
|---|------|-----------|
| 1.1 | Enable Supabase Auth (email/password + magic link) in Supabase dashboard | Auth settings saved in Supabase |
| 1.2 | Create `/auth/login` page with email + password form and magic link option | User can log in and is redirected to `/workspaces` |
| 1.3 | Create Next.js middleware (`middleware.ts`) to protect all routes except `/auth/*` and `/share/*` | Unauthenticated users are redirected to `/auth/login` |
| 1.4 | Create auth callback route (`/auth/callback`) for magic link and OAuth flows | Magic link emails complete sign-in successfully |
| 1.5 | Build a `useUser()` hook and `AuthProvider` context for client-side session access | `useUser()` returns current user on any protected page |
| 1.6 | Add sign-out functionality in a user menu dropdown (top-right of layout) | Clicking sign out clears session and redirects to login |

---

## Milestone 2 — Database Schema & RLS Policies

**Goal:** All Phase 1 tables exist with RLS enforced. Seed data loadable.

| # | Task | Done When |
|---|------|-----------|
| 2.1 | Write SQL migration for `workspaces` table with RLS policy (users see only workspaces they belong to) | Table exists; RLS blocks cross-tenant reads |
| 2.2 | Write SQL migration for `workspace_members` join table with RLS | Members can only read their own workspace memberships |
| 2.3 | Write SQL migration for `social_connections` table with RLS (workspace-scoped) | Connections scoped to workspace; RLS verified |
| 2.4 | Write SQL migration for `content_drafts` table with status enum, RLS | Drafts scoped to workspace; status enum enforced |
| 2.5 | Write SQL migration for `draft_assets` table with RLS | Assets queryable only within correct workspace |
| 2.6 | Write SQL migration for `hashtag_bank` table with RLS | Hashtags scoped to workspace |
| 2.7 | Write SQL migration for `comments` table with RLS (internal requires auth; external allowed via share token) | Internal comments require auth; external comments work without auth for valid share tokens |
| 2.8 | Write SQL migration for `notifications` table with RLS (user can only read own notifications) | User sees only their own notifications |
| 2.9 | Write SQL migration for `heatmap_cache` table with RLS | Heatmap data scoped to workspace |
| 2.10 | Create `updated_at` trigger function for `content_drafts` | `updated_at` auto-updates on row mutation |
| 2.11 | Create seed script with test workspace, users, and sample drafts | `npm run seed` populates dev database with test data |

---

## Milestone 3 — Workspace Management

**Goal:** Managers can create, configure, and switch between workspaces. Members can be invited and assigned roles.

| # | Task | Done When |
|---|------|-----------|
| 3.1 | Build `GET /api/workspaces` and `POST /api/workspaces` route handlers | API returns user's workspaces; creating a workspace works |
| 3.2 | Build `/workspaces` page — workspace selector/switcher grid | User sees all their workspaces as cards; can click to enter one |
| 3.3 | Build `/workspaces/new` page — create workspace form (name, logo upload, brand color) | Manager creates a workspace; it appears in the selector |
| 3.4 | Build `GET/PATCH /api/workspaces/:workspaceId` route handlers | Workspace details and settings are retrievable and editable |
| 3.5 | Build `/:workspaceSlug/settings` page — workspace settings (rename, logo, color, archive) | Manager can edit workspace settings and see changes reflected |
| 3.6 | Build workspace members API: `GET/POST/PATCH/DELETE` for `/members` | Members list works; invite by email creates a pending member row |
| 3.7 | Build member management UI on settings page — invite form, role selector, remove button | Manager can invite users, change roles, and remove members |
| 3.8 | Build `/auth/invite/:token` page — accept workspace invitation flow | Invited user clicks link, accepts, and appears in workspace members |
| 3.9 | Build app shell layout: sidebar with workspace switcher, nav links (Calendar, Drafts, Library, Hashtags, Settings) | Sidebar renders correctly; navigation works between sections |
| 3.10 | Implement workspace context provider — current workspace available via `useWorkspace()` hook | All child pages can access `workspaceId` and `workspaceSlug` |

---

## Milestone 4 — Content Drafting & Status Workflow

**Goal:** Users can create drafts, edit captions, transition statuses, and the correct notifications fire.

| # | Task | Done When |
|---|------|-----------|
| 4.1 | Build drafts API: `GET/POST/PATCH` for `/drafts` | Drafts CRUD works; filterable by status, assignee, date range |
| 4.2 | Build status transition API: `POST /drafts/:draftId/status` with validation (only valid transitions allowed per role) | Invalid transitions return 403; valid ones succeed |
| 4.3 | Create Postgres trigger function: on status change → insert row into `notifications` for correct recipients (per trigger matrix in tech spec) | Status change creates notification rows for the right users |
| 4.4 | Build `/:workspaceSlug/drafts` list page — filterable table of all drafts with StatusBadge | Drafts list loads with status badges, filters work |
| 4.5 | Build `StatusBadge` component with color map from tech spec | All 8 statuses render with correct colors |
| 4.6 | Build `/:workspaceSlug/drafts/:id` — ComposerPage with master caption editor | Draft opens; caption is editable and saves |
| 4.7 | Add platform selector (checkbox group) to ComposerPage — target platforms multi-select | Selecting/deselecting platforms updates `target_platforms` |
| 4.8 | Add platform-specific override tabs to ComposerPage — per-platform caption customization | User can write Instagram-specific caption separate from master |
| 4.9 | Add character count per platform with limit enforcement | Counter shows remaining chars; warns when over limit |
| 4.10 | Add assignee selectors (Copy Assignee, Creatives Assignee) to ComposerPage | Manager can assign team members to a draft |
| 4.11 | Add publish date/time picker to ComposerPage with timezone display | Date/time saves to `publish_at`; displays correctly |
| 4.12 | Build status action bar — context-aware buttons based on current status + user role | Copy Assignee sees "Mark Copy Ready"; Manager sees "Approve" / "Request Revision" |
| 4.13 | Wire status action bar to status transition API | Clicking "Approve Copy" transitions to `for_creatives` and triggers notification |

---

## Milestone 5 — Comments & Internal Notes

**Goal:** Team members can leave internal comments with @mentions. Comment threads display correctly.

| # | Task | Done When |
|---|------|-----------|
| 5.1 | Build comments API: `GET/POST` for `/drafts/:draftId/comments` (internal) | Internal comments are created and fetched per draft |
| 5.2 | Build internal notes panel on ComposerPage — comment list + input form | Comments appear in a threaded list; new comments post instantly |
| 5.3 | Implement @mention detection in comment body — trigger notification for mentioned user | Typing `@username` in a comment creates a `mention` notification for that user |
| 5.4 | Style internal vs. external comment threads as separate labeled sections | Two distinct sections visible on draft detail |

---

## Milestone 6 — Asset Management & Media Library

**Goal:** Users can upload images/videos to drafts, browse the workspace media library, and reuse assets.

| # | Task | Done When |
|---|------|-----------|
| 6.1 | Configure Supabase Storage bucket with per-workspace path policies | Files upload to `workspace_id/` path; RLS enforced on access |
| 6.2 | Build asset upload API: `POST /drafts/:draftId/assets` with MIME validation and size limits | Upload succeeds for valid files; rejects invalid MIME/oversized files |
| 6.3 | Build asset panel on ComposerPage — drag-and-drop + file picker upload | Assets appear as thumbnails after upload |
| 6.4 | Build `GET /api/workspaces/:workspaceId/assets` — workspace media library API | Library returns all assets for workspace; filterable by tag |
| 6.5 | Build `/:workspaceSlug/library` page — grid view of all workspace media assets with tag filter | Library page shows all assets; clicking one shows details |
| 6.6 | Add asset tagging UI — add/remove tags on assets | Tags save and filter works in library |
| 6.7 | Implement signed URL generation for asset serving (1-hour TTL) | Asset URLs work for 1 hour then expire |

---

## Milestone 7 — Hashtag Bank

**Goal:** Workspace maintains a saved hashtag library. Users can quick-insert hashtag sets into captions.

| # | Task | Done When |
|---|------|-----------|
| 7.1 | Build hashtag bank API: `GET/POST/DELETE` for `/hashtags` | CRUD works; hashtags scoped to workspace |
| 7.2 | Build `/:workspaceSlug/hashtags` page — table of saved hashtags grouped by concept | Hashtags display grouped by concept; add/delete works |
| 7.3 | Build hashtag quick-insert panel in ComposerPage — click a saved set to insert into caption | Clicking a hashtag group inserts hashtags into the active caption field |
| 7.4 | Add concept/campaign grouping to hashtag creation form | Hashtags can be tagged with a concept label |

---

## Milestone 8 — Calendar & Scheduling

**Goal:** Calendar view renders scheduled content with click-to-draft, drag-to-reschedule, and status color coding.

| # | Task | Done When |
|---|------|-----------|
| 8.1 | Install and configure calendar library (FullCalendar React or react-big-calendar) | Calendar renders in a test page with month/week/day views |
| 8.2 | Build calendar API: `GET /api/workspaces/:workspaceId/calendar` with date range + status filters | API returns drafts within requested date range |
| 8.3 | Build `/:workspaceSlug/calendar` page — single-brand calendar populated from API | Calendar shows draft tiles with status-colored badges |
| 8.4 | Implement click-to-draft: clicking empty time slot opens ComposerPage with `publish_at` pre-filled | New draft created from calendar has correct date/time |
| 8.5 | Implement drag-to-reschedule: dragging a draft tile to new slot updates `publish_at` | Draft's publish time updates after drag; confirmation dialog shown |
| 8.6 | Implement hover preview card — popover on event hover showing platform icons, assignees, status | Hovering shows quick-view popover |
| 8.7 | Build master calendar page (`/master/calendar`) — all-workspace aggregate view | Master calendar shows drafts across all user's workspaces |
| 8.8 | Build global list view (`/master/drafts`) — combined content list with brand/status filters | List shows all drafts with workspace name column |
| 8.9 | Build assigned-to view (`/my-work`) — personal dashboard filtered by current user | Only drafts assigned to logged-in user appear |

---

## Milestone 8.5 — Draft Deletion & Unschedule

**Goal:** Drafts can be archived (soft-deleted), permanently deleted, and scheduled posts can be unscheduled.

| # | Task | Done When |
|---|------|-----------|
| 8.5.1 | Add `archived_at` and `archived_by` columns to `content_drafts` via migration | Migration applied; columns exist |
| 8.5.2 | Add `scheduled → for_scheduling` status transition (Manager-only) with "Unschedule" label | Manager can unschedule; publish_at and ayrshare_post_id cleared |
| 8.5.3 | Update status transition API to clear `publish_at` and `ayrshare_post_id` on unschedule | Transitioning from scheduled to for_scheduling clears publish data |
| 8.5.4 | Add `DELETE` handler to drafts API for soft-delete (archive) | Manager can archive any draft; assignee can archive own idea-status drafts |
| 8.5.5 | Add permanent delete API endpoint (Manager-only, archived drafts only) | Manager can permanently delete archived drafts; associated storage files cleaned up |
| 8.5.6 | Filter archived drafts from GET drafts query | Archived drafts hidden from list, calendar, and master views |
| 8.5.7 | Add `archived_at` and `archived_by` to `ContentDraft` TypeScript interface | Types updated |
| 8.5.8 | Add archive button + confirmation dialog to ComposerPage header | Trash icon visible per permission rules; confirmation dialog on click |
| 8.5.9 | Add archive button + confirmation dialog to drafts list page rows | Per-row trash icon with confirmation; row removed from list on archive |
| 8.5.10 | Update PRD with Section 4C.6 (Draft Deletion & Archival) and update Scheduled status row | PRD reflects archive and unschedule capabilities |
| 8.5.11 | Update Tech Spec with archive columns, DELETE endpoints, and reverse transition | Tech Spec reflects all changes |

---

## Milestone 9 — Engagement Heatmap ✅

**Goal:** Calendar displays engagement heatmap overlay with per-platform toggle.
**Status:** COMPLETE — Heatmap API, global defaults migration (00004), scoreToColor utility, slotPropGetter/dayPropGetter on calendar, PlatformHeatmapToggle, Vercel cron stub.

| # | Task | Done When |
|---|------|-----------|
| 9.1 | Build heatmap API: `GET /api/workspaces/:workspaceId/heatmap` serving from `heatmap_cache` | API returns heatmap scores per platform/day/hour |
| 9.2 | Seed `heatmap_cache` with industry-average static dataset as initial fallback | Heatmap data exists for all platforms in dev environment |
| 9.3 | Render heatmap as semi-transparent background color layer on calendar time slots | Calendar slots show blue-to-amber gradient based on engagement score |
| 9.4 | Build `PlatformHeatmapToggle` dropdown — switch active platform heatmap | Toggling platform updates the heatmap colors |
| 9.5 | Create Vercel Cron job stub for nightly heatmap cache refresh | Cron endpoint exists and is callable (actual API integration deferred) |

---

## Milestone 10 — Notification System ✅

**Goal:** Real-time in-app notifications with unread badge. Email notifications on status changes.
**Status:** COMPLETE — Notification types, API routes, useNotifications hook with Realtime, NotificationBell in sidebar, Resend email client, React Email templates, webhook handler.

| # | Task | Done When |
|---|------|-----------|
| 10.1 | Set up Supabase Realtime subscription on `notifications` table filtered by `user_id` | Client receives real-time notification when a new row is inserted |
| 10.2 | Build `NotificationBell` component — unread count badge + dropdown list | Bell shows count; dropdown lists recent notifications |
| 10.3 | Implement mark-as-read: clicking a notification sets `read_at`; mark-all-read button | Unread count decreases on click; mark-all zeroes the count |
| 10.4 | Notification links navigate to the relevant draft | Clicking a notification opens the correct draft page |
| 10.5 | Set up transactional email provider (Resend or Postmark) + configure API key | Email sends successfully from a test route |
| 10.6 | Build email templates using React Email for each notification type | Templates render correctly with draft title, status, assignee info |
| 10.7 | Wire Supabase DB webhook → Next.js route handler → email dispatch | Status change triggers email to correct recipient within 60 seconds |

---

## Milestone 11 — Social Account Connections ✅

**Goal:** Managers can connect social media accounts via OAuth. Connection health is monitored.
**Status:** COMPLETE — SocialConnection type, CRUD API, OAuth stubs (real Ayrshare deferred to M13), AES-256-GCM encryption util, SocialConnections UI on settings page, token expiry cron, health indicators.

| # | Task | Done When |
|---|------|-----------|
| 11.1 | Build connections API: `GET/POST/PATCH/DELETE` for `/connections` | CRUD for social connections works |
| 11.2 | Implement OAuth flow initiation: `POST /connections/oauth` redirects to platform auth page | Clicking "Connect Instagram" opens Meta OAuth consent screen |
| 11.3 | Build OAuth callback handler: `GET /auth/callback/:platform` — exchanges code for tokens, encrypts, and stores | Tokens stored encrypted; connection appears in connections list |
| 11.4 | Build AES-256-GCM encryption/decryption utility for token storage | Tokens encrypt on save and decrypt on read correctly |
| 11.5 | Build social connections UI on workspace settings page — list, connect, disconnect, set default | Manager can connect/disconnect accounts; default account selectable |
| 11.6 | Implement token expiry monitoring — Vercel Cron checks `token_expires_at`, sends notification 7 days before | Manager gets notification when a token is about to expire |
| 11.7 | Build connection health indicators — status badge per connection (active/expiring/revoked) | Connection list shows correct health status for each account |

---

## Milestone 12 — External Approval & Public Share Links

**Goal:** Managers can generate share links. External reviewers can view posts and leave named comments without logging in.

| # | Task | Done When |
|---|------|-----------|
| 12.1 | Build share token API: `POST/DELETE /drafts/:draftId/share` — generate/revoke UUID share token | Token generated; revocation sets field to null |
| 12.2 | Build public share page: `GET /api/share/:shareToken` — returns draft preview (no auth) | Accessing valid token URL shows draft content |
| 12.3 | Build `/share/:shareToken` page — read-only post preview with platform mockup | External reviewer sees caption, assets, and platform preview |
| 12.4 | Build external comment form — requires name field; posts to `POST /api/share/:shareToken/comments` | External comment posts with name; appears in comment thread |
| 12.5 | External comment triggers notification to Copy Assignee + Creatives Assignee + Manager | All three roles get notified when external comment is posted |
| 12.6 | Implement token expiry (30-day TTL) — expired tokens return 410 Gone | Expired token returns 410; page shows "Link expired" message |
| 12.7 | Rate limit `/share/:token` endpoint to 30 req/min per IP | Exceeding rate limit returns 429 |

---

## Milestone 13 — Social Publishing via Ayrshare

**Goal:** Scheduled posts are submitted to Ayrshare for cross-platform publishing. Webhook handles success/failure.

| # | Task | Done When |
|---|------|-----------|
| 13.1 | Integrate Ayrshare SDK — configure API key and profile mapping | Ayrshare client initializes without error |
| 13.2 | Build publish API: `POST /drafts/:draftId/publish` — sends post to Ayrshare with platforms, caption, media URLs, schedule date | Post submitted to Ayrshare; `ayrshare_post_id` saved on draft |
| 13.3 | Build Ayrshare webhook handler: `POST /api/webhooks/ayrshare` — updates `published_at` and status | Webhook fires; draft status updates to reflect publish result |
| 13.4 | Handle Ayrshare 401 — attempt token refresh, retry once, then notify Manager | Failed publish triggers Manager notification |
| 13.5 | Add "Publish" action to status bar — available when status is `scheduled` | Manager can trigger publish; loading state shown during submission |

---

## Milestone 14 — Live Preview & Platform Mockups

**Goal:** Composer shows desktop/mobile mockups for each target platform.

| # | Task | Done When |
|---|------|-----------|
| 14.1 | Build platform mockup components — Instagram feed, Story, Reel; Facebook post; X tweet; LinkedIn post; TikTok | Each mockup renders caption + media in a realistic frame |
| 14.2 | Add desktop/mobile toggle to preview panel | Toggling switches mockup dimensions appropriately |
| 14.3 | Wire preview to live caption data — updates as user types | Preview reflects caption changes in real time |
| 14.4 | Add platform-specific options: thumbnail selector (Reels/TikTok), first-comment hashtag toggle | Options save and reflect in publish payload |

---

## Milestone 15 — Polish, Performance & Edge Cases

**Goal:** App meets NFRs, handles edge cases, and is ready for stakeholder review.

| # | Task | Done When |
|---|------|-----------|
| 15.1 | Audit and enforce all RLS policies — run cross-tenant access tests | No cross-workspace data leakage in any endpoint |
| 15.2 | Add loading skeletons to all data-fetching pages (calendar, drafts list, library) | No layout shifts on page load |
| 15.3 | Add error boundaries and toast notifications for API failures | Errors surface user-friendly messages; no silent failures |
| 15.4 | Verify calendar + list views load < 2s with 200 drafts (performance test) | Lighthouse or manual timing confirms < 2s |
| 15.5 | Responsive design pass — tablet and desktop layouts for all pages | All pages usable on iPad-sized screens |
| 15.6 | WCAG 2.1 AA accessibility audit — keyboard navigation, ARIA labels, color contrast | Core flows navigable via keyboard; contrast ratios pass |
| 15.7 | Add `favicon`, `metadata`, and `og:image` for the app | Metadata renders in browser tab and social shares |
| 15.8 | Write deployment config — Vercel project settings, environment variables, domain | App deploys to staging URL successfully |

---

## Dependency Graph

```
M0 (Scaffold) → M1 (Auth) → M2 (DB Schema)
                                    ↓
                              M3 (Workspaces)
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              M4 (Drafts)    M6 (Assets)     M7 (Hashtags)
                    ↓
              M5 (Comments)
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
  M8 (Calendar) M10 (Notifs) M11 (Social)
        ↓                       ↓
  M9 (Heatmap)           M13 (Publishing)
        ↓
  M12 (External Share)
        ↓
  M14 (Previews)
        ↓
  M15 (Polish)
```

**Parallelizable work:** After M3 is complete, M4, M6, and M7 can be built in parallel. After M4, M8, M10, and M11 can also proceed in parallel.

---

## Open Decisions (Block Progress if Unresolved)

| # | Decision Needed | Blocks |
|---|-----------------|--------|
| 1 | Transactional email provider: Resend vs Postmark vs SendGrid | M10.5 |
| 2 | Ayrshare account structure: single master vs per-workspace | M11, M13 |
| 3 | Canva integration: Phase 1 or deferred? | M6 (partial) |
| 4 | Heatmap data source: own account analytics vs static industry averages for launch? | M9 |
| 5 | YouTube Shorts support at launch? | M13 |
