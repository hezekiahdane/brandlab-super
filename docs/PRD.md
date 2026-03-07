# Brandlab Super MVP — Product Requirements Document

**Phase:** Phase 1 – Content Management, Workflow & Scheduling
**Prepared For:** Executive Review & Marketing Team (Kim Montejo)
**Prepared By:** Zeke Menoso (Development)
**Version:** 2.0 – Revised & Enhanced
**Reference Apps:** Metricool, Rella

---

## 1. Executive Summary

Brandlab Super MVP is a bespoke, multi-tenant social media content management platform built to streamline the end-to-end marketing workflow — from ideation through scheduling and publishing. The platform is designed to serve marketing teams managing multiple brands across multiple social media platforms, providing a single unified workspace with a structured, approval-driven content pipeline.

The platform is comparable in scope and functionality to Metricool and Rella, and is purpose-built for internal team use with external stakeholder collaboration. Phase 1 covers the core platform experience: workspace management, social account connections, content creation with a status-driven workflow, and a calendar-based scheduling system with engagement heatmaps.

### Phase Scope

| Phase | Scope | Key Features |
|---|---|---|
| **Phase 1** | **IN SCOPE (MVP)** | Workspace Management, Social Connections, Content Drafting, Status Workflow, Approvals, Calendar Scheduling, Heatmaps, Asset Management, Hashtag Bank |
| **Phase 2** | Out of Scope | Meta Analytics, Unified Inboxes |
| **Phase 3** | Out of Scope | Context-aware AI Assistant Integration |

---

## 2. User Personas & Roles

| Role | Who | Key Permissions |
|---|---|---|
| **Manager / Approver** | e.g. Kim Montejo | Create/manage workspaces, connect social accounts, review & approve content, trigger revisions, oversee all brands |
| **Copy & Caption Assignee** | Writers, Strategists | Draft copy, manage hashtags, set status to review, receive revision notifications |
| **Creatives Assignee** | Designers, Videographers | Upload assets, manage media library, set status to creatives review, receive revision notifications |
| **External Approver** | e.g. S Anton, S Tommy | Review content via secure public link (no login required), leave named comments |

---

## 3. Core Content Workflow

The platform operates on a strict, chronological, status-driven state machine. Each status change triggers automated notifications to the relevant assignees.

```
Idea Generation → Copy & Caption Review → Creatives Generation & Review → External / Internal Approval → Scheduled
```

---

## 4. Functional Requirements

### 4A. Workspace Management

Users with the Manager role can create and manage isolated brand workspaces. Each workspace functions as a completely independent environment with its own data, users, connections, and settings.

- **Create & Name Workspaces:** Managers can create new brand workspaces, assign a brand name, logo, and color identity.
- **User Management:** Managers can invite team members to a workspace and assign them a role (Copy Assignee, Creatives Assignee, or additional Managers).
- **Workspace Isolation:** Each workspace maintains a separate database for media assets, hashtag banks, platform API connections, and content drafts.
- **Multi-Workspace Navigation:** Users belonging to multiple workspaces can switch between them from a persistent sidebar or top navigation.
- **Workspace Settings:** Managers can rename, configure, or archive a workspace. Archived workspaces retain their data but are hidden from active views.

---

### 4B. Social Media Account Connections

Each workspace can independently connect to its own set of social media accounts. Connections are scoped to the workspace and managed exclusively by users with the Manager role.

- **Supported Platforms:** Facebook, Instagram, TikTok, LinkedIn, Threads, X (Twitter), YouTube.
- **OAuth Authentication:** Each platform connection uses a standard OAuth flow. Connected accounts display connection status, account name, and expiry warnings.
- **Per-Platform Configuration:** Managers can connect multiple accounts per platform (e.g., multiple Instagram pages), and assign which account is the default publishing target.
- **Connection Health Indicators:** The system monitors token validity and alerts the Manager if a connection expires or is revoked, preventing failed publishes.
- **Disconnect & Reconnect:** Managers can revoke and re-authorize any platform connection at any time from the workspace settings panel.

---

### 4C. Content Drafting & Creation

Content creation follows a structured, status-driven workflow. Drafts can be initiated either directly from the content list view or by clicking a time slot on the calendar — enabling seamless scheduling during the drafting phase.

#### 4C.1 – Idea Initiation

- New drafts can be created from the content dashboard (list or calendar view).
- **Calendar-Triggered Drafts:** Clicking any date/time slot on the calendar opens the content composer with the publishing date and time pre-filled.
- Each draft includes: title/concept name, target platforms (multi-select), assigned team members (Copy & Creatives), publishing date & time, and internal notes.

#### 4C.2 – Multi-Platform Composer

- **Master Caption Editor:** A primary text editor for the base caption, shared across all selected platforms by default.
- **Platform-Specific Overrides:** Separate tabs per platform allow customization (e.g., shorter captions for X, adding alt text for LinkedIn, hashtag placement for Instagram).
- **Character Count & Limits:** Real-time character counters per platform enforce native character limits.
- **Live Preview:** Toggle between Desktop and Mobile mockups for each target platform.
- **Platform-Specific Optimizations:** Set thumbnail/cover images for Instagram Reels and TikTok; select audio tracks; configure first-comment hashtag drops.
- **Publishing Date & Time:** Users set a specific date and time for scheduled publishing directly within the composer. This date is reflected on the calendar view.

#### 4C.3 – Asset Management

- **Direct Upload:** Upload images and videos directly from local disk.
- **Google Drive Integration:** Browse and pull files directly from a connected Google Drive account.
- **Canva Integration:** Pull published Canva designs directly into the composer.
- **Brand Media Library:** All uploaded assets are stored in the workspace media library, accessible for reuse across future drafts.
- **Asset Tagging:** Assets can be tagged by campaign or content type for easier retrieval.

#### 4C.4 – Hashtag Bank

- Each workspace maintains a saved hashtag library organized by concept and campaign.
- **Real-Time Hashtag Analytics:** When a hashtag is added, the system displays real-time usage data and platform-specific reach metrics to help optimize selection.
- **Hashtag Suggestions:** AI-powered or API-driven suggestions based on caption content and brand category.
- **Quick-Insert:** Users can insert saved hashtag sets into the caption with a single click.

#### 4C.5 – Internal Notes & Comments

- A dedicated notes panel is available on every draft for internal team communication — separate from the caption editor and external comment thread.
- Team members can @-mention assignees within internal notes to trigger targeted in-app notifications.

---

### 4D. Detailed Status Workflow & Approvals

The platform enforces a linear, permission-gated status progression. Status changes trigger real-time in-app and email notifications to the relevant parties.

| Status | Description & Trigger |
|---|---|
| **Idea / Draft** | Initial state. Copy Assignee is working on the caption. No notifications sent yet. |
| **Copy for Review** | Copy Assignee marks copy as complete. Approver (Manager) is notified via email and in-app. |
| **Copy Revision** | Manager requests changes. Copy Assignee is notified to revise and resubmit. |
| **For Creatives** | Manager approves copy. Creatives Assignee is notified to begin asset creation. |
| **Creatives for Review** | Creatives Assignee uploads collaterals and marks ready. Manager is notified to review. |
| **Creatives Revision** | Manager requests creative changes. Creatives Assignee is notified. |
| **For Scheduling** | Manager approves creatives. Post is locked and ready to schedule. |
| **Scheduled** | Any permitted user confirms the publishing date/time. Post is queued for automated publishing. |

#### External Approval Flow

- **Public Share Link:** Manager generates a unique, secure URL for any post at the "For Scheduling" stage.
- **No Login Required:** External reviewers access the post via the link. They must enter their name before submitting a comment.
- **External Comment Notifications:** When an external comment is posted, all three roles (Copy Assignee, Creatives Assignee, and Manager) are instantly notified.
- **Comment Thread:** External and internal comments are displayed in separate, labeled threads on the draft view.

---

### 4E. Calendar Scheduling

The calendar is the primary scheduling interface and is tightly integrated with the content drafting system. It provides both a visual overview of published and scheduled content and an interactive interface for initiating new drafts.

#### 4E.1 – Calendar Views

- **Single Brand Calendar:** A monthly/weekly calendar view filtered to content from a single workspace/brand.
- **Master Calendar:** A combined view of all brands and their scheduled content across the entire organization.
- **List View (Single Brand):** A filterable list of all content items for one brand.
- **Global List View:** A combined content list across all brands with status and brand filters.
- **Assigned-To View:** A personal dashboard showing each user only the content items currently assigned to them.

#### 4E.2 – Calendar Interaction & Draft Initiation

- **Click-to-Draft:** Clicking any date/time block on the calendar opens the content composer with the date and time pre-populated, allowing users to begin a new draft directly from the calendar.
- **Drag-to-Reschedule:** Scheduled posts displayed on the calendar can be dragged and dropped to a new time slot to update the publishing time.
- **Post Preview on Hover:** Hovering over a scheduled post thumbnail on the calendar shows a quick-view card with the platform icons, status badge, and assigned team members.
- **Post Status on Calendar:** Each post tile on the calendar displays a color-coded status indicator, allowing managers to see the pipeline health at a glance.

#### 4E.3 – Engagement Heatmap

- The calendar visually overlays a heatmap on each date/time slot, indicating the predicted best times to post for maximum engagement.
- **Heatmap Data Source:** The platform fetches platform-specific optimal engagement windows (by day and hour) via the social API integrations or a third-party analytics provider.
- **Per-Platform Heatmaps:** Users can toggle the heatmap display by platform (e.g., show best times for Instagram only).
- **Color Coding:** Heatmap intensity uses a color gradient — cool blue for low engagement, warm amber/red for peak engagement windows.
- **Time Granularity:** Heatmap data is displayed at 30-minute or 1-hour intervals.

---

## 5. Technical Requirements & Integrations

### 5A. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend / Backend** | Next.js (App Router) |
| **Database** | Supabase (PostgreSQL + Row-Level Security for multi-tenancy) |
| **Authentication** | Supabase Auth with role-based access control (RBAC) |
| **Social Publishing API** | Unified API aggregator (e.g., Ayrshare) — handles cross-platform posting, thumbnail optimization, and rate limits |
| **File Storage** | Supabase Storage or S3-compatible bucket for media assets |
| **Real-Time Notifications** | Supabase Realtime or WebSockets for in-app notifications |
| **Heatmap Data** | Platform Insights APIs or third-party engagement data provider |

### 5B. Third-Party Integrations

- **Ayrshare (or equivalent):** Primary social publishing API for all platform cross-posting, scheduling, and native feature support (thumbnails, reels, etc.)
- **Google Drive API:** OAuth-based file browser for pulling assets into the composer.
- **Canva Connect API:** Pull published Canva designs directly into draft assets.
- **Social Platform APIs (Meta, TikTok, LinkedIn, etc.):** For real-time engagement data feeding the heatmap and hashtag analytics features.

---

## 6. Non-Functional Requirements

- **Multi-Tenancy & Data Isolation:** All workspace data must be fully isolated using Supabase Row-Level Security. No cross-tenant data leakage.
- **Performance:** Calendar and list views must load within 2 seconds for up to 200 scheduled posts per workspace.
- **Security:** All public share links must be cryptographically unique and expire after 30 days or upon manual revocation by a Manager.
- **Notifications:** In-app and email notifications must be delivered within 60 seconds of a status change trigger.
- **Mobile Responsiveness:** The web application must be fully functional on tablet and desktop screen sizes. Calendar views must be touch-friendly on iPad.
- **Accessibility:** Core UI components must meet WCAG 2.1 AA standards.
- **Scalability:** The architecture must support up to 50 concurrent workspace users without degradation.

---

## 7. Out of Scope (Future Phases)

| Phase | Feature |
|---|---|
| **Phase 2** | Meta Analytics dashboard — post performance, reach, impressions, engagement rates per platform |
| **Phase 2** | Unified Inbox — aggregate DMs and comments from all connected social accounts into a single interface |
| **Phase 3** | Context-aware AI Assistant — AI-generated caption suggestions, creative briefs, and campaign ideation based on brand history |

---

## 8. Success Metrics (Phase 1)

- All content statuses are correctly triggering the right notifications to the right users with zero missed notifications.
- Managers can create a workspace, connect at least one social account, and publish a piece of content end-to-end within 10 minutes of onboarding.
- External approvers can access a public link, leave a comment, and have the internal team notified within 60 seconds.
- Calendar heatmap data loads alongside the calendar view with no separate load action required from the user.
- Click-to-draft from calendar pre-fills date/time accurately 100% of the time.
