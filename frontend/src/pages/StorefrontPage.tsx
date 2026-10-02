import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Product } from "../api/types";
import { EmptyState, InlineError } from "../components/Feedback";
import { ProductCard } from "../components/ProductCard";

export function StorefrontPage() {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    api
      .products({ search, active: active || undefined, page })
      .then((result) => {
        if (!current) return;
        setProducts(result.results);
        setCount(result.count);
        setHasNext(Boolean(result.next));
        setHasPrevious(Boolean(result.previous));
      })
      .catch((cause: unknown) => {
        if (current) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "The collection could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [active, page, reload, search]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPage(1);
    setSearch(searchText.trim());
  }

  function retryProducts() {
    setLoading(true);
    setError(null);
    setReload((value) => value + 1);
  }

  return (
    <>
      <section className="editorial-hero">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">
            A small shop for everyday living
          </span>
          <h1>
            Good things,
            <br />
            chosen <em>well.</em>
          </h1>
          <p>
            Useful, lasting things for the moments that make a day feel like
            yours.
          </p>
          <a className="hero-link" href="#collection">
            Meet the collection <ArrowDown aria-hidden="true" size={16} />
          </a>
        </div>
        <div className="hero-image-wrap">
          <img
            alt="A sunlit neighborhood shop with carefully arranged shelves"
            className="hero-image"
            fetchPriority="high"
            src="/hero-shop.svg"
          />
          <span className="hero-image-note">A little more considered</span>
        </div>
        <span className="hero-index" aria-hidden="true">
          01 / 06
        </span>
      </section>

      <section className="collection-section" id="collection">
        <div className="section-heading">
          <div>
            <span className="eyebrow">The collection</span>
            <h2>Things worth keeping close</h2>
          </div>
          {!loading && !error && (
            <span className="result-count">
              {count} {count === 1 ? "piece" : "pieces"}
            </span>
          )}
        </div>

        <div className="catalog-controls">
          <form className="search-form" onSubmit={submitSearch} role="search">
            <Search aria-hidden="true" size={18} />
            <label className="visually-hidden" htmlFor="product-search">
              Search by product name
            </label>
            <input
              autoComplete="off"
              id="product-search"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Find something by name"
              type="search"
              value={searchText}
            />
            <button className="search-submit" type="submit">
              Search
            </button>
          </form>
          <label className="filter-select">
            <SlidersHorizontal aria-hidden="true" size={16} />
            <span className="visually-hidden">Availability</span>
            <select
              onChange={(event) => {
                setLoading(true);
                setError(null);
                setActive(event.target.value);
                setPage(1);
              }}
              value={active}
            >
              <option value="true">Available now</option>
              <option value="">All items</option>
              <option value="false">Unavailable</option>
            </select>
          </label>
        </div>

        {error && <InlineError onRetry={retryProducts}>{error}</InlineError>}
        {loading ? (
          <div
            aria-label="Loading products"
            className="product-grid"
            role="status"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div className="product-skeleton" key={index} />
            ))}
          </div>
        ) : !error && products.length === 0 ? (
          <EmptyState
            detail="Try another name or change the availability filter."
            title="Nothing on this shelf just yet."
            action={
              <button
                className="button button-quiet"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setSearchText("");
                  setSearch("");
                  setActive("true");
                  setPage(1);
                }}
                type="button"
              >
                Clear filters
              </button>
            }
          />
        ) : !error ? (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {(hasPrevious || hasNext) && (
              <nav aria-label="Product pages" className="pagination">
                <button
                  className="button button-quiet"
                  disabled={!hasPrevious || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((value) => Math.max(1, value - 1));
                  }}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={16} /> Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="button button-quiet"
                  disabled={!hasNext || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((value) => value + 1);
                  }}
                  type="button"
                >
                  Next{" "}
                  <ArrowLeft
                    aria-hidden="true"
                    className="flip-icon"
                    size={16}
                  />
                </button>
              </nav>
            )}
          </>
        ) : null}
      </section>

      <section className="quiet-note">
        <span className="quiet-note-mark" aria-hidden="true">
          B.
        </span>
        <p>
          Less, but better. Find something that earns its place in your
          everyday.
        </p>
        <Link to="/account">
          A note about your account <ArrowLeft aria-hidden="true" size={15} />
        </Link>
      </section>
    </>
  );
}
