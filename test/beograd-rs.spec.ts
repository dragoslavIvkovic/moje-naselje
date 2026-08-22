import { describe, it, expect } from 'vitest';
import { parseBeogradRsHtml } from '../src/beograd-rs';

const SAMPLE_BEOGRAD_RS_HTML = `
<div class="news-list">
  <div class="news-list__cards-container">
    <div class="news-card isNewsListCard news-card--large">
      <a href="/lat/beoinfo-vesti/a115304/Bez-vode-deo-opstine-Novi-Beograd.html" title="Bez vode deo opštine Novi Beograd" class="news-card__link">
        <div class="news-card__content">
          <div class="news-card__section news-card__section--service">Beoinfo vesti</div>
          <h2 class="news-card__title">Bez vode deo opštine Novi Beograd</h2>
          <div class="news-card__bottom">
            <div class="news-card__time">21.08.2026.</div>
          </div>
        </div>
      </a>
    </div>
    <div class="news-card isNewsListCard news-card--large">
      <a href="/lat/beoinfo-vesti/a115303/Pocinje-prijavljivanje-za-besplatne-izlete-u-Opstini-Novi-Beograd.html" title="Počinje prijavljivanje za besplatne izlete u Opštini Novi Beograd" class="news-card__link">
        <div class="news-card__content">
          <div class="news-card__section news-card__section--service">Beoinfo vesti</div>
          <h2 class="news-card__title">Počinje prijavljivanje za besplatne izlete u Opštini Novi Beograd</h2>
          <div class="news-card__bottom">
            <div class="news-card__time">21.08.2026.</div>
          </div>
        </div>
      </a>
    </div>
  </div>
</div>
`;

describe('beograd.rs HTML parser', () => {
	it('should parse news articles from beograd.rs', () => {
		const articles = parseBeogradRsHtml(SAMPLE_BEOGRAD_RS_HTML);
		expect(articles).toHaveLength(2);
		expect(articles[0].title).toBe('Bez vode deo opštine Novi Beograd');
		expect(articles[0].link).toBe('https://www.beograd.rs/lat/beoinfo-vesti/a115304/Bez-vode-deo-opstine-Novi-Beograd.html');
		expect(articles[0].source).toBe('Grad Beograd (beograd.rs)');
		expect(articles[0].pubDate).toBe('21.08.2026.');
	});
});
