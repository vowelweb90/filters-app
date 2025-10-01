import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    gid: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    handle: { type: String, required: true },
    shopifyCreatedAt: { type: Date },
    priceAmount: { type: Number, required: true },
    priceCurrency: { type: String },
    collections: [{ type: String }],
    collectionHandles: { type: [String] },

    // Metafields
    style: {
      type: String,
      enum: [
        "ETERNITY",
        "HALO",
        "ROUND",
        "SIDE STONES",
        "SOLITARE",
        "STUDS",
        "HEART",
        "OVAL",
        "CUSHION BRILLIANT",
        "EMERALD",
        "SOLITAIRE",
        "PRINCESS",
        "PEAR",
        "MARQUISE",
        "RADIANT",
        "TOI ET MOI",
        "MULTI-STONE",
        "THREE STONE",
        "ASSCHER",
        "CUSHION MODIFIED",
        "FULL ETERNITY",
        "BANGLE",
        "HOOPS",
        "UNIQUE",
        "FIVE STONE",
      ],
    },
    shape: {
      type: String,
      enum: [
        "RADIANT",
        "CUSHION",
        "ASSCHER",
        "EMERALD",
        "HEART",
        "MARQUISE",
        "OVAL",
        "PEAR",
        "PRINCESS",
        "ROUND",
        "CUSHION BRILLIANT",
        "CUSHION MODIFIED",
        "SQUARE EMERALD",
      ],
    },
    cut: {
      type: String,
      enum: ["EX", "GD", "ID", "VG", "F", "ID"],
    },
    carat: { type: Number },
    carat_size: { type: [Number] },
    clarity: {
      type: String,
      enum: ["IF", "FL", "VS1", "VS2", "VS+", "VVS1", "VVS2"],
    },
    diamond_color: {
      type: String,
      enum: ["D", "E", "F", "F-G", "G", "E-F-G"],
    },
    polish: { type: String, enum: ["EX", "GD", "VG"] },
    symmetry: { type: String, enum: ["EX", "GD", "VG"] },
    certification: { type: String, enum: ["IGI", "GIA"] },
    ring_carat: { type: [Number] },
    depth: { type: Number },
    lw_ratio: { type: Number },
    fluorescence: { type: String },
    table: { type: Number },
  },
  { timestamps: true },
);

productSchema.index(
  {
    title: "text",
    description: "text",
    handle: "text",
    collectionHandles: "text",
  },
  { name: "TextSearchIndex" },
);

productSchema.index({ style: 1, carat: 1, shape: 1 }, { name: "SortIndex" });

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
