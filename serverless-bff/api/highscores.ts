import type { VercelRequest, VercelResponse } from '@vercel/node';

const getRequestHandler = (response: VercelResponse) => {
  return response.status(200).send([
    {
      name: 'Foo',
      timeToComplete: 60,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Fook',
      timeToComplete: 320,
      timestamp: Math.ceil(Date.now()/1000 + 3000),
    },
    {
      name: 'Foo',
      timeToComplete: 320,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 320,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 120,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 430,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 350,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 500,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 220,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 360,
      timestamp: Math.ceil(Date.now()/1000),
    },
  ]);
};

const postRequestHandler = (response: VercelResponse) => {
  return response.status(200).send({
    status: 'Not implemented.',
  });
};

const headRequestHandler = (response: VercelResponse) => {
  return response.status(200).send(null);
};

const otherRequestHandeler = (response: VercelResponse) => {
  return response.status(405).send(null);
};

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  switch (request.method) {
  case 'GET':
    return getRequestHandler(response);
  case 'POST':
    return postRequestHandler(response);
  case 'HEAD':
    return headRequestHandler(response);
  default:
    return otherRequestHandeler(response);
  }
}
