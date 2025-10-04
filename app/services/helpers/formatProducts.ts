import { ImportProductGQL, TProduct, ValueCollectionContext } from "app/types";
import { METAFIELDS } from "../utils/constants";

export function formatProducts(
  unformattedProducts: ImportProductGQL[],
  valueCollectionContext?: ValueCollectionContext,
) {
  return unformattedProducts.map((p) => {
    const fp: TProduct = {
      gid: p.id,
      title: p.title || "",
      description: p.description || "",
      handle: p.handle || "",
      shopifyCreatedAt: p.createdAt ? new Date(p.createdAt) : null,
      priceAmount:
        p.priceRangeV2?.minVariantPrice?.amount &&
        !isNaN(Number(p.priceRangeV2?.minVariantPrice?.amount))
          ? Number(p.priceRangeV2?.minVariantPrice?.amount)
          : null,
      priceCurrency: p.priceRangeV2?.minVariantPrice?.currencyCode || null,
      collections: p.collections?.nodes?.map((c) => c.id) || [],
      collectionHandles: p.collections?.nodes?.map((c) => c.handle) || [],
      options:
        p.options?.map((opt) => ({
          name: opt.name,
          values: opt.values,
        })) || [],
      optionValues: p.options?.flatMap((opt) => opt.values) || [],
    };

    for (const field of METAFIELDS) {
      const metafield = p.metafields.nodes.find((m) => m.key === field.key);

      if (metafield) {
        try {
          let parsedValue;

          if (metafield.jsonValue && valueCollectionContext) {
            if (
              valueCollectionContext[field.key] &&
              Array.isArray(valueCollectionContext[field.key]) &&
              !valueCollectionContext[field.key]?.includes(metafield.jsonValue)
            ) {
              valueCollectionContext[field.key]?.push(metafield.jsonValue);
            } else {
              valueCollectionContext[field.key] = [metafield.jsonValue];
            }
          }

          if (field.jsonParseble) {
            if (
              typeof metafield.jsonValue === "string" &&
              metafield.jsonValue.trim()
            )
              parsedValue = JSON.parse(metafield.jsonValue.trim());
            else if (typeof metafield.jsonValue === "object")
              parsedValue = metafield.jsonValue;
          } else {
            if (typeof metafield.jsonValue === "string")
              parsedValue = metafield.jsonValue.trim();
            else parsedValue = metafield.jsonValue;
          }

          if (field.type === "number") {
            if (isNaN(Number(parsedValue))) {
              console.log(
                `Invalid Value: ${JSON.stringify(parsedValue)} on product ${p.id}`,
              );
              continue;
            } else parsedValue = Number(parsedValue);
          }

          if (field.type === "number[]") {
            if (Array.isArray(parsedValue) && parsedValue.length) {
              if (isNaN(Number(parsedValue[0]))) {
                console.log(
                  `Invalid Value: ${JSON.stringify(parsedValue)} on product ${p.id}`,
                );
                continue;
              } else parsedValue = parsedValue.map((v) => Number(v));
            } else {
              console.log(
                `Invalid Value: ${JSON.stringify(parsedValue)} on product ${p.id}`,
              );
              continue;
            }
          }

          if (typeof parsedValue === "string")
            parsedValue = parsedValue.trim().toUpperCase();

          if (parsedValue) fp[field.key] = parsedValue;
        } catch (error) {
          fp[field.key] = null;
          throw error;
        }
      }
    }

    return fp;
  });
}
