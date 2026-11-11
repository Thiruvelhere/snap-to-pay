
"use client";

import { useEffect, useState } from "react";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

type CreatedSale = {
  saleId: string;
  total: number;
  paymentStatus: string;
};

export default function Home() {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [createdSale, setCreatedSale] = useState<CreatedSale | null>(null);

  useEffect(() => {
    async function fetchCatalogue() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/catalog");

        if (!response.ok) {
          throw new Error("Failed to fetch catalogue");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Unable to load products");
        }

        setProducts(data.items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCatalogue();
  }, []);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(price / 100);
  }

  function updateQuantity(id: string, change: number) {
    setCreatedSale(null);

    setQuantities((previous) => {
      const current = previous[id] || 0;
      const updated = Math.max(0, current + change);

      return {
        ...previous,
        [id]: updated,
      };
    });
  }

  const cartItems = products.filter(
    (product) => (quantities[product.id] || 0) > 0
  );

  const totalItems = cartItems.reduce(
    (sum, product) => sum + quantities[product.id],
    0
  );

  const subtotal = cartItems.reduce(
    (sum, product) => sum + product.price * quantities[product.id],
    0
  );

  async function handleCheckout() {
    if (cartItems.length === 0 || checkoutLoading) return;

    try {
      setCheckoutLoading(true);
      setCreatedSale(null);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems.map((product) => ({
            catalogItemId: product.id,
            quantity: quantities[product.id],
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create sale");
      }

      setCreatedSale({
        saleId: data.sale.saleId,
        total: data.sale.total,
        paymentStatus: data.sale.paymentStatus,
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Snap to Pay
            </h1>
            <p className="text-sm text-zinc-500">
              Your camera-powered checkout
            </p>
          </div>

          <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium">
            Seller Dashboard
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              Product Catalogue
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Select products to build your customer's cart.
            </p>
          </div>

          {loading && (
            <div className="rounded-xl border bg-white p-10 text-center text-zinc-500">
              Loading catalogue...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="rounded-xl border bg-white p-10 text-center text-zinc-500">
              No products available.
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const quantity = quantities[product.id] || 0;

                return (
                  <article
                    key={product.id}
                    className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-xl">
                      🍰
                    </div>

                    <h3 className="font-semibold">{product.name}</h3>

                    <p className="mt-1 min-h-10 text-sm text-zinc-500">
                      {product.description || "No description available"}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold">
                        {formatPrice(product.price)}
                      </span>

                      {quantity === 0 ? (
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="h-8 w-8 rounded-md border border-zinc-300 hover:bg-zinc-100"
                            aria-label={`Decrease ${product.name} quantity`}
                          >
                            −
                          </button>

                          <span className="min-w-4 text-center font-semibold">
                            {quantity}
                          </span>

                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="h-8 w-8 rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
                            aria-label={`Increase ${product.name} quantity`}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
          <h2 className="text-xl font-semibold">Current Cart</h2>

          <p className="mt-1 text-sm text-zinc-500">
            {totalItems} {totalItems === 1 ? "item" : "items"} selected
          </p>

          <div className="my-5 border-t border-zinc-200" />

          {cartItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              Your cart is empty. Add products to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {cartItems.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="mt-1 text-zinc-500">
                      {quantities[product.id]} × {formatPrice(product.price)}
                    </p>
                  </div>

                  <span className="font-semibold">
                    {formatPrice(
                      product.price * quantities[product.id]
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="my-5 border-t border-zinc-200" />

          <div className="flex justify-between text-lg font-bold">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || checkoutLoading}
            className="mt-6 w-full rounded-lg bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {checkoutLoading ? "Creating Sale..." : "Continue to Checkout"}
          </button>

          {createdSale && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="font-semibold text-green-800">
                Sale created successfully!
              </h3>

              <p className="mt-2 break-all text-sm text-green-700">
                Sale ID: {createdSale.saleId}
              </p>

              <p className="mt-1 text-sm text-green-700">
                Amount: {formatPrice(createdSale.total)}
              </p>

              <p className="mt-1 text-sm text-green-700">
                Status: {createdSale.paymentStatus}
              </p>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-zinc-400">
            Payments powered by PayPal
          </p>
        </aside>
      </div>
    </main>
  );
}
