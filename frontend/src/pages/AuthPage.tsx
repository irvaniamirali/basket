import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import type { FieldErrors } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { InlineError } from "../components/Feedback";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate replace to="/account" />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register({
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });
      }
      const next = searchParams.get("next");
      navigate(next?.startsWith("/") ? next : "/account", { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFieldErrors(cause.fieldErrors);
      } else {
        setError("We could not complete that request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const otherMode = mode === "login" ? "register" : "login";
  const fieldError = (name: string) => fieldErrors[name]?.join(" ");
  return (
    <div className="auth-layout">
      <section className="auth-form-wrap">
        <Link className="back-link" to="/">
          <ArrowLeft aria-hidden="true" size={16} /> Back to the shop
        </Link>
        <span className="eyebrow">
          {mode === "login" ? "Welcome back" : "A good place to begin"}
        </span>
        <h1>{mode === "login" ? "Come on in." : "Make yourself at home."}</h1>
        <p className="auth-intro">
          {mode === "login"
            ? "Sign in to pick up where you left off."
            : "Create an account to keep your basket and orders together."}
        </p>

        {error && <InlineError>{error}</InlineError>}
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
            {fieldError("username") && (
              <span className="field-error">{fieldError("username")}</span>
            )}
          </label>
          {mode === "register" && (
            <>
              <label className="field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
                {fieldError("email") && (
                  <span className="field-error">{fieldError("email")}</span>
                )}
              </label>
              <div className="name-fields">
                <label className="field">
                  <span>
                    First name <small>Optional</small>
                  </span>
                  <input
                    autoComplete="given-name"
                    onChange={(event) => setFirstName(event.target.value)}
                    value={firstName}
                  />
                </label>
                <label className="field">
                  <span>
                    Last name <small>Optional</small>
                  </span>
                  <input
                    autoComplete="family-name"
                    onChange={(event) => setLastName(event.target.value)}
                    value={lastName}
                  />
                </label>
              </div>
            </>
          )}
          <label className="field">
            <span>Password</span>
            <input
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {fieldError("password") && (
              <span className="field-error">{fieldError("password")}</span>
            )}
            {mode === "register" && (
              <span className="field-help">
                Use at least 8 characters. Your password is protected by the
                account service.
              </span>
            )}
          </label>
          <button
            className="button button-primary button-wide"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? "One moment"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New to Basket?" : "Already have an account?"}{" "}
          <Link to={`/${otherMode}`}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </section>
      <aside className="auth-aside">
        <span className="aside-number">A place for your good things</span>
        <p>
          “The ordinary is where life happens. We’re glad you’re here for it.”
        </p>
        <span className="aside-bottom">Basket, for everyday</span>
      </aside>
    </div>
  );
}
