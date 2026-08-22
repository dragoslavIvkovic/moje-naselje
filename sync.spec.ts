import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncNewsToViber, isVojvodeVlahovicaArticle } from '../src/sync';
import * as rssModule from '../src/rss';
import * as beogradRsModule from '../src/beograd-rs';
import * as viberModule from '../src/viber';
import { Env } from '../src/types';

describe('isVojvodeVlahovicaArticle filter', () => {
	it('should match Latin and Cyrillic Vojvode Vlahovica titles', () => {
		expect(isVojvodeVlahovicaArticle({ id: '1', title: 'Radovi u ulici Vojvode Vlahovića', link: 'https://ex.com/1' })).toBe(true);
		expect(isVojvodeVlahovicaArticle({ id: '2', title: 'Радови у насељу Војводе Влаховић', link: 'https://ex.com/2' })).toBe(true);
		expect(isVojvodeVlahovicaArticle({ id: '3', title: 'Požar u naselju Vojvode Vlahovica', link: 'https://ex.com/3' })).toBe(true);
		expect(isVojvodeVlahovicaArticle({ id: '4', title: 'Otvaranje novog mosta u Zemunu', link: 'https://ex.com/4' })).toBe(false);
	});
});

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

	it('should publish new Vojvode Vlahovica articles and filter out unrelated articles', async () => {
		vi.spyOn(rssModule, 'fetchGoogleNews').mockResolvedValue([
			{
				id: 'https://news.com/1',
				link: 'https://news.com/1',
				title: 'Novi radovi u naselju Vojvode Vlahovića',
				source: 'RTS'
			},
			{
				id: 'https://news.com/unrelated',
				link: 'https://news.com/unrelated',
				title: 'Izložba slika na Kalemegdanu',
				source: 'Blic'
			}
		]);

		vi.spyOn(beogradRsModule, 'fetchBeogradRsNews').mockResolvedValue([
			{
				id: 'https://www.beograd.rs/lat/vesti/1',
				link: 'https://www.beograd.rs/lat/vesti/1',
				title: 'Izmena linije 26L u Vojvode Vlahovića',
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
		expect(result.totalFetched).toBe(2); // only the 2 relevant articles
		expect(result.publishedCount).toBe(2);
		expect(result.newArticlesFound).toBe(2);
		expect(viberSpy).toHaveBeenCalledTimes(2);
		expect(mockEnv.NEWS_KV!.put).toHaveBeenCalledTimes(2);
	});
});
