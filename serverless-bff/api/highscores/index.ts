import {PrismaClient} from '@prisma/client';
import type {VercelRequest, VercelResponse} from '@vercel/node';

const prisma = new PrismaClient;

const listHighScores = async (limit?: number) => {
  return await prisma.highScore.findMany({ take: limit });
};

const getRequestHandler = async (request: VercelRequest, response: VercelResponse) => {
  const {limit} = request.query;
  let queryLimit: number | undefined = undefined;
  const clientErrors = [];

  if (limit && typeof limit === 'string') {
    queryLimit = parseInt(limit);
  }

  if (limit && typeof limit !== 'string' || (queryLimit && (isNaN(queryLimit) || queryLimit < 0))) {
    clientErrors.push({
      error: 'The \'limit\' query parameter must be exactly one positive integer.',
    });
  }

  if (clientErrors.length > 0) {
    return response.status(400).send({
      errors: clientErrors,
    });
  }

  let responseBody;
  let responseStatusCode = 200;

  try {
    responseBody = await listHighScores(queryLimit);
  } catch (_error) {
    responseBody = {
      error: 'Whoops, we messed up. Please try again later.',
    };
    responseStatusCode = 500;
  } finally {
    await prisma.$disconnect();
  }

  return response.status(responseStatusCode).send(responseBody);
};

const postRequestHandler = (response: VercelResponse) => {
  return response.status(200).send({
    status: 'Not implemented.',
  });
};

const headRequestHandler = (response: VercelResponse) => {
  return response.status(200).send(null);
};

const otherRequestHandler = (response: VercelResponse) => {
  return response.status(405)
    .appendHeader('Allow', 'HEAD,GET,POST')
    .send(null);
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  switch (request.method) {
  case 'HEAD':
    return headRequestHandler(response);
  case 'GET':
    return await getRequestHandler(request, response);
  case 'POST':
    return postRequestHandler(response);
  default:
    return otherRequestHandler(response);
  }
}
