import assert from 'node:assert/strict';
import test from 'node:test';

import { handler, testable } from '../netlify/functions/apod.js';

const placeholder = {
    date: '2024-04-08',
    explanation: 'Discover the cosmos!',
    hdurl: 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png',
    media_type: 'image',
    service_version: 'v1',
    title: 'NASA Science',
    url: 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png'
};

function mockResponse(data, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async text() {
            return JSON.stringify(data);
        }
    };
}

test('date validation rejects malformed and impossible dates', () => {
    assert.equal(testable.isValidDate('2024-04-08'), true);
    assert.equal(testable.isValidDate('2024-02-31'), false);
    assert.equal(testable.isValidDate('not-a-date'), false);
    assert.equal(testable.isValidDate('1995-06-15'), false);
});

test('known NASA placeholder is never treated as a real APOD', () => {
    assert.equal(testable.isPlaceholder(placeholder), true);
    assert.equal(testable.isUsableAPOD(placeholder, placeholder.date), false);
});

test('placeholder response falls back to the matching NASA archive entry', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.NASA_API_KEY;

    process.env.NASA_API_KEY = 'test-key';
    globalThis.fetch = async (url) => {
        const value = String(url);

        if (value.startsWith('https://api.nasa.gov/')) {
            return mockResponse(placeholder);
        }

        if (value.includes('/image-article?')) {
            return mockResponse([{
                date: '2024-04-08T00:00:00',
                title: {
                    rendered: 'APOD: 2024 April 8 &#8211; The Changing Ion Tail of Comet Pons Brooks'
                },
                content: {
                    rendered: '<p><strong>Explanation:</strong> A changing comet tail.</p>'
                },
                featured_media: 123,
                link: 'https://science.nasa.gov/example/'
            }]);
        }

        if (value.includes('/media/123?')) {
            return mockResponse({
                media_type: 'image',
                mime_type: 'image/jpeg',
                source_url: 'https://assets.science.nasa.gov/comet.jpg',
                caption: { rendered: '' }
            });
        }

        throw new Error(`Unexpected URL: ${value}`);
    };

    try {
        const response = await handler({
            queryStringParameters: { date: '2024-04-08' }
        });
        const body = JSON.parse(response.body);

        assert.equal(response.statusCode, 200);
        assert.equal(body.date, '2024-04-08');
        assert.equal(body.title, 'The Changing Ion Tail of Comet Pons Brooks');
        assert.equal(body.url, 'https://assets.science.nasa.gov/comet.jpg');
        assert.equal(body.explanation, 'A changing comet tail.');
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) {
            delete process.env.NASA_API_KEY;
        } else {
            process.env.NASA_API_KEY = originalKey;
        }
    }
});

test('missing API key is reported instead of silently bypassed', async () => {
    const originalKey = process.env.NASA_API_KEY;
    delete process.env.NASA_API_KEY;

    try {
        const response = await handler({
            queryStringParameters: { date: '2024-04-08' }
        });

        assert.equal(response.statusCode, 500);
        assert.match(JSON.parse(response.body).error, /NASA_API_KEY/);
    } finally {
        if (originalKey !== undefined) {
            process.env.NASA_API_KEY = originalKey;
        }
    }
});
