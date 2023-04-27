import { ApiManager } from "@heyheyjude/toolkit";

const simple = ApiManager.singleRequest({
  endpoint: "https://jsonplaceholder.typicode.com/todos/1",
  method: "POST",
  fn: () => ({ body: { hello: 1 } }),
});

simple.requestData().then((e) => {
  console.log(e);
});

const validatePhone = ApiManager.singleRequest<any, string>({
  endpoint: `https://altekloads.com/backend/api/v2/auth/drivers/get-sms-code`,
  method: "POST",
  fn: (phone_number) => ({ body: { phone_number } }),
});
validatePhone.requestData("+48666506120").then((e) => {
  console.log(e);
});

export const straightApi = {
  simple,
};
