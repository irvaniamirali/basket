import { useState } from "react";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../cart/useCart";
import { EmptyState, InlineError, PageLoading } from "../components/Feedback";
import { formatToman } from "../lib/format";

export function CartPage() {
  const { cart, loading, error, update, remove, clear } = useCart();
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  async function run(id: string, operation: () => Promise<void>) {
    setWorking(id);
    setActionError(null);
    try {
      await operation();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Your basket could not be updated.",
      );
    } finally {
      setWorking(null);
    }
  }

  if (loading) return <PageLoading label="Gathering your basket" />;
  if (error)
    return (
      <div className="content-narrow">
        <InlineError>{error}</InlineError>
      </div>
    );
  if (!cart || cart.items.length === 0) {
    return (
      <div className="content-narrow">
        <EmptyState
          detail="The good things you choose will be kept here."
          title="Your basket is taking a breather."
          action={
            <Link className="button button-primary" to="/">
              Explore the collection <ArrowRight size={17} />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="content-wide cart-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Your selections</span>
          <h1>The basket</h1>
        </div>
        <button
          className="text-button remove-all"
          disabled={working === "clear"}
          onClick={() => void run("clear", clear)}
          type="button"
        >
          Clear basket
        </button>
      </div>
      {actionError && <InlineError>{actionError}</InlineError>}
      <div className="cart-layout">
        <section aria-label="Basket items" className="cart-lines">
          {cart.items.map((item) => (
            <article className="cart-line" key={item.id}>
              <span className="cart-line-initial" aria-hidden="true">
                {item.product.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="cart-line-main">
                <Link
                  className="cart-line-name"
                  to={`/products/${item.product.id}`}
                >
                  {item.product.name}
                </Link>
                <span className="cart-line-price">
                  {formatToman(item.unit_price)} each
                </span>
                <div className="quantity-stepper cart-stepper">
                  <button
                    aria-label={`Decrease ${item.product.name} quantity`}
                    disabled={item.quantity <= 1 || working === item.id}
                    onClick={() =>
                      void run(item.id, () =>
                        update(item.id, item.quantity - 1),
                      )
                    }
                    type="button"
                  >
                    <Minus size={14} />
                  </button>
                  <output aria-label={`${item.quantity} items`}>
                    {item.quantity}
                  </output>
                  <button
                    aria-label={`Increase ${item.product.name} quantity`}
                    disabled={
                      item.quantity >= item.product.stock || working === item.id
                    }
                    onClick={() =>
                      void run(item.id, () =>
                        update(item.id, item.quantity + 1),
                      )
                    }
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="cart-line-end">
                <strong>{formatToman(item.line_total)}</strong>
                <button
                  aria-label={`Remove ${item.product.name}`}
                  className="icon-button subtle-icon"
                  disabled={working === item.id}
                  onClick={() => void run(item.id, () => remove(item.id))}
                  title="Remove item"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
            </article>
          ))}
        </section>
        <aside className="order-summary">
          <span className="eyebrow">A clear view</span>
          <h2>Summary</h2>
          <div className="summary-line">
            <span>
              {cart.items.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
            <span>{formatToman(cart.total)}</span>
          </div>
          <div className="summary-total">
            <span>Current total</span>
            <strong>{formatToman(cart.total)}</strong>
          </div>
          <p className="summary-note">
            The order total is confirmed by Basket when your order is created.
          </p>
          <Link className="button button-primary button-wide" to="/checkout">
            Review order <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </aside>
      </div>
      <Link className="back-link" to="/">
        <ArrowRight aria-hidden="true" className="back-arrow" size={16} /> Keep
        browsing
      </Link>
    </div>
  );
}
