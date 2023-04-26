import { ApiManager } from "@heyheyjude/toolkit";

const simple = ApiManager.singleRequest({
  endpoint: "https://jsonplaceholder.typicode.com/todos/1",
  method: "GET",
});

simple.requestData().then((e) => {
  console.log(e);
});

export const straightApi = {
  simple,
};
