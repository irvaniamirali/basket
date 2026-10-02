import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Product } from "../api/types";
import { ProductCard } from "./ProductCard";

const product: Product = {
  id: "product-1",
  name: "Woven market tote",
  slug: "woven-market-tote",
  description: "A sturdy everyday carryall.",
  price: "12500.00",
  stock: 6,
  is_active: true,
  created_at: "2026-10-02T10:00:00Z",
  updated_at: "2026-10-02T10:00:00Z",
};

describe("ProductCard", () => {
  it("renders live product details and links to the backend product ID", () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Woven market tote")).toBeInTheDocument();
    expect(screen.getByText("A sturdy everyday carryall.")).toBeInTheDocument();
    expect(screen.getByText("12,500.00 Toman")).toBeInTheDocument();
    expect(screen.getByText("6 in stock")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Woven market tote" }),
    ).toHaveAttribute("href", "/products/product-1");
  });
});
