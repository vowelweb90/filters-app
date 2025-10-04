import { getProductsQuery } from "app/queries/graphql/getProductsQuery";
import {
  AdminClient,
  BatchContext,
  ImportProductGQL,
  ProductsGQL,
} from "app/types";

export async function fetchProducts({
  admin,
  cursor,
  context,
  productsPerRequest,
}: {
  admin: AdminClient;
  cursor: null | string;
  context: BatchContext;
  productsPerRequest: number;
}) {
  try {
    const data = await admin.graphql<ProductsGQL<ImportProductGQL>>(
      getProductsQuery,
      {
        variables: {
          cursor,
          limit: productsPerRequest,
        },
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
