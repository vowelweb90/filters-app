import { METAFIELDS } from "app/utils/constants";

export type AdminClient = {
  graphql: <T>(q: string, v: object) => Promise<GraphqlResponse<T>>;
};

export type TProduct = {
  gid: string;
  title: string;
  description: string;
  handle: string;
  shopifyCreatedAt: Date | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  collections: string[];
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
    nodes: { id: string }[];
  };
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
  result?: unknown[];
  data?: GraphqlResponse<ProductsGQL<ImportProductGQL>>;
  cursor?: string | null;
  batchRequestCount?: number | null;
  waitMs?: number | null;
};
