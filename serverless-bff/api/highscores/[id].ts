import type { VercelRequest, VercelResponse } from '@vercel/node';

const getRequestHandler = (request: VercelRequest, response: VercelResponse) => {
  const { id } = request.query;

  if (!id || id.length === 0) {
    return response.status(400).send({
      error: 'Invalid id.',
    });
  }

  // TODO: handle 404

  return response.status(200).send({
    status: `Endpoint not implemented; wanted to get ${id}.`,
  });
};

const patchRequestHandler = (request: VercelRequest, response: VercelResponse) => {
  const { id } = request.query;

  if (!id || id.length === 0) {
    return response.status(400).send({
      error: 'Invalid id.',
    });
  }

  // TODO: handle 404

  return response.status(200).send({
    status: `Endpoint not implemented; wanted to patch ${id}.`,
  });
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
