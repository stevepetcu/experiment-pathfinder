import {connect} from '@planetscale/database';
import {eq} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/planetscale-serverless';
import {z} from 'zod';

import {highscores} from '../../database/highscores';
import {allowCors} from '../../utils/cors';
import {rateLimit} from '../../utils/rate-limit';
import {defaultResponseOptions, ResponseOptions} from '../../utils/response-options';
import {searchParams} from '../../utils/search-params';

export const config = {
  runtime: 'edge',
  regions: ['lhr1'], // Only execute this function in the eu-west-2	London, United Kingdom region.
};

const connection = connect({
  host: process.env.PLANETSCALE_DB_HOST,
  username: process.env.PLANETSCALE_DB_USERNAME,
  password: process.env.PLANETSCALE_DB_PASSWORD,
});
const db = drizzle(connection);

const getRequestHandler = async (request: Request, responseOpts: ResponseOptions): Promise<Response> => {
  const query = searchParams(request);
  const id = query.get('id') !== null ? query.get('id') : undefined;

  const schema = z.string().uuid();
  const validationResult = schema.safeParse(id);

  if (!validationResult.success) {
    console.info(validationResult.error.format());
    return new Response(
      JSON.stringify({
        errors: {
          error: 'The requested resource does not exist.',
        },
      }),
      responseOpts
        .setStatus(404)
        .getOptions(),
    );
  }

  let responseBody;

  try {
    const dbResponse = await db
      .select()
      .from(highscores)
      .where(eq(highscores.id, schema.parse(id)));

    if (dbResponse.length !== 1) {
      responseBody = {
        errors: {
          error: 'The requested resource does not exist.',
        },
      };
      responseOpts.setStatus(404);
    } else {
      responseBody = dbResponse[0];
    }
  } catch (error) {
    console.error(error);
    responseBody = {
      errors: {
        error: 'Whoops, we messed up. Please try again later.',
      },
    };
    responseOpts.setStatus(500);
  }

  return new Response(JSON.stringify(responseBody), responseOpts.getOptions());
};

const patchRequestHandler = async (request: Request, responseOpts: ResponseOptions): Promise<Response> => {
  const query = searchParams(request);
  const id = query.get('id') !== null ? query.get('id') : undefined;

  const schema = z.string().uuid();
  const validationResult = schema.safeParse(id);

  if (!validationResult.success) {
    console.info(validationResult.error.format());
    return new Response(
      JSON.stringify({
        errors: {
          error: 'The requested resource does not exist.',
        },
      }),
      responseOpts
        .setStatus(404)
        .getOptions(),
    );
  }

  const UpdateHighScoreRequest = z.object({
    name: z.string().min(2).max(20),
  });
  const jsonReqBody = await request.json();
  const parsedHsReq = UpdateHighScoreRequest.safeParse(jsonReqBody);

  if (!parsedHsReq.success) {
    const errors = parsedHsReq.error.format();
    console.info(errors);
    const name = errors.name ?
      {
        name: errors.name._errors,
      } : {};

    return new Response(
      JSON.stringify({
        errors: {...name},
      }),
      responseOpts
        .setStatus(400)
        .getOptions(),
    );
  }

  let responseBody;
  const record = {
    ...UpdateHighScoreRequest.parse(jsonReqBody),
    updatedAt: new Date(),
  };

  try {
    const dbResponse = await db
      .update(highscores)
      .set(record)
      .where(eq(highscores.id, schema.parse(id)));

    if (dbResponse.rowsAffected !== 1) {
      return new Response(
        JSON.stringify({
          errors: {
            error: 'The requested resource does not exist.',
          },
        }),
        {
          status: 404,
          headers: {'Content-Type': 'application/json'},
        },
      );
    }

    responseBody = (await db
      .select()
      .from(highscores)
      .where(eq(highscores.id, schema.parse(id))))[0];
  } catch (error) {
    console.error(error);
    responseBody = {
      error: 'Whoops, we messed up. Please try again later.',
    };
    responseOpts.setStatus(500);
  }

  return new Response(JSON.stringify(responseBody), responseOpts.getOptions());
};

const headRequestHandler = (responseOpts: ResponseOptions): Response => {
  return new Response(null, responseOpts.getOptions());
};

const otherRequestHandler = (responseOpts: ResponseOptions): Response => {
  responseOpts
    .setStatus(405)
    .headers
    .set('Content-Type', 'application/json')
    .set('Allow', 'HEAD,GET,POST');
  return new Response(null, responseOpts.getOptions());
};

const handler = async (request: Request, event: never, responseOpts: ResponseOptions):
  Promise<Response> => {
  const resOpts = responseOpts || defaultResponseOptions();

  switch (request.method) {
  case 'HEAD':
    return headRequestHandler(resOpts);
  case 'GET':
    return getRequestHandler(request, resOpts);
  case 'PATCH':
    return patchRequestHandler(request, resOpts);
  default:
    return otherRequestHandler(resOpts);
  }
};

export default rateLimit(allowCors(handler));
