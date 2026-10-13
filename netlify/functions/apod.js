const APOD_START_DATE = '1995-06-16';
const NASA_API_URL = 'https://api.nasa.gov/planetary/apod';
const NASA_CONTENT_API_URL = 'https://science.nasa.gov/wp-json/wp/v2';

function jsonResponse(statusCode, body, cacheSeconds = 0) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': cacheSeconds > 0
            ? `public, max-age=${Math.min(cacheSeconds, 3600)}`
            : 'no-store'
    };

    if (cacheSeconds > 0) {
        headers['Netlify-CDN-Cache-Control'] =
            `public, durable, s-maxage=${cacheSeconds}, stale-while-revalidate=604800`;
    }

    return {
        statusCode,
        headers,
        body: JSON.stringify(body)
    };
}

function isValidDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);
    const today = new Date().toISOString().slice(0, 10);

    return !Number.isNaN(parsedDate.getTime())
        && parsedDate.toISOString().slice(0, 10) === date
        && date >= APOD_START_DATE
        && date <= today;
}

function isPlaceholder(data) {
    const title = String(data?.title || '').trim().toLowerCase();
    const imageUrl = String(data?.url || data?.hdurl || '').toLowerCase();

    return title === 'nasa science'
        && imageUrl.includes('/nasa-logo');
}

function isUsableAPOD(data, requestedDate) {
    return Boolean(
        data
        && data.date === requestedDate
        && typeof data.title === 'string'
        && typeof data.explanation === 'string'
        && ['image', 'video', 'other'].includes(data.media_type)
        && typeof data.url === 'string'
        && !isPlaceholder(data)
    );
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' }
    });
    const text = await response.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        // The caller handles a non-JSON upstream response as an unavailable service.
    }

    return { response, data };
}

function decodeHtml(value) {
    const namedEntities = {
        amp: '&',
        apos: "'",
        gt: '>',
        hellip: '…',
        ldquo: '“',
        lsquo: '‘',
        lt: '<',
        mdash: '—',
        nbsp: ' ',
        ndash: '–',
        quot: '"',
        rdquo: '”',
        rsquo: '’'
    };

    return String(value || '').replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (entity, code) => {
            if (code[0] !== '#') {
                return namedEntities[code.toLowerCase()] ?? entity;
            }

            const isHex = code[1].toLowerCase() === 'x';
            const number = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
            return Number.isInteger(number) && number >= 0 && number <= 0x10FFFF
                ? String.fromCodePoint(number)
                : entity;
        }
    );
}

function htmlToText(value) {
    return decodeHtml(
        String(value || '')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
    ).replace(/\s+/g, ' ').trim();
}

function extractExplanation(html) {
    const match = String(html || '').match(
        /<strong>\s*Explanation:\s*<\/strong>([\s\S]*?)<\/p>/i
    );

    return match ? htmlToText(match[1]) : '';
}

function cleanTitle(renderedTitle) {
    return htmlToText(renderedTitle).replace(
        /^APOD:\s+\d{4}\s+[A-Za-z]+\s+\d{1,2}\s+[–—-]\s+/,
        ''
    );
}

function nextDate(date) {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
}

async function fetchFromNasaArchive(date) {
    const postsUrl = new URL(`${NASA_CONTENT_API_URL}/image-article`);
    postsUrl.searchParams.set('after', `${date}T00:00:00Z`);
    postsUrl.searchParams.set('before', `${nextDate(date)}T00:00:00Z`);
    postsUrl.searchParams.set('per_page', '5');
    postsUrl.searchParams.set(
        '_fields',
        'date,title,content,featured_media,link'
    );

    const { response: postsResponse, data: posts } = await fetchJson(postsUrl);
    if (!postsResponse.ok || !Array.isArray(posts)) {
        throw new Error(`NASA content API returned ${postsResponse.status}.`);
    }

    const post = posts.find((item) =>
        item?.date?.startsWith(date)
        && /^APOD:/i.test(htmlToText(item?.title?.rendered))
    );

    if (!post?.featured_media) {
        throw new Error('NASA content API did not contain the requested APOD.');
    }

    const mediaUrl = new URL(`${NASA_CONTENT_API_URL}/media/${post.featured_media}`);
    mediaUrl.searchParams.set('_fields', 'source_url,media_type,mime_type,caption');

    const { response: mediaResponse, data: media } = await fetchJson(mediaUrl);
    if (!mediaResponse.ok || media?.media_type !== 'image' || !media?.source_url) {
        throw new Error(`NASA media API returned ${mediaResponse.status}.`);
    }

    const title = cleanTitle(post.title.rendered);
    const explanation = extractExplanation(post.content?.rendered)
        || extractExplanation(media.caption?.rendered);
    const sourceUrl = new URL(media.source_url);

    if (!title || !explanation || sourceUrl.protocol !== 'https:') {
        throw new Error('NASA content API returned an incomplete APOD.');
    }

    return {
        date,
        explanation,
        hdurl: sourceUrl.href,
        media_type: 'image',
        service_version: 'v1',
        title,
        url: sourceUrl.href
    };
}

export async function handler(event) {
    const date = event.queryStringParameters?.date;
    const apiKey = process.env.NASA_API_KEY;

    if (!date) {
        return jsonResponse(400, { error: 'Missing required date parameter.' });
    }

    if (!isValidDate(date)) {
        return jsonResponse(400, {
            error: `Choose a real date from ${APOD_START_DATE} through today.`
        });
    }

    if (!apiKey) {
        return jsonResponse(500, {
            error: 'Server configuration error: NASA_API_KEY is missing.'
        });
    }

    const nasaUrl = new URL(NASA_API_URL);
    nasaUrl.searchParams.set('api_key', apiKey);
    nasaUrl.searchParams.set('date', date);
    nasaUrl.searchParams.set('thumbs', 'true');

    try {
        const { response, data } = await fetchJson(nasaUrl);

        if (response.ok && isUsableAPOD(data, date)) {
            const cacheSeconds = date === new Date().toISOString().slice(0, 10)
                ? 900
                : 86400;
            return jsonResponse(200, data, cacheSeconds);
        }

        if (response.status === 401 || response.status === 403) {
            console.error(`NASA APOD rejected the configured API key (${response.status}).`);
            return jsonResponse(502, {
                error: 'NASA rejected the server API key. Check NASA_API_KEY in Netlify.'
            });
        }

        console.warn(
            `NASA APOD API returned unusable data for ${date}; trying NASA's content archive.`
        );

        const archiveData = await fetchFromNasaArchive(date);
        return jsonResponse(200, archiveData, 86400);
    } catch (error) {
        console.error('Unable to retrieve APOD data:', error);
        return jsonResponse(502, {
            error: 'NASA data is temporarily unavailable. Please try again shortly.'
        });
    }
}

export const testable = {
    cleanTitle,
    extractExplanation,
    isPlaceholder,
    isUsableAPOD,
    isValidDate
};
