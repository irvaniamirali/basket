import { AlertCircle, LoaderCircle } from "lucide-react";

export function InlineError({
  children,
  onRetry,
}: {
  children: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle aria-hidden="true" size={18} />
      <span>{children}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <LoaderCircle className="spinner" aria-hidden="true" size={22} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="eyebrow">A little room for something good</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </section>
  );
}
