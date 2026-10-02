import type { Order, Payment } from "../api/types";

type Status = Order["status"] | Payment["status"];

const labels: Record<Status, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  canceled: "Canceled",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status}`}>{labels[status]}</span>
  );
}
