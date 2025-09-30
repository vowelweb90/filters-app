import { Product } from "../models/product";
import { LoaderFunctionArgs } from "react-router";
import { json, toGid } from "../services/utils/lib";
import { SortOrder } from "mongoose";
import { apiVersion } from "app/shopify.server";
import {
  ProductResponse,
  ProductResponseGQL,
  ProductsResponseData,
} from "app/types";
import { createAdminClient } from "app/services/helpers/createAdminClient";
import { getProductsByIdsQuery } from "app/queries/graphql/getProductsByIdsQuery";

const sanitizeString = (str: string | null | undefined) => {
  if (!str) return undefined;
  const trimmed = str.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const admin = createAdminClient({
      shop: process.env.SHOP!,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      apiVersion: apiVersion,
    });
    const url = new URL(request.url);
    const params = url.searchParams;

    const context: Record<string, any> = {};

    context.search = params.get("search")?.trim() || undefined;

    context.collections = params.get("collections")
      ? params
          .get("collections")!
          .split(",")
          .map((id) => toGid("Collection", id))
          .filter(Boolean)
      : undefined;
    context.collectionHandles = params.get("collectionHandles")
      ? params.get("collectionHandles")!.split(",").filter(Boolean)
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
    if (context.collectionHandles)
      query.collectionHandles = { $in: context.collectionHandles };
    if (context.ids) query.gid = { $in: context.ids };

    if (context.style || context.shape || context.cut) {
      if (context.style) query.style = context.style;
      if (context.shape) query.shape = context.shape;
      if (context.cut) query.cut = context.cut;
    } else {
      query.style = context.style || { $exists: true };
      query.shape = context.shape || { $exists: true };
      query.cut = context.cut || { $exists: true };
    }

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

    const sort: Record<string, SortOrder> = { style: 1, cut: 1, shape: 1 };
    if (context.sortBy) sort[context.sortBy] = context.sortOrder;

    const skip = (context.page - 1) * context.limit;

    console.log("query: ", JSON.stringify(query, null, 2));
    console.log("sort: ", JSON.stringify(sort, null, 2));
    console.log("context: ", JSON.stringify(context, null, 2));
    const products = await Product.find(query, { gid: 1, _id: 0 })
      .sort(sort)
      .skip(skip)
      .limit(context.limit);
    const total = await Product.countDocuments(query);

    // const response = await admin.graphql(GET_PRODUCTS_BY_IDS, {
    //   variables: { ids: products.map((p) => p.gid) },
    // });

    // const data = await response.json();

    const data = await admin.graphql<{ nodes: ProductResponseGQL[] }>(
      getProductsByIdsQuery,
      { ids: products.map((p) => p.gid) },
    );

    const shopifyProducts = (data.data?.nodes || [])
      .filter((node) => node)
      .map((node) => {
        const image = node.featuredMedia?.preview?.image;

        return {
          id: node.id,
          handle: node.handle,
          title: node.title,
          tags: node.tags,
          productType: node.productType,
          featuredImage: {
            id: node.featuredMedia?.id || "",
            altText: image?.altText || null,
            url: image?.url || "",
            width: image?.width || 0,
            height: image?.height || 0,
          },
          priceRange: {
            minVariantPrice: node.priceRangeV2.minVariantPrice,
            maxVariantPrice: node.priceRangeV2.maxVariantPrice,
          },
          caratMetafield: node.caratMetafield,
          shape: node.shape,
          diamondColor: node.diamondColor,
          cut: node.cut,
          clarity: node.clarity,
          depth: node.depth,
          polish: node.polish,
          lwRatio: node.lwRatio,
          fluorescence: node.fluorescence,
          report: node.report,
          table: node.table,
          symmetry: node.symmetry,
          showOnCollection: node.showOnCollection,
          sizeProductOption: node.sizeProductOption,
          certification: node.certification,
          style: node.style,
          sliderEnable: node.sliderEnable,
          pinned: node.pinned,
          variants: {
            nodes: node.variants.nodes.map((v) => ({
              ...v,
              price: {
                amount: v.price,
                currencyCode: node.priceRangeV2.minVariantPrice.currencyCode,
              },
            })),
          },
        } as ProductResponse;
      });

      console.log('shopifyProducts: ', shopifyProducts.length);

    const responseData: ProductsResponseData = {
      data: {
        nodes: shopifyProducts,
        pageInfo: {
          page: context.page,
          limit: context.limit,
          total,
          totalPages: Math.ceil(total / context.limit),
          hasNextPage: context.page < Math.ceil(total / context.limit),
          hasPreviousPage: context.page > 1,
        },
      },
    };

    return json(responseData);
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
