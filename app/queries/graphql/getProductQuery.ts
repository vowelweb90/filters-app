export const getProductQuery = `
query getProduct($id: ID!) {
  product(id: $id) {
    id
    metafields(first: 250, namespace: "custom") {
      nodes {
        key
        id
        namespace
        jsonValue
      }
    }
    title
    description
    handle
    createdAt
    priceRangeV2 {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    collections(first: 250) {
      nodes {
        id
        handle
      }
    }
  }
}`;
