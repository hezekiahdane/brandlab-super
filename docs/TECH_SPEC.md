# Brandlab Super MVP — Technical Specification

**Document Type:** Technical Specification
**Product:** Brandlab Super MVP – Content Management Platform
**Phase:** Phase 1 – Content Management, Workflow & Scheduling
**Stack:** Next.js · Supabase · TypeScript · Ayrshare
**Based On:** Brandlab Super PRD v2.0

---

## 1. System Architecture

### 1.1 High-Level Layers

Brandlab Super is a multi-tenant SaaS web application organized into four layers:

| Layer | Technology | Responsibility |
|---|---|---|
| **Presentation** | Next.js 14 App Router, Tailwind CSS | All UI, server components, client interactivity |
| **API** | Next.js Route Handlers (REST) + Supabase Realtime | Business logic, auth middleware, webhook receivers |
| **Data** | Supabase PostgreSQL + Row-Level Security | Multi-tenant data isolation, file storage, auth |
| **Integrations** | Ayrshare, Google Drive, Canva, Social APIs | Publishing, asset sourcing, heatmap data |

### 1.2 Multi-Tenancy Strategy

Multi-tenancy is enforced at the database level via Supabase Row-Level Security (RLS). Every tenant-scoped table carries a `workspace_id` foreign key. RLS policies verify the authenticated user's JWT contains the correct workspace membership before permitting any data access.

- Users can belong to multiple workspaces via the `workspace_members` join table.
- All API routes run through Supabase with RLS active — no cross-workspace data leakage is architecturally possible.
- The Supabase service role key is server-side only; the browser only receives scoped user JWTs.

### 1.3 Request Flow

```
Browser  →  Next.js Route Handler (JWT middleware)  →  Supabase Client (RLS enforced)  →  PostgreSQL
                                                     ↘  Ayrshare API       (scheduled publishing)
                                                     ↘  Supabase Realtime  (live notifications)
```

### 1.4 Deployment

- **Hosting:** Vercel (Next.js frontend + API routes) + Supabase Cloud (database, auth, storage)
- **Environments:** `development` / `staging` / `production` — each with isolated Supabase projects
- **CI/CD:** GitHub Actions → Vercel preview per PR; auto-deploy to production on `main` merge
- **File Storage:** Supabase Storage with per-workspace bucket policies; time-limited signed URLs served via CDN
- **Cron Jobs:** Vercel Cron for nightly heatmap cache refresh and token expiry checks

---

## 2. Database Schema

All tables reside in a single Supabase PostgreSQL instance. UUIDs are used for all primary keys. All timestamps are `timestamptz` (UTC). RLS is enabled on every table.

### 2.1 `workspaces`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | Auto-generated primary key |
| `name` | text | NOT NULL | Display name of the brand/workspace |
| `slug` | text UNIQUE | NOT NULL | URL-safe identifier, auto-generated from name |
| `logo_url` | text | NULL | Path to logo in Supabase Storage |
| `brand_color` | text | NULL | Hex color for UI theming |
| `created_by` | uuid FK → users | NOT NULL | Manager who created the workspace |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |
| `archived_at` | timestamptz | NULL | Null = active; set when archived |

### 2.2 `workspace_members`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | Parent workspace |
| `user_id` | uuid FK → auth.users | NOT NULL | Supabase auth user |
| `role` | text ENUM | NOT NULL | `'manager'` \| `'copy_assignee'` \| `'creatives_assignee'` |
| `invited_at` | timestamptz | NOT NULL | When invite was sent |
| `accepted_at` | timestamptz | NULL | Null until user accepts the invite |

### 2.3 `social_connections`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | |
| `platform` | text ENUM | NOT NULL | `'facebook'`\|`'instagram'`\|`'tiktok'`\|`'linkedin'`\|`'threads'`\|`'x'`\|`'youtube'` |
| `account_name` | text | NOT NULL | Display name of connected account |
| `account_id` | text | NOT NULL | Platform-native account/page ID |
| `ayrshare_profile_key` | text | NOT NULL | Ayrshare profile key for this connection |
| `access_token_enc` | text | NOT NULL | AES-256-GCM encrypted OAuth access token |
| `refresh_token_enc` | text | NULL | AES-256-GCM encrypted OAuth refresh token |
| `token_expires_at` | timestamptz | NULL | Used to surface 7-day expiry warnings |
| `is_default` | boolean | NOT NULL | Default: false; true = primary posting account |
| `connected_at` | timestamptz | NOT NULL | |
| `revoked_at` | timestamptz | NULL | Null = active connection |

### 2.4 `content_drafts`

The central table. Each row represents one piece of content moving through the workflow state machine.

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | |
| `title` | text | NOT NULL | Internal concept/idea name |
| `status` | text ENUM | NOT NULL | See status enum below |
| `master_caption` | text | NULL | Base caption shared across platforms |
| `platform_overrides` | jsonb | NULL | `{ instagram: '...', x: '...' }` per-platform overrides |
| `target_platforms` | text[] | NOT NULL | e.g. `['instagram','tiktok']` |
| `publish_at` | timestamptz | NULL | Scheduled publish time; null = unscheduled |
| `published_at` | timestamptz | NULL | Actual publish time set by Ayrshare webhook |
| `copy_assignee_id` | uuid FK → users | NULL | |
| `creatives_assignee_id` | uuid FK → users | NULL | |
| `manager_id` | uuid FK → users | NOT NULL | Approving manager |
| `public_share_token` | uuid UNIQUE | NULL | Generated on-demand for external review |
| `share_token_expires_at` | timestamptz | NULL | 30-day TTL from token generation |
| `ayrshare_post_id` | text | NULL | Returned by Ayrshare after scheduling |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |
| `updated_at` | timestamptz | NOT NULL | Auto-updated via DB trigger |

> **Status ENUM:**
> `idea` | `copy_for_review` | `copy_revision` | `for_creatives` | `creatives_for_review` | `creatives_revision` | `for_scheduling` | `scheduled`

### 2.5 `draft_assets`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `draft_id` | uuid FK → content_drafts | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | Denormalized for RLS policy |
| `storage_path` | text | NOT NULL | Supabase Storage object path |
| `cdn_url` | text | NOT NULL | Signed CDN URL (refreshed on access) |
| `file_type` | text ENUM | NOT NULL | `'image'`\|`'video'`\|`'thumbnail'` |
| `source` | text ENUM | NOT NULL | `'upload'`\|`'google_drive'`\|`'canva'` |
| `tags` | text[] | NULL | User-applied asset tags |
| `platform_target` | text | NULL | e.g. `'instagram'` for platform-specific thumbnail |
| `uploaded_by` | uuid FK → users | NOT NULL | |
| `uploaded_at` | timestamptz | NOT NULL | Default: `now()` |

### 2.6 `hashtag_bank`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | |
| `hashtag` | text | NOT NULL | Stored without `#` prefix |
| `concept` | text | NULL | Grouping label e.g. `'Summer Campaign'` |
| `platforms` | text[] | NOT NULL | Relevant platforms for this hashtag |
| `cached_usage_count` | integer | NULL | Cached from last API fetch |
| `cached_at` | timestamptz | NULL | When usage data was last refreshed |
| `created_by` | uuid FK → users | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

### 2.7 `comments`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `draft_id` | uuid FK → content_drafts | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | Denormalized for RLS |
| `type` | text ENUM | NOT NULL | `'internal'`\|`'external'` |
| `author_user_id` | uuid FK → users | NULL | Null for external comments |
| `external_name` | text | NULL | Name entered by external reviewer |
| `body` | text | NOT NULL | Comment content |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

### 2.8 `notifications`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `user_id` | uuid FK → users | NOT NULL | Notification recipient |
| `workspace_id` | uuid FK → workspaces | NOT NULL | |
| `draft_id` | uuid FK → content_drafts | NOT NULL | |
| `type` | text ENUM | NOT NULL | `'status_change'`\|`'external_comment'`\|`'mention'`\|`'token_expiry'`\|`'publish_failure'` |
| `message` | text | NOT NULL | Human-readable notification text |
| `read_at` | timestamptz | NULL | Null = unread |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

### 2.9 `heatmap_cache`

| Column | Type | Null? | Description |
|---|---|---|---|
| `id` | uuid PK | NOT NULL | |
| `workspace_id` | uuid FK → workspaces | NOT NULL | |
| `platform` | text ENUM | NOT NULL | Platform slug |
| `day_of_week` | integer | NOT NULL | 0=Sunday … 6=Saturday |
| `hour_utc` | integer | NOT NULL | 0–23 |
| `score` | float | NOT NULL | Normalized engagement index 0.0–1.0 |
| `refreshed_at` | timestamptz | NOT NULL | When this row was last updated |

---

## 3. API Design (REST)

All endpoints are Next.js Route Handlers under `/api`. Authentication is enforced via Supabase JWT middleware on every route. Workspace context is resolved from `:workspaceId` in the URL path. Responses follow the shape: `{ data, error, meta }`.

### 3.1 Workspaces

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces` | List all workspaces the authenticated user belongs to |
| `POST` | `/api/workspaces` | Create a new workspace (Manager role required) |
| `GET` | `/api/workspaces/:workspaceId` | Get workspace details and settings |
| `PATCH` | `/api/workspaces/:workspaceId` | Update name, logo, brand color (Manager only) |
| `DELETE` | `/api/workspaces/:workspaceId/archive` | Soft-archive workspace (Manager only) |
| `GET` | `/api/workspaces/:workspaceId/members` | List workspace members and their roles |
| `POST` | `/api/workspaces/:workspaceId/members` | Invite user by email (Manager only) |
| `PATCH` | `/api/workspaces/:workspaceId/members/:id` | Update a member's role (Manager only) |
| `DELETE` | `/api/workspaces/:workspaceId/members/:id` | Remove a member from workspace (Manager only) |

### 3.2 Social Connections

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/connections` | List all social connections for workspace |
| `POST` | `/api/workspaces/:workspaceId/connections/oauth` | Initiate OAuth flow for a given platform (Manager only) |
| `GET` | `/api/auth/callback/:platform` | OAuth callback — exchanges code, stores encrypted tokens |
| `PATCH` | `/api/workspaces/:workspaceId/connections/:id` | Set connection as default account for its platform |
| `DELETE` | `/api/workspaces/:workspaceId/connections/:id` | Revoke and delete a social connection (Manager only) |

### 3.3 Content Drafts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/drafts` | List drafts; filter by `?status=&assignee=&from=&to=` |
| `POST` | `/api/workspaces/:workspaceId/drafts` | Create draft; `publish_at` pre-filled if launched from calendar |
| `GET` | `/api/workspaces/:workspaceId/drafts/:draftId` | Get full draft with assets, comments, and status history |
| `PATCH` | `/api/workspaces/:workspaceId/drafts/:draftId` | Update caption, platforms, assignees, `publish_at`, etc. |
| `POST` | `/api/workspaces/:workspaceId/drafts/:draftId/status` | Transition status; triggers notification DB function |
| `POST` | `/api/workspaces/:workspaceId/drafts/:draftId/share` | Generate public share token (Manager only) |
| `DELETE` | `/api/workspaces/:workspaceId/drafts/:draftId/share` | Revoke public share token (Manager only) |
| `POST` | `/api/workspaces/:workspaceId/drafts/:draftId/publish` | Submit to Ayrshare for scheduled publishing |

### 3.4 Assets

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/assets` | Browse workspace media library; filter by tag |
| `POST` | `/api/workspaces/:workspaceId/drafts/:draftId/assets` | Upload asset to Supabase Storage, create asset record |
| `DELETE` | `/api/workspaces/:workspaceId/drafts/:draftId/assets/:id` | Remove asset from draft and delete from storage |
| `POST` | `/api/workspaces/:workspaceId/assets/import/gdrive` | Import file from Google Drive into Supabase Storage |
| `POST` | `/api/workspaces/:workspaceId/assets/import/canva` | Import design from Canva into Supabase Storage |

### 3.5 Comments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/drafts/:draftId/comments` | Get all comments (internal + external threads) for draft |
| `POST` | `/api/workspaces/:workspaceId/drafts/:draftId/comments` | Post internal comment (requires auth) |
| `GET` | `/api/share/:shareToken` | Public: get draft preview (no auth required) |
| `POST` | `/api/share/:shareToken/comments` | Public: post external comment (name field required) |

### 3.6 Calendar & Heatmap

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/calendar` | Fetch drafts in date range for brand calendar; `?from=&to=&status=` |
| `GET` | `/api/calendar/master` | Fetch drafts across all user workspaces for master calendar |
| `GET` | `/api/workspaces/:workspaceId/heatmap` | Get best-time-to-post scores per platform; cached 24hrs |
| `GET` | `/api/workspaces/:workspaceId/drafts/mine` | Drafts assigned to current authenticated user |

### 3.7 Hashtag Bank

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/hashtags` | List saved hashtags; filter by concept, platform |
| `POST` | `/api/workspaces/:workspaceId/hashtags` | Save a new hashtag to the workspace bank |
| `DELETE` | `/api/workspaces/:workspaceId/hashtags/:id` | Remove hashtag from bank |
| `GET` | `/api/hashtags/analytics` | Fetch real-time usage stats for a given hashtag + platform |

### 3.8 Webhooks

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/webhooks/ayrshare` | Receives Ayrshare publish success/failure; updates draft status and `published_at` |
| `POST` | `/api/webhooks/supabase` | DB trigger webhook for notification fan-out on status change events |

---

## 4. Notification System

### 4.1 Trigger Matrix

Status transitions and system events write to the `notifications` table via a Postgres trigger function. Supabase Realtime fans the record out to the active browser session; a separate webhook handler dispatches email via a transactional email provider (Resend or Postmark).

| Trigger Event | Notified Parties | Channel |
|---|---|---|
| Status → `copy_for_review` | Manager | In-app + Email |
| Status → `copy_revision` | Copy Assignee | In-app + Email |
| Status → `for_creatives` | Creatives Assignee | In-app + Email |
| Status → `creatives_for_review` | Manager | In-app + Email |
| Status → `creatives_revision` | Creatives Assignee | In-app + Email |
| Status → `for_scheduling` | Copy Assignee + Creatives Assignee | In-app + Email |
| Status → `scheduled` | All workspace members | In-app |
| External comment posted | Copy Assignee + Creatives Assignee + Manager | In-app + Email |
| Internal @mention | Mentioned user | In-app + Email |
| OAuth token expiry (7 days) | Manager | In-app + Email |
| Ayrshare publish failure | Manager | In-app + Email |

### 4.2 Real-Time Delivery

- **In-App:** Supabase Realtime subscription on `notifications` filtered by `user_id`. Client subscribes on login and shows unread count badge in the notification bell.
- **Email:** Supabase DB webhook → Next.js Route Handler → transactional email provider. Templates are pre-built React Email components.
- **SLA:** Notifications must be delivered within 60 seconds of the triggering event.

---

## 5. Calendar & Heatmap Specification

### 5.1 Calendar Component

- **Library:** FullCalendar React or `react-big-calendar` for calendar rendering.
- **Views:** Month / Week / Day — switchable via toolbar.
- **Events:** Each draft in a scheduled or in-progress state appears as a color-coded tile mapped to its current status.
- **Click-to-Draft:** Clicking an empty slot fires `onSelectSlot({ start })` — opens `ComposerModal` with `publish_at` pre-filled.
- **Drag-to-Reschedule:** `onEventDrop` calls `PATCH /drafts/:id` with new `publish_at` after a confirmation dialog.
- **Hover Preview Card:** `onMouseEnter` renders a Popover with platform icons, assignees, status badge, and a 'View Draft' link.

### 5.2 Heatmap Data Model & Rendering

Heatmap scores represent predicted engagement for each day-of-week / hour slot per platform, normalized to `0.0–1.0`. Data is fetched from social platform analytics APIs and cached in `heatmap_cache` for 24 hours.

- **Rendering:** Each calendar hour slot receives a background color linearly interpolated between `rgba(59,130,246,0.08)` at score `0.0` and `rgba(245,158,11,0.45)` at score `1.0`.
- **Platform Toggle:** A dropdown above the calendar controls which platform heatmap is shown. Default is the first connected platform.
- **Refresh:** A Vercel Cron job refreshes `heatmap_cache` nightly at `00:00 UTC` per workspace.
- **Fallback:** If a platform API does not expose timing data, use Ayrshare analytics or static industry-average dataset as fallback.

---

## 6. Front-End Routes & Components

### 6.1 Route Structure

```
/                                  →  Redirect to /workspaces
/auth/login                        →  Login / magic link page
/auth/invite/:token                →  Accept workspace invitation
/workspaces                        →  Workspace selector / switcher
/workspaces/new                    →  Create workspace (Manager only)
/:workspaceSlug/calendar           →  Single-brand calendar view
/:workspaceSlug/drafts             →  Brand content list view
/:workspaceSlug/drafts/:id         →  Draft composer / detail page
/:workspaceSlug/library            →  Brand media library
/:workspaceSlug/hashtags           →  Hashtag bank
/:workspaceSlug/settings           →  Workspace settings + social connections
/master/calendar                   →  Master calendar (all brands)
/master/drafts                     →  Global list view (all brands)
/my-work                           →  Assigned-to personal dashboard
/share/:shareToken                 →  Public external reviewer page (no auth)
```

### 6.2 Key Components

#### `ComposerModal` / `ComposerPage`

- Multi-tab layout: `[Master Caption]` `[Platform Tabs per target]` `[Assets]` `[Hashtags]` `[Internal Notes]`
- Platform selector: Checkbox group at top — adds/removes platform-specific tabs dynamically
- Live preview panel: Toggleable Desktop / Mobile mockup for each selected platform
- Publish date/time picker: `DateTimePicker` component with timezone display; pre-filled when launched from calendar slot
- Status action bar: Context-aware buttons at bottom based on current status and user role (e.g. 'Mark Copy Ready', 'Approve Copy', 'Request Revision')

#### `CalendarView`

- Wraps FullCalendar — receives events array from `/calendar` API and heatmap scores from `/heatmap` API
- Renders heatmap as a semi-transparent background color layer behind calendar time slots
- `PlatformHeatmapToggle`: Dropdown above calendar to switch active heatmap platform

#### `StatusBadge`

- Color-coded pill for any content status value
- Color map:
  - `idea` → slate
  - `copy_for_review` → purple
  - `copy_revision` → red
  - `for_creatives` → blue
  - `creatives_for_review` → pink
  - `creatives_revision` → orange
  - `for_scheduling` → amber
  - `scheduled` → green

#### `NotificationBell`

- Subscribes to Supabase Realtime on mount; shows unread count badge
- Dropdown lists recent notifications with links to the relevant draft
- Mark-as-read fires `PATCH /notifications/:id` on click; mark-all-read available

#### `PublicSharePage` (`/share/:token`)

- Server component — fetches draft via share token, no auth required
- Read-only platform mockup preview of the post content and assets
- Comment form requires non-empty Name field before submission is enabled
- Displays existing external comments in a threaded list below the preview

---

## 7. Integration Specifications

### 7.1 Ayrshare (Social Publishing)

- All cross-platform scheduling, thumbnail assignment, and native optimizations (Reels, TikTok audio) go through Ayrshare.
- Each workspace-platform connection maps to one Ayrshare profile key stored in `social_connections.ayrshare_profile_key`.
- On `status → scheduled`, the server calls `POST /post` on Ayrshare with: `platforms[]`, `post` (caption), `scheduleDate`, `mediaUrls[]`, and platform-specific options.
- **Webhook:** Ayrshare calls `POST /api/webhooks/ayrshare` on publish success or failure. Handler updates `draft.published_at` and `status`.
- On `401` from Ayrshare, the system attempts OAuth token refresh and retries once before alerting the Manager via notification.

### 7.2 Google Drive

- **OAuth Scope:** `https://www.googleapis.com/auth/drive.readonly`
- **Flow:** User authorizes Drive in the Asset panel. Google Picker API renders a file browser iframe. On selection, the server downloads the file from Drive, uploads it to Supabase Storage, and creates a `draft_assets` record with `source = 'google_drive'`.
- **Tokens:** Google OAuth tokens are AES-256-GCM encrypted and stored in a `google_tokens` table scoped to `user_id`.

### 7.3 Canva

- Canva Connect API — embedded design import button in the asset panel.
- **Flow:** User authenticates with Canva via OAuth. Published designs are listed. Selected design is exported as PNG or MP4 and imported to Supabase Storage.

### 7.4 Heatmap Data Sources

| Platform | API Source | Fallback |
|---|---|---|
| Instagram / Facebook | Meta Graph API — Page Insights `best_times_to_publish` | Industry-average static dataset |
| TikTok | TikTok for Developers Analytics API | Industry-average static dataset |
| LinkedIn | LinkedIn Marketing API — audience activity data | Industry-average static dataset |
| X (Twitter) | Twitter API v2 — account analytics | Industry-average static dataset |
| All platforms | Ayrshare analytics endpoint as secondary fallback | Static dataset |

---

## 8. Security Specification

### 8.1 Authentication & Authorization

- **Auth Provider:** Supabase Auth — email/password and magic link. Future: SAML SSO.
- **JWT:** Supabase-issued JWTs are validated by Next.js middleware on every `/api` route. Workspace membership is embedded in JWT custom claims.
- **RBAC:** Role stored in `workspace_members.role`. Route handlers verify role before executing Manager-gated operations.
- **RLS:** Every Supabase table has RLS enabled. The anon key has no write access. All mutations require an authenticated session.

### 8.2 Public Share Links

- Share tokens are UUID v4 — cryptographically random, non-enumerable, and not derivable from draft IDs.
- Tokens expire after 30 days (`share_token_expires_at`). Requests with expired tokens return `HTTP 410 Gone`.
- Managers can revoke any token at any time by setting `public_share_token = NULL`.
- The `/share/:token` endpoint is rate-limited to 30 requests/minute per IP.

### 8.3 Credential Storage

- All OAuth tokens (social platforms + Google Drive) are AES-256-GCM encrypted at rest before being written to Supabase.
- Encryption keys live in Vercel environment variables, never in the database.
- The Supabase service role key is server-side only and never included in any client bundle.

### 8.4 Media Upload Security

- MIME type validation against allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/quicktime`.
- File size limits: Images ≤ 20MB; Videos ≤ 500MB. Enforced at Route Handler before storage upload.
- Assets served via time-limited signed URLs (1 hour TTL). No publicly accessible storage buckets.

---

## 9. Performance Requirements

| Metric | Target | Notes |
|---|---|---|
| Calendar view initial load | < 2s | Up to 200 events in 30-day range |
| Draft composer open | < 1.5s | Including asset thumbnails |
| Status change + notification delivery | < 60s | DB trigger → Realtime → email |
| Asset upload (20MB image) | < 10s | Direct Supabase Storage upload |
| Heatmap render | < 500ms | Served from cache; no blocking API calls |
| API p95 response time | < 300ms | Excluding media upload endpoints |
| Concurrent users per workspace | 50 | No performance degradation |

---

## 10. Open Questions & Decisions Required

| # | Question | Decision / Owner |
|---|---|---|
| 1 | Which transactional email provider will be used? (Resend, Postmark, SendGrid) | Decision needed — affects email template setup |
| 2 | Will Ayrshare use a single master account with sub-profiles, or one API account per workspace? | Confirm Ayrshare plan tier with stakeholders |
| 3 | Is Canva integration required for Phase 1 MVP, or can it be deferred to Phase 1.5? | Kim Montejo to confirm priority |
| 4 | What is the required data retention period for archived workspaces and deleted drafts? | Legal / policy decision required |
| 5 | Should heatmap data be sourced from each workspace's own connected account analytics, or from a global industry-average dataset for initial launch? | Affects API scope and onboarding flow |
| 6 | Is YouTube Shorts (short-form) required at launch, or only standard long-form video posting? | Impacts Ayrshare API configuration |
