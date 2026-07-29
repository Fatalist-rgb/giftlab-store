import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/**
 * A deploy renames every admin asset (content hash). A browser tab left open still asks
 * for the OLD filenames; the server answers those with index.html, the module script is
 * rejected for its MIME type and the dashboard shows "An error occurred" until someone
 * hard-reloads. This inline snippet runs before the module scripts, notices a failed
 * /app/assets/* load and reloads once (at most every 5 minutes per tab, so a genuinely
 * broken deploy cannot turn into a reload loop) — the fresh index.html then boots.
 */
const STALE_ASSET_RELOAD = `
(function () {
  var KEY = "gl_stale_asset_reload";
  // the build may inject this snippet more than once — one listener is enough
  if (window.__glStaleAssetReload) return;
  window.__glStaleAssetReload = true;
  window.addEventListener("error", function (event) {
    var el = event.target;
    if (!el || (el.tagName !== "SCRIPT" && el.tagName !== "LINK")) return;
    var url = el.src || el.href || "";
    if (url.indexOf("/app/assets/") === -1) return;
    try {
      var last = parseInt(sessionStorage.getItem(KEY) || "0", 10);
      if (Date.now() - last < 300000) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch (e) { /* private mode: reload anyway, the guard is best-effort */ }
    location.reload();
  }, true);
})();
`

module.exports = defineConfig({
  admin: {
    vite: (config: { plugins?: unknown[] }) => {
      config.plugins = [
        ...(config.plugins ?? []),
        {
          name: 'gl-stale-asset-reload',
          transformIndexHtml() {
            return [
              {
                tag: 'script',
                children: STALE_ASSET_RELOAD,
                injectTo: 'head-prepend' as const,
              },
            ]
          },
        },
      ]
      return config
    },
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    // GiftLab custom modules (personalized-figurine domain)
    { resolve: './src/modules/product_customization' },
    { resolve: './src/modules/personalization' },
    { resolve: './src/modules/price_history' },
    { resolve: './src/modules/content' },
    { resolve: './src/modules/consent' },
    { resolve: './src/modules/review' },
    // Notifications: the local provider logs emails until the client's mail service
    // (SMTP/Resend) exists — then only this provider entry changes, not the senders.
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/notification-local',
            id: 'local',
            options: { channels: ['email', 'feed'] },
          },
        ],
      },
    },
  ],
})
