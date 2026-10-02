import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "../api/types";
import { formatToman } from "../lib/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <div className="product-card-top">
        <span
          className={`availability ${product.is_active ? "is-available" : "is-unavailable"}`}
        >
          <span aria-hidden="true" />
          {product.is_active ? "Available" : "Not available"}
        </span>
        <span className="stock-note">
          {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
        </span>
      </div>
      <Link className="product-card-title" to={`/products/${product.id}`}>
        <span className="product-card-monogram" aria-hidden="true">
          {product.name.trim().slice(0, 1).toUpperCase() || "B"}
        </span>
        <span className="product-card-copy">
          <span className="product-card-name">{product.name}</span>
          <span className="product-card-description">
            {product.description || "A considered addition to the everyday."}
          </span>
        </span>
      </Link>
      <div className="product-card-bottom">
        <strong>{formatToman(product.price)}</strong>
        <Link
          aria-label={`View ${product.name}`}
          className="icon-link"
          title={`View ${product.name}`}
          to={`/products/${product.id}`}
        >
          <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </article>
  );
}
