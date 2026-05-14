// Server entry point — connects to MongoDB, auto-configures AI models, seeds the database, and starts Express.
// Model roles are hydrated from persisted config on boot so the app is usable without manual setup.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { seedDefaultAdmin } from './config/seed.js';
import { createRoutes } from './adapters/web/routes.js';
import { errorMiddleware } from './adapters/web/error-handling.js';
import { buildDependencies } from './config/di.js';
import { pickSmallestModel } from './config/runtime-config.js';

const PORT = process.env.PORT || 5000;

// CORS allowlist comes from env. The tunnel hostname goes here; an empty list
// means "deny all cross-origin requests" (same-origin nginx-proxied calls
// still work because they arrive without an Origin header).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Default body limit is intentionally small. Endpoints that legitimately need
// more (story save, AI suggestion with long context) bump it inline.
const DEFAULT_JSON_LIMIT = process.env.JSON_BODY_LIMIT || '512kb';
const LARGE_JSON_LIMIT = process.env.LARGE_JSON_BODY_LIMIT || '10mb';

async function start() {
    const deps = buildDependencies();
    await deps.mongoClient.connect();

    if (deps.ollamaEndpointService?.hydrate) {
        await deps.ollamaEndpointService.hydrate();
    }

    if (deps.llmParamsService?.hydrate) {
        await deps.llmParamsService.hydrate();
    }

    if (deps.checkpointStore?.load) {
        const previous = await deps.checkpointStore.load();
        if (previous && (previous.running > 0 || previous.pending.length > 0)) {
            console.warn(
                `[AIJobQueue] Recovered checkpoint from prior process: running=${previous.running}, pending=${previous.pending.length}. Closures lost; queue starting empty.`
            );
        }
        await deps.infrastructureRepository.saveCheckpoint({ running: 0, pending: [] });
    }

    if (deps.modelManagementService?.hydrateRuntimeModels) {
        let active = await deps.modelManagementService.hydrateRuntimeModels();

        const embeddingModel = (process.env.EMBEDDING_MODEL || 'nomic-embed-text').toLowerCase();
        const isEmbeddingModel = (name) => {
            if (!name) return false;
            const lower = name.toLowerCase();
            return lower === embeddingModel || lower.includes('embed');
        };

        // Guard against embedding models landing in generative roles (e.g. from a prior
        // misconfiguration). Treat them as unconfigured so auto-detection replaces them.
        const needsSuggestion = !active.suggestion || isEmbeddingModel(active.suggestion);
        const needsSummary = !active.summary || isEmbeddingModel(active.summary);

        if (needsSuggestion || needsSummary) {
            try {
                const { installed } = await deps.aiService.listModels();
                const generativeNames = installed
                    .map((m) => m.name)
                    .filter(Boolean)
                    .filter((name) => !isEmbeddingModel(name));

                if (generativeNames.length > 0) {
                    // Prefer LLM_MODEL if installed, otherwise pick the smallest by parameter count.
                    const preferred = process.env.LLM_MODEL
                        ? generativeNames.find((n) => n.toLowerCase().startsWith(process.env.LLM_MODEL.toLowerCase()))
                        : null;
                    const defaultModel = preferred || pickSmallestModel(generativeNames, generativeNames[0]);

                    if (needsSuggestion) await deps.modelManagementService.setActiveModel('suggestion', defaultModel);
                    if (needsSummary) await deps.modelManagementService.setActiveModel('summary', defaultModel);
                    active = deps.modelManagementService.getActiveModels();
                    console.log('[ModelConfig] Auto-configured default model:', defaultModel);
                } else if (process.env.LLM_MODEL) {
                    // No generative models installed — pull in the background so the app self-heals on first boot.
                    console.log('[ModelConfig] Pulling default model in background:', process.env.LLM_MODEL);
                    deps.aiService.pullModel(process.env.LLM_MODEL).catch((err) => {
                        console.warn('[ModelConfig] Background pull failed:', err.message);
                    });
                } else {
                    console.log('[ModelConfig] No generative models installed; configure via Admin > AI Models.');
                }
            } catch (err) {
                console.warn('[ModelConfig] Auto-discovery skipped:', err.message);
            }
        }

        console.log('[ModelConfig] Active runtime models:', JSON.stringify(active));
    }

    const app = express();

    // Trust one proxy hop: nginx (which lives in the client container). When
    // cloudflared is added in front of nginx, Cloudflare's edge → cloudflared
    // → nginx is still one *trusted* hop from Express's perspective because
    // nginx normalizes X-Forwarded-For. Update to 2 only if you put Express
    // directly behind cloudflared without nginx.
    app.set('trust proxy', 1);

    // helmet sets a sensible default set of security headers (X-Content-Type-Options,
    // X-DNS-Prefetch-Control, Referrer-Policy, Strict-Transport-Security, X-Frame-Options,
    // X-Permitted-Cross-Domain-Policies, etc.). CSP and HSTS are tuned below.
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'default-src': ["'self'"],
                    // Cloudflare injects its beacon at the edge (Web Analytics).
                    // Allow it here or disable Cloudflare Web Analytics in the CF dashboard.
                    'script-src': ["'self'", 'https://static.cloudflareinsights.com'],
                    // Lexical/React inline styles + Google Fonts stylesheet.
                    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    // Allow Google Fonts to serve the actual font files.
                    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
                    'img-src': ["'self'", 'data:', 'blob:'],
                    'connect-src': ["'self'"],
                    'frame-ancestors': ["'none'"],
                    'object-src': ["'none'"],
                    'base-uri': ["'self'"],
                },
            },
            // SSE works better without COEP set to require-corp.
            crossOriginEmbedderPolicy: false,
            // Two-year HSTS, includeSubDomains. preload=false until you're sure
            // about every subdomain on novellier.dev. Cloudflare also sets HSTS
            // at the edge; this header is the in-app defense-in-depth copy.
            hsts: { maxAge: 63072000, includeSubDomains: true, preload: false },
        })
    );

    // CORS allowlist. Same-origin requests (no Origin header, e.g. nginx-proxied
    // /api/* from the browser) are always allowed. Cross-origin requests must
    // come from a hostname listed in ALLOWED_ORIGINS.
    app.use(
        cors({
            origin: (origin, cb) => {
                if (!origin) return cb(null, true);
                if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
                return cb(new Error('Origin not allowed by CORS'));
            },
            credentials: false, // We use bearer tokens in Authorization, not cookies.
            maxAge: 600,
        })
    );

    // Global rate limit. Generous default so a real user shouldn't notice it.
    // The login route has a much tighter limit applied per-route in createRoutes.
    const globalLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 120,
        standardHeaders: true,
        legacyHeaders: false,
        // Skip the health endpoint so cloudflared/uptime checks don't burn budget.
        skip: (req) => req.path === '/health' || req.path === '/api/health',
    });
    app.use(globalLimiter);

    // Login limiter applied at the route level so we can keep this declaration
    // here and pass it through deps. 10 attempts per 15 minutes per IP is well
    // above any human typing the wrong password and well below any automated
    // credential-stuffing attempt being viable against a bcrypt-12 hash.
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many login attempts. Try again in 15 minutes.' },
    });

    // No global body parser — if we mount a 512kb parser globally, it runs
    // before per-route largeBody parsers and rejects large story saves with 413
    // before they ever reach the route handler. Instead every route that needs
    // a JSON body opts in via smallBody or largeBody in createRoutes.
    app.use(createRoutes({ ...deps, loginLimiter, smallJsonLimit: DEFAULT_JSON_LIMIT, largeJsonLimit: LARGE_JSON_LIMIT }));
    app.get('/health', (req, res) => res.json({ status: 'ok', message: 'Server is running' }));

    // Must be registered after all routes — Express identifies error handlers by their 4-arg signature.
    app.use(errorMiddleware);

    await seedDefaultAdmin(deps.userService);

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
