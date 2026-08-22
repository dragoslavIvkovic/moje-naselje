import { Env } from './types';
import { syncNewsToViber } from './sync';

export default {
	/**
	 * Cloudflare Cron Trigger Handler
	 * Executed automatically every 12 hours (configured in wrangler.jsonc)
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[CRON] Scheduled event fired at ${new Date(event.scheduledTime).toISOString()} (cron: "${event.cron}")`);
		ctx.waitUntil(
			syncNewsToViber(env)
				.then(result => {
					console.log(`[CRON] Sync finished: ${result.publishedCount} published, ${result.newArticlesFound} new, ${result.totalFetched} total`);
				})
				.catch(err => {
					console.error('[CRON] Sync failed:', err);
				})
		);
	},

	/**
	 * HTTP Request Handler
	 * Allows manual testing, debugging, and health monitoring
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle manual test/trigger route
		if (url.pathname === '/test' || url.pathname === '/sync' || url.pathname === '/trigger') {
			try {
				const result = await syncNewsToViber(env);
				return new Response(JSON.stringify(result, null, 2), {
					headers: {
						'Content-Type': 'application/json; charset=utf-8'
					},
					status: result.success ? 200 : 500
				});
			} catch (err: any) {
				return new Response(
					JSON.stringify({ error: err.message || String(err) }, null, 2),
					{
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
						status: 500
					}
				);
			}
		}

		// Default info / health endpoint
		const info = {
			name: 'Belgrade News Viber Bot Worker',
			status: 'active',
			cronSchedule: '0 */12 * * *',
			endpoints: {
				manualTrigger: `${url.origin}/test`,
				health: `${url.origin}/`
			},
			configuration: {
				rssUrlConfigured: Boolean(env.NEWS_RSS_URL),
				viberTokenConfigured: Boolean(env.VIBER_TOKEN),
				kvConfigured: Boolean(env.NEWS_KV)
			}
		};

		return new Response(JSON.stringify(info, null, 2), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' }
		});
	}
};
