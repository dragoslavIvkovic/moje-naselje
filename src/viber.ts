import { NewsArticle } from './types';

const VIBER_POST_API = 'https://chatapi.viber.com/pa/post';
const VIBER_ACCOUNT_INFO_API = 'https://chatapi.viber.com/pa/get_account_info';
const VIBER_SET_WEBHOOK_API = 'https://chatapi.viber.com/pa/set_webhook';

export const DEFAULT_VIBER_TOKEN = '552dec4a7ff53c14-94bd5ab43dcff7dc-ab522b2d0c699b4f';
export const DEFAULT_ADMIN_ID = 'Q6nu5rPr3ieTfWPLsuxGQA==';

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

let cachedAdminId: string | null = DEFAULT_ADMIN_ID;

export async function getAdminId(token: string): Promise<string> {
	if (cachedAdminId) {
		return cachedAdminId;
	}

	try {
		const res = await fetch(VIBER_ACCOUNT_INFO_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Viber-Auth-Token': token
			},
			body: JSON.stringify({})
		});

		if (res.ok) {
			const data = (await res.json()) as any;
			if (data.status === 0 && Array.isArray(data.members) && data.members.length > 0) {
				cachedAdminId = data.members[0].id;
				return cachedAdminId!;
			}
		}
	} catch (e) {
		console.warn('Failed to fetch account info, falling back to default admin ID', e);
	}

	return DEFAULT_ADMIN_ID;
}

export async function ensureWebhook(token: string, webhookUrl: string): Promise<void> {
	try {
		await fetch(VIBER_SET_WEBHOOK_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Viber-Auth-Token': token
			},
			body: JSON.stringify({
				url: webhookUrl,
				event_types: ['delivered', 'seen', 'failed', 'subscribed', 'unsubscribed', 'conversation_started']
			})
		});
	} catch (e) {
		console.warn('Error setting webhook:', e);
	}
}

export async function publishToViberChannel(
	article: NewsArticle,
	viberToken?: string,
	adminId?: string
): Promise<ViberApiResponse> {
	const activeToken: string = viberToken || DEFAULT_VIBER_TOKEN;
	if (!activeToken) {
		throw new Error('VIBER_TOKEN is not set.');
	}

	const fromId: string = adminId || (await getAdminId(activeToken));
	const messageText = formatViberMessage(article);

	const payload = {
		from: fromId,
		sender: {
			name: 'Naselje Vojvode Vlahović'
		},
		type: 'text',
		text: messageText
	};

	let response = await fetch(VIBER_POST_API, {
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

	let result = (await response.json()) as ViberApiResponse;

	// Auto-recovery if webhook wasn't set yet (Status 10)
	if (result.status === 10) {
		await ensureWebhook(activeToken, 'https://moje-naselje.dragoslav-m-ivkovic.workers.dev/webhook');
		// Retry once
		response = await fetch(VIBER_POST_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Viber-Auth-Token': activeToken
			},
			body: JSON.stringify(payload)
		});
		result = (await response.json()) as ViberApiResponse;
	}

	if (result.status !== 0) {
		throw new Error(`Viber API Error [Status ${result.status}]: ${result.status_message}`);
	}

	return result;
}
