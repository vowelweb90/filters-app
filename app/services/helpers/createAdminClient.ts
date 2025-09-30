import { AdminClient } from "app/types";
import { AppError } from "../utils/AppError";

export function createAdminClient(
  shop: string,
  accessToken: string,
  apiVersion: string,
): AdminClient {
  const admin: AdminClient = {
    graphql: async (query: string, variables = {}) => {
      let response, data;
      try {
        response = await fetch(
          `https://${shop}/admin/api/${apiVersion}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({ query, variables }),
          },
        );

        data = await response.json();

        if (!response.ok) {
          const error = new AppError("Shopify GraphQL request failed");
          error.response = response;
          error.data = data;
          throw error;
        }

        return data;
      } catch (error) {
        if (!(error instanceof AppError)) {
          throw error;
        }

        if (!error.response && response) {
          error.response = response;
          error.data = data;
        }
        throw error;
      }
    },
  } as AdminClient;

  return admin;
}
