import {connect} from '@planetscale/database';
import {asc, desc, eq} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/planetscale-serverless';
import {z} from 'zod';

import {highscores} from '../../database/highscores';
import {allowCors} from '../../utils/cors';
import {fixEdgeUuidFormat} from '../../utils/fix-edge-uuid-format';
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

const SMALLINT_MAX_VALUE = 32767;
const DEFAULT_LIST_LIMIT = 10;
const DEFAULT_OFFSET_START = 0;

const getRequestHandler = async (request: Request, responseOpts: ResponseOptions): Promise<Response> => {
  const GetHighScoreListRequest = z.object({
    limit: z.coerce.number().min(1).max(20).optional(),
    offset: z.coerce.number().min(0).optional(),
  });

  const query = searchParams(request);
  const queryParams = {
    limit: query.get('limit') !== null ? query.get('limit') : undefined,
    offset: query.get('offset') !== null ? query.get('offset') : undefined,
  };

  const validationResult = GetHighScoreListRequest.safeParse(queryParams);

  if (!validationResult.success) {
    const errors = validationResult.error.format();
    console.info(errors);
    const limit = errors.limit ?
      {
        limit: ['Parameter must be exactly one integer that is > 0 and < 20.'],
      } : {};
    const offset = errors.offset ?
      {
        offset: ['Parameter must be exactly one integer that is > 0.'],
      } : {};

    return new Response(
      JSON.stringify({
        errors: {...limit, ...offset},
      }),
      responseOpts
        .setStatus(400)
        .getOptions(),
    );
  }

  let responseBody;

  try {
    const options = GetHighScoreListRequest.parse(queryParams);
    responseBody = (
      await db
        .select()
        .from(highscores)
        .orderBy(
          asc(highscores.timeToComplete),
          desc(highscores.createdAt),
        )
        .offset(options.offset || DEFAULT_OFFSET_START)
        .limit(options.limit || DEFAULT_LIST_LIMIT)
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
    responseOpts.setStatus(500);
  }

  return new Response(JSON.stringify(responseBody), responseOpts.getOptions());
};

const postRequestHandler = async (request: Request, responseOpts: ResponseOptions): Promise<Response> => {
  const CreateHighScoreRequest = z.object({
    name: z.string().min(2).max(20),
    timeToComplete: z.number().min(1).max(SMALLINT_MAX_VALUE),
  });
  const jsonReqBody = await request.json();
  const parsedHsReq = CreateHighScoreRequest.safeParse(jsonReqBody);

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
      } : {};

    return new Response(
      JSON.stringify({
        errors: {...name, ...timeToComplete},
      }),
      responseOpts
        .setStatus(400)
        .getOptions(),
    );
  }

  let responseBody;

  const date = new Date();
  const recordId = fixEdgeUuidFormat(crypto.randomUUID());
  const record = {
    ...CreateHighScoreRequest.parse(jsonReqBody),
    id: recordId,
    publicId: fixEdgeUuidFormat(crypto.randomUUID()),
    createdAt: date,
    updatedAt: date,
  };

  try {
    await db
      .insert(highscores)
      .values(record);
    responseBody = (await db
      .select()
      .from(highscores)
      .where(eq(highscores.id, recordId)))[0];
  } catch (error) {
    console.error(error);
    responseBody = {
      errors: {
        error: 'Whoops, we messed up. Please try again later.',
      },
    };
    responseOpts.setStatus(200);
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
    return await getRequestHandler(request, resOpts);
  case 'POST':
    return postRequestHandler(request, resOpts);
  default:
    return otherRequestHandler(resOpts);
  }
};

export default allowCors(handler);
