export interface Env {
	NEWS_KV?: KVNamespace;
	VIBER_TOKEN?: string;
	NEWS_RSS_URL?: string;
	BEOGRAD_RS_URL?: string;
}

export interface NewsArticle {
	title: string;
	link: string;
	pubDate?: string;
	source?: string;
	id: string; // unique identifier (link or hash)
}

export interface SyncResult {
	success: boolean;
	totalFetched: number;
	newArticlesFound: number;
	publishedCount: number;
	errors: string[];
	articles: {
		title: string;
		link: string;
		source: string;
		status: 'published' | 'already_published' | 'failed';
		error?: string;
	}[];
}
