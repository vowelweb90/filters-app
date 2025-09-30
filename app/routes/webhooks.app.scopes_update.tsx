import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { shopifySession } from "../models/shopifySession";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const current = payload.current as string[];
  if (session) {
    await shopifySession.updateOne(
      { id: session.id },
      { scope: current.toString() },
    );
  }
  return new Response();
};
