# API_DOCUMENTATION.md - Express Backend API Reference

**Project:** Nexus ERP
**Base URL:** `/api`
**Format:** JSON (`Content-Type: application/json`)

---

## 1. Operational & Daily Logger Routes (`/api/operations`)

### `GET /api/operations/bookings`
Retrieves filtered booking records and daily summary metrics.
- **Query Params:** `branch` (string), `month` (YYYY-MM), `search` (string)
- **Response:**
  ```json
  {
    "success": true,
    "bookings": [...],
    "summary": {
      "monthlyRevenue": 48500,
      "totalBookings": 7,
      "activeBookings": 4,
      "expiredBookings": 2,
      "activeSubscriptions": 4,
      "expiredSubscriptions": 2
    }
  }
  ```

### `POST /api/operations/bookings`
Creates a new booking record using a database transaction.
- **Payload:**
  ```json
  {
    "clientName": "Acme Corp",
    "phone": "+234 803 000 1122",
    "email": "billing@acme.com",
    "branch": "Lekki Innovation Hub",
    "facility": "Co-working Space",
    "daysCount": 30,
    "timeDuration": "09:00 AM - 05:00 PM",
    "amount": 14500,
    "paymentMethod": "Wire Transfer",
    "date": "2026-08-01"
  }
  ```

### `PUT /api/operations/bookings/:id`
Updates an existing booking.

### `GET /api/operations/facility-records`
Gets facility occupancy and revenue analytics.

### `GET /api/operations/next-booking-id`
Returns generated sequence ID for the next booking (e.g. `BK-IPHIN-2026-8`).

### `GET /api/operations/settings`
Returns business settings.

### `POST /api/operations/settings`
Updates business settings.

---

## 2. CRM Routes (`/api/customers`)

### `GET /api/customers`
Returns all customer profiles with computed metric totals.

### `GET /api/customers/:id`
Returns customer detail by ID.

### `GET /api/customers/subscriptions/active`
Returns active subscriptions list.

---

## 3. Expense Routes (`/api/expenses`)

### `GET /api/expenses`
Retrieves expense records filtered by branch, category, search, and date.

### `POST /api/expenses`
Creates a new expense entry.

### `PUT /api/expenses/:id`
Updates an expense.

### `GET /api/expenses/categories`
Returns expense categories.

### `POST /api/expenses/categories`
Creates a new category.

---

## 4. Admin & System Routes (`/api/admin`)

### `GET /api/admin/branches`
Lists all branches.

### `POST /api/admin/branches`
Creates a branch.

### `GET /api/admin/facilities`
Lists all facilities.

### `POST /api/admin/facilities`
Creates a facility.

### `GET /api/admin/users`
Lists all administrative users.

### `GET /api/admin/audit-logs`
Returns the recent audit logs from MySQL.

### `POST /api/admin/upload`
Uploads file metadata to the `file_uploads` MySQL table.

---

## 5. System Health Route (`/api/health`)

### `GET /api/health`
Checks backend and MySQL connectivity.
- **Response:**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "host": "localhost",
    "timestamp": "2026-08-03T10:15:00.000Z"
  }
  ```

---

*End of API_DOCUMENTATION.md*
