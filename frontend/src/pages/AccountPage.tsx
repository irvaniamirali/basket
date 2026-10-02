import { ArrowRight, LogOut, PackageCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function AccountPage() {
  const { user, isStaff, logout } = useAuth();
  if (!user) return null;
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;

  return (
    <div className="content-narrow account-page">
      <span className="eyebrow">Your corner</span>
      <h1>Hello, {displayName}.</h1>
      <p className="page-lede">Your Basket account, just as you left it.</p>
      <section className="account-profile" aria-labelledby="profile-title">
        <div className="account-monogram" aria-hidden="true">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2 id="profile-title">Account details</h2>
          <dl className="profile-list">
            <div>
              <dt>Username</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            {displayName !== user.username && (
              <div>
                <dt>Name</dt>
                <dd>{displayName}</dd>
              </div>
            )}
          </dl>
          <p className="form-hint">Account details are read-only here.</p>
        </div>
      </section>
      <div className="account-links">
        <Link className="account-link-row" to="/orders">
          <span>
            <PackageCheck aria-hidden="true" size={18} /> Your orders
          </span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        {isStaff && (
          <Link className="account-link-row" to="/manage/products">
            <span>Manage the collection</span>
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        )}
        <button
          className="account-link-row account-signout"
          onClick={() => void logout()}
          type="button"
        >
          <span>
            <LogOut aria-hidden="true" size={18} /> Sign out
          </span>
          <ArrowRight aria-hidden="true" size={17} />
        </button>
      </div>
    </div>
  );
}
