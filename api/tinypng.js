export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_TINYPNG_API_KEY || process.env.TINYPNG_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'TinyPNG API key not configured' });
  }

  try {
    // Forward the request body to TinyPNG
    const tinypngResponse = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
        'Content-Type': 'application/octet-stream',
      },
      body: request.body,
    });

    if (!tinypngResponse.ok) {
        const errorText = await tinypngResponse.text();
        console.error('TinyPNG API Error:', tinypngResponse.status, errorText);
        return response.status(tinypngResponse.status).json({ error: 'TinyPNG API error', details: errorText });
    }

    const data = await tinypngResponse.json();
    const outputUrl = data.output.url;

    // Download the compressed image from TinyPNG
    const imageResponse = await fetch(outputUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Return the image directly
    response.setHeader('Content-Type', data.output.type);
    response.setHeader('Content-Length', data.output.size);
    return response.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('Server Error:', error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
