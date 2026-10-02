import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Order, Payment } from "../api/types";
import { InlineError, PageLoading } from "../components/Feedback";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatToman, shortOrderId } from "../lib/format";
import { paymentForOrder, rememberPayment } from "../lib/paymentStorage";

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<{
    orderId: string;
    payment: Payment;
  } | null>(null);
  const payment = paymentRecord?.orderId === id ? paymentRecord.payment : null;
  const loading = loadedId !== id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    api
      .order(id)
      .then((result) => {
        if (!current) return;
        setOrder(result);
        setError(null);
        setLoadedId(id);
        const paymentId = paymentForOrder(result.id);
        if (paymentId)
          void api
            .payment(paymentId)
            .then((value) => {
              if (current) setPaymentRecord({ orderId: id, payment: value });
            })
            .catch(() => undefined);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setOrder(null);
        setError(
          cause instanceof ApiError
            ? cause.message
            : "This order could not be loaded.",
        );
        setLoadedId(id);
      });
    return () => {
      current = false;
    };
  }, [id, reload]);

  async function payNow() {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.createPayment(order.id);
      rememberPayment(order.id, result.id);
      window.location.assign(result.payment_url!);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Payment could not be started.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoading label="Opening your order" />;
  if (error && !order)
    return (
      <div className="content-narrow">
        <InlineError>{error}</InlineError>
        <Link className="back-link" to="/orders">
          <ArrowLeft size={16} /> Your orders
        </Link>
      </div>
    );
  if (!order) return null;

  return (
    <div className="content-narrow order-detail-page">
      <Link className="back-link" to="/orders">
        <ArrowLeft aria-hidden="true" size={16} /> Your orders
      </Link>
      <div className="order-detail-heading">
        <div>
          <span className="eyebrow">Order #{shortOrderId(order.id)}</span>
          <h1>A good choice.</h1>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="page-lede">Placed {formatDate(order.created_at)}</p>
      {error && <InlineError>{error}</InlineError>}
      <section className="checkout-confirmation order-items">
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
      <div className="order-payment-detail">
        <span>Payment</span>
        {payment ? (
          <StatusBadge status={payment.status} />
        ) : order.status === "paid" ? (
          <StatusBadge status="paid" />
        ) : (
          <span className="status-note">No payment status available</span>
        )}
      </div>
      {order.status === "pending" && (
        <div className="order-next-action">
          <p>
            <ShieldCheck aria-hidden="true" size={17} /> This order is waiting
            for payment.
          </p>
          <button
            className="button button-primary button-wide"
            disabled={busy}
            onClick={() => void payNow()}
            type="button"
          >
            {busy
              ? "Opening secure payment"
              : payment?.status === "pending"
                ? "Continue payment"
                : "Pay for this order"}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
          <p className="form-hint">
            Payment is verified by Basket after you return from ZarinPal.
          </p>
        </div>
      )}
      {order.status === "paid" && (
        <div className="notice notice-success" role="status">
          This order is paid and confirmed.
        </div>
      )}
      <button
        className="text-button order-refresh"
        onClick={() => {
          setLoadedId(null);
          setReload((value) => value + 1);
        }}
        type="button"
      >
        Refresh order status
      </button>
    </div>
  );
}
