import { describe, it, expect } from 'vitest';
import { parseRssXml } from '../src/rss';
import { formatViberMessage } from '../src/viber';

const SAMPLE_GOOGLE_NEWS_RSS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <generator>NFE/5.0</generator>
    <title>Google News</title>
    <link>https://news.google.com/search?q=Beograd+Serbia&amp;hl=sr-Latn&amp;gl=RS&amp;ceid=RS:sr-Latn</link>
    <language>sr-Latn</language>
    <webMaster>news-webmaster@google.com</webMaster>
    <copyright>2026 Google Inc.</copyright>
    <lastBuildDate>Sat, 22 Aug 2026 21:00:00 GMT</lastBuildDate>
    <description>Google vesti</description>
    <item>
      <title>Radovi na mostu Gazela u Beogradu počinju u ponedeljak - RTS</title>
      <link>https://news.google.com/rss/articles/CBMiRGh0dHBzOi8vd3d3LnJ0cy5ycy92ZXN0aS9kcnVzdHZvLzEyMzQ1Ni9yYWRvdmktZ2F6ZWxhLWJlb2dyYWQuaHRtbNIBAA?oc=5</link>
      <guid isPermaLink="false">CBMiRGh0dHBzOi8vd3d3LnJ0cy5ycy92ZXN0aS9kcnVzdHZvLzEyMzQ1Ni9yYWRvdmktZ2F6ZWxhLWJlb2dyYWQuaHRtbNIBAA</guid>
      <pubDate>Sat, 22 Aug 2026 18:30:00 GMT</pubDate>
      <description>&lt;a href="https://news.google.com/rss/articles/..." target="_blank"&gt;Radovi na mostu Gazela u Beogradu počinju u ponedeljak&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;RTS&lt;/font&gt;</description>
      <source url="https://www.rts.rs">RTS</source>
    </item>
    <item>
      <title>Otvoren novi park u centru Beograda - Blic</title>
      <link>https://news.google.com/rss/articles/CBMiTWh0dHBzOi8vd3d3LmJsaWMucnMvYmVvZ3JhZC92ZXN0aS9vdHZvcmVuLW5vdmktcGFyay11LWJlZ3JhZHUvOTg3NjU0M9IBAA?oc=5</link>
      <guid isPermaLink="false">CBMiTWh0dHBzOi8vd3d3LmJsaWMucnMvYmVvZ3JhZC92ZXN0aS9vdHZvcmVuLW5vdmktcGFyay11LWJlZ3JhZHUvOTg3NjU0M9IBAA</guid>
      <pubDate>Sat, 22 Aug 2026 19:15:00 GMT</pubDate>
      <description>&lt;a href="..." target="_blank"&gt;Otvoren novi park u centru Beograda&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Blic&lt;/font&gt;</description>
      <source url="https://www.blic.rs">Blic</source>
    </item>
  </channel>
</rss>`;

describe('RSS XML Parsing', () => {
	it('should parse Google News RSS correctly', () => {
		const articles = parseRssXml(SAMPLE_GOOGLE_NEWS_RSS);

		expect(articles).toHaveLength(2);

		expect(articles[0].title).toBe('Radovi na mostu Gazela u Beogradu počinju u ponedeljak');
		expect(articles[0].source).toBe('RTS');
		expect(articles[0].link).toContain('https://news.google.com/rss/articles/');
		expect(articles[0].pubDate).toBe('Sat, 22 Aug 2026 18:30:00 GMT');

		expect(articles[1].title).toBe('Otvoren novi park u centru Beograda');
		expect(articles[1].source).toBe('Blic');
	});

	it('should fallback to parsing source from title when source tag is missing', () => {
		const xmlWithoutSourceTag = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Google News</title>
    <item>
      <title>Manifestacija Dani Beograda sledećeg vikenda - Danas</title>
      <link>https://news.google.com/rss/articles/123</link>
      <pubDate>Sat, 22 Aug 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

		const articles = parseRssXml(xmlWithoutSourceTag);
		expect(articles).toHaveLength(1);
		expect(articles[0].title).toBe('Manifestacija Dani Beograda sledećeg vikenda');
		expect(articles[0].source).toBe('Danas');
	});
});

describe('Viber Message Formatting', () => {
	it('should format message matching the requested pattern', () => {
		const formatted = formatViberMessage({
			id: 'https://example.com/1',
			title: 'Protesti u Beogradu',
			source: 'N1 Srbija',
			link: 'https://example.com/1'
		});

		expect(formatted).toBe('📰 Protesti u Beogradu\n\nSource: N1 Srbija\n\n🔗 https://example.com/1');
	});
});
