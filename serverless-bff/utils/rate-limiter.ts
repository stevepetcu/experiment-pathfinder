import {VercelRequest, VercelResponse} from '@vercel/node';
import console from 'console';
import limiter from 'lambda-rate-limiter';

const TEN_MINUTES = 600000;

const rateLimiter = limiter({
  interval: TEN_MINUTES,
  uniqueTokenPerInterval: 100, // I'm assuming this means "how many unique IPs we remember for the interval".
});

export const rateLimit = (fn: (request: VercelRequest, response: VercelResponse) => Promise<VercelResponse>) =>
  async (request: VercelRequest, response: VercelResponse): Promise<VercelResponse> => {
    try {
      // Allow 30 requests per ten minutes from the same IP address.
      // Which, if we have 1 OPTIONS request for each CORS request, should mean we can play 5 games in 10 min.
      await rateLimiter.check(30, (request.headers['x-real-ip'] as unknown as string) || 'unknown');
    } catch {
      console.info('Rate limiting request.');
      return response.status(429).send(null);
    }

    return await fn(request, response);
  };
