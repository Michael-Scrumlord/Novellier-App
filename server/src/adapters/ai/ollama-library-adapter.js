import { normalizeModelName } from '../../core/domain/ModelNameUtils.js';

const DEFAULT_LIBRARY_URL = 'https://ollama.com/library';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class OllamaLibraryAdapter {
    constructor({ libraryUrl } = {}) {
        this.libraryUrl = libraryUrl || DEFAULT_LIBRARY_URL;
        this._indexCache = null;
        this._detailCache = new Map();
    }

    async getLibraryIndex() {
        if (this._indexCache && Date.now() - this._indexCache.timestamp < CACHE_TTL_MS) {
            return this._indexCache.value;
        }

        const response = await fetch(this.libraryUrl, {
            headers: { 'User-Agent': 'Novellier-App/1.0' },
        });
        if (!response.ok) {
            throw new Error(`Failed to load Ollama library index (${response.status})`);
        }

        const html = await response.text();
        const cards = parseLibraryCards(html);
        this._indexCache = { timestamp: Date.now(), value: cards };
        return cards;
    }

    async getModelDetail(family) {
        const normalizedFamily = normalizeModelName(family);
        const cached = this._detailCache.get(normalizedFamily);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.value;
        }

        const response = await fetch(
            `${this.libraryUrl}/${encodeURIComponent(normalizedFamily)}`,
            { headers: { 'User-Agent': 'Novellier-App/1.0' } }
        );
        if (!response.ok) {
            throw new Error(`Failed to load Ollama model detail (${response.status})`);
        }

        const html = await response.text();

        const description =
            stripHtml(
                html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || ''
            ) ||
            stripHtml(html.match(/<p class="max-w-3xl[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '') ||
            '';

        const displayName =
            html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*·\s*Ollama.*$/, '')?.trim() ||
            normalizedFamily;

        const variants = parseModelRows(html);
        const value = { family: normalizedFamily, displayName, description, variants };

        this._detailCache.set(normalizedFamily, { timestamp: Date.now(), value });
        return value;
    }
}

function stripHtml(html = '') {
    return String(html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseSizeLabel(sizeLabel) {
    const match = String(sizeLabel || '')
        .trim()
        .match(/^(\d+(?:\.\d+)?)([KMGTP]?)B?$/i);

    if (!match) return null;

    const value = Number.parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const scale = {
        '': 1,
        K: 1 / 1024 / 1024,
        M: 1 / 1024,
        G: 1,
        T: 1024,
        P: 1024 * 1024,
    }[unit];

    if (!Number.isFinite(value) || !scale) return null;
    return value * scale;
}

export function estimateRamGb(sizeLabel) {
    const parameterSize = parseSizeLabel(sizeLabel);
    if (!parameterSize) return null;
    return Number((Math.max(0.5, parameterSize * 0.7)).toFixed(1));
}

function parseContextWindow(contextLabel) {
    const normalized = String(contextLabel || '').trim().toLowerCase();
    if (!normalized) return null;

    const match = normalized.match(/(\d+(?:\.\d+)?)\s*([km])(?:\s*context)?/i);
    if (!match) return null;

    const value = Number.parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value)) return null;

    return unit === 'm' ? `${value}M` : `${value}K`;
}

function parseLibraryCards(html) {
    const cards = [];
    const blocks = String(html || '')
        .split('<li x-test-model')
        .slice(1);

    for (const block of blocks) {
        const hrefMatch = block.match(/<a href="\/library\/([^"]+)"/i);
        const slug = hrefMatch?.[1];
        if (!slug) continue;

        const titleMatch = block.match(/group-hover:underline truncate">([^<]+)<\/span>/i);
        const descriptionMatch = block.match(
            /<p class="max-w-lg break-words text-neutral-800 text-md">([\s\S]*?)<\/p>/i
        );
        const sizeTags = Array.from(
            block.matchAll(/<span x-test-size[^>]*>([^<]+)<\/span>/gi)
        ).map((m) => m[1].trim());
        const pullMatch = block.match(/<span x-test-pull-count>([^<]+)<\/span>/i);

        cards.push({
            family: slug,
            displayName: titleMatch?.[1]?.trim() || slug,
            description: stripHtml(descriptionMatch?.[1] || ''),
            sizeTags,
            pullCount: pullMatch?.[1]?.trim() || null,
        });
    }

    return cards;
}

function parseModelRows(html) {
    const rows = [];
    const rowRegex =
        /<div class="hidden group px-4 py-3 sm:grid sm:grid-cols-12 text-\[13px\]">([\s\S]*?)<\/div>/gi;

    for (const match of html.matchAll(rowRegex)) {
        const rowHtml = match[1];
        const tagMatch = rowHtml.match(/<a href="\/library\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
        if (!tagMatch) continue;

        const cols = [...rowHtml.matchAll(/<p class="col-span-2 text-neutral-500">([^<]*)<\/p>/gi)]
            .map((m) => m[1].trim() || null);
        const [sizeLabel, contextLabel, inputType] = cols;

        rows.push({
            tag: tagMatch[1].trim(),
            label: tagMatch[2].trim(),
            sizeLabel,
            contextWindow: parseContextWindow(contextLabel),
            inputType,
            estimatedRamGb: estimateRamGb(sizeLabel),
        });
    }

    return rows;
}