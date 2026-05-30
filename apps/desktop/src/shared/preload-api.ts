export interface ZabtemPreloadApi {
  app: {
    getVersion(): Promise<string>;
  };
}

declare global {
  interface Window {
    zabtem: ZabtemPreloadApi;
  }
}
