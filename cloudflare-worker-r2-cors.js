/**
 * Cloudflare Worker for R2 CORS Support
 * 
 * This worker handles CORS headers for R2 uploads and downloads.
 * 
 * Setup:
 * 1. Create a Cloudflare Worker
 * 2. Bind your R2 buckets to the worker
 * 3. Add route: previews.celite.in/* → Worker
 * 4. Deploy this code
 * 
 * Bindings needed:
 * - R2_PREVIEWS_BUCKET (celite-previews)
 * - R2_SOURCE_BUCKET (celite-source-files) - optional, for downloads
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': getOrigin(request),
          'Access-Control-Allow-Methods': 'GET, HEAD, PUT, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Extract the path from URL (remove domain)
    // URL format: https://previews.celite.in/preview/video/...
    const path = url.pathname.substring(1); // Remove leading /
    
    // Determine which bucket to use based on path
    let bucket;
    if (path.startsWith('preview/')) {
      bucket = env.R2_PREVIEWS_BUCKET;
    } else {
      // Assume source files (private bucket)
      bucket = env.R2_SOURCE_BUCKET;
    }

    if (!bucket) {
      return new Response('Bucket not configured', { status: 500 });
    }

    try {
      // Handle PUT (upload) requests
      if (request.method === 'PUT') {
        const object = await env[bucket].put(path, request.body, {
          httpMetadata: {
            contentType: request.headers.get('Content-Type') || 'application/octet-stream',
          },
        });

        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': getOrigin(request),
            'Access-Control-Allow-Methods': 'GET, HEAD, PUT, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'ETag': object.etag,
          },
        });
      }

      // Handle GET (download) requests
      if (request.method === 'GET' || request.method === 'HEAD') {
        const object = await env[bucket].get(path, {
          range: request.headers.get('Range'),
        });

        if (!object) {
          return new Response('Not found', { 
            status: 404,
            headers: {
              'Access-Control-Allow-Origin': getOrigin(request),
            },
          });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Access-Control-Allow-Origin', getOrigin(request));
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', '*');
        headers.set('Accept-Ranges', 'bytes');

        // Handle range requests for video streaming
        if (object.range) {
          headers.set('Content-Range', `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
          return new Response(object.body, {
            status: 206,
            headers,
          });
        }

        return new Response(object.body, {
          status: 200,
          headers,
        });
      }

      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': getOrigin(request),
        },
      });
    } catch (error) {
      return new Response(error.message, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': getOrigin(request),
        },
      });
    }
  },
};

function getOrigin(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    'https://www.celite.in',
    'https://celite.in',
    'http://localhost:3000',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Default to production domain
  return 'https://www.celite.in';
}

