import {PrismaClient} from '@prisma/client';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as console from 'console';
import {z} from 'zod';

const SMALLINT_MAX_VALUE = 32767;

const prisma = new PrismaClient;

const getRequestHandler = async (request: VercelRequest, response: VercelResponse) => {
  const {limit} = request.query;
  const schema = z.coerce.number().min(1).optional();

  const validationResult = schema.safeParse(limit);

  if (!validationResult.success) {
    console.info(validationResult.error.format());
    return response.status(400).send({
      errors: {
        limit: [
          'Parameter must be exactly one integer that is > 0.',
        ],
      },
    });
  }

  let responseBody;
  let responseStatusCode = 200;

  try {
    responseBody = await prisma.highScore.findMany({
      orderBy: [
        {
          timeToComplete: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: schema.parse(limit),
    });
  } catch (error) {
    console.error(error);
    responseBody = {
      error: 'Whoops, we messed up. Please try again later.',
    };
    responseStatusCode = 500;
  } finally {
    await prisma.$disconnect();
  }

  return response.status(responseStatusCode).send(responseBody);
};

const postRequestHandler = async (request: VercelRequest, response: VercelResponse) => {
  const CreateHighScoreRequest = z.object({
    name: z.string().min(2).max(20),
    timeToComplete: z.number().min(1).max(SMALLINT_MAX_VALUE),
  });
  const parsedHsReq = CreateHighScoreRequest.safeParse(request.body);

  if (!parsedHsReq.success) {
    const errors = parsedHsReq.error.format();
    console.info(errors);
    const name = errors.name ?
      {
        name: errors.name._errors,
      } : {};
    const timeToComplete = errors.timeToComplete ?
      {
        timeToComplete: errors.timeToComplete._errors,
      }: {};

    return response.status(400).send({...name, ...timeToComplete});
  }

  let responseBody;
  let responseStatusCode = 200;

  try {
    responseBody = await prisma.highScore.create({
      data: CreateHighScoreRequest.parse(request.body),
    });
  } catch (error) {
    console.error(error);
    responseBody = {
      error: 'Whoops, we messed up. Please try again later.',
    };
    responseStatusCode = 500;
  } finally {
    await prisma.$disconnect();
  }

  return response.status(responseStatusCode).send(responseBody);
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
    return postRequestHandler(request, response);
  default:
    return otherRequestHandler(response);
  }
}
