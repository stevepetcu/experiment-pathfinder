import limiter from 'lambda-rate-limiter';

import { ResponseOptions} from './response-options';

const TEN_MINUTES = 600000;

const rateLimiter = limiter({
  interval: TEN_MINUTES,
  // I'm assuming this means "how many unique IPs we remember for the interval":
  uniqueTokenPerInterval: 100,
});

export const rateLimit = (fn: (request: Request, event: never, responseOpts: ResponseOptions) => Promise<Response>) =>
  async (request: Request, event: never, responseOpts: ResponseOptions): Promise<Response> => {
    try {
      // Allow 30 requests per ten minutes from a given IP address.
      // Which, if we have 1 OPTIONS request for each CORS request,
      // means we can play 5 games in 10 min. More, if CORS requests are cached.
      // await rateLimiter.check(parseInt(process.env.RATE_LIMIT_REQUESTS_PER_INTERVAL || '30'),
      await rateLimiter.check(30,
        (request.headers.get('x-real-ip') as unknown as string) || 'unknown');
    } catch {
      console.info('Rate limiting request.');
      return new Response(null, responseOpts.setStatus(429).getOptions());
    }

    return await fn(request, event, responseOpts);
  };
