import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { CartProvider } from "./cart/CartContext";
import { Layout } from "./components/Layout";
import { PageLoading } from "./components/Feedback";
import { AccountPage } from "./pages/AccountPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AuthPage } from "./pages/AuthPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PaymentReturnPage } from "./pages/PaymentReturnPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { StorefrontPage } from "./pages/StorefrontPage";
import "./App.css";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading label="Opening your account" />;
  if (!user)
    return (
      <Navigate
        replace
        to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
      />
    );
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<StorefrontPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="payment/return" element={<PaymentReturnPage />} />
        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="cart"
          element={
            <RequireAuth>
              <CartPage />
            </RequireAuth>
          }
        />
        <Route
          path="checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route
          path="orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="orders/:id"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="manage/products"
          element={
            <RequireAuth>
              <AdminProductsPage />
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <div className="content-narrow not-found">
              <span className="eyebrow">Not on this shelf</span>
              <h1>We couldn’t find that page.</h1>
              <p>It may have moved, or it may never have been here.</p>
              <Navigate to="/" replace />
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
