export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductSummary = Pick<
  Product,
  "id" | "name" | "slug" | "price" | "stock" | "is_active"
>;

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type CartItem = {
  id: string;
  product: ProductSummary;
  quantity: number;
  unit_price: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

export type Cart = {
  id: string;
  items: CartItem[];
  total: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  product_id: string | null;
  product_name: string;
  product_slug: string;
  unit_price: string;
  quantity: number;
  line_total: string;
};

export type Order = {
  id: string;
  status: "pending" | "paid";
  total: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

export type Payment = {
  id: string;
  order_id: string;
  provider: "zarinpal";
  status: "pending" | "paid" | "failed" | "canceled";
  amount_rials: number;
  reference_id: string;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  payment_url?: string;
};

export type RegistrationInput = {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
};

export type ProductInput = Pick<
  Product,
  "name" | "slug" | "description" | "price" | "stock" | "is_active"
>;

export type FieldErrors = Record<string, string[]>;
