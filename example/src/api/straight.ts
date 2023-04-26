import { ApiManager } from "@heyheyjude/toolkit";

const rawApiManager = new ApiManager();
const simple = rawApiManager.request({
  endpoint: "Hello",
  method: "GET",
});

export const straightApi = {
  simple,
};
