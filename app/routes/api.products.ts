import { Product } from "../models/product";
import { LoaderFunctionArgs } from "react-router";
import {
  getArrayParams,
  json,
  sanitizeArray,
  toGid,
} from "../services/utils/lib";
import { SortOrder } from "mongoose";
import { apiVersion } from "app/shopify.server";
import {
  ProductResponse,
  ProductResponseGQL,
  ProductsResponseData,
} from "app/types";
import { createAdminClient } from "app/services/helpers/createAdminClient";
import { getProductsByIdsQuery } from "app/queries/graphql/getProductsByIdsQuery";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const admin = createAdminClient({
      shop: process.env.SHOP!,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      apiVersion: apiVersion,
    });
    const url = new URL(request.url);
    const params = url.searchParams;
    const query: Record<string, any> = {};
    const context: Record<string, any> = {};

    // extract all params and collect them in context
    extractAllParams(params, context);

    // build mongodb query based on the search params
    buildQuery(query, context);

    // default sort
    let sort: Record<string, SortOrder> = {
      // these props are just for sorting docs with actual
      // values to the front, so that the docs with null values
      // or docs that dont have the property will be sorted out at last.
      hasStyle: 1, // sorts docs without style to last
      hasCut: 1, // sorts docs without Cut to last
      hasShape: 1, // sort docs without Shape to last

      // This is the actual sort which will be applied after the above sort
      // compound sort
      style: 1,
      cut: 1,
      shape: 1,
    };

    // add the sort from the search params if exists
    if (context.sortBy) {
      // if sort is one of shape, style and cut then overwrite their value
      if (["shape", "style", "cut"].includes(context.sortBy)) {
        sort[context.sortBy] = context.sortOrder;
      }
      // else add the sort_by key with the highest priority in the sort
      else {
        sort = { [context.sortBy]: context.sortOrder, ...sort };
      }
    }

    const skip = (context.page - 1) * context.limit;

    console.log("query: ", JSON.stringify(query, null, 2));
    console.log("sort: ", JSON.stringify(sort, null, 2));
    console.log("context: ", JSON.stringify(context, null, 2));

    const products = await Product.find(query, { gid: 1, _id: 0 })
      .sort(sort)
      .skip(skip)
      .limit(context.limit);

    const total = await Product.countDocuments(query);

    const data = await admin.graphql<{ nodes: ProductResponseGQL[] }>(
      getProductsByIdsQuery,
      { variables: { ids: products.map((p) => p.gid) } },
    );

    const shopifyProducts = (data.data?.nodes || []).map(
      (node) =>
        ({
          id: node.id,
          handle: node.handle,
          title: node.title,
          shape: node.shape,
          diamondColor: node.diamondColor,
          cut: node.cut,
          clarity: node.clarity,
          depth: node.depth,
          polish: node.polish,
          lwRatio: node.lwRatio,
          fluorescence: node.fluorescence,
          table: node.table,
          symmetry: node.symmetry,
          certification: node.certification,
          style: node.style,
          variants: {
            nodes: node.variants.nodes.map((v) => ({
              ...v,
              price: {
                amount: v.price,
                currencyCode: node.priceRangeV2.minVariantPrice.currencyCode,
              },
            })),
          },
        }) as ProductResponse,
    );

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

function extractAllParams(
  params: URLSearchParams,
  context: Record<string, any>,
) {
  try {
    context.search = params.get("q")?.trim() || null;

    context.page =
      params.get("p") &&
      !isNaN(Number(params.get("p"))) &&
      Number(params.get("p")) > 0
        ? Number(params.get("p"))
        : 1;

    context.limit =
      params.get("l") &&
      !isNaN(Number(params.get("l"))) &&
      Number(params.get("l")) > 0
        ? Number(params.get("l"))
        : 20;

    const sortKeys = [
      "priceAmount",
      "style",
      "cut",
      "shape",
      "title",
      "shopifyCreatedAt",
    ] as const;
    context.sortBy =
      params.get("sb")?.trim() &&
      sortKeys.includes(params.get("sb") as (typeof sortKeys)[number])
        ? params.get("sb")
        : null;

    context.sortOrder = params.get("so") === "desc" ? -1 : 1;

    context.collections = sanitizeArray(
      getArrayParams(params, "cids"),
      false,
    ).map((id) => toGid("Collection", id));

    context.collectionHandles = sanitizeArray(
      getArrayParams(params, "chs"),
      false,
    );

    context.ids = sanitizeArray(getArrayParams(params, "ids"), false).map(
      (id) => toGid("Product", id),
    );

    context.depthMin =
      params.get("depth_min") && !isNaN(Number(params.get("depth_min")))
        ? Number(params.get("depth_min"))
        : null;

    context.depthMax =
      params.get("depth_max") && !isNaN(Number(params.get("depth_max")))
        ? Number(params.get("depth_max"))
        : null;

    context.table =
      params.get("table") && !isNaN(Number(params.get("table")))
        ? Number(params.get("table"))
        : null;

    context.lw_ratio =
      params.get("lw_ratio") && !isNaN(Number(params.get("lw_ratio")))
        ? Number(params.get("lw_ratio"))
        : null;

    context.caratMin =
      params.get("carat_min") && !isNaN(Number(params.get("carat_min")))
        ? Number(params.get("carat_min"))
        : null;

    context.caratMax =
      params.get("carat_max") && !isNaN(Number(params.get("carat_max")))
        ? Number(params.get("carat_max"))
        : null;

    context.priceMin =
      params.get("price_min") && !isNaN(Number(params.get("price_min")))
        ? Number(params.get("price_min"))
        : null;

    context.priceMax =
      params.get("price_max") && !isNaN(Number(params.get("price_max")))
        ? Number(params.get("price_max"))
        : null;

    const sanitizedFilters: Record<string, any> = {};
    sanitizedFilters.style = sanitizeArray(getArrayParams(params, "style"));
    sanitizedFilters.shape = sanitizeArray(getArrayParams(params, "shape"));
    sanitizedFilters.cut = sanitizeArray(getArrayParams(params, "cut"));
    sanitizedFilters.diamond_color = sanitizeArray(
      getArrayParams(params, "diamond_color"),
    );
    sanitizedFilters.clarity = sanitizeArray(getArrayParams(params, "clarity"));
    sanitizedFilters.polish = sanitizeArray(getArrayParams(params, "polish"));
    sanitizedFilters.symmetry = sanitizeArray(
      getArrayParams(params, "symmetry"),
    );
    sanitizedFilters.certification = sanitizeArray(
      getArrayParams(params, "certification"),
    );
    sanitizedFilters.fluorescence = sanitizeArray(
      getArrayParams(params, "fluorescence"),
    );
    sanitizedFilters.ring_carat = sanitizeArray(
      getArrayParams(params, "ring_carat"),
    )
      .map((v) => Number(v))
      .filter((v) => !isNaN(v));
    sanitizedFilters.options = sanitizeArray(getArrayParams(params, "options"));

    context.collections = context.collections?.length
      ? context.collections
      : null;
    context.collectionHandles = context.collectionHandles?.length
      ? context.collectionHandles
      : null;
    context.ids = context.ids?.length ? context.ids : null;
    context.ring_carat = sanitizedFilters.ring_carat?.length
      ? sanitizedFilters.ring_carat
      : null;
    context.style = sanitizedFilters.style?.length
      ? sanitizedFilters.style
      : null;
    context.shape = sanitizedFilters.shape?.length
      ? sanitizedFilters.shape
      : null;
    context.cut = sanitizedFilters.cut?.length ? sanitizedFilters.cut : null;
    context.diamond_color = sanitizedFilters.diamond_color?.length
      ? sanitizedFilters.diamond_color
      : null;
    context.clarity = sanitizedFilters.clarity?.length
      ? sanitizedFilters.clarity
      : null;
    context.polish = sanitizedFilters.polish?.length
      ? sanitizedFilters.polish
      : null;
    context.symmetry = sanitizedFilters.symmetry?.length
      ? sanitizedFilters.symmetry
      : null;
    context.certification = sanitizedFilters.certification?.length
      ? sanitizedFilters.certification
      : null;
    context.fluorescence = sanitizedFilters.fluorescence?.length
      ? sanitizedFilters.fluorescence
      : null;
    context.options = sanitizedFilters.options?.length
      ? sanitizedFilters.options
      : null;
  } catch (error) {
    throw error;
  }
}

function buildQuery(query: Record<string, any>, context: Record<string, any>) {
  try {
    if (context.search) query.$text = { $search: context.search };
    if (context.collections) query.collections = { $in: context.collections };
    if (context.collectionHandles)
      query.collectionHandles = { $in: context.collectionHandles };
    if (context.ids) query.gid = { $in: context.ids };

    // if (context.style || context.shape || context.cut) {
    if (context.style) query.style = { $in: context.style };
    if (context.shape) query.shape = { $in: context.shape };
    if (context.cut) query.cut = { $in: context.cut };
    // } else {
    //   query.style = context.style || { $exists: true };
    //   query.shape = context.shape || { $exists: true };
    //   query.cut = context.cut || { $exists: true };
    // }
    if (context.diamond_color?.length)
      query.diamond_color = { $in: context.diamond_color };
    if (context.clarity?.length) query.clarity = { $in: context.clarity };
    if (context.polish?.length) query.polish = { $in: context.polish };
    if (context.symmetry?.length) query.symmetry = { $in: context.symmetry };
    if (context.certification?.length)
      query.certification = { $in: context.certification };
    if (context.ring_carat?.length)
      query.ring_carat = { $in: context.ring_carat };
    if (context.fluorescence?.length)
      query.fluorescence = { $in: context.fluorescence };
    if (context.options?.length) {
      query.optionValues = { $in: context.options };
    }
    if (context.table !== null) query.table = context.table;
    if (context.lw_ratio !== null) query.lw_ratio = context.lw_ratio;

    if (context.caratMin !== null || context.caratMax !== null) {
      query.carat = {};
      if (context.caratMin !== null) query.carat["$gte"] = context.caratMin;
      if (context.caratMax !== null) query.carat["$lte"] = context.caratMax;
    }

    if (context.depthMin !== null || context.depthMax !== null) {
      query.depth = {};
      if (context.depthMin !== null) query.depth["$gte"] = context.depthMin;
      if (context.depthMax !== null) query.depth["$lte"] = context.depthMax;
    }

    if (context.priceMin !== null || context.priceMax !== null) {
      query.priceAmount = {};
      if (context.priceMin !== null)
        query.priceAmount["$gte"] = context.priceMin;
      if (context.priceMax !== null)
        query.priceAmount["$lte"] = context.priceMax;
    }
  } catch (error) {
    throw error;
  }
}
