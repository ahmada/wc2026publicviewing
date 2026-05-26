# Google Sheets CRM — Setup Guide

Follow these steps once to connect the registration form to a Google Sheet.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it: **TSA Public Viewing — Registrations 2026**
3. Rename the default "Sheet1" tab to **Registrations**
4. In row 1, paste these 26 column headers exactly:

```
Reference ID | Submitted At | Language | Full Name | Position | Email | Phone | Org Name | Org Type | SSM Number | Venue Name | Venue Address | State | Capacity | Screen Setup | Matches Planned | Est. Audience | Entry Fee? | Sells F&B? | Sponsorship? | Applicant Notes | Status | Assigned To | Fee (MYR) | Follow-up Date | Internal Notes | Source
```

5. **Freeze row 1**: View → Freeze → 1 row
6. **Status dropdown** (column V):
   - Select the entire V column (click the "V" header)
   - Data → Data Validation → Add a rule
   - Criteria: Dropdown from a list
   - Values: `New, Initial Call Done, Approved, Invoice Sent, Payment Received, Authorised, Rejected, Revoked`
   - Save
7. **Format column Y** (Follow-up Date) as Date: Format → Number → Date
8. Bold row 1 and give it a background colour (navy or gold)
9. **Share the sheet** with your team: Share → add each team member's email as Editor

---

## Step 2 — Add the Apps Script

1. With the sheet open: **Extensions → Apps Script**
2. Delete the existing `myFunction()` code
3. Paste the following code in full:

```javascript
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET');

    if (!body.secret || body.secret !== secret) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registrations');
    var row = body.row;

    sheet.appendRow([
      row.referenceId,
      row.submittedAt,
      row.lang,
      row.fullName,
      row.position,
      row.email,
      row.phone,
      row.orgName,
      row.orgType,
      row.ssmNumber || '',
      row.venueName || '',
      row.venueAddress,
      row.state,
      row.capacity,
      row.screenSetup || '',
      row.matchesPlanned,
      row.estimatedAudience || '',
      row.chargesEntry,
      row.sellsFnb,
      row.sponsorshipInterest || '',
      row.notes || '',
      'New',   // Status — team updates this
      '',      // Assigned To
      '',      // Fee (MYR)
      '',      // Follow-up Date
      '',      // Internal Notes
      '',      // Source — team fills in for commission tracking
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (floppy disk icon or Ctrl+S)

---

## Step 3 — Set the Secret

1. In Apps Script: click the **gear icon** (Project Settings) in the left sidebar
2. Scroll down to **Script Properties**
3. Click **Add script property**
   - Property: `SHEETS_SECRET`
   - Value: generate a secret with `openssl rand -hex 16` in your terminal (or any 32+ char random string)
4. Click **Save script properties**

**Keep this value** — you'll need it for Step 5.

---

## Step 4 — Deploy as Web App

1. In Apps Script: click **Deploy → New deployment**
2. Click the gear icon next to "Type" → select **Web app**
3. Configure:
   - Description: `TSA Registration Webhook`
   - Execute as: **Me** (your Google account)
   - Who has access: **Anyone**
4. Click **Deploy**
5. **Authorisation prompt** — Google will ask you to authorise access (one-time only):
   - Click **Authorise access**
   - Select your Google account
   - If you see **"Google hasn't verified this app"**, click **Advanced** → **Go to [project name] (unsafe)** — this is your own script, it is safe
   - Click **Allow**
   - You'll be returned to the deployment screen
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfycbx.../exec`

> The "Anyone" access is intentional — the `SHEETS_SECRET` in the request body is the authentication layer. The "unsafe" warning is Google's standard notice for unverified scripts; since you own both the script and the sheet, it is safe to allow.

---

## Step 5 — Configure the Cloudflare Environment

### Local development (`.env.local`)

Add these two lines:

```
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/<your-id>/exec
GOOGLE_SHEETS_SECRET=<your-secret-from-step-3>
```

### Production (Cloudflare Pages secrets)

Run these two commands in your terminal from the project root:

```bash
npx wrangler pages secret put GOOGLE_SHEETS_WEBHOOK_URL
# paste the Web App URL when prompted

npx wrangler pages secret put GOOGLE_SHEETS_SECRET
# paste the secret when prompted
```

---

## Step 6 — Test

1. Start the dev server: `npm run dev`
2. Submit a test registration via the form (use a dummy Turnstile token or skip in dev)
3. Open the Google Sheet — a new row should appear within 5 seconds
4. Confirm columns A–U are populated and column V shows **New**

If no row appears, check the Cloudflare dev server logs for:
```
[register] sheets write failed: ...
```

---

## Column Reference

| Col | Name | Set by |
|-----|------|--------|
| A | Reference ID | Auto |
| B | Submitted At (UTC) | Auto |
| C | Language | Auto |
| D–G | Contact (name, position, email, phone) | Auto |
| H–J | Organisation | Auto |
| K–O | Venue | Auto |
| P–Q | Viewing plan | Auto |
| R–T | Commercial | Auto |
| U | Applicant notes | Auto |
| V | **Status** | **Team** |
| W | **Assigned To** | **Team** |
| X | **Fee (MYR)** | **Team** |
| Y | **Follow-up Date** | **Team** |
| Z | **Internal Notes** | **Team** |
| AA | **Source** | **Team** |
