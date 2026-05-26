# Webmaster Instructions — wcmalaysia.totalsportsasia.com Proxy Setup

**Requested by:** Total Sports Asia  
**Goal:** Make `https://wcmalaysia.totalsportsasia.com` serve the FIFA World Cup 2026 public viewing registration page, hosted on Cloudflare Workers.

No changes to WordPress are needed. Everything is done in Cloudflare.

---

## What You Need

- Access to the Cloudflare account that manages `totalsportsasia.com`
- 10 minutes

---

## Step 1 — Add a DNS Record

1. Log in to **dash.cloudflare.com**
2. Go to **Websites** → click **totalsportsasia.com**
3. In the left sidebar click **DNS** → **Records**
4. Click **Add record**
5. Set:
   - **Type:** `CNAME`
   - **Name:** `wcmalaysia`
   - **Target:** `2026wcpublicviewing.aasil.workers.dev`
   - **Proxy status:** Enabled (orange cloud icon — must be ON)
6. Click **Save**

---

## Step 2 — Create the Worker

1. In the left sidebar click **Workers & Pages**
2. Click **Create** → **Create Worker**
3. Name it: `tsa-wcmalaysia-proxy`
4. Replace all the default code with this:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = 'https://2026wcpublicviewing.aasil.workers.dev' + url.pathname + url.search;

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(proxyRequest);

    // Rewrite any absolute URLs in the response that point back to workers.dev
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let body = await response.text();
      body = body.replaceAll(
        'https://2026wcpublicviewing.aasil.workers.dev',
        'https://wcmalaysia.totalsportsasia.com'
      );
      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    }

    return response;
  },
};
```

5. Click **Deploy**

---

## Step 3 — Add a Worker Route

1. Go to **Websites** → click **totalsportsasia.com**
2. In the left sidebar go to **Workers Routes**
3. Click **Add route**
4. Set:
   - **Route:** `wcmalaysia.totalsportsasia.com/*`
   - **Worker:** `tsa-wcmalaysia-proxy`
5. Click **Save**

---

## Step 4 — Test

Open a browser (incognito recommended) and go to:

```
https://wcmalaysia.totalsportsasia.com
```

The registration page should load. The URL bar should show `wcmalaysia.totalsportsasia.com` throughout — the `workers.dev` address should never appear.

If the page loads but styles or images are broken, contact Total Sports Asia — there may be asset path rewriting needed.

---

## Notes

- No changes to WordPress are required
- The registration site itself remains on Cloudflare Workers — this is purely a routing layer
- All form submissions, emails, and Google Sheets integrations continue to work without any changes
- The CORS allowlist and Turnstile bot protection have already been updated on the registration site to accept `wcmalaysia.totalsportsasia.com`
