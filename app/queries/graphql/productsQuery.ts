export const productsQuery = `
query getProducts($limit: Int, $cursor: String) {
  products(first: $limit, after: $cursor) {
    nodes {
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
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}`;
