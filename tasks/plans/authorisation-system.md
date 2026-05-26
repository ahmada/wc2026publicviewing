# Authorisation Letter System — Design Plan

## Context
The registration portal currently has no backend persistence or admin workflow. Registrations arrive as emails only. This plan adds the full post-registration pipeline: database storage → admin approval → payment confirmation → cryptographically-signed PDF letter → email delivery.

The "blockchain-enabled / tamper-proof QR" is implemented using **HMAC-SHA256 cryptographic signing** via the Web Crypto API (already used in the codebase for rate-limit hashing). This provides identical tamper-proof guarantees to blockchain: you cannot forge or alter a letter without the secret key. The QR encodes a verification URL; any phone camera scan instantly validates the letter's authenticity against the live database. No blockchain network fees, no external dependencies, no latency.

---

## Third-Party Services Required

**No new services needed.** Everything runs on what's already configured:

| Service | Purpose | Status |
|---|---|---|
| **Cloudflare Workers/Pages** | Hosting + server logic | ✅ Already configured |
| **Cloudflare KV** | Rate limiting + magic link tokens | ✅ Already configured |
| **Cloudflare D1** | Registration + authorisation database | 🆕 New binding (same account) |
| **Cloudflare R2** | Store PDFs (letters + invoices) + payment slips | 🆕 New binding (same account) |
| **Resend** | All transactional email | ✅ Already configured |

New Cloudflare bindings are created with `wrangler` CLI — no new accounts or billing beyond Cloudflare's existing plan.

---

## Architecture Overview

```
Registration form
      │
      ▼
[D1 Database] ← INSERT on submit (status: pending)
      │
      ▼
Admin Dashboard (/admin)
  ├── Review application
  │   └── Admin enters fee amount → clicks "Approve & Send Invoice"
  │       ├── Generate PDF invoice (pdf-lib) → store in R2
  │       └── Email to client: invoice PDF + upload link for payment slip
  │           status: approved
  │
  ├── Payment slip arrives (two paths):
  │   ├── Client uploads via /upload/{refId}?token={hmac} → stored in R2
  │   │       └── Email to TSA: "Slip received for {refId}" with link to admin
  │   └── Admin uploads manually via dashboard → stored in R2
  │
  ├── Admin reviews slip → clicks "Confirm Payment"
  │       ├── Generate PDF authorisation letter (pdf-lib + qrcode)
  │       ├── Store letter in R2
  │       ├── INSERT into authorisations table (HMAC signed)
  │       └── Email to client: letter PDF attached
  │           status: authorised
  │
  └── Revoke → status: revoked (QR verification fails)
      │
      ▼
Cloudflare R2 (file storage)
  ├── invoices/{registrationId}/invoice.pdf
  ├── letters/{registrationId}/{authorisationId}.pdf
  └── slips/{registrationId}/{timestamp}-{filename}

Verification page (/verify/[id])
  └── Lookup D1 record + verify HMAC → show valid/invalid
```

---

## Phase 1 — Database Foundation

### Add Cloudflare D1 + R2 to wrangler.toml
```toml
[[d1_databases]]
binding = "DB"
database_name = "tsa-public-viewing"
database_id = "<to be created>"

[[r2_buckets]]
binding = "FILES"
bucket_name = "tsa-public-viewing-files"
```

**R2 key structure:**
- `letters/{registrationId}/{authorisationId}.pdf` — generated authorisation letters
- `slips/{registrationId}/{timestamp}-{originalFilename}` — payment transfer slips

### Schema — two tables

**`registrations`** table:
```sql
CREATE TABLE registrations (
  id TEXT PRIMARY KEY,           -- TSA-2026-XXXXXXXX reference ID
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | payment_confirmed | authorised | revoked
  lang TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  ssm_number TEXT,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  state TEXT NOT NULL,
  capacity TEXT NOT NULL,
  screen_setup TEXT,
  matches_planned TEXT NOT NULL,  -- JSON array stored as text
  estimated_audience TEXT,
  charges_entry TEXT NOT NULL,
  sells_fnb TEXT NOT NULL,
  sponsorship_interest TEXT NOT NULL,
  notes TEXT,
  fee_amount REAL,                -- set by admin on approval (MYR)
  fee_currency TEXT DEFAULT 'MYR',
  invoice_due_date INTEGER,       -- Unix timestamp (UTC)
  invoice_r2_key TEXT,            -- invoices/{registrationId}/invoice.pdf
  created_at INTEGER NOT NULL,    -- Unix timestamp (UTC)
  updated_at INTEGER NOT NULL
);
```

**`authorisations`** table:
```sql
CREATE TABLE authorisations (
  id TEXT PRIMARY KEY,            -- UUID
  registration_id TEXT NOT NULL REFERENCES registrations(id),
  issued_at INTEGER NOT NULL,     -- Unix timestamp (UTC)
  expires_at INTEGER NOT NULL,    -- typically tournament end: 2026-07-19
  hmac_sig TEXT NOT NULL,         -- HMAC-SHA256 of canonical payload
  pdf_r2_key TEXT NOT NULL,       -- R2 key: letters/{registrationId}/{authorisationId}.pdf
  created_at INTEGER NOT NULL
);
```

**`payment_slips`** table:
```sql
CREATE TABLE payment_slips (
  id TEXT PRIMARY KEY,            -- UUID
  registration_id TEXT NOT NULL REFERENCES registrations(id),
  r2_key TEXT NOT NULL,           -- R2 key: slips/{registrationId}/{timestamp}-{filename}
  original_filename TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,      -- 'client' | admin email address
  uploaded_at INTEGER NOT NULL
);
```

### Update `src/pages/api/register.ts`
- After validation passes, INSERT into `registrations` table with status `pending`
- Reference ID generation stays the same
- Emails still sent as before

---

## Phase 2 — Admin API

**Auth**: All admin routes require `Authorization: Bearer {ADMIN_SECRET}` header. `ADMIN_SECRET` stored as Cloudflare secret (env var).

### New files under `src/pages/api/admin/`

| Route | Method | Action |
|---|---|---|
| `registrations/index.ts` | GET | List all registrations with status + slip count, sorted by created_at desc |
| `registrations/[id]/approve.ts` | POST | Body: `{ feeAmount, feeCurrency, dueDate, notes }` → generate invoice PDF → R2 + D1 → email invoice + upload link to client → status: `approved` |
| `registrations/[id]/upload-slip.ts` | POST | Admin uploads payment slip → store in R2 + `payment_slips` row |
| `registrations/[id]/confirm-payment.ts` | POST | Generate letter PDF → R2 + D1 → email letter to client → status: `authorised` |
| `registrations/[id]/revoke.ts` | POST | Set status → `revoked` |

### Client upload flow
- Approval email includes a secure upload URL: `/upload/{registrationId}?token={hmac}`
- Token = HMAC-SHA256 of `{registrationId}:{expiresAt}` using **`UPLOAD_TOKEN_KEY`** (separate from `LETTER_SIGNING_KEY`)
- Token expiry: 30 days from approval date — enforced server-side on every upload
- **`src/pages/upload/[id].astro`** — public upload page, validates token + expiry, accepts file input
- **`src/pages/api/upload/[id].ts`** — validates token + expiry + magic bytes, stores in R2, inserts `payment_slips` row, emails TSA notification

Accepted file types: PDF, JPG, PNG, HEIC. Max size: 10MB. Max 3 files per registration. Validated server-side with magic byte inspection.

### Admin middleware
`src/lib/admin/session.ts` — shared function: reads `admin_session` cookie, verifies HMAC + expiry, returns email or throws 401.

---

## Phase 3 — Document Generation (Invoice + Letter)

### New packages to install
- `pdf-lib` — pure JS PDF generation, Cloudflare Workers compatible
- `qrcode` — pure JS QR code generator (Workers compatible via existing `nodejs_compat` flag)

### New files under `src/lib/letter/`

**`src/lib/letter/sign.ts`**
Uses Web Crypto API (already available in codebase — see `src/lib/rate-limit.ts`) to:
1. Import `LETTER_SIGNING_KEY` (env var) as an HMAC-SHA256 key
2. Compute HMAC over canonical string: `{registrationId}:{orgName}:{venueName}:{issuedAt}:{expiresAt}`
3. Return base64url-encoded signature

**`src/lib/letter/qr.ts`**
- Generates QR code PNG (Uint8Array) encoding the verification URL:
  `https://publicviewing.totalsportsasia.com/verify/{authorisationId}`
- HMAC stored in D1, not in URL — clean URL, tamper-proof via DB lookup

**`src/lib/letter/invoice-pdf.ts`**
Generates a PDF invoice with:
- TSA letterhead and company details (from env vars)
- Client: org name, contact name, email, address
- Invoice number = registration reference ID
- Line item: "FIFA World Cup 2026™ Public Viewing Authorisation License — {matchScope}"
- Fee amount + currency (MYR), SST if applicable, total due
- Payment instructions: bank name, account name, account number, reference = refId
- Payment due date
- Footer: TSA company registration number

**`src/lib/letter/authorisation-pdf.ts`**
Generates a PDF authorisation letter with:
- TSA letterhead
- Body: organisation name, venue, state, authorised match scope, issue date, expiry
- Licensing terms paragraph
- QR code embedded bottom-right with "Scan to verify authenticity"
- Reference ID + authorisation ID in monospace footer

**`src/lib/letter/generate-invoice.ts`** — orchestrator:
1. Call `invoice-pdf.ts` → get PDF bytes
2. PUT to R2: `invoices/{registrationId}/invoice.pdf`
3. Return `{ pdfBytes, r2Key }`

**`src/lib/letter/generate-authorisation.ts`** — orchestrator:
1. Call `sign.ts` → get HMAC
2. Call `qr.ts` → get QR PNG bytes
3. Call `authorisation-pdf.ts` → get PDF bytes
4. PUT to R2: `letters/{registrationId}/{authorisationId}.pdf`
5. INSERT into `authorisations` table
6. Return `{ pdfBytes, authorisationId }`

### New Environment Variables for Invoice
```env
TSA_BANK_NAME=Maybank
TSA_BANK_ACCOUNT_NAME=Total Sports Asia Sdn Bhd
TSA_BANK_ACCOUNT_NUMBER=XXXXXXXXXX
TSA_COMPANY_REG=XXXXXXXX-X
TSA_COMPANY_ADDRESS=Level X, Tower X, KLCC, Kuala Lumpur
```

---

## Phase 4 — Email Update

**`src/lib/email/index.ts`** — extend `EmailPayload` interface to include optional `attachments` array:
```ts
attachments?: Array<{ filename: string; content: string }>  // base64 content
```

**Resend provider** (`src/lib/email/resend.ts`) — Resend supports attachments natively via the `attachments` field. Map it through.

**New template: `src/lib/email/templates/approval.ts`**
- Subject: `Application Approved — Invoice & Payment Instructions | {referenceId}`
- Body: congratulations, invoice attached, bank transfer details, upload link for slip, due date
- Invoice PDF attached as base64

**New template: `src/lib/email/templates/slip-received.ts`** (internal TSA notification)
- Subject: `[TSA] Payment Slip Received — {referenceId}`
- Body: org name, direct link to admin registration detail page, uploaded by (client or admin name)

**New template: `src/lib/email/templates/authorisation.ts`**
- Subject: `Your FIFA World Cup 2026 Public Viewing Authorisation — {referenceId}`
- Body: congratulations, letter attached, QR verification instructions, TSA contact
- Authorisation letter PDF attached as base64

---

## Phase 5 — Verification Page

**`src/pages/verify/[id].astro`** — server-side rendered (SSR, Cloudflare adapter)
- Reads `id` param
- Queries `authorisations` JOIN `registrations` from D1
- If not found: shows "Invalid authorisation"
- If status = `revoked`: shows "This authorisation has been revoked"
- If HMAC fails: shows "This document has been tampered with"
- If valid: shows:
  - Organisation name
  - Venue name & state
  - Authorisation ID and reference ID
  - Issue date and expiry date
  - "Valid authorisation issued by Total Sports Asia"
  - TSA branding, dark theme matching site

---

## Phase 6 — Admin Dashboard (Magic Link Auth)

**Access control**: Only email addresses in the `ADMIN_EMAILS` env var (comma-separated) can log in. Uses one-time magic links — no passwords.

### Magic link flow
1. Admin visits `/admin` → redirected to `/admin/login` if no valid session
2. Enters email → `POST /api/admin/auth/request-link`
   - If email not in `ADMIN_EMAILS` whitelist → silent 200 (no enumeration)
   - If whitelisted → generate signed token (HMAC-SHA256 of `{email}:{timestamp}`), store in KV with 15-minute TTL
   - Send magic link email via existing Resend service: `https://.../api/admin/auth/verify?token={token}`
3. Admin clicks link → `GET /api/admin/auth/verify?token={token}`
   - Lookup token in KV → verify not expired → verify HMAC
   - Delete token from KV (one-time use)
   - Set `admin_session` cookie: HMAC-signed `{email}:{expires}`, 8-hour expiry, `HttpOnly; Secure; SameSite=Strict`
   - Redirect to `/admin`
4. All admin pages/API routes validate the session cookie before serving

### Admin UI pages
**`src/pages/admin/login.astro`** — email input form
**`src/pages/admin/index.astro`** — registration list: name, org, email, state, status, created_at, action buttons
**`src/pages/api/admin/auth/request-link.ts`** — issues magic link
**`src/pages/api/admin/auth/verify.ts`** — validates token, sets session cookie
**`src/pages/api/admin/auth/logout.ts`** — clears session cookie

### New Environment Variables (auth additions)
```env
ADMIN_EMAILS=aasil.ahmad@gmail.com,another@totalsportsasia.com  # comma-separated whitelist
ADMIN_SESSION_KEY=<64-char-hex>  # for signing session cookies (openssl rand -hex 32)
```
Magic link tokens stored in existing `RATE_LIMIT_KV` namespace (prefix: `ml:{token_hash}`).

---

## New Environment Variables Required

```env
# Admin auth
ADMIN_EMAILS=aasil.ahmad@gmail.com        # comma-separated whitelist
ADMIN_SESSION_KEY=<64-char-hex>           # openssl rand -hex 32

# Document signing — keep separate from upload token key
LETTER_SIGNING_KEY=<64-char-hex>          # openssl rand -hex 32
UPLOAD_TOKEN_KEY=<64-char-hex>            # openssl rand -hex 32

# TSA bank details (stored as Cloudflare secrets, not in .env files)
TSA_BANK_NAME=Maybank
TSA_BANK_ACCOUNT_NAME=Total Sports Asia Sdn Bhd
TSA_BANK_ACCOUNT_NUMBER=XXXXXXXXXX
TSA_COMPANY_REG=XXXXXXXX-X
TSA_COMPANY_ADDRESS=Level X, Tower X, KLCC, Kuala Lumpur
```

All secrets added via `wrangler secret put` — never committed to git.

---

## Critical Files

| File | Action |
|---|---|
| `wrangler.toml` | Add D1 binding + R2 binding (optional) |
| `src/pages/api/register.ts` | Add D1 INSERT |
| `src/lib/email/index.ts` | Add attachments support |
| `src/lib/email/resend.ts` | Map attachments to Resend API |
| `src/lib/email/brevo.ts` | Map attachments to Brevo API |
| `src/lib/email/templates/authorisation.ts` | New template (new file) |
| `src/lib/letter/sign.ts` | New file — HMAC signing |
| `src/lib/letter/qr.ts` | New file — QR generation |
| `src/lib/letter/pdf.ts` | New file — PDF template |
| `src/lib/letter/generate.ts` | New file — orchestrator |
| `src/lib/admin/auth.ts` | New file — admin auth middleware |
| `src/pages/api/admin/registrations/index.ts` | New file |
| `src/pages/api/admin/registrations/[id]/approve.ts` | New file |
| `src/pages/api/admin/registrations/[id]/confirm-payment.ts` | New file |
| `src/pages/api/admin/registrations/[id]/revoke.ts` | New file |
| `src/pages/verify/[id].astro` | New file — public verification page |
| `src/pages/admin/login.astro` | New file — magic link request form |
| `src/pages/admin/login.astro` | New file — magic link request form |
| `src/pages/admin/index.astro` | New file — admin dashboard (list) |
| `src/pages/admin/[id].astro` | New file — registration detail, slip viewer, action buttons |
| `src/pages/api/admin/auth/request-link.ts` | New file — issues magic link email |
| `src/pages/api/admin/auth/verify.ts` | New file — validates token, sets session |
| `src/pages/api/admin/auth/logout.ts` | New file — clears session |
| `src/pages/api/admin/registrations/[id]/upload-slip.ts` | New file — admin slip upload |
| `src/pages/upload/[id].astro` | New file — client slip upload page |
| `src/pages/api/upload/[id].ts` | New file — client slip upload handler |
| `src/lib/admin/session.ts` | New file — session cookie sign/verify |

---

## Security Hardening Requirements

These must be implemented — not optional:

### Authentication & Session
- Magic link tokens: sign `{email}:{expiresAt}` (not just email), store hash in KV, delete on use — already one-time
- Rate limit magic link requests: 3/hour per IP using existing `RATE_LIMIT_KV` (reuse `src/lib/rate-limit.ts`)
- All admin POST routes: validate `Origin` header matches `https://publicviewing.totalsportsasia.com` in addition to session cookie
- Session cookie: `HttpOnly; Secure; SameSite=Strict; Max-Age=28800` (8 hours)

### File Upload
- Upload token payload: `{registrationId}:{expiresAt}` signed with `UPLOAD_TOKEN_KEY` — 30-day expiry checked server-side
- `UPLOAD_TOKEN_KEY` and `LETTER_SIGNING_KEY` must be **separate secrets**
- Magic byte validation: read first 12 bytes of every upload and check against known signatures (PDF: `%PDF`, JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, HEIC: check `ftyp` box)
- Reject any upload where magic bytes don't match declared MIME type
- Max 3 uploads per registration (prevent R2 abuse)
- Rate limit upload endpoint: 5 requests/hour per IP

### R2 Access
- R2 bucket: **private** — no public access policy
- Admin file downloads: generate presigned R2 URLs with 15-minute expiry — never expose raw R2 keys in responses
- Client does not need direct R2 access — only the upload endpoint writes to R2

### Database
- All D1 queries use prepared statements (`.prepare(sql).bind(...values).run()`) — no string interpolation
- Race condition on letter generation: use `UPDATE registrations SET status='authorised', updated_at=? WHERE id=? AND status='payment_confirmed'` — check `meta.rows_written === 1` before proceeding with PDF generation

### Audit Log
Add `admin_audit_log` table to D1 schema:
```sql
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- 'approve' | 'confirm_payment' | 'revoke' | 'upload_slip'
  admin_email TEXT NOT NULL,
  metadata TEXT,                  -- JSON: fee amount, file name, etc.
  created_at INTEGER NOT NULL
);
```
Every admin action inserts a row. Logged before the action completes.

### Content Security Policy
Add CSP headers to admin and upload pages:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```
Configured in Astro middleware (`src/middleware.ts`).

---

## Code Quality Standards

All implementation must meet these standards:

- **TypeScript strict mode**: `tsconfig.json` with `"strict": true` — no implicit `any`, no unchecked nulls
- **Zod validation on every API route**: request body validated before processing, typed response bodies
- **Error types**: service functions throw typed errors (e.g. `class UploadError extends Error`), never silently swallow failures
- **Structured logging**: `console.error(JSON.stringify({ event, registrationId, error }))` — picked up by Cloudflare Logpush
- **Idempotency**: all admin endpoints safe to call twice (check current status before transitioning)
- **JSDoc on all `src/lib/` functions**: one-line description + `@param` + `@returns` — no paragraphs
- **No hardcoded values**: all configurable values (expiry durations, file size limits, accepted MIME types) as named constants at top of file

---

## Testing Requirements

Add `vitest` and `@cloudflare/vitest-pool-workers` to devDependencies.

### Unit tests (`src/lib/*.test.ts`)
- `sign.ts`: sign then verify returns true; tampered payload returns false
- `qr.ts`: output is non-empty Uint8Array
- `invoice-pdf.ts`: output is a non-empty PDF byte array (starts with `%PDF`)
- `authorisation-pdf.ts`: same
- `session.ts`: valid cookie passes; expired cookie fails; tampered cookie fails
- `rate-limit.ts`: existing tests should already cover this

### Integration tests (Miniflare via Wrangler)
- Registration → D1 row created with status `pending`
- Admin approval → status `approved`, invoice in R2, email sent
- Client upload → slip in R2, `payment_slips` row created, notification email sent
- Admin confirm payment → status `authorised`, letter in R2, letter email sent
- Verify page → valid authorisation shows details; revoked shows revoked; tampered returns error

---

## Pre-Deployment Checklist

Run these in order before every deployment:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Unit tests
npx vitest run

# 3. Generate Cloudflare type bindings
npx wrangler types

# 4. Apply pending D1 migrations
npx wrangler d1 migrations apply tsa-public-viewing --remote

# 5. Security scan — grep for known bad patterns
grep -r "crypto.subtle\|randomUUID" src/ | grep -v ".test."  # verify no raw crypto misuse
grep -rn "execute\|query\|sql" src/ | grep -v "prepare"       # flag any non-prepared queries
grep -rn "LETTER_SIGNING_KEY\|UPLOAD_TOKEN_KEY" src/ | grep -v "env\."  # no hardcoded keys

# 6. Deploy
npx wrangler deploy
```

Add `wrangler.toml` `[build]` command to run steps 1-3 automatically before deploy.

---

## Verification (How to Test)

1. Submit a registration via the public form → confirm it appears in D1 via `wrangler d1 execute tsa-public-viewing --command "SELECT * FROM registrations LIMIT 5"`
2. Call `POST /api/admin/registrations/{id}/approve` with correct Bearer token → confirm status updates + approval email received
3. Call `POST /api/admin/registrations/{id}/confirm-payment` → confirm PDF email received with attachment, `authorisations` row created
4. Open PDF → scan QR code → browser opens `/verify/{id}` → shows valid authorisation details
5. Manually edit any field in the PDF → scan QR → verification should still pass (QR links to D1, not the PDF contents directly) — *this is by design: revocation is the mechanism, not field comparison*
6. Call `POST /api/admin/registrations/{id}/revoke` → scan QR again → shows "revoked"

---

## Implementation Order

1. D1 setup + migrations + update `register.ts`
2. Admin API routes (no UI yet — test with curl)
3. `sign.ts` + `qr.ts` + `pdf.ts` + `generate.ts`
4. Email attachment support + authorisation template
5. Wire `confirm-payment` route to generate + email
6. Verification page
7. Admin dashboard UI
