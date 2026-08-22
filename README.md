# Belgrade News to Viber Channel Cloudflare Worker

A lightweight, automated Cloudflare Worker that periodically fetches the latest news about Belgrade, Serbia from Google News RSS and publishes new articles directly to your Viber Channel.

## Features

- ⚡ **Cloudflare Cron Trigger**: Runs automatically every 12 hours in the background (`0 */12 * * *`).
- 📰 **Google News RSS Parser**: Extracts article title, URL, publication date, and news source.
- 🛡️ **Deduplication via Cloudflare KV**: Stores published article hashes with a 30-day TTL to ensure zero duplicate posts.
- 💬 **Viber Channel Post API**: Formats and sends clean, readable messages using `X-Viber-Auth-Token`.
- 🔒 **Secure Secrets**: `VIBER_TOKEN` is managed securely as a Cloudflare secret.
- 🧪 **Manual Test & Trigger Endpoint**: Test the sync pipeline instantly via HTTP (`/test` or `/sync`).

---

## Message Format

Every published message on Viber follows this clean layout:

```
📰 {article title}

Source: {source name}

🔗 {article URL}
```

---

## Setup & Deployment Guide

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Create Cloudflare KV Namespace

Create a KV namespace named `NEWS_KV` to store published article IDs:

```bash
npx wrangler kv namespace create NEWS_KV
```

Example output:
```text
✨ Success!
Add the following to your wrangler.jsonc:
{
  "binding": "NEWS_KV",
  "id": "a1b2c3d4e5f6g7h8i9j0"
}
```

Open `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with your generated KV `id`:

```jsonc
"kv_namespaces": [
  {
    "binding": "NEWS_KV",
    "id": "a1b2c3d4e5f6g7h8i9j0"
  }
]
```

---

### 3. Add Viber Secret Token (`VIBER_TOKEN`)

Set your Viber Channel Authentication Token as a secure secret in Cloudflare:

```bash
npx wrangler secret put VIBER_TOKEN
```

When prompted, paste your Viber token:
```text
✔ Enter a secret value: ************************************************
✨ Success! Uploaded secret VIBER_TOKEN
```

---

### 4. Configure RSS Feed URL (`NEWS_RSS_URL`)

The default RSS feed is configured in `wrangler.jsonc`:

```jsonc
"vars": {
  "NEWS_RSS_URL": "https://news.google.com/rss/search?q=Beograd+Serbia&hl=sr-Latn&gl=RS&ceid=RS:sr-Latn"
}
```

You can customize the search query or language at any time in `wrangler.jsonc` or in the Cloudflare Dashboard under **Workers & Pages > Settings > Variables**.

---

### 5. Deploy the Worker

Deploy your Worker to Cloudflare:

```bash
npm run deploy
```

Once deployed, Cloudflare will automatically register the Cron Trigger (`0 */12 * * *`), and your Worker will begin monitoring Google News and posting updates to your Viber Channel every 12 hours.

---

## Testing the Worker Manually

### Option A: Local Testing with `wrangler dev`

1. Create a local `.dev.vars` file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Verify that your `VIBER_TOKEN` is present in `.dev.vars`.
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Open your browser or run `curl`:
   ```bash
   curl http://localhost:8787/test
   ```
   This will execute a live test run, fetching the RSS feed, checking KV deduplication, posting new articles to Viber, and returning a JSON summary.

5. Test the Cron Trigger locally:
   ```bash
   curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
   ```

### Option B: Triggering the Deployed Worker via HTTP

You can also trigger a manual sync run on the live deployed worker at any time:

```bash
curl https://<your-worker-subdomain>.workers.dev/test
```

Response format:
```json
{
  "success": true,
  "totalFetched": 20,
  "newArticlesFound": 2,
  "publishedCount": 2,
  "errors": [],
  "articles": [
    {
      "title": "Radovi na mostu Gazela u Beogradu...",
      "link": "https://news.google.com/rss/articles/...",
      "source": "RTS",
      "status": "published"
    }
  ]
}
```

---

## Running Automated Tests

Run the Vitest test suite:

```bash
npm test
```

Typecheck TypeScript:

```bash
npm run typecheck
```
