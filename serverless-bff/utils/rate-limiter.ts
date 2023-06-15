import {VercelRequest, VercelResponse} from '@vercel/node';
import console from 'console';
import limiter from 'lambda-rate-limiter';
import * as process from 'process';

const TEN_MINUTES = '600000';

const rateLimiter = limiter({
  interval: parseInt(process.env.RATE_LIMIT_INTERVAL || TEN_MINUTES),
  // I'm assuming this means "how many unique IPs we remember for the interval":
  uniqueTokenPerInterval: parseInt(process.env.RATE_LIMIT_INTERVAL || '100'),
});

export const rateLimit = (fn: (request: VercelRequest, response: VercelResponse) => Promise<VercelResponse>) =>
  async (request: VercelRequest, response: VercelResponse): Promise<VercelResponse> => {
    try {
      // Allow 30 requests per ten minutes from a given IP address.
      // Which, if we have 1 OPTIONS request for each CORS request,
      // means we can play 5 games in 10 min. More, if CORS requests are cached.
      await rateLimiter.check(parseInt(process.env.RATE_LIMIT_REQUESTS_PER_INTERVAL || '30'),
        (request.headers['x-real-ip'] as unknown as string) || 'unknown');
    } catch {
      console.info('Rate limiting request.');
      return response.status(429).send(null);
    }

    return await fn(request, response);
  };
