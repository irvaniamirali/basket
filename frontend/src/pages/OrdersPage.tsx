import { useEffect, useState } from "react";
import { ArrowRight, PackageCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Order, Payment } from "../api/types";
import { EmptyState, InlineError, PageLoading } from "../components/Feedback";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatToman, shortOrderId } from "../lib/format";
import { paymentForOrder } from "../lib/paymentStorage";

function PaymentStatus({ order }: { order: Order }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const paymentId = paymentForOrder(order.id);

  useEffect(() => {
    let current = true;
    if (paymentId) {
      api
        .payment(paymentId)
        .then((result) => {
          if (current) setPayment(result);
        })
        .catch(() => {
          if (current) setPayment(null);
        });
    }
    return () => {
      current = false;
    };
  }, [paymentId]);

  if (order.status === "paid") return <StatusBadge status="paid" />;
  if (payment) return <StatusBadge status={payment.status} />;
  return (
    <span className="status-note">
      {paymentId ? "Checking payment" : "Not started in this browser"}
    </span>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    api
      .orders(page)
      .then((result) => {
        if (!current) return;
        setOrders(result.results);
        setHasNext(Boolean(result.next));
        setHasPrevious(Boolean(result.previous));
      })
      .catch((cause: unknown) => {
        if (current) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Your orders could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [page, reload]);

  if (loading) return <PageLoading label="Finding your orders" />;
  function retryOrders() {
    setError(null);
    setLoading(true);
    setReload((value) => value + 1);
  }
  return (
    <div className="content-wide orders-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">The things you chose</span>
          <h1>Your orders</h1>
        </div>
        <PackageCheck aria-hidden="true" className="section-icon" size={28} />
      </div>
      {error && <InlineError onRetry={retryOrders}>{error}</InlineError>}
      {!error && orders.length === 0 ? (
        <EmptyState
          detail="Once you place an order, you’ll find its details here."
          title="Nothing ordered yet."
          action={
            <Link className="button button-primary" to="/">
              Discover the collection <ArrowRight size={17} />
            </Link>
          }
        />
      ) : (
        !error && (
          <div className="order-list">
            {orders.map((order) => (
              <Link
                className="order-row"
                key={order.id}
                to={`/orders/${order.id}`}
              >
                <span className="order-ref">
                  <small>Order</small>
                  <strong>#{shortOrderId(order.id)}</strong>
                </span>
                <span className="order-date">
                  <small>Placed</small>
                  <strong>{formatDate(order.created_at)}</strong>
                </span>
                <span className="order-state">
                  <small>Order status</small>
                  <StatusBadge status={order.status} />
                </span>
                <span className="order-total">
                  <small>Total</small>
                  <strong>{formatToman(order.total)}</strong>
                </span>
                <span className="order-payment">
                  <small>Payment</small>
                  <PaymentStatus order={order} />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="order-arrow"
                  size={17}
                />
              </Link>
            ))}
          </div>
        )
      )}
      {!error && orders.length > 0 && (hasPrevious || hasNext) && (
        <nav aria-label="Order pages" className="pagination">
          <button
            className="button button-quiet"
            disabled={!hasPrevious}
            onClick={() => {
              setLoading(true);
              setPage((value) => Math.max(1, value - 1));
            }}
            type="button"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button button-quiet"
            disabled={!hasNext}
            onClick={() => {
              setLoading(true);
              setPage((value) => value + 1);
            }}
            type="button"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
