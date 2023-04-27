import { ApiManager, ServerManager } from "@heyheyjude/toolkit";

const DEFAULT_ROOT = "heyheyjude.io";
const DEV_ROOT = "dev.heyheyjude.io";
export const server = new ServerManager({
  initialRoot: DEFAULT_ROOT,
  apiGenerator: (root) => `https://${root}/api/v1`,
});
export const serverApiManager = new ApiManager({
  server,
});

serverApiManager.debug();

const requestWithDefault = serverApiManager.request({
  endpoint: "hello",
  method: "GET",
});

requestWithDefault()
  .finally(() => {
    console.log(requestWithDefault.url());
    return server.setDomain(DEV_ROOT);
  })
  .finally(() => {
    console.log(requestWithDefault.url());
    requestWithDefault().catch(() => {});
  });

export const serverApi = {
  requestWithDefault,
};
