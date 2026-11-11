
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

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

type PayPalOrderDetails = {
  paypalOrderId: string;
  approvalUrl: string;
  qrCodeDataUrl: string;
  originalAmount: {
    currency: string;
    value: number;
  };
  paypalAmount: {
    currency: string;
    value: string;
  };
};

type UnknownItem = {
  description: string;
  estimatedQuantity: number;
};

type AnalyzeResult = {
  success: boolean;
  message?: string;
  matchedItems: {
    catalogItemId: string;
    productName: string;
    quantity: number;
    confidence: number;
  }[];
  unknownItems: UnknownItem[];
};

export default function Home() {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [confidenceScores, setConfidenceScores] = useState<
    Record<string, number>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [createdSale, setCreatedSale] = useState<CreatedSale | null>(null);

  const [paypalOrder, setPaypalOrder] = useState<PayPalOrderDetails | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalError, setPaypalError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [unknownItems, setUnknownItems] = useState<UnknownItem[]>([]);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);

  // Load catalogue
  useEffect(() => {
    async function fetchCatalogue() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/catalog");
        const data = await response.json();

        if (!response.ok || !data.success) {
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

  // Generate and clean up image preview URL
  useEffect(() => {
    if (!selectedImage) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(selectedImage);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(price / 100);
  }

  function updateQuantity(id: string, change: number) {
    setCreatedSale(null);
    setPaypalOrder(null);
    setPaypalError("");

    setQuantities((previous) => {
      const current = previous[id] || 0;
      const updated = Math.max(0, current + change);

      return {
        ...previous,
        [id]: updated,
      };
    });
  }

  function handleImageSelection(file?: File) {
    if (!file) return;

    setAnalysisError("");
    setAiAnalysisComplete(false);
    setUnknownItems([]);
    setSelectedImage(file);
  }

  async function handleAnalyzeImage() {
    if (!selectedImage || analyzing) return;

    try {
      setAnalyzing(true);
      setAnalysisError("");
      setCreatedSale(null);
      setPaypalOrder(null);
      setPaypalError("");

      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data: AnalyzeResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Image analysis failed");
      }

      const detectedQuantities: Record<string, number> = {};
      const detectedConfidence: Record<string, number> = {};

      for (const item of data.matchedItems) {
        const existsInCatalogue = products.some(
          (product) => product.id === item.catalogItemId
        );

        if (!existsInCatalogue) continue;

        detectedQuantities[item.catalogItemId] =
          (detectedQuantities[item.catalogItemId] || 0) +
          item.quantity;

        detectedConfidence[item.catalogItemId] = Math.max(
          detectedConfidence[item.catalogItemId] || 0,
          item.confidence
        );
      }

      // AI results become the initial cart.
      // Seller can edit this cart before checkout.
      setQuantities(detectedQuantities);
      setConfidenceScores(detectedConfidence);
      setUnknownItems(data.unknownItems || []);
      setAiAnalysisComplete(true);
    } catch (err) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the image"
      );
    } finally {
      setAnalyzing(false);
    }
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
      setPaypalOrder(null);
      setPaypalError("");

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
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleCreatePayPalOrder() {
    if (!createdSale || paypalLoading) return;

    try {
      setPaypalLoading(true);
      setPaypalError("");

      const response = await fetch(`/api/sales/${createdSale.saleId}/paypal`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.details || "Unable to create PayPal order"
        );
      }

      // Generate the real QR code directly from the PayPal Sandbox approval URL
      const qrCodeDataUrl = await QRCode.toDataURL(data.approvalUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#09090b",
          light: "#ffffff",
        },
      });

      setPaypalOrder({
        paypalOrderId: data.paypalOrderId,
        approvalUrl: data.approvalUrl,
        qrCodeDataUrl,
        originalAmount: data.originalAmount,
        paypalAmount: data.paypalAmount,
      });
    } catch (err) {
      setPaypalError(
        err instanceof Error
          ? err.message
          : "Failed to generate PayPal order"
      );
    } finally {
      setPaypalLoading(false);
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

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">

        {/* AI IMAGE ANALYSIS */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              AI-powered product detection
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Upload a photo of your products and let AI build
              your cart automatically.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* Image upload */}
            <div>
              <label
                htmlFor="product-image"
                className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-5 text-center transition hover:border-zinc-500"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Selected products"
                    className="max-h-72 w-full rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <div className="mb-3 text-4xl">📷</div>
                    <p className="font-semibold">
                      Upload a product image
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      PNG, JPG or WebP · Maximum 5 MB
                    </p>
                  </>
                )}
              </label>

              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) =>
                  handleImageSelection(event.target.files?.[0])
                }
              />

              {selectedImage && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-zinc-500">
                    {selectedImage.name}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalysisError("");
                      setAiAnalysisComplete(false);
                      setUnknownItems([]);
                    }}
                    className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>

            {/* Analysis controls */}
            <div className="flex flex-col justify-center">
              <div className="rounded-xl bg-zinc-50 p-5">
                <h3 className="font-semibold">
                  How it works
                </h3>

                <ol className="mt-4 space-y-3 text-sm text-zinc-600">
                  <li>01. Upload a photo of your products.</li>
                  <li>02. AI identifies products from your catalogue.</li>
                  <li>03. Review and correct the detected quantities.</li>
                  <li>04. Confirm the cart and proceed to checkout.</li>
                </ol>
              </div>

              <button
                onClick={handleAnalyzeImage}
                disabled={!selectedImage || analyzing}
                className="mt-5 w-full rounded-lg bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {analyzing
                  ? "Analyzing image..."
                  : "Analyze Image"}
              </button>

              {analyzing && (
                <p className="mt-3 text-center text-sm text-zinc-500">
                  Gemini is identifying your products. This may
                  take a few seconds.
                </p>
              )}

              {analysisError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {analysisError}
                </div>
              )}
            </div>
          </div>

          {/* AI detection results */}
          {aiAnalysisComplete && (
            <div className="mt-7 border-t border-zinc-200 pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    AI detection results
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Review the detected products before checkout.
                  </p>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  Analysis successful
                </span>
              </div>

              {cartItems.length === 0 && unknownItems.length === 0 ? (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  No catalogue products were identified in this image.
                  You can add products manually below.
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold">
                          {product.name}
                        </h4>

                        <p className="mt-1 text-sm text-zinc-500">
                          {formatPrice(product.price)} per unit
                        </p>

                        {confidenceScores[product.id] !== undefined && (
                          <p className="mt-1 text-xs text-green-700">
                            AI confidence:{" "}
                            {(confidenceScores[product.id] * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="h-9 w-9 rounded-lg border border-zinc-300 hover:bg-zinc-100"
                          aria-label={`Decrease ${product.name}`}
                        >
                          −
                        </button>

                        <span className="min-w-6 text-center font-semibold">
                          {quantities[product.id]}
                        </span>

                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="h-9 w-9 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700"
                          aria-label={`Increase ${product.name}`}
                        >
                          +
                        </button>

                        <button
                          onClick={() =>
                            setQuantities((previous) => ({
                              ...previous,
                              [product.id]: 0,
                            }))
                          }
                          className="ml-1 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unknownItems.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="font-semibold text-amber-900">
                    Unrecognized products
                  </h4>

                  <p className="mt-1 text-sm text-amber-800">
                    These items could not be matched to your catalogue.
                    Add the correct products manually if needed.
                  </p>

                  <ul className="mt-3 space-y-2">
                    {unknownItems.map((item, index) => (
                      <li
                        key={index}
                        className="text-sm text-amber-900"
                      >
                        {item.description} — estimated quantity:{" "}
                        {item.estimatedQuantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 text-xs text-zinc-400">
                AI results are suggestions. Verify the products and
                quantities before creating the sale.
              </p>
            </div>
          )}
        </section>

        {/* CATALOGUE AND CART */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">
                Product Catalogue
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Add or adjust products manually.
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

                      <h3 className="font-semibold">
                        {product.name}
                      </h3>

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

          {/* CART */}
          <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
            <h2 className="text-xl font-semibold">
              Current Cart
            </h2>

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
                      <p className="font-medium">
                        {product.name}
                      </p>
                      <p className="mt-1 text-zinc-500">
                        {quantities[product.id]} ×{" "}
                        {formatPrice(product.price)}
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
              <div className="mt-5 space-y-4">
                {/* Sale Confirmation Header */}
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-green-900">
                      Sale created
                    </h3>
                    <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      ID: {createdSale.saleId.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-green-950">
                      {formatPrice(createdSale.total)}
                    </span>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Status: {createdSale.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* 1. Pay with PayPal Button (shown immediately below sale confirmation) */}
                {!paypalOrder && (
                  <div className="space-y-3">
                    <button
                      onClick={handleCreatePayPalOrder}
                      disabled={paypalLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070BA] px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#005ea6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {paypalLoading ? (
                        <>
                          <svg
                            className="h-5 w-5 animate-spin text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          <span>Creating PayPal Order...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">💳</span>
                          <span>Pay with PayPal</span>
                        </>
                      )}
                    </button>

                    {paypalError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        <p className="font-semibold">PayPal Error:</p>
                        <p>{paypalError}</p>
                        <button
                          onClick={handleCreatePayPalOrder}
                          className="mt-1 font-semibold underline hover:text-red-900"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Scan to Pay & QR Checkout Display (once PayPal order created) */}
                {paypalOrder && (
                  <div className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-lg">
                    {/* Header with Scan to Pay & Pending status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                        </span>
                        <h3 className="font-bold text-zinc-900">
                          Scan to Pay
                        </h3>
                      </div>

                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Payment pending
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-zinc-500">
                      PayPal Sandbox approval QR
                    </p>

                    {/* Dual currency amount display (INR + USD) */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                          Sale Amount
                        </p>
                        <p className="text-lg font-bold text-zinc-900">
                          {formatPrice(paypalOrder.originalAmount.value)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                          PayPal Charged
                        </p>
                        <p className="text-lg font-bold text-[#0070BA]">
                          ${paypalOrder.paypalAmount.value} USD
                        </p>
                      </div>
                    </div>

                    {/* Real PayPal Approval URL QR Code */}
                    <div className="my-5 flex flex-col items-center justify-center">
                      <div className="rounded-2xl border-4 border-zinc-900 bg-white p-2 shadow-inner">
                        <img
                          src={paypalOrder.qrCodeDataUrl}
                          alt="PayPal Checkout QR Code"
                          className="h-52 w-52 rounded-lg object-contain"
                        />
                      </div>
                      <p className="mt-3 text-center text-xs text-zinc-500">
                        Buyer can scan this QR code using their camera on another device
                      </p>
                    </div>

                    {/* Alternative Clickable Approval Link */}
                    <div className="space-y-2 border-t border-zinc-200 pt-4">
                      <p className="text-center text-xs font-medium text-zinc-600">
                        Or open the PayPal checkout link
                      </p>

                      <a
                        href={paypalOrder.approvalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
                      >
                        <span>Open PayPal Checkout ↗</span>
                      </a>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paypalOrder.approvalUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }}
                        className="w-full text-center text-xs text-zinc-500 underline hover:text-zinc-800"
                      >
                        {copiedLink
                          ? "✓ Link copied to clipboard!"
                          : "Copy checkout link"}
                      </button>
                    </div>

                    {/* Order ID tracking */}
                    <div className="mt-4 border-t border-zinc-100 pt-3 text-center">
                      <p className="font-mono text-[10px] text-zinc-400">
                        PayPal Order ID: {paypalOrder.paypalOrderId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="mt-3 text-center text-xs text-zinc-400">
              Payments powered by PayPal
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
