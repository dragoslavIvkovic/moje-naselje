import { Env, NewsArticle, SyncResult } from './types';
import { fetchGoogleNews } from './rss';
import { fetchBeogradRsNews } from './beograd-rs';
import { publishToViberChannel } from './viber';

async function hashUrl(url: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(url);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 30 days retention in KV to prevent duplicates
const KV_TTL_SECONDS = 60 * 60 * 24 * 30;

// Maximum articles to post per cron execution to respect Viber rate limits and Cloudflare execution time
const MAX_POSTS_PER_RUN = 20;

export async function syncNewsToViber(env: Env): Promise<SyncResult> {
	const result: SyncResult = {
		success: true,
		totalFetched: 0,
		newArticlesFound: 0,
		publishedCount: 0,
		errors: [],
		articles: []
	};

	const allArticles: NewsArticle[] = [];

	// 1. Fetch from Google News RSS
	try {
		const googleNews = await fetchGoogleNews(env.NEWS_RSS_URL);
		allArticles.push(...googleNews);
	} catch (err: any) {
		const errorMsg = `Error fetching Google News RSS: ${err.message || err}`;
		console.error(errorMsg);
		result.errors.push(errorMsg);
	}

	// 2. Fetch from beograd.rs/lat/vesti
	try {
		const beogradNews = await fetchBeogradRsNews(env.BEOGRAD_RS_URL);
		allArticles.push(...beogradNews);
	} catch (err: any) {
		const errorMsg = `Error fetching beograd.rs news: ${err.message || err}`;
		console.error(errorMsg);
		result.errors.push(errorMsg);
	}

	result.totalFetched = allArticles.length;

	if (allArticles.length === 0) {
		result.success = result.errors.length === 0;
		return result;
	}

	// Reverse order so older items are published first
	const chronologicalArticles = [...allArticles].reverse();

	let publishedThisRun = 0;

	for (const article of chronologicalArticles) {
		const hash = await hashUrl(article.link);
		const kvKey = `article:${hash}`;

		let isAlreadyPublished = false;

		if (env.NEWS_KV) {
			try {
				const existing = await env.NEWS_KV.get(kvKey);
				if (existing) {
					isAlreadyPublished = true;
				}
			} catch (kvErr: any) {
				console.warn(`KV read error for key ${kvKey}:`, kvErr);
			}
		}

		if (isAlreadyPublished) {
			result.articles.push({
				title: article.title,
				link: article.link,
				source: article.source || 'Unknown',
				status: 'already_published'
			});
			continue;
		}

		result.newArticlesFound++;

		if (publishedThisRun >= MAX_POSTS_PER_RUN) {
			// Skip posting further in this run to avoid flooding; will be picked up on next run if still available
			continue;
		}

		try {
			await publishToViberChannel(article, env.VIBER_TOKEN, env.VIBER_ADMIN_ID);

			// Mark as published in KV
			if (env.NEWS_KV) {
				await env.NEWS_KV.put(
					kvKey,
					JSON.stringify({
						title: article.title,
						link: article.link,
						source: article.source,
						pubDate: article.pubDate,
						publishedAt: new Date().toISOString()
					}),
					{ expirationTtl: KV_TTL_SECONDS }
				);
			}

			result.publishedCount++;
			publishedThisRun++;

			result.articles.push({
				title: article.title,
				link: article.link,
				source: article.source || 'Unknown',
				status: 'published'
			});

			console.log(`[VIBER] Published: "${article.title}" (${article.source})`);
		} catch (viberErr: any) {
			const errorMsg = `Failed to publish "${article.title}": ${viberErr.message || viberErr}`;
			console.error(errorMsg);
			result.errors.push(errorMsg);
			result.articles.push({
				title: article.title,
				link: article.link,
				source: article.source || 'Unknown',
				status: 'failed',
				error: viberErr.message || String(viberErr)
			});
		}
	}

	result.success = result.errors.length === 0;
	return result;
}
