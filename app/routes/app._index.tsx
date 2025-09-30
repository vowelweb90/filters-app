import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";


export default function Index() {
  const importProducts = () => {
    fetch("/api/import-products", { method: "POST" });
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <s-button variant="primary" onClick={importProducts}>
        Import Products
      </s-button>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
