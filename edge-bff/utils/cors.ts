import {defaultResponseOptions, ResponseOptions} from './response-options';

export const allowCors = (fn: (request: Request, event: never, responseOpts: ResponseOptions) => Promise<Response>) =>
  async (request: Request, event: never, responseOpts: ResponseOptions): Promise<Response> => {
    const resOpts = responseOpts || defaultResponseOptions();

    resOpts.headers.set('Access-Control-Allow-Credentials', 'true');
    resOpts.headers.set('Access-Control-Allow-Origin', process.env.CORS_ALLOWED_ORIGINS || '');
    resOpts.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST');
    resOpts.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, ' +
      'Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
    );

    if (request.method === 'OPTIONS') {
      return new Response(null, resOpts.getOptions());
    }

    return await fn(request, event,resOpts);
  };
