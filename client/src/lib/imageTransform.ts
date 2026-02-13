/** Image transformation library with adapter-based URL rewriting. */

interface ImageParams {
    w: number;
    h: number;
    fit: string;
    q: number;
    output: string;
}

interface ImageAdapter {
    /** Human-readable name for debugging / logging. */
    name: string;
    /** Return true if this adapter can handle the given source URL. */
    supports(url: string): boolean;
    /** Rewrite the URL so it returns a transformed image with the given params. */
    transform(url: string, params: ImageParams): string;
}

// ---------------------------------------------------------------------------
// Adapters (ordered by priority – first match wins)
// ---------------------------------------------------------------------------

/**
 * wsrv.nl – open-source image proxy that works with any publicly reachable URL.
 * Docs: https://wsrv.nl/docs/
 */
const wsrvAdapter: ImageAdapter = {
    name: "wsrv",
    supports: () => true, // universal fallback
    transform(url, params) {
        const qs = new URLSearchParams({
            url,
            w: String(params.w),
            h: String(params.h),
            fit: params.fit,
            q: String(params.q),
            output: params.output,
        });
        return `https://wsrv.nl/?${qs.toString()}`;
    },
};

/** Registered adapters – checked in order; first `supports()` match is used. */
const adapters: ImageAdapter[] = [
    // Add domain-specific adapters above the universal fallback.
    wsrvAdapter,
];

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

function resolve(url: string, params: ImageParams): string {
    const adapter = adapters.find((a) => a.supports(url));
    if (!adapter) return url; // no adapter matched – return original
    return adapter.transform(url, params);
}

// ---------------------------------------------------------------------------
// Public presets
// ---------------------------------------------------------------------------

const THUMBNAIL_PARAMS: ImageParams = {
    w: 200,
    h: 140,
    fit: "cover",
    q: 60,
    output: "webp",
};

/**
 * Return a thumbnail-sized, optimised version of the given image URL.
 *
 * Internally selects the best available adapter for the URL and applies
 * fixed thumbnail parameters (200×140, cover-fit, q60, webp).
 */
export function thumbnail(url: string): string {
    return resolve(url, THUMBNAIL_PARAMS);
}
