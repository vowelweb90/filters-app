import mongoose from "mongoose";
import { METAFIELDS } from "app/utils/constants";
import fs from "fs";
import { AppError } from "app/utils/AppError";
import {
  TProduct,
  AdminClient,
  ValueCollectionContext,
  BatchContext,
  ProductsGQL,
  ImportProductGQL,
} from "../types";

const MAX_REQUESTS_LIMIT = 200;
const MAX_ERROR_LIMIT = 50;
const PRODUCTS_PER_REQUEST = 250;
const API_VERSION = "2025-01";
const START_CURSOR = null;
const SHOP = process.env.SHOP;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const productsQuery = `
query getProducts($limit: Int, $cursor: String) {
  products(first: $limit, after: $cursor) {
    nodes {
      id
      metafields(first: 250, namespace: "custom") {
        nodes {
          key
          id
          namespace
          jsonValue
        }
      }
      title
      description
      handle
      createdAt
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      collections(first: 250) {
        nodes {
          id
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}`;

const productSchema = new mongoose.Schema(
  {
    gid: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    handle: { type: String, required: true },
    shopifyCreatedAt: { type: Date },
    priceAmount: { type: Number, required: true },
    priceCurrency: { type: String },
    collections: [{ type: String }],

    // Metafields
    style: {
      type: String,
      enum: [
        "ETERNITY",
        "HALO",
        "ROUND",
        "SIDE STONES",
        "SOLITARE",
        "STUDS", // from errors
        "HEART",
        "OVAL",
        "CUSHION BRILLIANT",
        "EMERALD",
        "SOLITAIRE",
        "PRINCESS",
        "PEAR",
        "MARQUISE",
        "RADIANT",
        "TOI ET MOI",
        "MULTI-STONE",
        "THREE STONE",
        "ASSCHER",
        "CUSHION MODIFIED",
        "FULL ETERNITY",
        "BANGLE",
      ],
    },
    shape: {
      type: String,
      enum: [
        "RADIANT",
        "CUSHION",
        "ASSCHER",
        "EMERALD",
        "HEART",
        "MARQUISE",
        "OVAL",
        "PEAR",
        "PRINCESS",
        "ROUND",
        "CUSHION BRILLIANT",
        "CUSHION MODIFIED",
      ],
    },
    cut: {
      type: String,
      enum: [
        "EX",
        "GD",
        "ID",
        "VG",
        "F", // from errors
        "ID",
      ],
    },
    carat: { type: Number },
    carat_size: { type: [Number] },
    clarity: {
      type: String,
      enum: ["IF", "FL", "VS1", "VS2", "VS+", "VVS1", "VVS2"],
    },
    diamond_color: {
      type: String,
      enum: [
        "D",
        "E",
        "F",
        "F-G",
        "G",
        "E-F-G", // from errors
      ],
    },
    polish: { type: String, enum: ["EX", "GD", "VG"] },
    symmetry: { type: String, enum: ["EX", "GD", "VG"] },
    certification: { type: String, enum: ["IGI", "GIA"] },
    ring_carat: { type: [Number] },
    depth: { type: Number },
    lw_ratio: { type: Number },
    fluorescence: { type: String },
    table: { type: Number },
  },
  { timestamps: true },
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

function getNow() {
  return `[ ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} ]`;
}

function log(
  ...args: (string | boolean | number | undefined | null | object | Error)[]
) {
  const logInConsole = args[0];
  if (logInConsole !== false) console.log(getNow(), ...args);
  fs.writeFileSync(
    "import.log",
    `${getNow()} ${args.length > 1 ? (logInConsole === false ? args.slice(1).join(" ") : args.join(" ")) : args[0]}\n`,
    { encoding: "utf-8", flag: "a" },
  );
}
function sleep(interval: number) {
  return new Promise((resolve) => setTimeout(resolve, interval));
}

async function connectToDatabase() {
  try {
    await mongoose.connect("mongodb://localhost:27017/bello-diamonds");
    console.log("Database connected");
  } catch (error) {
    console.log("Database Error: ", error);
  }
}

function createAdminClient(
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

async function fetchProducts({
  admin,
  cursor,
  context,
}: {
  admin: AdminClient;
  cursor: null | string;
  context: BatchContext;
}) {
  try {
    const data = await admin.graphql<ProductsGQL<ImportProductGQL>>(
      productsQuery,
      {
        cursor,
        limit: PRODUCTS_PER_REQUEST,
      },
    );

    context.data = data;

    if (context.data?.data?.errors?.length || !context.data?.data?.products)
      throw new Error("GraphQL Error");

    return context.data?.data.products.nodes;
  } catch (error) {
    throw error;
  }
}

function formatProducts(
  unformattedProducts: ImportProductGQL[],
  valueCollectionContext: ValueCollectionContext,
) {
  return unformattedProducts.map((p) => {
    const fp: TProduct = {
      gid: p.id,
      title: p.title || "",
      description: p.description || "",
      handle: p.handle || "",
      shopifyCreatedAt: p.createdAt ? new Date(p.createdAt) : null,
      priceAmount:
        p.priceRangeV2?.minVariantPrice?.amount &&
        !isNaN(Number(p.priceRangeV2?.minVariantPrice?.amount))
          ? Number(p.priceRangeV2?.minVariantPrice?.amount)
          : null,
      priceCurrency: p.priceRangeV2?.minVariantPrice?.currencyCode || null,
      collections: p.collections?.nodes?.map((c) => c.id) || [],
    };

    for (const field of METAFIELDS) {
      const metafield = p.metafields.nodes.find((m) => m.key === field.key);

      if (metafield) {
        try {
          let parsedValue;

          if (metafield.jsonValue) {
            if (
              valueCollectionContext[field.key] &&
              Array.isArray(valueCollectionContext[field.key]) &&
              !valueCollectionContext[field.key]?.includes(metafield.jsonValue)
            ) {
              valueCollectionContext[field.key]?.push(metafield.jsonValue);
            } else {
              valueCollectionContext[field.key] = [metafield.jsonValue];
            }
          }

          if (field.jsonParseble) {
            if (
              typeof metafield.jsonValue === "string" &&
              metafield.jsonValue.trim()
            )
              parsedValue = JSON.parse(metafield.jsonValue.trim());
            else if (typeof metafield.jsonValue === "object")
              parsedValue = metafield.jsonValue;
          } else {
            if (typeof metafield.jsonValue === "string")
              parsedValue = metafield.jsonValue.trim();
            else parsedValue = metafield.jsonValue;
          }

          if (field.type === "number") {
            if (isNaN(Number(parsedValue))) {
              console.log(
                `Invalid Value: ${JSON.stringify(parsedValue)} on product ${p.id}`,
              );
              continue;
            } else parsedValue = Number(parsedValue);
          }

          if (field.type === "number[]") {
            if (Array.isArray(parsedValue) && parsedValue.length) {
              if (isNaN(Number(parsedValue[0]))) {
                console.log(
                  `Invalid Value: ${JSON.stringify(parsedValue)} on product ${p.id}`,
                );
                continue;
              } else parsedValue = parsedValue.map((v) => Number(v));
            } else {
              console.log(
                `Invalid Value: ${JSON.stringify(parsedValue)} on product ${p.id}`,
              );
              continue;
            }
          }

          if (typeof parsedValue === "string")
            parsedValue = parsedValue.trim().toUpperCase();

          if (parsedValue) fp[field.key] = parsedValue;
        } catch (error) {
          fp[field.key] = null;
          throw error;
        }
      }
    }

    return fp;
  });
}

async function importProducts() {
  try {
    let hasNextPage = true;
    let cursor: string | null = START_CURSOR;
    let errors = [];
    let batchRequestCount = 0;
    let encounteredRateLimitError = false;
    const valueCollectionContext: ValueCollectionContext = {};

    await connectToDatabase();

    if(!SHOP || !SHOPIFY_ACCESS_TOKEN ) throw new Error("env variables not found")

    const admin = createAdminClient(SHOP, SHOPIFY_ACCESS_TOKEN, API_VERSION);

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
