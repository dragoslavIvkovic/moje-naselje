import { NewsArticle } from './types';

const VIBER_POST_API = 'https://chatapi.viber.com/pa/post';

export const DEFAULT_VIBER_TOKEN = '552dec4a7ff53c14-94bd5ab43dcff7dc-ab522b2d0c699b4f';

export function formatViberMessage(article: NewsArticle): string {
	return `📰 ${article.title}\n\nSource: ${article.source || 'Google News'}\n\n🔗 ${article.link}`;
}

export interface ViberApiResponse {
	status: number;
	status_message: string;
	message_token?: number;
	chat_hostname?: string;
	billing_status?: number;
}

export async function publishToViberChannel(
	article: NewsArticle,
	viberToken?: string
): Promise<ViberApiResponse> {
	const activeToken: string = viberToken || DEFAULT_VIBER_TOKEN;
	if (!activeToken) {
		throw new Error('VIBER_TOKEN is not set.');
	}

	const messageText = formatViberMessage(article);

	const payload = {
		type: 'text',
		text: messageText
	};

	const response = await fetch(VIBER_POST_API, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Viber-Auth-Token': activeToken
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Viber API HTTP ${response.status} ${response.statusText}: ${errorText}`);
	}

	const result = (await response.json()) as ViberApiResponse;
	if (result.status !== 0) {
		throw new Error(`Viber API Error [Status ${result.status}]: ${result.status_message}`);
	}

	return result;
}
