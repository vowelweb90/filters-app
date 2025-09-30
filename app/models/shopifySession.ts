import mongoose from "mongoose";
const sessionSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    id: String,
    shop: String,
    state: String,
    isOnline: Boolean,
    scope: String,
    accessToken: String,
  },
  { strict: false },
);

export const shopifySession =
  mongoose.models.shopify_sessions ||
  mongoose.model("shopify_sessions", sessionSchema);
