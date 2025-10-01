import { importProducts } from "app/services/importProducts";
import { json } from "app/services/utils/lib";
import { authenticate } from "app/shopify.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    await authenticate.admin(request);
    const reqData = await request.json();
    importProducts({
      maxRequestsLimit: reqData.maxRequestsLimit,
      productsPerRequest: reqData.productsPerRequest,
      startCursor: reqData.startCursor,
      shop: reqData.shop,
      accessToken: reqData.accessToken,
    });
    return true;
  } catch (error: any) {
    console.log("error: ", error);
    return json({ error: error.message }, { status: 500 });
  }
};
