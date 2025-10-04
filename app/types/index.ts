import { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { METAFIELDS } from "app/services/utils/constants";

export type AdminClient = {
  graphql: <T>(q: string, v: object) => Promise<GraphqlResponse<T>>;
};

export type ProductOption = { name: string; values: string[] };

export type TProduct = {
  gid: string;
  title: string;
  description: string;
  handle: string;
  shopifyCreatedAt: Date | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  collections: string[];
  collectionHandles: string[];
 
  // product options
  options: ProductOption[];
  optionValues: string[];

  // Metafields
  style?: string | null;
  shape?: string | null;
  cut?: string | null;
  carat?: number | null;
  carat_size?: number[] | null;
  clarity?: string | null;
  diamond_color?: string | null;
  polish?: string | null;
  symmetry?: string | null;
  certification?: string | null;
  ring_carat?: string | null;
  depth?: number | null;
  lw_ratio?: number | null;
  fluorescence?: string | null;
  table?: number | null;

  // sort helpers
  hasStyle?: boolean;
  hasShape?: boolean;
  hasCut?: boolean;
};

export type MetafieldKey = (typeof METAFIELDS)[number]["key"];

export type Metafield = {
  jsonParseble?: boolean;
  type?: string;
  key: MetafieldKey;
};

export type ValueCollectionContext = Partial<Record<MetafieldKey, unknown[]>>;

export type ImportProductGQL = {
  id: string;
  metafields: {
    nodes: {
      key: string;
      id: string;
      namespace: "custom";
      jsonValue: unknown;
    }[];
  };
  title: string;
  description: string;
  handle: string;
  createdAt: string;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  collections: {
    nodes: { id: string; handle: string }[];
  };
  options: ProductOption[];
};

export type ProductsGQL<T> = {
  errors: unknown[];
  products: {
    nodes: T[];
    pageInfo: {
      endCursor: string;
      hasNextPage: boolean;
    };
  };
};

export type GraphqlResponse<T> = {
  data: T;
  errors: unknown[];
  extensions: {
    cost: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
};

export type BatchContext = {
  formattedProducts?: TProduct[];
  success?: boolean;
  result?: unknown;
  data?: GraphqlResponse<ProductsGQL<ImportProductGQL>>;
  cursor?: string | null;
  batchRequestCount?: number | null;
  waitMs?: number | null;
};

export type ProductWebhookPayload = {
  admin_graphql_api_id: string;
  id: number;
  title: string;
  handle: string;
  body_html: string;
  product_type: string;
  vendor: string;
  status: string;
  published_at: string | null;
  template_suffix: string;
  published_scope: string;
  tags: string;
  created_at: string;
  updated_at: string;
  variants: unknown;
  options: unknown;
  images: unknown;
  image: unknown;
  media: unknown;
  variant_gids: unknown;
  has_variants_that_requires_components: boolean;
  category: unknown;
};

export type WebhookContext<T = ProductWebhookPayload> = {
  topic: string;
  admin: AdminApiContext;
  payload: T;
};

export type ProductResponse = {
  id: string;
  handle: string;
  title: string;
  featuredImage: {
    id: string;
    altText: string | null;
    url: string;
    width: number;
    height: number;
  };
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };

  tags: string[];
  productType: string;
  caratMetafield: string;
  shape: string;
  diamondColor: string;
  cut: string;
  clarity: string;
  depth: string;
  polish: string;
  lwRatio: string;
  fluorescence: string;
  report: string;
  table: string;
  symmetry: string;
  showOnCollection: string;
  sizeProductOption: string;
  certification: string;
  style: string;
  sliderEnable: string;
  pinned: string;
  variants: {
    nodes: {
      id: string;
      title: string;
      availableForSale: boolean;
      price: { amount: string; currencyCode: string };
      compareAtPrice?: string | number | null;
      selectedOptions: {
        name: string;
        value: string;
      }[];
      image?: {
        id: string;
        altText?: string | null;
        url: string;
        width: number;
        height: number;
      } | null;
    }[];
  };
};

export type ProductResponseGQL = {
  featuredMedia: {
    id: string;
    preview: {
      image: {
        altText: string;
        url: string;
        width: string;
        height: string;
      };
    };
  };
  id: string;
  handle: string;
  title: string;
  tags: string[];
  productType: string;
  priceRangeV2: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  caratMetafield: string;
  shape: string;
  diamondColor: string;
  cut: string;
  clarity: string;
  depth: string;
  polish: string;
  lwRatio: string;
  fluorescence: string;
  report: string;
  table: string;
  symmetry: string;
  showOnCollection: string;
  sizeProductOption: string;
  certification: string;
  style: string;
  sliderEnable: string;
  pinned: string;
  variants: {
    nodes: {
      id: string;
      title: string;
      availableForSale: boolean;
      price: string | number;
      compareAtPrice?: string | number | null;
      selectedOptions: {
        name: string;
        value: string;
      }[];
      image?: {
        id: string;
        altText?: string | null;
        url: string;
        width: number;
        height: number;
      } | null;
    }[];
  };
};

export type ProductsResponseData = {
  data: {
    nodes: ProductResponse[];
    pageInfo: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};
