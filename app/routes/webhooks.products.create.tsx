import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getProductQuery } from "app/queries/graphql/getProductQuery";
import { formatProducts } from "app/services/helpers/formatProducts";
import { Product } from "app/models/product";
import { ImportProductGQL, ProductWebhookPayload, WebhookContext } from "app/types";

async function processWebhook(context: WebhookContext) {
  try {
    const productGid = context.payload.admin_graphql_api_id;

    const res = await context.admin.graphql(getProductQuery, {
      variables: { id: productGid },
    });

    const resData = await res.json();

    if (
      resData.data?.errors?.length ||
      resData?.data?.product?.userErrors?.length
    ) {
      console.error(
        "GraphQL errors:",
        JSON.stringify({ resData, context }, null, 2),
      );
      return new Response(null, { status: 400 });
    }

    const shopifyProduct: ImportProductGQL = resData.data?.product;

    if (!shopifyProduct) {
      console.warn(`Product ${productGid} not found in Shopify.`);
      return new Response(null, { status: 404 });
    }

    const [formattedProduct] = formatProducts([shopifyProduct]);

    const existing = await Product.findOne({ gid: formattedProduct.gid });

    if (existing) {
      console.log(`Product ${formattedProduct.gid} already exists in DB.`);
      return new Response(null, { status: 200 });
    }

    await Product.create(formattedProduct);
    console.log(`Product ${formattedProduct.gid} created in DB.`);

    return new Response(null, { status: 201 });
  } catch (error) {
    console.error(
      `${context.topic} | Error processing webhook:`,
      error,
      JSON.stringify(context, null, 2),
    );
    return new Response(null, { status: 500 });
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, payload, admin } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (session) {
    processWebhook({ payload: payload as ProductWebhookPayload, topic, admin });
  }

  return new Response();
};
