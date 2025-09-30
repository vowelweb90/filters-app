
export const getProductsByIdsQuery = `
query getProductsByIds($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id
      handle
      title
      tags
      productType
      featuredMedia {
        id
        preview {
          image {
            altText
            height
            width
            url
          }
        }
      }
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      caratMetafield: metafield(namespace: "custom", key: "carat") {
        value
      }
      shape: metafield(namespace: "custom", key: "shape") {
        value
      }
      diamondColor: metafield(namespace: "custom", key: "diamond_color") {
        value
      }
      cut: metafield(namespace: "custom", key: "cut") {
        value
      }
      clarity: metafield(namespace: "custom", key: "clarity") {
        value
      }
      depth: metafield(namespace: "custom", key: "depth") {
        value
      }
      polish: metafield(namespace: "custom", key: "polish") {
        value
      }
      lwRatio: metafield(namespace: "custom", key: "lw_ratio") {
        value
      }
      fluorescence: metafield(namespace: "custom", key: "fluorescence") {
        value
      }
      report: metafield(namespace: "custom", key: "report") {
        value
      }
      table: metafield(namespace: "custom", key: "table") {
        value
      }
      symmetry: metafield(namespace: "custom", key: "symmetry") {
        value
      }
      showOnCollection: metafield(namespace: "custom", key: "show_on_collection") {
        value
      }
      sizeProductOption: metafield(namespace: "custom", key: "size") {
        value
      }
      certification: metafield(namespace: "custom", key: "certification") {
        value
      }
      style: metafield(namespace: "custom", key: "style") {
        value
      }
      sliderEnable: metafield(namespace: "custom", key: "slider_enable") {
        value
      }
      pinned: metafield(namespace: "custom", key: "pinned") {
        value
      }
      variants(first: 250) {
        nodes {
          id
          title
          availableForSale
          price
          compareAtPrice
          selectedOptions {
            name
            value
          }
          image {
            id
            altText
            url
            width
            height
          }
        }
      }
    }
  }
}`;