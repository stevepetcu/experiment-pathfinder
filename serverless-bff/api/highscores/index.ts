import {PrismaClient} from '@prisma/client';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as console from 'console';
import {z} from 'zod';

import {allowCors} from '../../utils/cors';
import {rateLimit} from '../../utils/rate-limiter';

const SMALLINT_MAX_VALUE = 32767;
const DEFAULT_LIST_LIMIT = 10;
const DEFAULT_OFFSET_START = 0;

const prisma = new PrismaClient;

const getRequestHandler = async (request: VercelRequest, response: VercelResponse): Promise<VercelResponse> => {
  const GetHighScoreListRequest = z.object({
    limit: z.coerce.number().min(1).max(20).optional(),
    offset: z.coerce.number().min(0).optional(),
  });
  const validationResult = GetHighScoreListRequest.safeParse(request.query);

  if (!validationResult.success) {
    const errors = validationResult.error.format();
    console.info(errors);
    console.info(request.query);
    const limit = errors.limit ?
      {
        limit: ['Parameter must be exactly one integer that is > 0 and < 20.'],
      } : {};
    const offset = errors.offset ?
      {
        offset: ['Parameter must be exactly one integer that is > 0.'],
      }: {};

    return response.status(400).send({
      errors: {...limit, ...offset},
    });
  }

  let responseBody;
  let responseStatusCode = 200;

  try {
    const options = GetHighScoreListRequest.parse(request.query);
    responseBody = (
      await prisma.highScore.findMany({
        orderBy: [
          {
            timeToComplete: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip: options.offset || DEFAULT_OFFSET_START,
        take: options.limit || DEFAULT_LIST_LIMIT,
      })
    ).map(hs => {
      return {
        publicId: hs.publicId,
        name: hs.name,
        timeToComplete: hs.timeToComplete,
        createdAt: hs.createdAt,
        updatedAt: hs.updatedAt,
      };
    });
  } catch (error) {
    console.error(error);
    responseBody = {
      errors: {
        error: 'Whoops, we messed up. Please try again later.',
      },
    };
    responseStatusCode = 500;
  } finally {
    await prisma.$disconnect();
  }

  return response.status(responseStatusCode).send(responseBody);
};

const postRequestHandler = async (request: VercelRequest, response: VercelResponse): Promise<VercelResponse> => {
  const CreateHighScoreRequest = z.object({
    name: z.string().min(2).max(20),
    timeToComplete: z.number().min(1).max(SMALLINT_MAX_VALUE),
  });
  const requestBody = JSON.parse(request.body);
  const parsedHsReq = CreateHighScoreRequest.safeParse(requestBody);

  if (!parsedHsReq.success) {
    const errors = parsedHsReq.error.format();
    console.info(errors);
    console.info(requestBody);
    const name = errors.name ?
      {
        name: errors.name._errors,
      } : {};
    const timeToComplete = errors.timeToComplete ?
      {
        timeToComplete: errors.timeToComplete._errors,
      }: {};

    return response.status(400).send({
      errors: {...name, ...timeToComplete},
    });
  }

  let responseBody;
  let responseStatusCode = 200;

  try {
    responseBody = await prisma.highScore.create({
      data: CreateHighScoreRequest.parse(requestBody),
    });
  } catch (error) {
    console.error(error);
    responseBody = {
      errors: {
        error: 'Whoops, we messed up. Please try again later.',
      },
    };
    responseStatusCode = 500;
  } finally {
    await prisma.$disconnect();
  }

  return response.status(responseStatusCode).send(responseBody);
};

const headRequestHandler = (response: VercelResponse): VercelResponse => {
  return response.status(200).send(null);
};

const otherRequestHandler = (response: VercelResponse): VercelResponse => {
  return response.status(405)
    .appendHeader('Allow', 'HEAD,GET,POST')
    .send(null);
};

const handler = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  switch (request.method) {
  case 'HEAD':
    return headRequestHandler(response);
  case 'GET':
    return await getRequestHandler(request, response);
  case 'POST':
    return postRequestHandler(request, response);
  default:
    return otherRequestHandler(response);
  }
};

export default rateLimit(allowCors(handler));
