import { NewsArticle } from './types';

const VIBER_POST_API = 'https://chatapi.viber.com/pa/post';

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
	viberToken: string
): Promise<ViberApiResponse> {
	if (!viberToken) {
		throw new Error('VIBER_TOKEN secret is not set in environment.');
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
			'X-Viber-Auth-Token': viberToken
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
