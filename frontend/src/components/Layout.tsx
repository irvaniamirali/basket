import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, ShoppingBasket, UserRound, X } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";

export function Layout() {
  const { user, isStaff, logout } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const nav = (
    <>
      <NavLink end onClick={() => setMenuOpen(false)} to="/">
        Discover
      </NavLink>
      {user && (
        <NavLink onClick={() => setMenuOpen(false)} to="/orders">
          Orders
        </NavLink>
      )}
      {isStaff && (
        <NavLink onClick={() => setMenuOpen(false)} to="/manage/products">
          Manage products
        </NavLink>
      )}
    </>
  );

  return (
    <div className="site-frame">
      <header className="site-header">
        <Link aria-label="Basket home" className="brand" to="/">
          <span className="brand-mark">
            <ShoppingBasket aria-hidden="true" size={19} />
          </span>
          <span>
            basket<span className="brand-period">.</span>
          </span>
        </Link>
        <nav aria-label="Primary navigation" className="desktop-nav">
          {nav}
        </nav>
        <div className="header-actions">
          <Link
            className="cart-nav"
            to={user ? "/cart" : "/login?next=%2Fcart"}
          >
            <ShoppingBasket aria-hidden="true" size={18} />
            <span>Basket</span>
            {user && (
              <span className="cart-count" aria-label={`${count} items`}>
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <Link
              aria-label="Your account"
              className="account-icon"
              title="Your account"
              to="/account"
            >
              <UserRound aria-hidden="true" size={18} />
            </Link>
          ) : (
            <Link className="sign-in-link" to="/login">
              Sign in
            </Link>
          )}
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? (
              <X aria-hidden="true" size={21} />
            ) : (
              <Menu aria-hidden="true" size={21} />
            )}
          </button>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="mobile-nav">
            {nav}
            {user ? (
              <>
                <NavLink to="/account">Account</NavLink>
                <button
                  className="mobile-logout"
                  onClick={() => void logout()}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink to="/register">Create an account</NavLink>
            )}
          </nav>
        )}
      </header>

      <main className="page-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <Link className="footer-brand" to="/">
          basket.
        </Link>
        <span>Thoughtfully chosen for ordinary days.</span>
        {user && (
          <button
            className="text-button footer-signout"
            onClick={() => void logout()}
            type="button"
          >
            Sign out
          </button>
        )}
      </footer>
    </div>
  );
}
