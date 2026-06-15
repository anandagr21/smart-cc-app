# Smart CC — Admin Routes Reference

> Auto-generated from codebase. Last updated: 2026-06-14.

All routes are gated behind the `ADMIN` role check in [admin/_layout.tsx](../frontend/app/admin/_layout.tsx). Non-admin users are redirected to `/(tabs)`.

## Route Tree

```
/admin                                    Admin Control Panel (dashboard)
 ├── master-catalog (modal)               Live Portfolio Viewer
 ├── card-intelligence                    Intelligence Operations
 │   └── review/:card_id                  AI Extraction Review Workspace
 ├── ingestion                            Catalog Ingestion Dashboard
 │   ├── :id                              Field Review & Evidence
 │   ├── create                           New Card Session (manual)
 │   ├── evaluation                       Extraction Benchmarking Dashboard
 │   ├── playground                       Single-Field Extraction Tester
 │   ├── sources                          PDF Upload & Full-Text Search
 │   ├── audit/:id                        Ingestion Audit Timeline
 │   ├── diff/:id                         Field Version Diff
 │   └── preview/:id                      Publish Preview (customer mockup)
 ├── card-intelligence/review/:card_id    (alias, reached via upload)
 └── feedback (modal)                     User Feedback Reports
```

---

## `/admin` — Admin Control Panel

**File:** `app/admin/index.tsx`

### Purpose
Central landing page for the admin area. Acts as a gateway to all operations tools.

### Layout
- Single-column, scrollable layout inside `ScreenContainer`
- Centered header with `ShieldCheck` icon badge (theme primary color), title "Admin Control Panel", and subtitle

### Modules (4 cards)
| Module | Icon | Color | Route | Description |
|---|---|---|---|---|
| Master Catalog | `Database` | Primary (purple) | `/admin/master-catalog` | Manage canonical credit cards, fee structures, and reward rules |
| Document Ingestion & AI | `FileText` | Accent (orange) | `/admin/ingestion` | Upload bank PDFs, run extractions, evaluate benchmark accuracy |
| Card Intelligence | `BrainCircuit` | Success (green) | `/admin/card-intelligence` | Test and debug AI narrative generation and card embeddings |
| User Feedback | `MessageSquare` | Warning (amber) | `/admin/feedback` | Review and moderate community feedback, suggestions, and bug reports |

### UX Details
- Each card: `TouchableOpacity` with `activeOpacity={0.7}`, `accessibilityRole="button"`, descriptive `accessibilityLabel`
- Card icon sits on a theme-aware soft background (`primarySoft`/`accentSoft`/etc) inside a 48×48 rounded container
- Arrow-right icon in top-right corner signals navigability, muted color + low-opacity stroke
- Card descriptions clamp to 2 lines via `numberOfLines={2}`
- All colors use semantic theme tokens — dark mode works automatically

### Auth
Page render is gated by `AdminLayout` (`_layout.tsx`): if `user?.role !== 'ADMIN'`, user is redirected to `/(tabs)`.

---

## `/admin/master-catalog` — Live Portfolio Viewer *(modal)*

**File:** `app/admin/master-catalog.tsx`

### Purpose
Browse, view, and edit the canonical credit card catalog. This is the source of truth for all card metadata used across the platform.

### Layout
- Full-screen modal (`presentation: 'modal'`)
- Top header bar: back button + page title "Live Portfolio Viewer" + "Add Card" pill button
- Two-panel layout: **CardSidebar** (left) + **Content Area** (right)
- Sidebar is collapsible; shows all cards from `useCardCatalog()`

### Card Detail View (right panel)
When a card is selected from the sidebar:

**Overview Card:**
- Icon box (48×48, primary-tinted) with `CreditCard` icon
- Bank name (uppercase, muted) + Card name (large, bold)
- Divider, then detail grid: Network name, Base Point Value (₹/pt)
- Status row: Active (green `CheckCircle`) or Inactive (muted `ShieldAlert`)

**Fee Structure Section:**
- Section header with "Edit" toggle button
- View mode: Joining Fee, Annual Fee, Fee Waiver Target (all formatted in ₹)
- Edit mode: Three `TextInput` fields (numeric keyboard) + "Save Fee Changes" green button
- Save calls `useUpdateCatalogCard()` mutation with loading/disabled states

**Structured Reward Rules Section:**
- Section header with `ListChecks` icon
- Each rule card shows: category name (bold), multiplier × reward type badge (green), cap limit/cycle, merchant exclusions
- Empty state: dashed-border box with "No reward rules found in the catalog."

### Data Sources
- `useCardCatalog()` — fetches all cards
- `useUpdateCatalogCard()` — mutations for fee updates

### Key Components
- `CardSidebar` — reusable sidebar for card selection (shared with Card Intelligence)
- `DocumentUploadSheet` — bottom sheet for ingesting a new card from URL (shared)

---

## `/admin/card-intelligence` — Intelligence Operations

**File:** `app/admin/card-intelligence.tsx`

### Purpose
Review, verify, and approve LLM-extracted card data. The central hub for the AI pipeline's quality control.

### Layout
- Top header: "Intelligence Operations" title + 3 buttons (Master Catalog, Add Source, Close)
- Two-panel: **CardSidebar** (left) + **Workspace** (right)
- When no card is selected: centered text "Select a card to review its extraction"
- When a card is selected: card title header (bank + name, base point value) + `CardIntelligenceWorkspaceV2` inline

### Key Components
- `CardSidebar` — lists all cards from catalog
- `CardIntelligenceWorkspaceV2` — the full review environment (see below)
- `DocumentUploadSheet` — "Add Source" button opens this

### Navigation
- "Master Catalog" button → `/admin/master-catalog`
- "Add Source" button → opens bottom sheet to scrape a bank URL
- Successful upload → auto-navigates to `/admin/card-intelligence/review/:card_id`

---

## `/admin/card-intelligence/review/:card_id` — AI Extraction Review Workspace

**File:** `app/admin/card-intelligence/review/[card_id].tsx`

### Purpose
Dedicated review screen for a single card's AI extraction. Reached after a successful URL ingestion or by selecting a card in Intelligence Operations.

### Layout
- `SafeAreaView` with back button ("← Back to Intelligence")
- Renders `CardIntelligenceWorkspaceV2` for the given `card_id`

### CardIntelligenceWorkspaceV2 (inline component)
**File:** `features/card_intelligence/components/CardIntelligenceWorkspaceV2.tsx`

Three states:

#### Loading
- Centered spinner + "Loading extraction data…" label

#### Error / No Snapshot
- Warning card (`AlertTriangle` icon, amber border/background)
- 404 → "No Ingestion Snapshot" with explanation: *"This card hasn't been through the Document Ingestion pipeline yet. Upload a bank PDF or URL source to generate structured extraction data."*
- Other errors → shows the actual error message

#### Data Loaded
Two-panel layout:

**Left Panel — Raw Source Document:**
- Header: "RAW SOURCE DOCUMENT" (uppercase, muted)
- Scrollable monospaced text showing the full cleaned markdown from the bank's webpage

**Right Panel — Structured Editor:**
- "Structured Database Verification" card
- Editable fields: Card Name, Bank Issuer, Base Reward Rate (per 100), Joining Fee, Annual Fee, Fee Waiver Spend Threshold
- Reward Rules section: dynamic list of rule cards, each with category name, multiplier, and "Has Cap?" toggle
- Bottom submission footer (sticky):
  - **Approve & Save** (green, with `CheckCircle` icon) — calls `POST /card-intelligence/review/action` with `approve: true`
  - **Reject & Rescrape** (outlined, with `AlertTriangle` icon) — calls same endpoint with `approve: false`

### Data Sources
- `useCardReviewData(cardId)` → `GET /card-intelligence/review/{card_id}` — fetches source markdown + LLM-suggested JSON
- `useSubmitReviewAction()` → `POST /card-intelligence/review/action` — commits approve/reject

---

## `/admin/ingestion` — Catalog Ingestion Dashboard

**File:** `app/admin/ingestion/index.tsx`

### Purpose
Home screen for the Document Ingestion pipeline. Overview of active sessions with quick access to related tools.

### Layout
- Custom header (safe-area-aware) with page title "Catalog Ingestion" and 4 action buttons
- Stats row: 3 stat boxes (Pending Review: 12, High Conflicts: 3, Avg Confidence: 94%) — currently mock data
- "Active Sessions" section with a scrollable card list

### Session Cards
Each card shows:
- Card name (e.g., "HDFC Millennia") + Bank name
- Priority badge: `CRITICAL` (red), `HIGH` (amber/blue), `MEDIUM` (muted)
- Metrics: confidence %, verified fields count, conflicts count

### Action Buttons
| Button | Destination |
|---|---|
| Eval Dashboard | `/admin/ingestion/evaluation` |
| Playground | `/admin/ingestion/playground` |
| Sources | `/admin/ingestion/sources` |
| New Card | (unwired — currently no-op) |

### Navigation
- Tapping a session card → `/admin/ingestion/:id`

---

## `/admin/ingestion/:id` — Field Review & Evidence

**File:** `app/admin/ingestion/[id].tsx`

### Purpose
Per-session review of LLM-extracted fields. The core verification screen where admins validate or correct AI output field-by-field.

### Layout
- Custom header with back button, session title, and "Source" button
- Scrollable content area

### AI Summary Card
- Top-level stats: Overall Confidence (large), Verified Fields, Conflicts, Missing
- Color-coded borders based on health

### Field Table
Each extracted field rendered as a row:
- **Field name** (e.g., "Annual Fee", "Lounge Access")
- **Status badge**: `VERIFIED` (green with check), `CONFLICT` (amber with alert), `MISSING` (red/muted)
- **Extracted value**: editable `TextInput` pre-filled with AI output
- **Evidence button**: opens `EvidenceDrawer` bottom sheet

### Evidence Drawer
- Lists source citations that contributed to the field extraction
- Each source shows: source type (MITC PDF), snippet text, confidence contribution %

### Bulk Action
- "Accept All AI Suggestions" button for batch approval

### Data
- Currently uses `MOCK_FIELDS` — not wired to a real API

---

## `/admin/ingestion/create` — New Card Session

**File:** `app/admin/ingestion/create.tsx`

### Purpose
Manually create a new draft ingestion session for a card that doesn't exist yet.

### Layout
- Simple form: Bank Name text input + Card Name text input
- "Create Draft Session" button (disabled until both fields are filled)
- On submit, navigates to `/admin/ingestion/new-session-id` (placeholder)

### State
Prototype — navigates to a hardcoded ID. Not yet wired to a real API.

---

## `/admin/ingestion/evaluation` — Extraction Benchmarking Dashboard

**File:** `app/admin/ingestion/evaluation.tsx`

### Purpose
Measure and track the accuracy of the LLM extraction pipeline against ground-truth benchmark datasets. Used to detect regressions and evaluate prompt changes.

### Layout
- Header with back button, title "Evaluation Dashboard"
- Dataset picker dropdown (fetches from `GET /admin/ingestion/evaluation/datasets`)
- "Run Evaluation Suite" button (calls `POST /admin/ingestion/evaluation/run`)
- Real-time progress bar when a job is running

### Metrics Displayed
| Section | Metrics |
|---|---|
| System Health | Total Benchmarks, Overall Accuracy %, Weighted Accuracy %, Retrieval Precision % |
| Field-Level Accuracy | Per-field breakdown with individual accuracy scores |
| Prompt Performance | Accuracy trends across prompt versions |
| Failure Analysis | Errors grouped by reason (e.g., "LLM hallucination", "Missing context") |
| Worst Performers | List of benchmarks with lowest accuracy scores |

### Data Sources
- `GET /admin/ingestion/evaluation/datasets` — available benchmark datasets
- `POST /admin/ingestion/evaluation/run` — triggers an evaluation job (returns job ID, polled for progress)

---

## `/admin/ingestion/playground` — Extraction Playground

**File:** `app/admin/ingestion/playground.tsx`

### Purpose
Interactive sandbox for testing LLM field extraction on a single document. Useful for debugging extraction quality and testing prompt variations.

### Layout
- Header with back button, title "Extraction Playground"

### Controls
- **Document ID** text input
- **Field selector** — target field to extract (e.g., `annual_fee`, `joining_fee`, `reward_structure`, `lounge_access`)
- **"Run Extraction"** button (calls `POST /admin/ingestion/playground/extract`)

### Results (two-column)
**Left — LLM Output:**
- Status badge (Success / Error)
- Extracted value (formatted)
- Explanation / reasoning
- Telemetry: tokens used, latency, model version

**Right — Retrieved Chunks:**
- Document chunks fed to the LLM as context
- Each chunk shows: preview text, similarity score, chunk index

### Action
- "Approve As Ground Truth" button — saves the result as a benchmark for future evaluations

---

## `/admin/ingestion/sources` — PDF Upload & Full-Text Search

**File:** `app/admin/ingestion/sources.tsx`

### Purpose
Upload bank PDF documents (MITCs, terms sheets) and search through their extracted text. The source material that feeds the ingestion pipeline.

### Layout
- Header with back button, title "Source Documents"

### Upload Section
- File picker for PDF selection
- Upload button (calls `POST /admin/ingestion/sources/upload`)
- Shows uploaded document metadata (filename, page count, upload time)

### Search Section
- Keyword search input (e.g., "Fee", "Lounge", "milestone benefit")
- Results list showing matched text chunks:
  - Snippet preview
  - Page number
  - Token count
  - Chunk ID

### Data Sources
- `POST /admin/ingestion/sources/upload` — upload PDF + trigger chunking
- `GET /admin/ingestion/sources/search?q=...` — full-text search across chunks

---

## `/admin/ingestion/audit/:id` — Audit Timeline

**File:** `app/admin/ingestion/audit/[id].tsx`

### Purpose
Full chronological history of every action taken on an ingestion session. Provides traceability for compliance and debugging.

### Layout
- Header with back button, session title
- Vertical timeline with alternating left/right entries

### Timeline Entries
Each event rendered as:
- **Node**: colored circle — blue/purple for bot (AI) actions, orange/green for human (admin) actions
- **Title**: action name (e.g., "AI Extraction", "Admin Edit", "Publish")
- **Detail**: description of what changed
- **Timestamp**: absolute date/time
- **Actor badge**: "AI" (bot icon) or admin email

### Data Source
- Currently uses mock data — not wired to a real API

---

## `/admin/ingestion/diff/:id` — Version Diff

**File:** `app/admin/ingestion/diff/[id].tsx`

### Purpose
Compare two versions of extracted card data to see exactly what changed between the AI's initial extraction and the admin's edits.

### Layout
- Header with back button, session title
- Table: Field Name | Old Value (vN) | New Value (vN+1)
- Changed rows: highlighted with faint amber background
- Updated values: arrow indicator (→) next to the new value

### Data Source
- Currently mock data

---

## `/admin/ingestion/preview/:id` — Publish Preview

**File:** `app/admin/ingestion/preview/[id].tsx`

### Purpose
Final review before publishing extracted card data to production. Shows how the card will appear to end users.

### Layout
- Scrollable preview with sections

### Card Mockup
- Visual card representation with bank name and card name

### Sections
- **Fees**: Annual Fee (₹), Joining Fee (₹) — large formatted values
- **Rewards & Benefits**: cards for each perk (cashback rates with description, lounge access details, fuel surcharge waiver info)

### Action
- Floating "Confirm & Publish" button at the bottom (sticky)
- Calls `POST /admin/ingestion/publish` with the session ID
- On success, navigates back to the ingestion dashboard

---

## `/admin/feedback` — User Feedback Reports *(modal)*

**File:** `app/admin/feedback.tsx`

### Purpose
Review and moderate user-submitted feedback about incorrect reward calculations, missing merchants, and wrong card recommendations.

### Layout
- Full-screen modal (`presentation: 'modal'`)
- Header: back button + "Feedback Reports" title
- Scrollable list of feedback cards

### Feedback Cards (collapsed)
Each card shows:
- **Issue type badge** (red, with `MessageSquareWarning` icon):
  - `incorrect_reward` → "Incorrect Reward"
  - `missing_merchant` → "Missing/Wrong Merchant"
  - `wrong_card_recommendation` → "Wrong Card Recommended"
  - default → "Other Issue"
- **Status badge**: `OPEN` (blue) or `CLOSED` (green), uppercase
- Merchant name + transaction amount (₹)
- Timestamp (formatted `en-IN` locale)

### Feedback Cards (expanded)
Tap a card to toggle expansion:
- Issue description (free text from user)
- Calculated reward amount (₹)
- Rule version used for the calculation
- Card ID (monospaced, 11px)
- Calculation ID (monospaced, 11px)
- **Calculation Context** — JSON block in a dark container with monospaced formatting

### Data Sources
- `feedbackApi.getFeedbacks(0, 100)` — fetches all feedback (offset 0, limit 100)
- Currently read-only — no approve/resolve actions wired

---

## Layout Files

| File | Purpose |
|---|---|
| `app/admin/_layout.tsx` | Admin root layout. Checks `user.role === 'ADMIN'`, redirects non-admins. Declares Stack screens: `index`, `master-catalog` (modal), `card-intelligence`, `ingestion`, `feedback` (modal). |
| `app/admin/ingestion/_layout.tsx` | Ingestion sub-layout. `headerShown: false` for all child screens. Auto-discovers 8 nested route files. |

---

## Shared Components Used Across Admin

| Component | Path | Used By |
|---|---|---|
| `ScreenContainer` | `components/ui/ScreenContainer.tsx` | `/admin` dashboard |
| `CardSidebar` | `features/card_intelligence/components/CardSidebar.tsx` | Master Catalog, Card Intelligence |
| `CardIntelligenceWorkspaceV2` | `features/card_intelligence/components/CardIntelligenceWorkspaceV2.tsx` | Card Intelligence, Review route |
| `DocumentUploadSheet` | `features/card_intelligence/components/DocumentUploadSheet.tsx` | Master Catalog, Card Intelligence |
| `EvidenceDrawer` | `features/ingestion/components/EvidenceDrawer.tsx` | Ingestion Field Review |

---

## API Endpoints Referenced

| Method | Endpoint | Used By |
|---|---|---|
| `GET` | `/card-intelligence/review/:card_id` | Card Intelligence Review |
| `POST` | `/card-intelligence/review/action` | Card Intelligence Review (approve/reject) |
| `POST` | `/card-intelligence/ingest-raw` | DocumentUploadSheet |
| `GET` | `/admin/ingestion/evaluation/datasets` | Evaluation Dashboard |
| `POST` | `/admin/ingestion/evaluation/run` | Evaluation Dashboard |
| `POST` | `/admin/ingestion/playground/extract` | Playground |
| `POST` | `/admin/ingestion/sources/upload` | Sources |
| `GET` | `/admin/ingestion/sources/search` | Sources |
| `GET` | `/feedback` (offset, limit) | Feedback Reports |

---

## Current State Notes (2026-06-14)

- **Ingestion screens**: Several use mock data (`MOCK_SESSIONS`, `MOCK_FIELDS`) and aren't wired to real APIs yet. The layout was recently fixed (added `ingestion/_layout.tsx`) to make sub-routes navigable.
- **Card Monitoring**: `card_monitoring` table is empty — no cards have been through the URL ingestion pipeline. Cards exist only via manual creation in Master Catalog. The review workspace now shows a proper error state instead of an indefinite spinner.
- **Feedback**: Read-only view. No moderation actions (close, respond, resolve) implemented yet.
- **Ingestion Create**: Hardcoded navigation to placeholder ID — not wired to a real session creation API.
