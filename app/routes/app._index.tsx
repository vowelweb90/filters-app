import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";

export default function Index() {
  const [config, setConfig] = useState<{
    maxRequestsLimit: number;
    productsPerRequest: number;
    startCursor?: string;
    shop?: string;
    accessToken?: string;
  }>({
    maxRequestsLimit: 200,
    productsPerRequest: 250,
  });

  const importProducts = () => {
    fetch("/api/import-products", {
      method: "POST",
      body: JSON.stringify(config, null, 2),
      headers: { "Content-Type": "application/json" },
    });
  };

  function handleFormChange(event: Event) {
    const target = event.target as HTMLInputElement;
    setConfig((prev) => ({
      ...prev,
      [target?.name]: target?.value,
    }));
  }

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
      <s-section heading="Import products">
        <s-number-field
          min={1}
          label="Max requests limit"
          onChange={handleFormChange}
          name="maxRequestsLimit"
          value={config.maxRequestsLimit.toString()}
        ></s-number-field>

        <s-number-field
          min={1}
          label="Products per request"
          onChange={handleFormChange}
          max={250}
          name="productsPerRequest"
          value={config.productsPerRequest.toString()}
        ></s-number-field>

        <s-text-field
          label="Start cursor (optional)"
          onChange={handleFormChange}
          name="startCursor"
          value={config.startCursor?.toString()}
        ></s-text-field>

        <s-text-field
          label="Shop (optional)"
          onChange={handleFormChange}
          name="shop"
          value={config.shop}
        ></s-text-field>

        <s-text-field
          label="Access token (optional)"
          onChange={handleFormChange}
          name="accessToken"
          value={config.accessToken}
        ></s-text-field>
        <s-button variant="primary" onClick={importProducts}>
          Import Products
        </s-button>
      </s-section>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
