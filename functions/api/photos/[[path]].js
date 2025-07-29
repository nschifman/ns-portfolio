export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/photos/', '');
  
  if (!path) {
    return new Response('Photo path required', { status: 400 });
  }

  try {
    // Get the image from R2
    const object = await env.R2_BUCKET.get(path);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Return the image with proper headers
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, {
      headers,
      status: 200
    });
  } catch (error) {
    console.error('Error fetching image from R2:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 