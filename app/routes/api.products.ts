import { Product } from "../models/product";
import { LoaderFunctionArgs } from "react-router";
import { json, toGid } from "../services/utils/lib";
import { SortOrder } from "mongoose";
import { authenticate } from "app/shopify.server";

// interface IProduct {
//   id: string;
//   handle: string;
//   title: string;
//   featuredImage: {
//     id: string;
//     altText: string | null;
//     url: string;
//     width: number;
//     height: number;
//   };
//   priceRange: {
//     minVariantPrice: { amount: string; currencyCode: string };
//     maxVariantPrice: { amount: string; currencyCode: string };
//   };
// }

const GET_PRODUCTS_BY_IDS = `
  query GetProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        featuredImage {
          id
          altText
          url
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 1) {
          nodes {
            id
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;
const sanitizeString = (str: string | null | undefined) => {
  if (!str) return undefined;
  const trimmed = str.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const params = url.searchParams;

    const context: any = {};

    context.search = params.get("search")?.trim() || undefined;

    context.collections = params.get("collections")
      ? params
          .get("collections")!
          .split(",")
          .map((id) => toGid("Collection", id))
          .filter(Boolean)
      : undefined;

    context.ids = params.get("ids")
      ? params
          .get("ids")!
          .split(",")
          .map((id) => toGid("Product", id))
          .filter(Boolean)
      : undefined;

    context.style = sanitizeString(params.get("style"));
    context.shape = sanitizeString(params.get("shape"));
    context.cut = sanitizeString(params.get("cut"));

    context.caratMin =
      params.get("carat_min") && !isNaN(Number(params.get("carat_min")))
        ? Number(params.get("carat_min"))
        : undefined;

    context.caratMax =
      params.get("carat_max") && !isNaN(Number(params.get("carat_max")))
        ? Number(params.get("carat_max"))
        : undefined;

    context.priceMin =
      params.get("price_min") && !isNaN(Number(params.get("price_min")))
        ? Number(params.get("price_min"))
        : undefined;

    context.priceMax =
      params.get("price_max") && !isNaN(Number(params.get("price_max")))
        ? Number(params.get("price_max"))
        : undefined;

    context.page =
      params.get("page") &&
      !isNaN(Number(params.get("page"))) &&
      Number(params.get("page")) > 0
        ? Number(params.get("page"))
        : 1;

    context.limit =
      params.get("limit") &&
      !isNaN(Number(params.get("limit"))) &&
      Number(params.get("limit")) > 0 &&
      Number(params.get("limit")) <= 100
        ? Number(params.get("limit"))
        : 20;

    context.sortBy = ["priceAmount", "title", "shopifyCreatedAt"].includes(
      params.get("sort_by") || "",
    )
      ? (params.get("sort_by") as "priceAmount" | "title" | "shopifyCreatedAt")
      : undefined;

    context.sortOrder = params.get("sort_order") === "desc" ? -1 : 1;

    const query: Record<string, any> = {};

    if (context.search) query.$text = { $search: context.search };
    if (context.collections) query.collections = { $in: context.collections };
    if (context.ids) query.gid = { $in: context.ids };
    if (context.style) query.style = context.style;
    if (context.shape) query.shape = context.shape;
    if (context.cut) query.cut = context.cut;

    if (context.caratMin !== undefined || context.caratMax !== undefined) {
      query.carat = {};
      if (context.caratMin !== undefined) query.carat.$gte = context.caratMin;
      if (context.caratMax !== undefined) query.carat.$lte = context.caratMax;
    }

    if (context.priceMin !== undefined || context.priceMax !== undefined) {
      query.priceAmount = {};
      if (context.priceMin !== undefined)
        query.priceAmount.$gte = context.priceMin;
      if (context.priceMax !== undefined)
        query.priceAmount.$lte = context.priceMax;
    }

    const sort: Record<string, SortOrder> = {};
    if (context.sortBy) sort[context.sortBy] = context.sortOrder;

    const skip = (context.page - 1) * context.limit;

    const products = await Product.find(query, { gid: 1, _id: 0 })
      .sort(sort)
      .skip(skip)
      .limit(context.limit);
    const total = await Product.countDocuments(query);

    const response = await admin.graphql(GET_PRODUCTS_BY_IDS, {
      variables: { ids: products.map((p) => p.gid) },
    });

    const data = response.json();
    const shopifyProducts = data.data?.nodes || [];

    return json({
      data: shopifyProducts,
      pagination: {
        page: context.page,
        limit: context.limit,
        total,
        totalPages: Math.ceil(total / context.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
