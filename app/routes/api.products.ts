import { Product } from "../models/product";
import { LoaderFunctionArgs } from "react-router";
import {
  getArrayParams,
  json,
  sanitizeArray,
  toGid,
} from "../services/utils/lib";
import { apiVersion } from "app/shopify.server";
import {
  FilterAPIContext,
  ProductResponse,
  ProductResponseGQL,
  ProductsResponseData,
  SearchParams,
  SortOptions,
} from "app/types";
import { createAdminClient } from "app/services/helpers/createAdminClient";
import { getProductsByIdsQuery } from "app/queries/graphql/getProductsByIdsQuery";
import { SortOrder } from "mongoose";

export async function loader({ request }: LoaderFunctionArgs) {
  const context: FilterAPIContext = { sort: {} };
  try {
    const admin = createAdminClient({
      shop: process.env.SHOP!,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      apiVersion: apiVersion,
    });
    const url = new URL(request.url);
    const params = url.searchParams;

    context.originalParams = Object.fromEntries(params);

    // extract all params and collect them in context
    context.searchParams = extractAllParams(params);

    // build mongodb query based on the search params
    context.query = buildQuery(context.searchParams);
    context.sort = buildSort(context.searchParams);

    if (!context.searchParams)
      throw new Error(
        `searchParams is ${JSON.stringify(context.searchParams)}`,
      );

    const skip = (context.searchParams.page - 1) * context.searchParams.limit;

    console.log("context: ", JSON.stringify(context, null, 2));
    context.products = await Product.find(context.query, { gid: 1, _id: 0 })
      .sort(context.sort)
      .skip(skip)
      .limit(context.searchParams.limit);

    console.log("products: ", context.products.length);

    const total = await Product.countDocuments(context.query);

    const data = await admin.graphql<{ nodes: ProductResponseGQL[] }>(
      getProductsByIdsQuery,
      { variables: { ids: context.products.map((p) => p.gid) } },
    );

    context.shopifyProducts = (data.data?.nodes || []).map(
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
        nodes: context.shopifyProducts,
        pageInfo: {
          page: context.searchParams.page,
          limit: context.searchParams.limit,
          total,
          totalPages: Math.ceil(total / context.searchParams.limit),
          hasNextPage:
            context.searchParams.page <
            Math.ceil(total / context.searchParams.limit),
          hasPreviousPage: context.searchParams.page > 1,
        },
      },
    };

    return json(responseData);
  } catch (error) {
    console.error(
      new Date().toLocaleString("en-IN"),
      "Error fetching products:",
      error,
      "\n",
      `Error data: ${JSON.stringify(context, null, 2)}`,
    );
    return json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

function extractAllParams(params: URLSearchParams) {
  try {
    const searchParams: SearchParams = {
      search: "",
      page: 1,
      limit: 20,
    };

    searchParams.search = params.get("q")?.trim() || "";

    searchParams.page =
      params.get("p") &&
      !isNaN(Number(params.get("p"))) &&
      Number(params.get("p")) > 0
        ? Number(params.get("p"))
        : 1;

    searchParams.limit =
      !isNaN(Number(params.get("l"))) && Number(params.get("l")) > 0
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

    if (sortKeys.includes(params.get("sb") as (typeof sortKeys)[number]))
      searchParams.sortBy = params.get("sb") || undefined;

    if (!isNaN(Number(params.get("so"))))
      searchParams.sortOrder = Number(params.get("so")) as SortOrder;

    // if any of the sort field is not available then set the other
    // sort field null to avoid strange behaviour in sorting
    if (!searchParams.sortOrder || !searchParams.sortBy) {
      delete searchParams.sortOrder;
      delete searchParams.sortBy;
    }

    searchParams.collections = sanitizeArray(
      getArrayParams(params, "cids"),
      false,
    ).map((id) => toGid("Collection", id));

    searchParams.collectionHandles = sanitizeArray(
      getArrayParams(params, "chs"),
      false,
    );

    searchParams.ids = sanitizeArray(getArrayParams(params, "ids"), false).map(
      (id) => toGid("Product", id),
    );

    if (params.get("depth_min") && !isNaN(Number(params.get("depth_min"))))
      searchParams.depthMin = Number(params.get("depth_min"));

    if (params.get("depth_max") && !isNaN(Number(params.get("depth_max"))))
      searchParams.depthMax = Number(params.get("depth_max"));

    if (params.get("table") && !isNaN(Number(params.get("table"))))
      searchParams.table = Number(params.get("table"));

    if (params.get("lw_ratio") && !isNaN(Number(params.get("lw_ratio"))))
      searchParams.lw_ratio = Number(params.get("lw_ratio"));

    if (params.get("carat_min") && !isNaN(Number(params.get("carat_min"))))
      searchParams.caratMin = Number(params.get("carat_min"));

    if (params.get("carat_max") && !isNaN(Number(params.get("carat_max"))))
      searchParams.caratMax = Number(params.get("carat_max"));

    if (params.get("price_min") && !isNaN(Number(params.get("price_min"))))
      searchParams.priceMin = Number(params.get("price_min"));

    if (params.get("price_max") && !isNaN(Number(params.get("price_max"))))
      searchParams.priceMax = Number(params.get("price_max"));

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

    searchParams.collections = searchParams.collections?.length
      ? searchParams.collections
      : null;
    searchParams.collectionHandles = searchParams.collectionHandles?.length
      ? searchParams.collectionHandles
      : null;
    searchParams.ids = searchParams.ids?.length ? searchParams.ids : null;
    searchParams.ring_carat = sanitizedFilters.ring_carat?.length
      ? sanitizedFilters.ring_carat
      : null;
    searchParams.style = sanitizedFilters.style?.length
      ? sanitizedFilters.style
      : null;
    searchParams.shape = sanitizedFilters.shape?.length
      ? sanitizedFilters.shape
      : null;
    searchParams.cut = sanitizedFilters.cut?.length
      ? sanitizedFilters.cut
      : null;
    searchParams.diamond_color = sanitizedFilters.diamond_color?.length
      ? sanitizedFilters.diamond_color
      : null;
    searchParams.clarity = sanitizedFilters.clarity?.length
      ? sanitizedFilters.clarity
      : null;
    searchParams.polish = sanitizedFilters.polish?.length
      ? sanitizedFilters.polish
      : null;
    searchParams.symmetry = sanitizedFilters.symmetry?.length
      ? sanitizedFilters.symmetry
      : null;
    searchParams.certification = sanitizedFilters.certification?.length
      ? sanitizedFilters.certification
      : null;
    searchParams.fluorescence = sanitizedFilters.fluorescence?.length
      ? sanitizedFilters.fluorescence
      : null;
    searchParams.options = sanitizedFilters.options?.length
      ? sanitizedFilters.options
      : null;

    return searchParams;
  } catch (error) {
    throw error;
  }
}

function buildQuery(searchParams: Partial<SearchParams>) {
  try {
    const query: Record<string, any> = {};
    if (searchParams.search) query.$text = { $search: searchParams.search };
    if (searchParams.collections)
      query.collections = { $in: searchParams.collections };
    if (searchParams.collectionHandles)
      query.collectionHandles = { $in: searchParams.collectionHandles };
    if (searchParams.ids) query.gid = { $in: searchParams.ids };

    if (searchParams.style) query.style = { $in: searchParams.style };
    if (searchParams.shape) query.shape = { $in: searchParams.shape };
    if (searchParams.cut) query.cut = { $in: searchParams.cut };

    if (searchParams.diamond_color?.length)
      query.diamond_color = { $in: searchParams.diamond_color };
    if (searchParams.clarity?.length)
      query.clarity = { $in: searchParams.clarity };
    if (searchParams.polish?.length)
      query.polish = { $in: searchParams.polish };
    if (searchParams.symmetry?.length)
      query.symmetry = { $in: searchParams.symmetry };
    if (searchParams.certification?.length)
      query.certification = { $in: searchParams.certification };
    if (searchParams.ring_carat?.length)
      query.ring_carat = { $in: searchParams.ring_carat };
    if (searchParams.fluorescence?.length)
      query.fluorescence = { $in: searchParams.fluorescence };
    if (searchParams.options?.length) {
      query.optionValues = { $in: searchParams.options };
    }
    if (searchParams.table) query.table = searchParams.table;
    if (searchParams.lw_ratio) query.lw_ratio = searchParams.lw_ratio;

    if (searchParams.caratMin || searchParams.caratMax) {
      query.carat = {};
      if (searchParams.caratMin) query.carat["$gte"] = searchParams.caratMin;
      if (searchParams.caratMax) query.carat["$lte"] = searchParams.caratMax;
    }

    if (searchParams.depthMin || searchParams.depthMax) {
      query.depth = {};
      if (searchParams.depthMin) query.depth["$gte"] = searchParams.depthMin;
      if (searchParams.depthMax) query.depth["$lte"] = searchParams.depthMax;
    }

    if (searchParams.priceMin || searchParams.priceMax) {
      query.priceAmount = {};
      if (searchParams.priceMin)
        query.priceAmount["$gte"] = searchParams.priceMin;
      if (searchParams.priceMax)
        query.priceAmount["$lte"] = searchParams.priceMax;
    }

    return query;
  } catch (error) {
    throw error;
  }
}

function buildSort(searchParams: SearchParams) {
  try {
    // default sort
    let sort: SortOptions = {
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
    if (searchParams.sortBy && searchParams.sortOrder) {
      // if sort is one of shape, style and cut then overwrite their value
      if (["shape", "style", "cut"].includes(searchParams.sortBy)) {
        sort[searchParams.sortBy as keyof SortOptions] = searchParams.sortOrder;
      }
      // else add the sort_by key with the highest priority in the sort
      else {
        sort = { [searchParams.sortBy]: searchParams.sortOrder, ...sort };
      }
    }
    return sort;
  } catch (error) {
    throw error;
  }
}
