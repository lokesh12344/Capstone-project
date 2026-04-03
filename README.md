# SmartOps

SmartOps is a full-stack inventory and sales management system for small businesses such as kirana stores. It combines a React Native mobile application with a Node.js and PostgreSQL backend to support product management, stock tracking, sales recording, customer management, and barcode-assisted workflows.

The system is designed as an offline-first application. The mobile app persists data locally using WatermelonDB, allows users to continue working without connectivity, and synchronizes changes with the backend when the device reconnects.

## Features

### Authentication

- JWT-based business authentication with register and login flows
- Business-scoped access control enforced by backend middleware
- Multi-tenant data isolation using `business_id`

### Inventory Management

- Product catalog with barcode, category, brand, unit, reorder level, and selling price
- Stock batches with quantity, batch number, expiry date, and cost price
- Stock transaction ledger for stock-in, sales, returns, and adjustments
- Read-only product APIs for inventory views, low-stock checks, and near-expiry queries

### Sales and Customers

- Sales order creation with order totals, payment mode, and sale timestamp
- Line-item level tracking with product, batch, quantity, and unit price
- Customer records with purchase activity and segmentation support
- Sales and order history persisted locally for offline access

### Offline-First Sync

- Local-first writes in the mobile app using WatermelonDB
- Pull and push synchronization with backend timestamp checkpoints
- Business-scoped sync payloads for products, stock, sales, and customers
- Reconnect-triggered synchronization with persisted auth and business context

### Barcode and Lookup

- Barcode lookup against business inventory
- Barcode catalog lookup from a seeded product catalog
- Fallback lookup using the OpenFoodFacts API

### Analytics

- Dashboard summary endpoint
- Sales analytics grouped by period
- Top product reporting
- Customer activity and segment statistics

## Architecture Overview

The repository is organized as a monorepo with two primary applications:

- `SmartOps/`: React Native mobile app built with Expo
- `backend/`: Node.js and Express API backed by PostgreSQL

### Mobile App

The mobile app stores operational data in WatermelonDB and treats the local database as the primary source of truth for UI interactions. Screens read from local collections and write to local tables through database actions. Sync is handled by a dedicated sync engine that pulls remote changes and pushes locally created records to the backend.

### Backend API

The backend exposes REST endpoints for authentication, sync, barcode lookup, products, and analytics. PostgreSQL is used as the system-of-record database. Data is partitioned by `business_id`, and protected routes are authenticated using JWT middleware.

### Data Flow

1. A user performs an action in the mobile app.
2. The app writes the change to WatermelonDB immediately.
3. The UI updates from local state without requiring network access.
4. When connectivity is available, the sync engine sends local changes to the backend.
5. The backend persists those changes to PostgreSQL and returns any server-side updates since `lastPulledAt`.
6. The mobile app merges the remote change set into the local database.

## Tech Stack

### Frontend

- React Native
- Expo
- React Navigation
- WatermelonDB
- AsyncStorage
- NetInfo

### Backend

- Node.js
- Express
- JSON Web Tokens
- bcryptjs
- express-validator
- helmet
- express-rate-limit
- morgan

### Database

- PostgreSQL
- WatermelonDB with LokiJS adapter in development
- Planned SQLite-backed WatermelonDB adapter for production mobile storage

### Other Tools

- OpenFoodFacts API for barcode lookup fallback
- Nodemon for backend development
- ESLint and Prettier for code quality

## Monorepo Structure

```text
capstone/
├── README.md
├── backend/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── barcodeController.js
│       │   ├── productsController.js
│       │   ├── syncController.js
│       │   └── analyticsController.js
│       ├── db/
│       │   ├── pool.js
│       │   └── migrate.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── errors.js
│       ├── routes/
│       │   └── index.js
│       └── scripts/
│           ├── seedOpenFoodFacts.js
│           └── seed_demo.js
└── SmartOps/
    ├── App.js
    ├── package.json
    └── src/
        ├── database/
        │   ├── index.js
        │   ├── schema.js
        │   ├── actions.js
        │   └── appInit.js
        ├── models/
        │   ├── Product.js
        │   ├── StockBatch.js
        │   ├── StockTransaction.js
        │   ├── SaleOrder.js
        │   ├── SaleItem.js
        │   └── Customer.js
        ├── screens/
        ├── services/
        ├── sync/
        │   └── syncEngine.js
        └── theme/
```

### Key Directories

- `backend/src/controllers`: Business logic for auth, sync, barcode, product, and analytics endpoints
- `backend/src/db`: PostgreSQL connection pooling and SQL schema migration
- `backend/src/routes`: Express route definitions
- `SmartOps/src/database`: WatermelonDB adapter, schema, initialization, and write/query helpers
- `SmartOps/src/models`: WatermelonDB model definitions for synced tables
- `SmartOps/src/screens`: Mobile UI flows such as login, inventory, order entry, and history
- `SmartOps/src/sync`: Sync engine that integrates WatermelonDB sync with backend endpoints
- `SmartOps/src/services`: External API wrappers used by the mobile app

## Setup Instructions

### Backend Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend/`.

3. Configure PostgreSQL and set `DATABASE_URL`.

4. Run database migrations:

```bash
npm run migrate
```

5. Start the backend server:

```bash
npm run dev
```

For production:

```bash
npm start
```

### Mobile App Setup

1. Install dependencies:

```bash
cd SmartOps
npm install
```

2. Verify the API base URL in `SmartOps/src/sync/syncEngine.js` points to your backend.

3. Start the Expo development server:

```bash
npm run start
```

4. Run on Android:

```bash
npm run android
```

5. Run on iOS:

```bash
npm run ios
```

### Notes on Local Database

- The current development setup uses WatermelonDB with a LokiJS adapter.
- SQLite support is already included through Expo dependencies and is the intended production storage path.
- Development behavior may differ from production persistence characteristics until the SQLite adapter is adopted.

## Environment Variables

### Backend

The backend requires the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret used to sign JWTs

The following are optional but supported by the current codebase:

- `PORT`: HTTP server port, defaults to `3000`
- `NODE_ENV`: Runtime environment
- `JWT_EXPIRES_IN`: JWT expiration window, defaults to `30d`
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds
- `RATE_LIMIT_MAX`: Maximum requests per window

### Mobile App

There is no dedicated `.env` file currently wired into the mobile app. The backend base URL is configured directly in:

- `SmartOps/src/sync/syncEngine.js`

## Database Schema Notes

- The backend stores sync-critical timestamps as `BIGINT` Unix milliseconds.
- Examples include `updated_at`, `sale_at`, `txn_at`, `expiry_date`, and `last_purchase_at`.
- Business data is partitioned by `business_id` to support multi-tenant isolation.
- Sync payloads use backend column names such as `selling_price`, `unit_price`, and `sale_at`.

## Sync System

The sync system follows WatermelonDB's pull/push model.

### pullChanges

- The mobile app calls `GET /sync/pull?last_pulled_at=<unix_ms>`.
- The backend returns all rows updated after `last_pulled_at` for the authenticated business.
- The response contains a `timestamp` and a `changes` object grouped by table.

### pushChanges

- The mobile app calls `POST /sync/push` with a WatermelonDB change set.
- The backend processes the incoming changes inside a PostgreSQL transaction.
- Inserts use idempotent upsert or conflict-safe insert patterns depending on the table.

### lastPulledAt

- `lastPulledAt` is the client's checkpoint for the last successful pull.
- It is used to request only server-side changes that occurred after the previous sync window.

### Conflict Handling Assumptions

- The current implementation assumes simple last-write and append-only workflows for most records.
- Orders and sale items are effectively treated as immutable after creation.
- Products and customers are updated through upsert semantics.
- There is no advanced per-field conflict resolution strategy yet.

## API Overview

All API routes are mounted under `/api`.

### Auth

#### `POST /auth/register`

Registers a new business and returns a JWT plus business metadata.

Example request:

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "My Store",
  "phone": "9999999999",
  "password": "secret123",
  "type": "kirana"
}
```

Example response:

```json
{
  "token": "<jwt>",
  "business": {
    "id": "uuid",
    "name": "My Store",
    "phone": "9999999999",
    "type": "kirana",
    "created_at": "..."
  }
}
```

#### `POST /auth/login`

Authenticates an existing business and returns a JWT.

Example request:

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "9999999999",
  "password": "secret123"
}
```

Example response:

```json
{
  "token": "<jwt>",
  "business": {
    "id": "uuid",
    "name": "My Store",
    "phone": "9999999999",
    "type": "kirana"
  }
}
```

### Sync

#### `GET /sync/pull`

Returns server-side changes since the supplied timestamp for the authenticated business.

Example request:

```http
GET /api/sync/pull?last_pulled_at=1710000000000
Authorization: Bearer <jwt>
```

Example response:

```json
{
  "timestamp": 1710000100000,
  "changes": {
    "products": {
      "created": [],
      "updated": [],
      "deleted": []
    }
  }
}
```

#### `POST /sync/push`

Accepts a WatermelonDB change set and persists it for the authenticated business.

Example request:

```http
POST /api/sync/push
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "changes": {
    "products": {
      "created": [],
      "updated": [],
      "deleted": []
    }
  },
  "lastPulledAt": 1710000000000
}
```

Example response:

```json
{
  "success": true,
  "synced_at": 1710000200000
}
```

### Barcode

#### `GET /barcode/:code`

Looks up a barcode in business inventory, local catalog, or OpenFoodFacts.

Example request:

```http
GET /api/barcode/8901030893346
Authorization: Bearer <jwt>
```

Example response:

```json
{
  "source": "catalog",
  "suggestion": {
    "barcode": "8901030893346",
    "name": "Aashirvaad Atta 5kg",
    "brand": "Aashirvaad",
    "category": "Atta & Flour",
    "quantity": "5kg"
  }
}
```

### Analytics

#### `GET /analytics/dashboard`

Returns dashboard summary data for the authenticated business.

Example response:

```json
{
  "today": {
    "orders": 4,
    "revenue": 1250
  },
  "alerts": {
    "low_stock": 3,
    "near_expiry": 1
  },
  "top_products_week": []
}
```

#### `GET /analytics/sales`

Returns revenue and order totals grouped by `daily`, `weekly`, or `monthly` period.

#### `GET /analytics/top-products`

Returns top-selling products for the recent reporting window.

#### `GET /analytics/customers`

Returns customer activity summary and customer-level segment data.

## Frontend Structure

### `screens/`

Contains mobile UI screens such as login, home dashboard, inventory, stock-in, product registration, new order, alerts, and order history.

### `database/`

Contains the WatermelonDB setup:

- `schema.js`: table definitions
- `index.js`: database and adapter initialization
- `actions.js`: local write and query helpers
- `appInit.js`: app bootstrapping and DB warm-up

### `models/`

Defines WatermelonDB model classes used by the app, including field decorators and relationships for products, batches, transactions, sales, items, and customers.

### `sync/`

Contains the sync engine responsible for:

- restoring auth and business context
- connecting WatermelonDB sync to backend endpoints
- pulling and pushing changes
- triggering sync after writes and on reconnect

### `services/`

Contains service wrappers for API access outside the sync engine, such as barcode lookup support.

## Development Notes

- The current development adapter uses LokiJS for WatermelonDB persistence.
- Development persistence behavior can differ from a production SQLite-backed adapter.
- Sync requires a valid JWT and a valid `businessId` restored on the device before synchronization will run.
- The backend is the source of truth for durable persisted data; the mobile app is optimized for resilient local operation first.

## Future Improvements

- Migrate WatermelonDB storage from LokiJS development setup to SQLite for production
- Introduce stronger conflict resolution beyond current upsert and immutable-record assumptions
- Improve background sync scheduling and retry behavior
- Move mobile API configuration to environment-based app config
- Add sync observability and operational diagnostics for production deployments
- Build a web dashboard for business owners with analytics, operational summaries, and reporting views
- Add richer analytics modules such as trend charts, payment breakdowns, top products, and inventory health metrics
- Expand CRM capabilities with customer profiles, purchase history, segment-based views, and retention insights
- Add customer engagement workflows such as follow-up reminders, loyalty tracking, and repeat-customer reporting
- Support admin-oriented inventory workflows such as reorder recommendations, supplier tracking, and stock adjustment audit trails
