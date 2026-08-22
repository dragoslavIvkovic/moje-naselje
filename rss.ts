import { XMLParser } from 'fast-xml-parser';
import { NewsArticle } from './types';

export const DEFAULT_RSS_URL = 'https://news.google.com/rss/search?q=%22vojvode+vlahovica%22+OR+%22vojvode+vlahovi%C4%87a%22+OR+%22vojvode+vlahovi%C4%87%22+OR+%22%D0%B2%D0%BE%D1%98%D0%B2%D0%BE%D0%B4%D0%B5+%D0%B2%D0%BB%D0%B0%D1%85%D0%BE%D0%B2%D0%B8%D1%9B%D0%B0%22+OR+%22%D0%B2%D0%BE%D1%98%D0%B2%D0%BE%D0%B4%D0%B5+%D0%B2%D0%BB%D0%B0%D1%85%D0%BE%D0%B2%D0%B8%D1%9B%22&hl=sr-Latn&gl=RS&ceid=RS:sr-Latn';

export async function fetchGoogleNews(rssUrl: string = DEFAULT_RSS_URL): Promise<NewsArticle[]> {
	const urlToFetch = rssUrl || DEFAULT_RSS_URL;
	const response = await fetch(urlToFetch, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; CloudflareWorker-NewsBot/1.0)',
			'Accept': 'application/rss+xml, application/xml, text/xml, */*'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch RSS feed: HTTP ${response.status} ${response.statusText}`);
	}

	const xmlText = await response.text();
	return parseRssXml(xmlText);
}

export function parseRssXml(xmlContent: string): NewsArticle[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		textNodeName: '#text',
		trimValues: true,
		parseTagValue: false
	});

	const parsed = parser.parse(xmlContent);
	const channel = parsed?.rss?.channel;
	if (!channel) {
		throw new Error('Invalid RSS structure: missing <rss><channel> root');
	}

	const rawItems = channel.item;
	if (!rawItems) {
		return [];
	}

	const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];
	const articles: NewsArticle[] = [];

	for (const item of itemsArray) {
		let rawTitle: string = typeof item.title === 'string' ? item.title : (item.title?.['#text'] || '');
		let link: string = typeof item.link === 'string' ? item.link : (item.link?.['#text'] || '');
		let pubDate: string = typeof item.pubDate === 'string' ? item.pubDate : (item.pubDate?.['#text'] || '');
		
		let sourceName = '';
		if (item.source) {
			if (typeof item.source === 'string') {
				sourceName = item.source;
			} else if (item.source?.['#text']) {
				sourceName = item.source['#text'];
			}
		}

		// Fallback: If title contains " - SourceName", extract source from title if source tag is missing
		let cleanTitle = rawTitle;
		if (!sourceName && rawTitle.includes(' - ')) {
			const lastDashIndex = rawTitle.lastIndexOf(' - ');
			sourceName = rawTitle.substring(lastDashIndex + 3).trim();
			cleanTitle = rawTitle.substring(0, lastDashIndex).trim();
		} else if (sourceName && rawTitle.endsWith(` - ${sourceName}`)) {
			cleanTitle = rawTitle.substring(0, rawTitle.length - (` - ${sourceName}`).length).trim();
		}

		if (!sourceName) {
			sourceName = 'Google News';
		}

		if (link && cleanTitle) {
			articles.push({
				id: link,
				title: cleanTitle,
				link: link,
				pubDate: pubDate || undefined,
				source: sourceName
			});
		}
	}

	return articles;
}
