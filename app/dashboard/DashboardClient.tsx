
"use client";

import { useEffect, useRef, useState } from "react";
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

type UnknownProductDraft = {
  name: string;
  price: string;
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
  const [unknownProductDrafts, setUnknownProductDrafts] = useState<UnknownProductDraft[]>([]);
  const [savingUnknownIndex, setSavingUnknownIndex] = useState<number | null>(null);
  const [unknownProductError, setUnknownProductError] = useState("");
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);

  // Seller-created products
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddDescription, setQuickAddDescription] = useState("");
  const [quickAddPrice, setQuickAddPrice] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [quickAddSuccess, setQuickAddSuccess] = useState("");

  // Camera capture state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

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

  // Attach the active camera stream to the video preview.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) return;

    video.srcObject = cameraStream;
    void video.play().catch(() => {
      setCameraError("The camera preview could not start. Please try again.");
    });

    return () => {
      video.srcObject = null;
    };
  }, [cameraStream, cameraOpen]);

  // Stop camera tracks when the camera is closed or the page is unmounted.
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  async function startCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Live camera access is unavailable in this browser or context. Use Take Photo or Upload Image instead."
      );
      return;
    }

    try {
      // Stop any previous stream before opening a new one.
      cameraStream?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setCameraStream(stream);
      setCameraOpen(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser settings, or use Take Photo / Upload Image.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device. Use Take Photo or Upload Image instead.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setCameraError("The camera may already be in use by another application. Close it and try again.");
      } else {
        setCameraError(err instanceof Error ? err.message : "Unable to access the camera.");
      }
    }
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
  }

  function captureCameraFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Wait for the preview, then try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture the camera frame. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("The captured image could not be processed. Please try again.");
        return;
      }

      const capturedFile = new File([blob], `snap-to-pay-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      handleImageSelection(capturedFile);
      stopCamera();
    }, "image/jpeg", 0.92);
  }

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
    setUnknownProductDrafts([]);
    setSelectedImage(file);
  }

  // Create a persistent catalogue product and add it to the current cart.
  async function handleQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (quickAddLoading) return;

    try {
      setQuickAddLoading(true);
      setQuickAddError("");
      setQuickAddSuccess("");

      const name = quickAddName.trim();
      const description = quickAddDescription.trim();
      const priceInRupees = Number(quickAddPrice);

      if (!name) {
        throw new Error("Please enter a product name.");
      }

      if (!Number.isFinite(priceInRupees) || priceInRupees <= 0) {
        throw new Error("Please enter a valid product price.");
      }

      // Convert INR to integer paise before sending it to the API.
      const priceInPaise = Math.round(priceInRupees * 100);

      if (!Number.isSafeInteger(priceInPaise) || priceInPaise <= 0) {
        throw new Error("The product price is outside the supported range.");
      }

      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || null,
          price: priceInPaise,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.item) {
        throw new Error(data.message || "Unable to add product.");
      }

      const newProduct: CatalogItem = data.item;

      // Keep the database-backed catalogue and current cart in sync.
      setProducts((previous) => [...previous, newProduct]);

      const matchingUnknownItem = unknownItems.find(
        (item) => item.description.trim().toLowerCase() === name.toLowerCase()
      );
      const quantityToAdd = Math.max(
        1,
        Math.min(100, matchingUnknownItem?.estimatedQuantity || 1)
      );

      setQuantities((previous) => ({
        ...previous,
        [newProduct.id]: quantityToAdd,
      }));

      // A changed cart must start a fresh sale and PayPal checkout.
      setCreatedSale(null);
      setPaypalOrder(null);
      setPaypalError("");

      setQuickAddSuccess(
        `${newProduct.name} added to your catalogue and cart.`
      );
      setQuickAddName("");
      setQuickAddDescription("");
      setQuickAddPrice("");
      setQuickAddOpen(false);
    } catch (err) {
      setQuickAddError(
        err instanceof Error ? err.message : "Unable to add custom product."
      );
    } finally {
      setQuickAddLoading(false);
    }
  }

  async function handleAddUnknownProduct(index: number) {
    if (savingUnknownIndex !== null) return;

    const item = unknownItems[index];
    const draft = unknownProductDrafts[index];
    if (!item || !draft) return;

    try {
      setSavingUnknownIndex(index);
      setUnknownProductError("");

      const name = draft.name.trim();
      const priceInRupees = Number(draft.price);

      if (!name) {
        throw new Error("Please enter a product name.");
      }
      if (!draft.price.trim() || !Number.isFinite(priceInRupees) || priceInRupees <= 0) {
        throw new Error("Enter a valid seller-confirmed price.");
      }

      const priceInPaise = Math.round(priceInRupees * 100);
      if (!Number.isSafeInteger(priceInPaise) || priceInPaise <= 0) {
        throw new Error("The product price is outside the supported range.");
      }

      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: item.description,
          price: priceInPaise,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.item) {
        throw new Error(data.message || "Unable to add product to catalogue.");
      }

      const newProduct: CatalogItem = data.item;
      const quantityToAdd = Math.max(1, Math.min(100, item.estimatedQuantity || 1));

      setProducts((previous) => [...previous, newProduct]);
      setQuantities((previous) => ({ ...previous, [newProduct.id]: quantityToAdd }));
      setUnknownItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
      setUnknownProductDrafts((previous) => previous.filter((_, itemIndex) => itemIndex !== index));

      setCreatedSale(null);
      setPaypalOrder(null);
      setPaypalError("");
    } catch (err) {
      setUnknownProductError(err instanceof Error ? err.message : "Unable to add product.");
    } finally {
      setSavingUnknownIndex(null);
    }
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

      const detectedUnknownItems = data.unknownItems || [];
      setUnknownItems(detectedUnknownItems);
      setUnknownProductDrafts(
        detectedUnknownItems.map((item) => ({
          name: item.description,
          price: "",
        }))
      );

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
    <main className="relative isolate min-h-screen overflow-hidden bg-[#100B16] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-pink-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 top-[35%] h-[520px] w-[520px] rounded-full bg-violet-600/10 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-56 left-[30%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/[0.06] blur-[140px]" />
      <header className="relative z-10 border-b border-white/10 bg-[#100B16]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">snap<span className="text-pink-400">.</span>to<span className="text-violet-400">.</span>pay
            </h1>
            <p className="text-sm text-white/50">
              Your camera-powered checkout
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-pink-200">
            Seller Dashboard
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-10">

        {/* AI IMAGE ANALYSIS */}
        <section className="rounded-2xl border border-white/10 bg-[#1A1222]/90 p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              AI-powered product detection
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Upload a photo of your products and let AI build
              your cart automatically.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* Image upload */}
            <div>
              <label
                htmlFor="product-image"
                className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.04] p-5 text-center transition hover:border-zinc-500"
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
                    <p className="mt-1 text-sm text-white/50">
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
                onChange={(event) => {
                  handleImageSelection(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />

              {/* Mobile-native camera capture. Devices may offer a camera or file picker. */}
              <input
                ref={mobileCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  handleImageSelection(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => mobileCameraInputRef.current?.click()}
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={cameraOpen ? stopCamera : startCamera}
                  className="rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {cameraOpen ? "Close Camera" : "Use Camera"}
                </button>
              </div>

              {cameraOpen && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="max-h-96 w-full object-contain"
                  />
                  <div className="flex gap-2 bg-gradient-to-r from-pink-400 to-violet-500 p-3">
                    <button
                      type="button"
                      onClick={captureCameraFrame}
                      className="flex-1 rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
                    >
                      Snap Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                  {cameraError}
                </div>
              )}

              {selectedImage && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-white/50">
                    {selectedImage.name}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalysisError("");
                      setAiAnalysisComplete(false);
                      setUnknownItems([]);
                      setUnknownProductDrafts([]);
                    }}
                    className="shrink-0 text-sm font-medium text-red-600 hover:text-red-200"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>

            {/* Analysis controls */}
            <div className="flex flex-col justify-center">
              <div className="rounded-xl bg-white/[0.04] p-5">
                <h3 className="font-semibold">
                  How it works
                </h3>

                <ol className="mt-4 space-y-3 text-sm text-white/65">
                  <li>01. Upload a photo of your products.</li>
                  <li>02. AI identifies products from your catalogue.</li>
                  <li>03. Review and correct the detected quantities.</li>
                  <li>04. Confirm the cart and proceed to checkout.</li>
                </ol>
              </div>

              <button
                onClick={handleAnalyzeImage}
                disabled={!selectedImage || analyzing}
                className="mt-5 w-full rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {analyzing
                  ? "Analyzing image..."
                  : "Analyze Image"}
              </button>

              {analyzing && (
                <p className="mt-3 text-center text-sm text-white/50">
                  Gemini is identifying your products. This may
                  take a few seconds.
                </p>
              )}

              {analyzing && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-zinc-950 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400" />
                    </span>
                    <span className="text-sm font-semibold tracking-wide">SCANNING PRODUCTS</span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-700">
                    <div className="h-full w-2/5 animate-pulse rounded-full bg-cyan-400" />
                  </div>
                  <p className="mt-2 text-xs text-white/60">Matching visual features against your seller catalogue...</p>
                </div>
              )}

              {analysisError && (
                <div className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-200">
                  {analysisError}
                </div>
              )}
            </div>
          </div>

          {/* AI detection results */}
          {aiAnalysisComplete && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    AI detection results
                  </h3>
                  <p className="text-sm text-white/50">
                    Review the detected products before checkout.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Analysis successful
                </span>
              </div>

              {cartItems.length === 0 && unknownItems.length === 0 ? (
                <div className="rounded-lg bg-amber-400/10 p-4 text-sm text-amber-200">
                  No catalogue products were identified in this image.
                  You can add products manually below.
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold">
                          {product.name}
                        </h4>

                        <p className="mt-1 text-sm text-white/50">
                          {formatPrice(product.price)} per unit
                        </p>

                        {confidenceScores[product.id] !== undefined && (
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceScores[product.id] >= 0.9
                              ? "bg-emerald-400/15 text-emerald-200"
                              : "bg-amber-400/15 text-amber-200"
                              }`}
                          >
                            {confidenceScores[product.id] >= 0.9 ? "High" : "Review"} confidence ·{" "}
                            {(confidenceScores[product.id] * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="h-9 w-9 rounded-lg border border-white/15 hover:bg-white/[0.08]"
                          aria-label={`Decrease ${product.name}`}
                        >
                          −
                        </button>

                        <span className="min-w-6 text-center font-semibold">
                          {quantities[product.id]}
                        </span>

                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="h-9 w-9 rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:brightness-110"
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
                          className="ml-1 text-sm font-medium text-red-600 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unknownItems.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
                  <h4 className="font-semibold text-amber-200">
                    New products detected
                  </h4>

                  <p className="mt-1 text-sm text-amber-200">
                    These products were not found in your catalogue. Review the
                    AI-suggested names and enter a seller-confirmed price.
                  </p>

                  {unknownProductError && (
                    <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-200">
                      {unknownProductError}
                    </p>
                  )}

                  <div className="mt-4 space-y-4">
                    {unknownItems.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-amber-300/20 bg-[#21172B] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white/90">
                            New product {index + 1}
                          </span>
                          <span className="text-xs text-white/50">
                            Quantity detected: {item.estimatedQuantity}
                          </span>
                        </div>

                        <label className="block text-sm font-medium text-white/80">
                          AI-suggested product name
                          <input
                            type="text"
                            value={unknownProductDrafts[index]?.name || ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setUnknownProductDrafts((previous) =>
                                previous.map((draft, draftIndex) =>
                                  draftIndex === index
                                    ? { ...draft, name: value }
                                    : draft
                                )
                              );
                            }}
                            maxLength={255}
                            placeholder="Enter product name"
                            className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-pink-400/60"
                          />
                        </label>

                        <label className="mt-3 block text-sm font-medium text-white/80">
                          Seller-confirmed price (INR)
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={unknownProductDrafts[index]?.price || ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setUnknownProductDrafts((previous) =>
                                previous.map((draft, draftIndex) =>
                                  draftIndex === index
                                    ? { ...draft, price: value }
                                    : draft
                                )
                              );
                            }}
                            placeholder="Enter price"
                            className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-pink-400/60"
                          />
                        </label>

                        <p className="mt-2 text-xs text-white/50">
                          AI suggestions require seller verification. No price
                          is automatically assigned.
                        </p>

                        <button
                          type="button"
                          onClick={() => handleAddUnknownProduct(index)}
                          disabled={savingUnknownIndex !== null}
                          className="mt-4 w-full rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-4 py-2.5 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingUnknownIndex === index
                            ? "Adding product..."
                            : "Confirm & Add to Catalogue and Cart"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-white/35">
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
              <p className="mt-1 text-sm text-white/50">
                Add or adjust products manually.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuickAddOpen((open) => !open);
                  setQuickAddError("");
                }}
                className="mt-4 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.08]"
              >
                {quickAddOpen ? "Close Quick Add" : "+ Quick Add Custom Product"}
              </button>
              {quickAddSuccess && (
                <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                  {quickAddSuccess}
                </p>
              )}
              {quickAddOpen && (
                <form onSubmit={handleQuickAdd} className="mt-4 max-w-xl space-y-3 rounded-xl border border-white/10 bg-[#1A1222]/90 p-5 shadow-sm">
                  <h3 className="font-semibold">Add a custom product</h3>
                  <label className="block text-sm font-medium">
                    Product name
                    <input
                      required
                      maxLength={255}
                      value={quickAddName}
                      onChange={(event) => setQuickAddName(event.target.value)}
                      placeholder="e.g. Used AirPods Pro"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-pink-400/60 font-normal"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Description (optional)
                    <textarea
                      maxLength={2000}
                      value={quickAddDescription}
                      onChange={(event) => setQuickAddDescription(event.target.value)}
                      placeholder="Product condition, model, or other details"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-pink-400/60 font-normal"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Price (INR)
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quickAddPrice}
                      onChange={(event) => setQuickAddPrice(event.target.value)}
                      placeholder="e.g. 2500.00"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-pink-400/60 font-normal"
                    />
                  </label>
                  {quickAddError && (
                    <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-200">{quickAddError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={quickAddLoading}
                    className="rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {quickAddLoading ? "Saving product..." : "Save Product & Add to Cart"}
                  </button>
                </form>
              )}
            </div>

            {loading && (
              <div className="rounded-xl border border-white/10 bg-[#1A1222] p-10 text-center text-white/50">
                Loading catalogue...
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-300/20 bg-red-400/10 p-5 text-red-200">
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
              <div className="rounded-xl border border-white/10 bg-[#1A1222] p-10 text-center text-white/50">
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
                      className="rounded-xl border border-white/10 bg-[#1A1222]/90 p-5 shadow-sm"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400/20 to-violet-500/20 text-xl">
                        🍰
                      </div>

                      <h3 className="font-semibold">
                        {product.name}
                      </h3>

                      <p className="mt-1 min-h-10 text-sm text-white/50">
                        {product.description || "No description available"}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-bold">
                          {formatPrice(product.price)}
                        </span>

                        {quantity === 0 ? (
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(product.id, -1)}
                              className="h-8 w-8 rounded-md border border-white/15 hover:bg-white/[0.08]"
                              aria-label={`Decrease ${product.name} quantity`}
                            >
                              −
                            </button>

                            <span className="min-w-4 text-center font-semibold">
                              {quantity}
                            </span>

                            <button
                              onClick={() => updateQuantity(product.id, 1)}
                              className="h-8 w-8 rounded-md bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:brightness-110"
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
          <aside className="h-fit rounded-xl border border-white/10 bg-[#1A1222]/90 p-6 shadow-sm lg:sticky lg:top-8">
            <h2 className="text-xl font-semibold">
              Current Cart
            </h2>

            <p className="mt-1 text-sm text-white/50">
              {totalItems} {totalItems === 1 ? "item" : "items"} selected
            </p>

            <div className="my-5 border-t border-white/10" />

            {cartItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">
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
                      <p className="mt-1 text-white/50">
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

            <div className="my-5 border-t border-white/10" />

            <div className="flex justify-between text-lg font-bold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0 || checkoutLoading}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-pink-400 to-violet-500 px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {checkoutLoading ? "Creating Sale..." : "Continue to Checkout"}
            </button>

            {createdSale && (
              <div className="mt-5 space-y-4">
                {/* Sale Confirmation Header */}
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-emerald-200">
                      Sale created
                    </h3>
                    <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                      ID: {createdSale.saleId.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-emerald-100">
                      {formatPrice(createdSale.total)}
                    </span>
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
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
                      <div className="rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-xs text-red-200">
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
                  <div className="rounded-2xl border border-pink-300/30 bg-[#1A1222] p-5 text-white shadow-lg">
                    {/* Header with Scan to Pay & Pending status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400/100" />
                        </span>
                        <h3 className="font-bold text-white">
                          Scan to Pay
                        </h3>
                      </div>

                      <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                        Payment pending
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-white/50">
                      PayPal Sandbox approval QR
                    </p>

                    {/* Dual currency amount display (INR + USD) */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                          Sale Amount
                        </p>
                        <p className="text-lg font-bold text-white">
                          {formatPrice(paypalOrder.originalAmount.value)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                          PayPal Charged
                        </p>
                        <p className="text-lg font-bold text-[#0070BA]">
                          ${paypalOrder.paypalAmount.value} USD
                        </p>
                      </div>
                    </div>

                    {/* Real PayPal Approval URL QR Code */}
                    <div className="my-5 flex flex-col items-center justify-center">
                      <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-inner">
                        <img
                          src={paypalOrder.qrCodeDataUrl}
                          alt="PayPal Checkout QR Code"
                          className="h-52 w-52 rounded-lg object-contain"
                        />
                      </div>
                      <p className="mt-3 text-center text-xs text-white/50">
                        Buyer can scan this QR code using their camera on another device
                      </p>
                    </div>

                    {/* Alternative Clickable Approval Link */}
                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <p className="text-center text-xs font-medium text-white/65">
                        Or open the PayPal checkout link
                      </p>

                      <a
                        href={paypalOrder.approvalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-400 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        <span>Open PayPal Checkout ↗</span>
                      </a>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paypalOrder.approvalUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }}
                        className="w-full text-center text-xs text-white/50 underline hover:text-white/90"
                      >
                        {copiedLink
                          ? "✓ Link copied to clipboard!"
                          : "Copy checkout link"}
                      </button>
                    </div>

                    {/* Order ID tracking */}
                    <div className="mt-4 border-t border-white/10 pt-3 text-center">
                      <p className="font-mono text-[10px] text-white/35">
                        PayPal Order ID: {paypalOrder.paypalOrderId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="mt-3 text-center text-xs text-white/35">
              Payments powered by PayPal
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
