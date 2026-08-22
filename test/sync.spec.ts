import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncNewsToViber } from '../src/sync';
import * as rssModule from '../src/rss';
import * as beogradRsModule from '../src/beograd-rs';
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
			BEOGRAD_RS_URL: 'https://www.beograd.rs/lat/vesti',
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

	it('should publish new articles from both Google News and beograd.rs and record them in KV', async () => {
		vi.spyOn(rssModule, 'fetchGoogleNews').mockResolvedValue([
			{
				id: 'https://news.com/1',
				link: 'https://news.com/1',
				title: 'Beograd dobija novi muzej',
				source: 'RTS'
			}
		]);

		vi.spyOn(beogradRsModule, 'fetchBeogradRsNews').mockResolvedValue([
			{
				id: 'https://www.beograd.rs/lat/beoinfo-vesti/a115304/Bez-vode.html',
				link: 'https://www.beograd.rs/lat/beoinfo-vesti/a115304/Bez-vode.html',
				title: 'Bez vode deo opštine Novi Beograd',
				source: 'Grad Beograd (beograd.rs)'
			}
		]);

		const viberSpy = vi.spyOn(viberModule, 'publishToViberChannel').mockResolvedValue({
			status: 0,
			status_message: 'ok',
			message_token: 12345
		});

		const result = await syncNewsToViber(mockEnv);

		expect(result.success).toBe(true);
		expect(result.totalFetched).toBe(2);
		expect(result.publishedCount).toBe(2);
		expect(result.newArticlesFound).toBe(2);
		expect(viberSpy).toHaveBeenCalledTimes(2);
		expect(mockEnv.NEWS_KV!.put).toHaveBeenCalledTimes(2);
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
		vi.spyOn(beogradRsModule, 'fetchBeogradRsNews').mockResolvedValue([]);

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
		vi.spyOn(beogradRsModule, 'fetchBeogradRsNews').mockResolvedValue([]);

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
