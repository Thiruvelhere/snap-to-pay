# Snap to Pay

### AI-Powered Visual Commerce and QR-Based Payment Platform

Snap to Pay is an AI-powered commerce platform designed to simplify product identification, catalogue management, and digital payments. Sellers can capture product images using a camera or upload them, use AI to identify products and match them against an existing catalogue, review and correct product information, manage a shopping cart, and generate QR-based PayPal payments.

The platform combines computer vision capabilities through Google's Gemini API, a PostgreSQL-backed product and sales management system, and PayPal Sandbox payment processing.

---

## 1. Project Overview

### Problem Statement

Traditional point-of-sale workflows require sellers to manually search for products, enter product details, calculate totals, and initiate payment transactions.

These processes can become inefficient when sellers manage multiple products or need to process transactions quickly.

### Proposed Solution

Snap to Pay introduces a visual-first commerce workflow:

1. Capture or upload a photograph of products.
2. Use AI to identify products in the image.
3. Match identified products against the seller's catalogue.
4. Allow sellers to review and correct product information.
5. Add identified products to a shopping cart.
6. Calculate the total amount on the server.
7. Generate a PayPal payment QR code.
8. Complete payment and display a transaction receipt.

### Core Objective

To make product identification and checkout faster by connecting AI-assisted product recognition with catalogue management and QR-based payments.

---

## 2. Technology Stack

The project uses a modern full-stack architecture built around Next.js, TypeScript, PostgreSQL, Gemini, and PayPal.

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16 | Application framework |
| Programming Language | TypeScript | Type safety |
| UI | React | Component-based interface |
| Styling | Tailwind CSS | Responsive styling |
| Animation | GSAP | UI animations |
| Scroll Animation | GSAP ScrollTrigger | Scroll-based animations |
| Smooth Scrolling | Lenis | Smooth scrolling |
| Backend | Next.js App Router | Server-side logic and API routes |
| Database | Neon PostgreSQL | Cloud relational database |
| ORM | Drizzle ORM | Database queries and schema management |
| Validation | Zod | Request and data validation |
| AI | Google Gemini API | Image-based product identification |
| Authentication | Better Auth | User registration and login |
| Authentication Adapter | @better-auth/drizzle-adapter | PostgreSQL integration |
| Payments | PayPal REST API | Payment order creation and capture |
| QR Generation | qrcode | Payment QR code generation |
| Testing | Vitest | Automated testing |
| Runtime | Node.js | JavaScript execution environment |
| Deployment | Render | Application hosting |
| Version Control | Git and GitHub | Source code management |

### Important Dependencies

Some of the primary project dependencies include:

- `next`
- `react`
- `react-dom`
- `typescript`
- `tailwindcss`
- `drizzle-orm`
- `drizzle-kit`
- `pg`
- `zod`
- `@google/genai`
- `better-auth`
- `@better-auth/drizzle-adapter`
- `qrcode`
- `gsap`
- `lenis`
- `vitest`
- `tsx`

The exact installed versions are maintained in `package.json` and `package-lock.json`.

---

## 3. System Architecture

The application follows a full-stack architecture using Next.js App Router.

```text
                    SELLER
                      |
                      v
              Next.js Frontend
                      |
          +-----------+-----------+
          |                       |
          v                       v
    Authentication          Dashboard
    Better Auth                  |
                                |
                      Capture / Upload Image
                                |
                                v
                         Gemini API
                                |
                      Product Identification
                                |
                                v
                       Catalogue Matching
                                |
                                v
                       Seller Confirmation
                                |
                                v
                         Shopping Cart
                                |
                                v
                      Next.js Backend APIs
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
              Neon PostgreSQL          PayPal API
                    |                       |
                    v                       v
             Sales and Products       Payment Order
                                            |
                                            v
                                      QR Generation
                                            |
                                            v
                                      Customer Payment
                                            |
                                            v
                                      Payment Capture
                                            |
                                            v
                                      Transaction Receipt
```

### Architectural Components

**Frontend:** Provides the seller interface for authentication, image capture, product review, catalogue management, cart operations, and payment initiation.

**Backend:** Handles API requests, validates incoming data, communicates with external services, and performs server-side business logic.

**Database:** Stores catalogue information, sales transactions, sale line items, and authentication records.

**AI Service:** Identifies products from uploaded images and assists in matching them to existing catalogue entries.

**Payment Service:** Integrates with PayPal to create and capture payment orders.

---

## 4. Application Features

### 4.1 Public Landing Page

A dedicated landing page introduces the Snap to Pay platform.

Implemented elements:

- `snap.to.pay` branding.
- Hero section with the headline: "Selling should feel as simple as a snap."
- Explanation of the Capture, Identify, and Pay workflow.
- Product feature sections.
- Call-to-action navigation.
- Responsive layout.
- Footer and supporting sections.

**Visual design:**

- Deep plum background: `#100B16`.
- Dusty pink, lavender, and violet accents.
- Gradient elements and ambient background effects.
- Grid-based background styling.
- GSAP-powered entrance and reveal animations.
- ScrollTrigger-based animation effects.
- Lenis smooth scrolling.
- Reduced-motion considerations.

### 4.2 Seller Authentication

Authentication is implemented using Better Auth.

Implemented functionality:

- Seller registration.
- Email and password login.
- Password confirmation during registration.
- Minimum password length of eight characters.
- Authentication session handling.
- Redirect to the dashboard after successful registration or login.
- Server-side dashboard session validation.

Authentication-related files:

```text
src/
└── lib/
    ├── auth.ts
    └── auth-client.ts

app/
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
└── api/
    └── auth/
        └── [...all]/
            └── route.ts
```

The dashboard uses server-side session verification. Unauthenticated users are redirected to `/login`.

The current implementation protects the dashboard page. Authentication and seller-level authorization still need to be extended to all business API endpoints.

### 4.3 Product Image Capture

Snap to Pay supports image-based product identification.

Implemented functionality:

- Upload product images.
- Access the device camera.
- Use the rear camera on supported mobile devices.
- Display a live camera preview.
- Capture photographs using the video stream and canvas.
- Convert captured images into files.
- Send captured images to the existing AI analysis workflow.
- Handle camera permission errors.
- Stop camera streams when the camera component is closed.
- Retain image upload as a fallback.

The camera functionality uses browser media capabilities through `getUserMedia()`.

### 4.4 AI-Based Product Recognition

Google Gemini is integrated through the `@google/genai` SDK.

The image analysis endpoint is:

```text
POST /api/analyze
```

The general workflow:

1. Receive an image from the frontend.
2. Pass the image to Gemini.
3. Request product identification.
4. Extract structured product information.
5. Match identified products against catalogue IDs.
6. Return matched and unknown products separately.
7. Display the results for seller review.

The AI workflow distinguishes between:

- Products already present in the catalogue.
- Products identified in the image but not yet available in the catalogue.

The analysis response is structured to accommodate missing or incomplete AI fields using validation defaults.

Examples include:

- Empty `matchedItems` arrays when no matches are returned.
- Default quantity of `1`.
- Default confidence of `0.5`.
- Empty `unknownItems` arrays.
- Nullable optional product attributes.

This makes the application more resilient to incomplete model responses.

**Important:** AI identification is an assistive feature. The seller remains responsible for reviewing product information and confirming prices.

#### Gemini API Quota Limitation

During development, Gemini returned:

```text
429 RESOURCE_EXHAUSTED
```

The issue was caused by the API's free-tier request quota being exhausted.

This was an external API quota limitation rather than a database or application failure.

### 4.5 Catalogue Management

The catalogue stores products that sellers can identify and add to transactions.

Implemented functionality:

- Retrieve catalogue products.
- Add new catalogue products.
- Match AI-identified products against existing catalogue entries.
- Use catalogue IDs for transaction creation.
- Support seller-assisted onboarding of unknown products.

Catalogue API:

```text
GET  /api/catalog
POST /api/catalog
```

The database uses PostgreSQL through Neon and Drizzle ORM.

### 4.6 Unknown Product Onboarding

When Gemini identifies a product that does not exist in the catalogue, it is displayed separately.

The seller can:

1. Review the detected product name.
2. Edit the product name.
3. Review the detected quantity.
4. Enter the product price manually.
5. Confirm the product.
6. Add it to the catalogue.
7. Automatically add it to the current cart.

The frontend sends the new product to the catalogue API.

After successful creation, the application:

- Converts the seller-entered INR price into paise.
- Adds the newly created product to the local catalogue.
- Adds the product to the cart with its detected quantity.
- Removes the pending unknown product from the review list.

AI-generated pricing is not used. The seller manually enters the price.

### 4.7 Shopping Cart

The shopping cart manages products selected for a transaction.

Implemented workflow:

- Add catalogue products.
- Add newly onboarded products.
- Maintain product quantities.
- Calculate the cart total.
- Submit the cart for server-side sale creation.

The frontend does not act as the authority for transaction pricing.

### 4.8 Server-Side Sales Management

Sales are created through:

```text
POST /api/sales
```

The backend:

1. Receives the requested catalogue product IDs and quantities.
2. Validates the incoming request.
3. Checks the referenced catalogue products.
4. Retrieves product prices from the database.
5. Recalculates the transaction total on the server.
6. Stores monetary values as integer paise.
7. Creates the sale and its associated line items.

This prevents the client from determining the authoritative transaction price.

Additional endpoint:

```text
GET /api/sales/[id]
```

Retrieves an existing sale and its associated line items.

### 4.9 PayPal Integration

PayPal Sandbox is integrated for payment processing.

The application uses PayPal REST APIs with OAuth 2.0 authentication.

Payment workflow:

1. A sale is created in the database.
2. The frontend requests a PayPal order for that sale.
3. The backend retrieves the sale amount.
4. The INR amount is converted into USD using a configured demonstration conversion rate.
5. The backend creates a PayPal Sandbox order.
6. PayPal returns an approval URL.
7. A QR code is generated from the approval URL.
8. The customer scans the QR code.
9. The customer completes the PayPal approval process.
10. The application captures the PayPal payment.
11. The transaction receipt is displayed.

Relevant endpoint:

```text
POST /api/sales/[id]/paypal
```

Payment capture endpoint:

```text
POST /api/sales/[id]/capture
```

The capture operation uses a PayPal request ID for request idempotency:

```text
PayPal-Request-Id:
snap-to-pay-capture-${sale.id}
```

The payment return flow uses the configured application base URL rather than hardcoded localhost URLs.

**Testing:** PayPal Sandbox payment creation, QR-based approval, and successful payment capture were tested through the deployed Render application.

**Currency limitation:** The INR-to-USD conversion rate is currently configured through an environment variable. It is a demonstration conversion rate, not a live exchange-rate integration.

### 4.10 QR Code Generation

The `qrcode` package is used to generate a QR code containing the PayPal approval URL.

This allows customers to scan the generated QR code and continue to PayPal's payment approval flow.

The QR code does not directly contain a bank UPI payment instruction. It points to the PayPal approval URL.

### 4.11 Transaction Receipt

After payment approval and capture, the application displays a transaction receipt.

Current receipt information includes:

- Sale ID.
- Transaction amount in INR.
- Payment status.
- PayPal capture ID.

The return page handles query parameters using `useSearchParams` and Suspense.

Receipt-related frontend files:

```text
app/
└── pay/
    └── return/
        ├── page.tsx
        └── PayPalReturnClient.tsx
```

The capture endpoint currently returns a `captureId` field. The frontend response type should remain aligned with this field name.

Detailed receipt line items and persistent product image display are not yet implemented.

---

## 5. Database Architecture

### Database Technology

- Neon PostgreSQL.
- Drizzle ORM.
- `pg` PostgreSQL driver.
- Drizzle Kit for migrations and schema management.

Database connection:

```text
src/lib/db/index.ts
```

### Application Tables

The application currently uses three primary business tables.

#### 5.1 catalog_items

Stores the seller's product catalogue.

Purpose:

- Store product information.
- Maintain catalogue IDs.
- Provide product data for AI matching.
- Supply authoritative product prices for sales.

#### 5.2 sales

Stores transaction-level information.

Purpose:

- Maintain sale records.
- Store transaction totals.
- Track payment-related information.
- Connect sales to their line items.

#### 5.3 sale_lines

Stores individual products belonging to a sale.

Purpose:

- Associate catalogue products with transactions.
- Store purchased quantities.
- Preserve line-level transaction information.

### Authentication Tables

Better Auth generated the following tables:

| Table | Purpose |
|---|---|
| `user` | Stores registered users |
| `session` | Stores authentication sessions |
| `account` | Stores account credentials and provider information |
| `verification` | Stores verification-related records |

Authentication schema:

```text
src/lib/db/auth-schema.ts
```

Application schema:

```text
src/lib/db/schema.ts
```

Database migrations:

```text
drizzle/
├── 0001_fixed_famine.sql
└── meta/
    ├── 0001_snapshot.json
    └── _journal.json
```

### Monetary Representation

The application stores INR amounts as integer paise rather than floating-point values.

For example:

```text
₹100.50 = 10050 paise
```

This avoids floating-point precision problems during monetary calculations.

---

## 6. API Reference

The following routes have been implemented.

| Method | Endpoint | Responsibility |
|---|---|---|
| GET | `/api/auth/[...all]` | Better Auth GET handler |
| POST | `/api/auth/[...all]` | Better Auth POST handler |
| POST | `/api/analyze` | AI image analysis |
| GET | `/api/catalog` | Retrieve catalogue |
| POST | `/api/catalog` | Add catalogue product |
| POST | `/api/sales` | Create a sale |
| GET | `/api/sales/[id]` | Retrieve sale details |
| POST | `/api/sales/[id]/paypal` | Create PayPal order |
| POST | `/api/sales/[id]/capture` | Capture PayPal payment |

The exact request and response contracts should be referenced from their respective route implementations.

---

## 7. Authentication Architecture

Better Auth is used for email and password authentication.

### Server Configuration

File:

```text
src/lib/auth.ts
```

Uses:

- `betterAuth`
- `drizzleAdapter`
- PostgreSQL database connection

### Client Configuration

File:

```text
src/lib/auth-client.ts
```

Uses:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

### Dashboard Protection

The dashboard is protected through a server component.

File:

```text
app/dashboard/page.tsx
```

The page:

1. Retrieves request headers.
2. Checks the current Better Auth session.
3. Redirects unauthenticated users to `/login`.
4. Renders the dashboard client component for authenticated users.

This separates server-side authentication checks from the client-side dashboard interface.

---

## 8. Environment Configuration

Create a `.env` file in the project root.

Required configuration:

```env
# Database
DATABASE_URL=

# Gemini AI
GEMINI_API_KEY=
GEMINI_MODEL=

# PayPal Sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Currency conversion (demonstration rate)
PAYPAL_INR_TO_USD_RATE=85

# Application URL
APP_BASE_URL=http://localhost:3000

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

### Environment Variable Description

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model identifier |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox secret |
| `PAYPAL_BASE_URL` | PayPal API base URL |
| `PAYPAL_INR_TO_USD_RATE` | Configured INR-to-USD demonstration rate |
| `APP_BASE_URL` | Application URL used for payment redirects |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth |
| `BETTER_AUTH_URL` | Better Auth application URL |

**Security considerations:**

- Never commit `.env` files.
- Never expose API keys or payment credentials in frontend code.
- Configure production secrets through the hosting provider's environment settings.
- Use HTTPS in production.
- Keep Sandbox and Live PayPal credentials separate.

---

## 9. Project Structure

The project uses the Next.js App Router with root-level `app/` and `src/lib/` directories.

```text
snap-to-pay/
│
├── app/
│   │
│   ├── page.tsx
│   │
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── register/
│   │   └── page.tsx
│   │
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── DashboardClient.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts
│   │   │
│   │   ├── analyze/
│   │   │   └── route.ts
│   │   │
│   │   ├── catalog/
│   │   │   └── route.ts
│   │   │
│   │   └── sales/
│   │       ├── route.ts
│   │       └── [id]/
│   │           ├── route.ts
│   │           ├── paypal/
│   │           │   └── route.ts
│   │           └── capture/
│   │               └── route.ts
│   │
│   └── pay/
│       └── return/
│           ├── page.tsx
│           └── PayPalReturnClient.tsx
│
├── src/
│   └── lib/
│       ├── auth.ts
│       ├── auth-client.ts
│       └── db/
│           ├── index.ts
│           ├── schema.ts
│           └── auth-schema.ts
│
├── drizzle/
│   ├── 0001_fixed_famine.sql
│   └── meta/
│       ├── 0001_snapshot.json
│       └── _journal.json
│
├── drizzle.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
└── .env
```

This is a representative structure of the implemented application. Additional configuration and generated files may exist in the repository.

---

## 10. Local Development Setup

### Prerequisites

- Node.js.
- npm.
- Git.
- Neon PostgreSQL database.
- Google Gemini API key.
- PayPal Developer Sandbox account.

### Step 1: Clone the Repository

```bash
git clone https://github.com/Thiruvelhere/snap-to-pay.git
```

Navigate into the project:

```bash
cd snap-to-pay
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create `.env` in the project root and configure the required variables.

### Step 4: Apply Database Migrations

```bash
npm run db:migrate
```

### Step 5: Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Useful Development Commands

```bash
# Start development server
npm run dev

# Build production application
npm run build

# Start production server
npm run start

# Run Drizzle migrations
npm run db:migrate

# Open Drizzle Studio
npx drizzle-kit studio
```

Refer to `package.json` for the exact available scripts.

---

## 11. Deployment

### Hosting

The application has been deployed using Render.

### Deployment Configuration

The deployed application requires:

- Neon PostgreSQL connection string.
- Gemini API credentials.
- PayPal Sandbox credentials.
- Better Auth secret.
- Production application URL.

The following URLs must point to the deployed application:

```env
APP_BASE_URL=https://YOUR-RENDER-APP-URL
BETTER_AUTH_URL=https://YOUR-RENDER-APP-URL
```

All required environment variables must be configured in Render.

### Deployment Verification

The following functionality has been tested on the deployed application:

- Application accessibility.
- Seller registration and login.
- Dashboard access.
- PayPal Sandbox order creation.
- QR-based payment approval.
- Successful PayPal payment capture.

The deployed application successfully completed a Sandbox payment transaction.

---

## 12. Development Challenges and Resolutions

### 12.1 Database Integration

**Challenge:** Connecting the application to a cloud PostgreSQL database while maintaining a manageable schema and migration workflow.

**Resolution:** Integrated Neon PostgreSQL with Drizzle ORM and Drizzle Kit.

### 12.2 AI Response Reliability

**Challenge:** AI model responses can contain missing or incomplete fields.

**Resolution:** Added validation defaults and nullable handling for optional Gemini response attributes.

### 12.3 Gemini API Rate Limits

**Challenge:** The free-tier API returned `429 RESOURCE_EXHAUSTED` after reaching its daily request quota.

**Resolution:** Identified the issue as an external API quota limitation rather than an application error.

### 12.4 Product Price Integrity

**Challenge:** Client-side prices cannot be trusted for transaction calculations.

**Resolution:** The backend retrieves catalogue prices and recalculates the total using server-side data.

### 12.5 PayPal Redirect Handling

**Challenge:** Localhost URLs in the PayPal return and cancellation flow would not work correctly after deployment.

**Resolution:** Introduced `APP_BASE_URL` to construct environment-specific payment redirect URLs.

### 12.6 Payment Capture

**Challenge:** Payment capture needs to be handled consistently.

**Resolution:** Implemented a dedicated capture endpoint and PayPal request idempotency key.

### 12.7 Authentication Integration

**Challenge:** Adding authentication without disrupting the existing database and application tables.

**Resolution:** Integrated Better Auth with the Drizzle adapter and generated the authentication schema as separate tables.

### 12.8 Dependency Compatibility

**Challenge:** Better Auth's dependency tree introduced a peer dependency conflict involving optional SvelteKit and Vite dependencies.

**Resolution:** Installed the Better Auth packages using:

```bash
npm install better-auth @better-auth/drizzle-adapter --legacy-peer-deps
```

This avoided an unnecessary Vite upgrade.

---

## 13. Current Implementation Status

### Implemented

- [x] Public landing page.
- [x] Responsive frontend.
- [x] GSAP animations and Lenis smooth scrolling.
- [x] Seller registration.
- [x] Seller login.
- [x] Better Auth integration.
- [x] PostgreSQL authentication tables.
- [x] Server-side dashboard protection.
- [x] Product image upload.
- [x] Camera access and image capture.
- [x] Gemini-based product identification.
- [x] Catalogue matching.
- [x] Unknown product identification.
- [x] Seller-assisted product onboarding.
- [x] Product catalogue API.
- [x] Shopping cart.
- [x] Server-side sales creation.
- [x] Integer-paise monetary calculations.
- [x] PayPal Sandbox integration.
- [x] PayPal order creation.
- [x] QR code generation.
- [x] PayPal payment capture.
- [x] Transaction receipt.
- [x] Render deployment.
- [x] Successful deployed Sandbox payment test.

### Not Yet Implemented

- [ ] Logout interface.
- [ ] Authentication and seller-level authorization across all business APIs.
- [ ] Seller-specific catalogue ownership and multi-tenant isolation.
- [ ] Persistent storage for product photographs.
- [ ] Full barcode scanning and catalogue matching.
- [ ] Detailed receipt with purchased line items.
- [ ] Production PayPal Live integration.
- [ ] PayPal webhooks and payment reconciliation.
- [ ] Live currency exchange-rate integration.
- [ ] Cryptographic proof-of-sale ledger.
- [ ] Public transaction verification page.
- [ ] External anchoring of transaction hashes.

---

## 14. Planned Development: Cryptographic Proof of Sale

An important planned enhancement is the introduction of a tamper-evident transaction verification system.

The objective is to associate a successfully captured payment with a verifiable record of the corresponding sale.

### Proposed Workflow

```text
             Successful PayPal Capture
                       |
                       v
                 Sale Information
                       |
                       v
              Canonical Data Record
                       |
                       v
                  SHA-256 Hash
                       |
                       v
              Previous Hash Reference
                       |
                       v
               Sale Proof Record
                       |
                       v
               Verification API
                       |
                       v
              Public Verification
```

### Planned Components

**1. Sale Proof Table**

A new `sale_proofs` table will store the cryptographic representation of completed transactions.

**2. Canonical Transaction Record**

The system will construct a deterministic representation of the relevant sale information.

**3. SHA-256 Hashing**

The canonical transaction record will be hashed using SHA-256.

**4. Hash Chaining**

Each new proof record will reference the previous record's hash, creating a sequential chain.

**5. Verification API**

A verification endpoint will recalculate the hash and compare it against the stored proof.

**6. Public Verification Page**

A customer or third party will be able to verify whether the transaction information matches its recorded proof.

### Important Security Consideration

A SHA-256 hash alone does not prove that a payment occurred.

The payment must first be confirmed through a trusted payment provider, such as a successfully captured PayPal transaction.

Furthermore, storing a hash chain entirely within the same writable database does not make it immutable. A sufficiently privileged administrator could modify records and recompute the chain.

External checkpoint anchoring or another independently controlled trust mechanism would be required for stronger tamper resistance.

This feature is planned and has not yet been implemented.

---

## 15. Security Considerations and Future Improvements

The current implementation establishes the primary commerce workflow, but further security work is necessary before production use.

Priority improvements include:

1. Enforce authentication on all seller-specific API routes.
2. Associate every catalogue item and sale with an authenticated seller.
3. Implement ownership checks for all sale and catalogue operations.
4. Validate all API request payloads.
5. Add payment webhook verification and reconciliation.
6. Protect payment capture against unauthorized requests.
7. Store uploaded images securely if persistent image history is required.
8. Introduce appropriate API rate limits.
9. Avoid exposing sensitive payment and AI credentials.
10. Implement external anchoring for cryptographic transaction proofs.

---

## 16. Future Scope

Potential future development directions include:

- Multi-merchant support.
- Seller analytics dashboard.
- Sales history and transaction management.
- Persistent product image storage.
- Barcode and QR-based product identification.
- Improved AI product matching.
- Multiple payment providers.
- UPI integration.
- Automated inventory management.
- Transaction fraud detection.
- Cryptographic proof-of-sale verification.
- External proof anchoring.
- Detailed financial reporting.

These are future development possibilities, not current application capabilities.

---

## 17. Repository

**GitHub:** https://github.com/Thiruvelhere/snap-to-pay

**Deployment:** Render

**Database:** Neon PostgreSQL

---

## 18. Project Summary

Snap to Pay is a full-stack AI-assisted commerce platform that connects visual product identification, catalogue management, and digital payments into a single workflow.

The project combines:

- Next.js and TypeScript for full-stack development.
- Google Gemini for image-based product identification.
- Neon PostgreSQL and Drizzle ORM for persistent data management.
- Better Auth for seller authentication.
- PayPal REST APIs for payment processing.
- QR code generation for payment approval.
- Render for application deployment.

The current implementation successfully supports the core workflow from product image capture through AI-assisted catalogue matching, cart creation, PayPal Sandbox payment, and transaction receipt generation.

The next major engineering milestone is implementing cryptographically verifiable proof-of-sale records.

---

**Snap to Pay — Capture. Identify. Pay.**