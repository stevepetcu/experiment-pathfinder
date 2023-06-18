export const searchParams = (request: Request): URLSearchParams => {
  return new URL(request.url).searchParams;
};
