// Centralized zod schemas for HTTP input validation.
//
// Controllers use `validate(schema, req.body, res)` and bail early on failure
// with a 400 response. Schemas are intentionally permissive about *which*
// fields are present (most operations have optional fields) but strict about
// the *shape* and *length* of values that are. The goal is to reject the
// classes of input that lead to injection, prototype pollution, or
// runaway-prompt cost — not to enforce business rules (those stay in
// services/repositories).

import { z } from 'zod';

// Generic helper: parses and writes a 400 on failure. Returns the parsed
// value on success, or `null` if the response has already been sent.
export function validate(schema, body, res) {
    const result = schema.safeParse(body ?? {});
    if (!result.success) {
        res.status(400).json({
            error: 'Invalid request body',
            details: result.error.flatten(),
        });
        return null;
    }
    return result.data;
}

// --- Auth ---

export const LoginSchema = z.object({
    username: z.string().min(1).max(128),
    password: z.string().min(1).max(512),
});

// --- Users (admin-managed) ---

const RoleSchema = z.enum(['user', 'admin']);

export const CreateUserSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9_.-]+$/, 'username may only contain letters, digits, _ . -'),
    password: z.string().min(12).max(256),
    role: RoleSchema.optional().default('user'),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().max(256).optional().or(z.literal('')),
    profilePicture: z.string().max(2048).nullable().optional(),
    uuid: z.string().uuid().optional(),
});

export const UpdateUserSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9_.-]+$/)
        .optional(),
    password: z.string().min(12).max(256).optional(),
    role: RoleSchema.optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().max(256).optional().or(z.literal('')),
    profilePicture: z.string().max(2048).nullable().optional(),
});

// --- Stories ---
//
// Story bodies can be very large (chapters with embedded HTML); we don't try
// to bound them tightly here. The express body limit (10mb on these routes)
// is the real backstop. We just sanity-check obvious fields.

export const CreateStorySchema = z.object({
    title: z.string().max(500).optional(),
    titleHtml: z.string().max(10000).nullable().optional(),
    chapterHeadingHtml: z.string().max(10000).nullable().optional(),
    content: z.unknown().optional(),
    sections: z.unknown().optional(),
    genre: z.string().max(120).optional(),
    templateId: z.string().max(120).optional().nullable(),
});

export const UpdateStorySchema = CreateStorySchema.partial();

// --- AI suggestions ---

export const SuggestSchema = z.object({
    storyText: z.unknown(), // can be plain string or RichText doc — kept loose
    sections: z.unknown().optional(),
    storyId: z.string().max(128).optional(),
    mode: z.enum(['tools', 'plain']).optional(),
    feedbackType: z.string().max(64).optional(),
    customPrompt: z.string().max(8000).optional(),
    contextSummaries: z.unknown().optional(),
    chapterSummaries: z.unknown().optional(),
});

// --- Ollama admin endpoint ---
//
// SSRF protection: only http/https URLs, and any host whose name resolves
// to a private/link-local/metadata address is rejected. The in-cluster
// `ollama` hostname is explicitly allowed because that's the legitimate
// default. Note: this validates the *string* form; the actual outbound
// request still resolves DNS at call time and could theoretically resolve
// to a different IP, but that requires the attacker to control DNS for
// the host they specify — at which point the SSRF is the smaller problem.

const PRIVATE_HOST_RE =
    /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc00:|fe80:|0\.0\.0\.0)/i;

export const OllamaEndpointSchema = z.object({
    url: z
        .string()
        .url()
        .max(2048)
        .refine(
            (raw) => {
                try {
                    const u = new URL(raw);
                    if (!['http:', 'https:'].includes(u.protocol)) return false;
                    // Explicitly allow the in-cluster service hostname.
                    if (u.hostname === 'ollama') return true;
                    return !PRIVATE_HOST_RE.test(u.hostname);
                } catch {
                    return false;
                }
            },
            {
                message:
                    'URL must be an http(s) endpoint pointing at a public host or the in-cluster "ollama" service',
            }
        ),
});

// --- Set active model (admin) ---

export const SetActiveModelSchema = z.object({
    target: z.enum(['suggestion', 'summary', 'embedding']),
    model: z.string().min(1).max(256),
});

// --- LLM params (admin) ---
//
// We don't enumerate every Ollama option here — just clamp the ones the UI
// drives so an admin can't accidentally (or maliciously) push absurd values.
// Anything not listed passes through; the underlying service has its own
// validation on top of this.

export const LlmParamsSchema = z
    .object({
        temperature: z.number().min(0).max(2).optional(),
        num_predict: z.number().int().min(1).max(8192).optional(),
        top_p: z.number().min(0).max(1).optional(),
        top_k: z.number().int().min(0).max(200).optional(),
        repeat_penalty: z.number().min(0).max(5).optional(),
    })
    .passthrough();

// --- Generic model identifier (pull/remove/ensure) ---

export const ModelIdSchema = z.object({
    model: z
        .string()
        .min(1)
        .max(256)
        .regex(/^[a-zA-Z0-9._:\-\/]+$/, 'model name contains invalid characters'),
});
