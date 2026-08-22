import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncNewsToViber } from '../src/sync';
import * as rssModule from '../src/rss';
import * as viberModule from '../src/viber';
import { Env } from '../src/types';

describe('syncNewsToViber', () => {
	let mockKv: Record<string, string>;
	let mockEnv: Env;

	beforeEach(() => {
		mockKv = {};
		mockEnv = {
			VIBER_TOKEN: 'test-viber-token',
			NEWS_RSS_URL: 'https://example.com/rss',
			NEWS_KV: {
				get: vi.fn(async (key: string) => mockKv[key] || null),
				put: vi.fn(async (key: string, value: string) => {
					mockKv[key] = value;
				}),
				delete: vi.fn(async (key: string) => {
					delete mockKv[key];
				}),
				list: vi.fn(async () => ({ keys: [], list_complete: true, cursor: '' })),
				getWithMetadata: vi.fn()
			} as unknown as KVNamespace
		};
	});

	it('should publish new articles and record them in KV', async () => {
		vi.spyOn(rssModule, 'fetchGoogleNews').mockResolvedValue([
			{
				id: 'https://news.com/1',
				link: 'https://news.com/1',
				title: 'Beograd dobija novi muzej',
				source: 'RTS'
			}
		]);

		const viberSpy = vi.spyOn(viberModule, 'publishToViberChannel').mockResolvedValue({
			status: 0,
			status_message: 'ok',
			message_token: 12345
		});

		const result = await syncNewsToViber(mockEnv);

		expect(result.success).toBe(true);
		expect(result.publishedCount).toBe(1);
		expect(result.newArticlesFound).toBe(1);
		expect(viberSpy).toHaveBeenCalledTimes(1);
		expect(mockEnv.NEWS_KV.put).toHaveBeenCalledTimes(1);
	});

	it('should not publish already published articles', async () => {
		vi.spyOn(rssModule, 'fetchGoogleNews').mockResolvedValue([
			{
				id: 'https://news.com/1',
				link: 'https://news.com/1',
				title: 'Beograd dobija novi muzej',
				source: 'RTS'
			}
		]);

		// Pre-populate KV
		const encoder = new TextEncoder();
		const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode('https://news.com/1'));
		const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
		mockKv[`article:${hash}`] = JSON.stringify({ title: 'Beograd dobija novi muzej' });

		const viberSpy = vi.spyOn(viberModule, 'publishToViberChannel').mockResolvedValue({
			status: 0,
			status_message: 'ok'
		});

		const result = await syncNewsToViber(mockEnv);

		expect(result.publishedCount).toBe(0);
		expect(result.newArticlesFound).toBe(0);
		expect(viberSpy).not.toHaveBeenCalled();
		expect(result.articles[0].status).toBe('already_published');
	});

	it('should handle Viber API failure gracefully without breaking the batch', async () => {
		vi.spyOn(rssModule, 'fetchGoogleNews').mockResolvedValue([
			{
				id: 'https://news.com/fail',
				link: 'https://news.com/fail',
				title: 'Failed article',
				source: 'B92'
			}
		]);

		vi.spyOn(viberModule, 'publishToViberChannel').mockRejectedValue(
			new Error('Viber API Rate limit exceeded')
		);

		const result = await syncNewsToViber(mockEnv);

		expect(result.success).toBe(false);
		expect(result.publishedCount).toBe(0);
		expect(result.errors).toHaveLength(1);
		expect(result.articles[0].status).toBe('failed');
	});
});
