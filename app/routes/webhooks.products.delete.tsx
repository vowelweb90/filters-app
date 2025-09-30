import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { Product } from "app/models/product";
import { ProductWebhookPayload, WebhookContext } from "app/types";
import { toGid } from "app/services/utils/lib";

async function processWebhook(context: WebhookContext) {
  try {
    const productGid = toGid("Product", context.payload.id.toString());

    const existing = await Product.findOne({ gid: productGid });

    if (!existing) {
      console.warn(`Product ${productGid} not found in DB.`);
      return new Response(null, { status: 404 });
    }

    await Product.deleteOne({ gid: productGid });
    console.log(`Product ${productGid} deleted from DB.`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(
      `${context.topic} | Error processing delete webhook:`,
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
