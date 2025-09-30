import { AppError } from "app/services/utils/AppError";
import { Product } from "app/models/product";
import { log, sleep } from "app/services/utils/lib";
import { ValueCollectionContext, BatchContext } from "../types";
import { createAdminClient } from "app/services/helpers/createAdminClient";
import { fetchProducts } from "app/services/helpers/fetchProducts";
import { formatProducts } from "app/services/helpers/formatProducts";

const MAX_REQUESTS_LIMIT = 200;
const MAX_ERROR_LIMIT = 50;
const PRODUCTS_PER_REQUEST = 250;
const API_VERSION = "2025-01";
const START_CURSOR = null;
const SHOP = process.env.SHOP;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function importProducts() {
  try {
    let hasNextPage = true;
    let cursor: string | null = START_CURSOR;
    let errors = [];
    let batchRequestCount = 0;
    let encounteredRateLimitError = false;
    const valueCollectionContext: ValueCollectionContext = {};

    if (!SHOP || !SHOPIFY_ACCESS_TOKEN)
      throw new Error("env variables not found");

    const admin = createAdminClient({
      shop: SHOP,
      accessToken: SHOPIFY_ACCESS_TOKEN,
      apiVersion: API_VERSION,
    });

    while (hasNextPage) {
      batchRequestCount++;

      const context: BatchContext = {
        cursor,
        batchRequestCount,
      };

      try {
        log(`Fetching batch ${batchRequestCount}: ${cursor}`);

        const products = await fetchProducts({
          admin,
          cursor,
          context,
          productsPerRequest: PRODUCTS_PER_REQUEST,
        });

        context.formattedProducts = formatProducts(
          products,
          valueCollectionContext,
        );

        context.result = await Product.create(context.formattedProducts);

        context.success = true;
      } catch (error) {
        if (!(error instanceof Error)) return;

        log(
          `Error encountered in batch ${batchRequestCount}: ${error.message}`,
        );

        errors.push({
          context,
          error: error.message,
          errorStack: error.stack,
          ...error,
        });

        if (error.message === "GraphQL Error") {
          continue;
        } else if (
          error instanceof AppError &&
          error.response?.status === 429
        ) {
          log(`429 Rate Limit hit`);
          encounteredRateLimitError = true;
          continue;
        } else if (
          error instanceof AppError &&
          error.response?.status >= 500 &&
          error.response?.status < 600
        ) {
          log(`Server error ${error.response.status}`);
          break;
        }
      } finally {
        cursor = context?.data?.data?.products?.pageInfo?.endCursor || null;
        hasNextPage =
          context.data?.data?.products?.pageInfo?.hasNextPage || false;

        if (
          errors.length &&
          (errors.length >= MAX_ERROR_LIMIT || !hasNextPage)
        ) {
          log(false, `Errors logs ${JSON.stringify(errors, null, 2)}`);
          errors = [];
        }

        log(
          "requestedQueryCost: ",
          context.data?.extensions?.cost?.requestedQueryCost,
          " | ",
          "actualQueryCost: ",
          context.data?.extensions?.cost?.actualQueryCost,
          " | ",
          "currentlyAvailable: ",
          context.data?.extensions?.cost?.throttleStatus?.currentlyAvailable,
        );

        if (
          !encounteredRateLimitError &&
          context.data?.extensions?.cost?.throttleStatus?.currentlyAvailable &&
          context.data?.extensions?.cost?.throttleStatus?.currentlyAvailable <
            context.data?.extensions?.cost?.requestedQueryCost
        ) {
          context.waitMs =
            Math.ceil(
              context.data?.extensions?.cost?.throttleStatus?.maximumAvailable /
                context.data?.extensions?.cost?.throttleStatus?.restoreRate,
            ) * 1000;

          log(
            `Max requests reached by shopify API |`,
            "currentlyAvailable:",
            context.data?.extensions?.cost?.throttleStatus
              ?.currentlyAvailable || null,
            "maximumAvailable:",
            context.data?.extensions?.cost?.throttleStatus?.maximumAvailable ||
              null,
            `\nsleeping for ${context.waitMs / 1000} seconds...`,
          );

          await sleep(context.waitMs);
        }
      }

      if (batchRequestCount === MAX_REQUESTS_LIMIT) {
        log(`Max requests limit reached`);
        break;
      }
    }

    log(
      false,
      "valueCollection.log",
      JSON.stringify(valueCollectionContext, null, 2),
    );

    if (errors.length) {
      log(false, `Errors logs ${JSON.stringify(errors, null, 2)}`);
    }
    console.log("=============== Finished ===============");
    process.exit();
  } catch (error) {
    log("IMPORT_PRODUCTS: ", error as Error);
  }
}

importProducts();
