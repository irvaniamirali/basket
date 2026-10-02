import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBasket } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Product } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { InlineError, PageLoading } from "../components/Feedback";
import { formatToman } from "../lib/format";

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const loading = loadedId !== id;
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    api
      .product(id)
      .then((result) => {
        if (!current) return;
        setProduct(result);
        setError(null);
        setLoadedId(id);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setProduct(null);
        setError(
          cause instanceof ApiError
            ? cause.message
            : "This item could not be loaded.",
        );
        setLoadedId(id);
      });
    return () => {
      current = false;
    };
  }, [id]);

  async function addItem() {
    if (!product) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await add(product.id, quantity);
      setNotice(`${product.name} is in your basket.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The item could not be added.",
      );
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <PageLoading label="Finding this piece" />;
  if (error && !product)
    return (
      <div className="content-narrow">
        <InlineError>{error}</InlineError>
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Back to the collection
        </Link>
      </div>
    );
  if (!product) return null;

  const canBuy = product.is_active && product.stock > 0;
  return (
    <div className="product-detail content-narrow">
      <Link className="back-link" to="/">
        <ArrowLeft aria-hidden="true" size={16} /> Back to the collection
      </Link>
      <div className="detail-columns">
        <section className="detail-copy">
          <div className="detail-label-row">
            <span
              className={`availability ${canBuy ? "is-available" : "is-unavailable"}`}
            >
              <span aria-hidden="true" />
              {canBuy ? "Available now" : "Currently unavailable"}
            </span>
            <span className="detail-stock">
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </span>
          </div>
          <h1>{product.name}</h1>
          <p className="detail-description">
            {product.description || "A considered addition to the everyday."}
          </p>
          <div className="detail-rule" />
          <div className="detail-price-row">
            <span>Price</span>
            <strong>{formatToman(product.price)}</strong>
          </div>
          <div className="detail-purchase">
            <div aria-label="Quantity" className="quantity-stepper">
              <button
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => value - 1)}
                type="button"
              >
                <Minus size={15} />
              </button>
              <output aria-live="polite">{quantity}</output>
              <button
                aria-label="Increase quantity"
                disabled={!canBuy || quantity >= product.stock}
                onClick={() =>
                  setQuantity((value) => Math.min(product.stock, value + 1))
                }
                type="button"
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className="button button-primary add-button"
              disabled={!canBuy || adding}
              onClick={() => void addItem()}
              type="button"
            >
              <ShoppingBasket aria-hidden="true" size={17} />
              {adding ? "Adding" : canBuy ? "Add to basket" : "Not available"}
            </button>
          </div>
          {!user && (
            <p className="form-hint">Sign in is required to keep a basket.</p>
          )}
          {error && <InlineError>{error}</InlineError>}
          {notice && (
            <div className="notice notice-success" role="status">
              {notice} <Link to="/cart">View basket</Link>
            </div>
          )}
        </section>
        <aside className="detail-aside">
          <span className="aside-number">
            B / {product.slug.slice(0, 3).toUpperCase()}
          </span>
          <p>
            Everyday objects should feel good to use, and easy to live with.
          </p>
          <span className="aside-bottom">A note from Basket</span>
        </aside>
      </div>
    </div>
  );
}
