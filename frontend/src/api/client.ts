import type {
  Cart,
  FieldErrors,
  Order,
  Page,
  Payment,
  Product,
  ProductInput,
  RegistrationInput,
  User,
} from "./types";

const TOKEN_KEY = "basket.authToken";

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function extractErrors(body: unknown): {
  message: string;
  fields: FieldErrors;
} {
  if (!body || typeof body !== "object") {
    return { message: "The request could not be completed.", fields: {} };
  }

  const fields: FieldErrors = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(value)) fields[key] = value.map(String);
    else if (typeof value === "string") fields[key] = [value];
  }

  const record = body as Record<string, unknown>;
  const detail = record.detail ?? record.non_field_errors;
  const message = Array.isArray(detail)
    ? detail.map(String).join(" ")
    : typeof detail === "string"
      ? detail
      : "Please check the highlighted fields and try again.";

  return { message, fields };
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const token =
    options.token === undefined
      ? localStorage.getItem(TOKEN_KEY)
      : options.token;
  if (token) headers.set("Authorization", `Token ${token}`);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      "We could not reach the shop. Check your connection and try again.",
    );
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const { message, fields } = extractErrors(body);
    throw new ApiError(response.status, message, fields);
  }
  return body as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const authTokenKey = TOKEN_KEY;

export const api = {
  products(params: { search?: string; active?: string; page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.active) query.set("is_active", params.active);
    if (params.page && params.page > 1) query.set("page", String(params.page));
    const suffix = query.size ? `?${query.toString()}` : "";
    return request<Page<Product>>(`/products/${suffix}`);
  },
  product(id: string) {
    return request<Product>(`/products/${id}/`);
  },
  createProduct(input: ProductInput) {
    return request<Product>("/products/", json("POST", input));
  },
  updateProduct(id: string, input: Partial<ProductInput>) {
    return request<Product>(`/products/${id}/`, json("PATCH", input));
  },
  deleteProduct(id: string) {
    return request<void>(`/products/${id}/`, { method: "DELETE" });
  },
  // productWriteCapability() {
  //   return request<{ actions?: { POST?: unknown } }>("/products/", {
  //     method: "OPTIONS",
  //   });
  // },
  register(input: RegistrationInput) {
    return request<User>("/auth/register/", json("POST", input), {
      token: null,
    });
  },
  async login(username: string, password: string) {
    return request<{ token: string }>(
      "/auth/token/",
      json("POST", { username, password }),
      { token: null },
    );
  },
  profile() {
    return request<User>("/auth/me/");
  },
  logout() {
    return request<void>("/auth/logout/", { method: "POST" });
  },
  cart() {
    return request<Cart>("/cart/");
  },
  addCartItem(product_id: string, quantity: number) {
    return request<Cart>(
      "/cart/items/",
      json("POST", { product_id, quantity }),
    );
  },
  updateCartItem(itemId: string, quantity: number) {
    return request<Cart>(`/cart/items/${itemId}/`, json("PATCH", { quantity }));
  },
  removeCartItem(itemId: string) {
    return request<void>(`/cart/items/${itemId}/`, { method: "DELETE" });
  },
  clearCart() {
    return request<void>("/cart/items/", { method: "DELETE" });
  },
  createOrder() {
    return request<Order>("/orders/", json("POST", {}));
  },
  orders(page = 1) {
    const query = page > 1 ? `?page=${page}` : "";
    return request<Page<Order>>(`/orders/${query}`);
  },
  order(id: string) {
    return request<Order>(`/orders/${id}/`);
  },
  createPayment(orderId: string) {
    return request<Payment>(`/orders/${orderId}/payments/`, json("POST", {}));
  },
  payment(id: string) {
    return request<Payment>(`/payments/${id}/`);
  },
  async paymentCallback(authority: string, status: string) {
    const query = new URLSearchParams({ Authority: authority, Status: status });
    return request<{
      payment_id: string;
      status: Payment["status"];
      reference_id: string | null;
    }>(
      `/payments/zarinpal/callback/?${query.toString()}`,
      { method: "GET" },
      { token: null },
    );
  },
};
