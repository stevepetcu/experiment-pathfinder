import {VercelRequest, VercelResponse} from '@vercel/node';
import * as process from 'process';

export const allowCors = fn => async (request: VercelRequest, response: VercelResponse) => {
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', process.env.CORS_ALLOWED_ORIGINS || '');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, ' +
    'Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  return await fn(request, response);
};
