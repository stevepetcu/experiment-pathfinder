import {PrismaClient } from '@prisma/client';
import {PrismaClientKnownRequestError} from '@prisma/client/runtime/library';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import console from 'console';
import {z} from 'zod';

const PRISMA_NOT_FOUND_ERROR_CODE = 'P2025';

const prisma = new PrismaClient;

const getRequestHandler = async (request: VercelRequest, response: VercelResponse) => {
  const { id } = request.query;
  const schema = z.string().uuid();

  const validationResult = schema.safeParse(id);

  if (!validationResult.success) {
    console.info(validationResult.error.format());
    return response.status(404).send({
      errors: {
        error: 'The requested resource does not exist.',
      },
    });
  }

  let responseBody;
  let responseStatusCode = 200;

  try {
    responseBody = await prisma.highScore.findUniqueOrThrow({
      where: {
        id: schema.parse(id),
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === PRISMA_NOT_FOUND_ERROR_CODE) {
      console.info(error);
      responseBody = {
        errors: {
          error: 'The requested resource does not exist.',
        },
      };
      responseStatusCode = 404;
    } else {
      console.error(error);
      responseBody = {
        error: 'Whoops, we messed up. Please try again later.',
      };
      responseStatusCode = 500;
    }
  } finally {
    await prisma.$disconnect();
  }

  return response.status(responseStatusCode).send(responseBody);
};

const patchRequestHandler = async (request: VercelRequest, response: VercelResponse) => {
  const { id } = request.query;
  const schema = z.string().uuid();

  const validationResult = schema.safeParse(id);

  if (!validationResult.success) {
    console.info(validationResult.error.format());
    return response.status(404).send({
      errors: {
        error: 'The requested resource does not exist.',
      },
    });
  }

  const UpdateHighScoreRequest = z.object({
    name: z.string().min(2).max(20),
  });
  const parsedHsReq = UpdateHighScoreRequest.safeParse(request.body);

  if (!parsedHsReq.success) {
    const errors = parsedHsReq.error.format();
    console.info(errors);
    const name = errors.name ?
      {
        name: errors.name._errors,
      } : {};

    return response.status(400).send({...name});
  }


  let responseBody;
  let responseStatusCode = 200;

  try {
    responseBody = await prisma.highScore.update({
      where: {
        id: schema.parse(id),
      },
      data: UpdateHighScoreRequest.parse(request.body),
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === PRISMA_NOT_FOUND_ERROR_CODE) {
      console.info(error);
      responseBody = {
        errors: {
          error: 'The requested resource does not exist.',
        },
      };
      responseStatusCode = 404;
    } else {
      console.error(error);
      responseBody = {
        error: 'Whoops, we messed up. Please try again later.',
      };
      responseStatusCode = 500;
    }
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
    .appendHeader('Allow', 'HEAD,GET,PATCH')
    .send(null);
};

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  switch (request.method) {
  case 'HEAD':
    return headRequestHandler(response);
  case 'GET':
    return getRequestHandler(request, response);
  case 'PATCH':
    return patchRequestHandler(request, response);
  default:
    return otherRequestHandler(response);
  }
}
