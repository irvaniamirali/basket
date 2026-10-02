import { useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Order } from "../api/types";
import { useCart } from "../cart/useCart";
import { InlineError, PageLoading } from "../components/Feedback";
import { formatToman } from "../lib/format";
import { rememberPayment } from "../lib/paymentStorage";

export function CheckoutPage() {
  const { cart, loading, refresh } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function createOrder() {
    setWorking(true);
    setError(null);
    try {
      const created = await api.createOrder();
      setOrder(created);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We could not place this order.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function startPayment() {
    if (!order) return;
    setWorking(true);
    setError(null);
    try {
      const payment = await api.createPayment(order.id);
      rememberPayment(order.id, payment.id);
      window.location.assign(payment.payment_url!);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Payment could not be started. Your order is still saved.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading && !order) return <PageLoading label="Checking your basket" />;

  if (order) {
    return (
      <div className="content-narrow checkout-page">
        <span className="eyebrow">Order ready for your review</span>
        <h1>One last look.</h1>
        <p className="page-lede">
          Basket created this order from your saved selections. Review the
          confirmed total before continuing.
        </p>
        <section className="checkout-confirmation">
          {order.items.map((item) => (
            <div className="checkout-item" key={item.id}>
              <span>
                <strong>{item.product_name}</strong>
                <small>
                  {item.quantity} × {formatToman(item.unit_price)}
                </small>
              </span>
              <strong>{formatToman(item.line_total)}</strong>
            </div>
          ))}
          <div className="summary-total checkout-total">
            <span>Order total</span>
            <strong>{formatToman(order.total)}</strong>
          </div>
        </section>
        {error && <InlineError>{error}</InlineError>}
        <button
          className="button button-primary button-wide"
          disabled={working}
          onClick={() => void startPayment()}
          type="button"
        >
          <ShieldCheck aria-hidden="true" size={18} />
          {working
            ? "Preparing secure payment"
            : "Confirm and continue to payment"}
          {!working && <ArrowRight aria-hidden="true" size={17} />}
        </button>
        <p className="payment-assurance">
          <Check aria-hidden="true" size={15} /> Payment is verified by ZarinPal
          and Basket. You’ll leave this site to pay.
        </p>
        <Link className="text-link" to={`/orders/${order.id}`}>
          View this order instead
        </Link>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div className="content-narrow">
        <InlineError>
          Your basket is empty. Add something before creating an order.
        </InlineError>
        <Link className="button button-primary" to="/">
          Browse the collection <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <div className="content-narrow checkout-page">
      <span className="eyebrow">Review before placing</span>
      <h1>Make it an order.</h1>
      <p className="page-lede">
        Your current basket total is shown below. Basket confirms the final
        order amount before payment begins.
      </p>
      <section className="checkout-confirmation">
        {cart.items.map((item) => (
          <div className="checkout-item" key={item.id}>
            <span>
              <strong>{item.product.name}</strong>
              <small>
                {item.quantity} × {formatToman(item.unit_price)}
              </small>
            </span>
            <strong>{formatToman(item.line_total)}</strong>
          </div>
        ))}
        <div className="summary-total checkout-total">
          <span>Current basket total</span>
          <strong>{formatToman(cart.total)}</strong>
        </div>
      </section>
      {error && <InlineError>{error}</InlineError>}
      <button
        className="button button-primary button-wide"
        disabled={working}
        onClick={() => void createOrder()}
        type="button"
      >
        {working ? "Creating your order" : "Create order for review"}
        {!working && <ArrowRight aria-hidden="true" size={17} />}
      </button>
      <p className="payment-assurance">
        No payment is taken at this step. You’ll confirm the returned order
        total next.
      </p>
    </div>
  );
}
