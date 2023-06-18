export interface ResponseOptions {
  headers: Map<string, string>;
  status: number;
  getOptions: () => {status: number, headers: Headers};
  setStatus: (status: number) => ResponseOptions;
}

export const defaultResponseOptions = (): ResponseOptions => {
  const getOptions = () => {
    const headersAsArray: HeadersInit = [];
    _this.headers.forEach((value, key) => {
      headersAsArray.push([key, value]);
    });

    return {
      status: _this.status,
      headers: new Headers(headersAsArray),
    };
  };

  const setStatus = (status: number) => {
    _this.status = status;

    return _this;
  };

  const _this = {
    headers: (new Map()).set('Content-Type', 'application/json'),
    status: 200,
    getOptions,
    setStatus,
  };

  return _this;
};
