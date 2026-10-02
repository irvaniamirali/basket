import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  RotateCw,
  XCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { Payment } from "../api/types";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { PageLoading } from "../components/Feedback";
import { StatusBadge } from "../components/StatusBadge";
import { formatRialsAsToman } from "../lib/format";
import { rememberPayment } from "../lib/paymentStorage";

type ReturnState =
  "checking" | "paid" | "canceled" | "failed" | "pending" | "unknown";

export function PaymentReturnPage() {
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id;
  const query = new URLSearchParams(location.search);
  const authority = query.get("Authority");
  const callbackStatus = query.get("Status");
  const validCallback = Boolean(
    authority && callbackStatus && ["OK", "NOK"].includes(callbackStatus),
  );
  const [state, setState] = useState<ReturnState>(
    validCallback ? "checking" : "unknown",
  );
  const [payment, setPayment] = useState<Payment | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    if (!validCallback || !authority || !callbackStatus) return;
    api
      .paymentCallback(authority, callbackStatus)
      .then(async (callback) => {
        if (!current) return;
        if (userId) {
          try {
            const result = await api.payment(callback.payment_id);
            if (!current) return;
            setPayment(result);
            rememberPayment(result.order_id, result.id);
            setState(result.status);
            return;
          } catch {
            // The callback itself is already the backend's verified result.
          }
        }
        if (
          callback.status === "paid" ||
          callback.status === "canceled" ||
          callback.status === "failed"
        ) {
          setState(callback.status);
        } else {
          setState("pending");
        }
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setDetail(cause instanceof Error ? cause.message : null);
        setState(cause instanceof ApiError && cause.status === 404 ? "unknown" : "pending");
      });

    return () => {
      current = false;
    };
  }, [
    attempt,
    location.search,
    userId,
    authority,
    callbackStatus,
    validCallback,
  ]);

  if (state === "checking")
    return <PageLoading label="Checking your payment with Basket" />;

  const icon =
    state === "paid" ? (
      <CheckCircle2 aria-hidden="true" size={34} />
    ) : state === "canceled" || state === "failed" ? (
      <XCircle aria-hidden="true" size={34} />
    ) : (
      <CircleHelp aria-hidden="true" size={34} />
    );
  const title = {
    checking: "Checking payment",
    paid: "All settled.",
    canceled: "Payment canceled.",
    failed: "Payment not completed.",
    pending: "Verification is still in progress.",
    unknown: "We couldn’t identify this payment.",
  }[state];
  const copy = {
    checking: "Basket is confirming the result with the payment provider.",
    paid: "Your payment has been verified by Basket. Your order is confirmed.",
    canceled:
      "No payment was recorded. Your order is still available in your account.",
    failed:
      "The provider did not verify this payment. Your order has not been marked paid.",
    pending:
      detail ??
      "We haven’t received a verified result yet. You can safely check again.",
    unknown: "The payment return did not include a valid authority and status.",
  }[state];

  return (
    <div className={`payment-result payment-result-${state}`}>
      <span className="payment-result-icon">{icon}</span>
      <span className="eyebrow">ZarinPal payment return</span>
      <h1>{title}</h1>
      <p>{copy}</p>
      {payment && (
        <div className="payment-result-detail">
          <div>
            <span>Payment status</span>
            <StatusBadge status={payment.status} />
          </div>
          <div>
            <span>Payment amount</span>
            <strong>{formatRialsAsToman(payment.amount_rials)}</strong>
          </div>
          {payment.reference_id && (
            <div>
              <span>Reference</span>
              <strong>{payment.reference_id}</strong>
            </div>
          )}
        </div>
      )}
      {state === "pending" && (
        <button
          className="button button-quiet"
          onClick={() => {
            setState("checking");
            setDetail(null);
            setAttempt((value) => value + 1);
          }}
          type="button"
        >
          <RotateCw aria-hidden="true" size={16} /> Check again
        </button>
      )}
      {user ? (
        <Link className="button button-primary" to="/orders">
          View your orders <ArrowRight aria-hidden="true" size={17} />
        </Link>
      ) : (
        <Link className="button button-primary" to="/login">
          Sign in to view your order <ArrowRight aria-hidden="true" size={17} />
        </Link>
      )}
    </div>
  );
}
