export async function handler(event) {
    const date = event.queryStringParameters?.date;
    const apiKey = process.env.NASA_API_KEY;

    if (!date) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Missing required date parameter.'
            })
        };
    }

    if (!apiKey) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Server configuration error: NASA_API_KEY is missing.'
            })
        };
    }

    const nasaUrl = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}`;

    try {
        const response = await fetch(nasaUrl);
        const data = await response.json();

        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Failed to retrieve APOD data from NASA.'
            })
        };
    }
}