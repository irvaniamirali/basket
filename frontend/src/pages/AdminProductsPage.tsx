import { useEffect, useState, type FormEvent } from "react";
import { Check, Edit3, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { FieldErrors, Product, ProductInput } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { EmptyState, InlineError, PageLoading } from "../components/Feedback";
import { formatToman } from "../lib/format";

const blankProduct: ProductInput = {
  name: "",
  slug: "",
  description: "",
  price: "0.00",
  stock: 0,
  is_active: true,
};

export function AdminProductsPage() {
  const { isStaff, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<ProductInput>(blankProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (authLoading || !isStaff) return;
    let current = true;
    api
      .products({ page })
      .then((result) => {
        if (!current) return;
        setProducts(result.results);
        setHasNext(Boolean(result.next));
        setHasPrevious(Boolean(result.previous));
      })
      .catch((cause: unknown) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Products could not be loaded.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [authLoading, isStaff, page, reload]);

  if (authLoading) return <PageLoading label="Checking access" />;
  if (!isStaff)
    return (
      <div className="content-narrow">
        <InlineError>This area is only available to catalog staff.</InlineError>
      </div>
    );

  function resetForm() {
    setForm(blankProduct);
    setEditingId(null);
    setFieldErrors({});
    setError(null);
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      stock: product.stock,
      is_active: product.is_active,
    });
    setFieldErrors({});
    setError(null);
    document
      .getElementById("product-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const payload = { ...form, stock: Number(form.stock) };
    try {
      if (editingId) await api.updateProduct(editingId, payload);
      else await api.createProduct(payload);
      resetForm();
      setReload((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFieldErrors(cause.fieldErrors);
      } else setError("The product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      await api.updateProduct(product.id, { is_active: !product.is_active });
      setReload((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Availability could not be changed.",
      );
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete “${product.name}”?`)) return;
    try {
      await api.deleteProduct(product.id);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The product could not be deleted.",
      );
    }
  }

  const fieldError = (key: string) => fieldErrors[key]?.join(" ");
  return (
    <div className="content-wide admin-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Staff tools</span>
          <h1>The collection</h1>
        </div>
        <span className="staff-mark">Catalog staff</span>
      </div>
      {error && (
        <InlineError onRetry={() => setReload((value) => value + 1)}>
          {error}
        </InlineError>
      )}
      <section className="admin-editor" id="product-editor">
        <div className="admin-editor-heading">
          <div>
            <span className="eyebrow">
              {editingId ? "Make a change" : "Add to the collection"}
            </span>
            <h2>{editingId ? "Edit product" : "New product"}</h2>
          </div>
          {editingId && (
            <button
              className="icon-button"
              onClick={resetForm}
              title="Cancel editing"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
            {fieldError("name") && (
              <span className="field-error">{fieldError("name")}</span>
            )}
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              required
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
            />
            {fieldError("slug") && (
              <span className="field-error">{fieldError("slug")}</span>
            )}
          </label>
          <label className="field admin-description">
            <span>Description</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>
              Price <small>Toman</small>
            </span>
            <input
              min="0"
              required
              step="0.01"
              type="number"
              value={form.price}
              onChange={(event) =>
                setForm({ ...form, price: event.target.value })
              }
            />
            {fieldError("price") && (
              <span className="field-error">{fieldError("price")}</span>
            )}
          </label>
          <label className="field">
            <span>Stock</span>
            <input
              min="0"
              required
              step="1"
              type="number"
              value={form.stock}
              onChange={(event) =>
                setForm({ ...form, stock: Number(event.target.value) })
              }
            />
            {fieldError("stock") && (
              <span className="field-error">{fieldError("stock")}</span>
            )}
          </label>
          <label className="check-field">
            <input
              checked={form.is_active}
              onChange={(event) =>
                setForm({ ...form, is_active: event.target.checked })
              }
              type="checkbox"
            />
            <span>Available in the shop</span>
          </label>
          <button
            className="button button-primary"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving" : editingId ? "Save changes" : "Add product"}
            {editingId ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </form>
      </section>

      <section className="admin-list" aria-label="Products">
        <div className="admin-list-heading">
          <h2>Products</h2>
          <span>{products.length} shown</span>
        </div>
        {loading ? (
          <PageLoading label="Loading products" />
        ) : products.length === 0 ? (
          <EmptyState
            detail="Create the first product using the form above."
            title="The collection is empty."
          />
        ) : (
          <div className="admin-product-list">
            {products.map((product) => (
              <article className="admin-product-row" key={product.id}>
                <span className="product-card-monogram" aria-hidden="true">
                  {product.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="admin-product-main">
                  <strong>{product.name}</strong>
                  <span>{product.slug}</span>
                </div>
                <span className="admin-product-stock">
                  {product.stock} in stock
                </span>
                <strong className="admin-product-price">
                  {formatToman(product.price)}
                </strong>
                <span
                  className={`availability ${product.is_active ? "is-available" : "is-unavailable"}`}
                >
                  <span aria-hidden="true" />
                  {product.is_active ? "Available" : "Hidden"}
                </span>
                <div className="admin-actions">
                  <button
                    aria-label={`Edit ${product.name}`}
                    className="icon-button"
                    onClick={() => editProduct(product)}
                    title="Edit product"
                    type="button"
                  >
                    <Edit3 size={17} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => void toggleActive(product)}
                    type="button"
                  >
                    {product.is_active ? "Hide" : "Publish"}
                  </button>
                  <button
                    aria-label={`Delete ${product.name}`}
                    className="icon-button danger-icon"
                    onClick={() => void deleteProduct(product)}
                    title="Delete product"
                    type="button"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {(hasPrevious || hasNext) && (
        <div className="pagination">
          <button
            className="button button-quiet"
            disabled={!hasPrevious}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button button-quiet"
            disabled={!hasNext}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
