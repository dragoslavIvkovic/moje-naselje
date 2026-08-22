import { NewsArticle } from './types';

const BEOGRAD_RS_URL = 'https://www.beograd.rs/lat/vesti';

export async function fetchBeogradRsNews(url: string = BEOGRAD_RS_URL): Promise<NewsArticle[]> {
	const response = await fetch(url || BEOGRAD_RS_URL, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; CloudflareWorker-NewsBot/1.0; +https://workers.cloudflare.com)',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'sr-Latn,sr;q=0.9,en;q=0.8'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch beograd.rs: HTTP ${response.status} ${response.statusText}`);
	}

	const html = await response.text();
	return parseBeogradRsHtml(html);
}

export function parseBeogradRsHtml(html: string): NewsArticle[] {
	const articles: NewsArticle[] = [];
	const seenUrls = new Set<string>();

	// Regex matching each news card
	// Format: <div class="news-card ..."><a href="(/lat/...)" title="..." class="news-card__link">...<h2 class="news-card__title">Title</h2>...<div class="news-card__time">Date</div>...
	const cardRegex = /<div class="[^"]*news-card[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/a>\s*<\/div>/gi;
	
	// Simpler and more resilient per-card regex
	const simpleCardRegex = /<a\s+[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*class="news-card__link">([\s\S]*?)<\/a>/gi;

	let match: RegExpExecArray | null;
	while ((match = simpleCardRegex.exec(html)) !== null) {
		let rawHref = match[1].trim();
		let rawTitle = match[2].trim();
		const innerContent = match[3];

		// Ensure full absolute URL
		let fullUrl = rawHref;
		if (fullUrl.startsWith('/')) {
			fullUrl = `https://www.beograd.rs${fullUrl}`;
		}

		if (seenUrls.has(fullUrl)) {
			continue;
		}
		seenUrls.add(fullUrl);

		// Extract cleaner title from <h2 class="news-card__title">...</h2> if available
		const titleMatch = /<h2 class="news-card__title">([\s\S]*?)<\/h2>/i.exec(innerContent);
		if (titleMatch) {
			rawTitle = titleMatch[1].trim();
		}

		// Clean up title (decode HTML entities, remove extra whitespace)
		const cleanTitle = rawTitle
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/\s+/g, ' ')
			.trim();

		// Extract date from <div class="news-card__time">...</div>
		let pubDate = '';
		const dateMatch = /<div class="news-card__time">([\s\S]*?)<\/div>/i.exec(innerContent);
		if (dateMatch) {
			pubDate = dateMatch[1].trim();
		}

		if (cleanTitle && fullUrl) {
			articles.push({
				id: fullUrl,
				title: cleanTitle,
				link: fullUrl,
				pubDate: pubDate || undefined,
				source: 'Grad Beograd (beograd.rs)'
			});
		}
	}

	return articles;
}
