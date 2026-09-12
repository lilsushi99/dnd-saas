# ERD.md - Entity Relationship Diagram

**Project:** Nexus ERP
**Database Engine:** MySQL 8.0+
**Character Set:** utf8mb4 / utf8mb4_unicode_ci

---

## Visual ERD Diagram (Mermaid)

```mermaid
erDiagram
    BRANCHES ||--o{ FACILITIES : "contains"
    BRANCHES ||--o{ BOOKINGS : "hosts"
    BRANCHES ||--o{ EXPENSES : "incurs"
    BRANCHES ||--o{ USERS : "employs"

    CLIENTS ||--o{ BOOKINGS : "places"
    CLIENTS ||--o{ PAYMENTS : "makes"
    CLIENTS ||--o{ CLIENT_COMMUNICATIONS : "has"

    BOOKINGS ||--o{ BOOKING_ITEMS : "includes"
    BOOKINGS ||--o{ PAYMENTS : "generates"

    USERS ||--o{ AUDIT_LOGS : "performs"
    USERS }|--|| USER_ROLES_PERMISSIONS : "assigned"

    BUSINESS_SETTINGS ||--o| PROFILE_SETTINGS : "configures"

    FACILITIES ||--o{ FACILITY_ANALYTICS : "generates"

    BRANCHES {
        string id PK
        string name
        string location
        enum status
        date created_date
    }

    FACILITIES {
        string id PK
        string name
        string branch_id FK
        string branch_name
        decimal default_price
        int capacity
        enum status
        date created_date
    }

    CLIENTS {
        string id PK
        string name
        string phone
        string email
        string company
        enum status
        datetime created_at
    }

    CLIENT_COMMUNICATIONS {
        int id PK
        string client_id FK
        enum type
        text summary
        string logged_by
        datetime created_at
    }

    BOOKINGS {
        string id PK
        date date
        string client_id FK
        string client_name
        string phone
        string email
        string branch
        string facility
        int days_count
        string time_duration
        decimal amount
        enum payment_method
        int days_used
        int days_left
        enum status
        datetime created_at
    }

    BOOKING_ITEMS {
        int id PK
        string booking_id FK
        string item_name
        decimal unit_price
        int quantity
        decimal total_price
    }

    EXPENSES {
        string id PK
        string name
        decimal amount
        date date
        string branch
        string category
        text description
        enum status
        string created_by
        datetime created_at
    }

    PAYMENTS {
        string id PK
        string reference
        string booking_id FK
        string client_id FK
        decimal amount
        string payment_method
        date payment_date
        enum status
        datetime created_at
    }

    USERS {
        string id PK
        string name
        string email
        string phone
        string password_hash
        enum role
        string branch
        enum status
        string profile_photo
        datetime created_at
    }

    USER_ROLES_PERMISSIONS {
        int id PK
        string role UK
        json permissions
        datetime updated_at
    }

    BUSINESS_SETTINGS {
        int id PK
        string business_name
        text business_logo
        string currency
        string timezone
        text address
        string phone
        string email
        string language
        string booking_prefix
        string client_prefix
        string expense_prefix
        string category_prefix
        string branch_code
        datetime updated_at
    }

    AUDIT_LOGS {
        int id PK
        string user
        string action
        string ip_address
        string entity
        string entity_id
        json previous_value
        json new_value
        datetime timestamp
    }

    FILE_UPLOADS {
        int id PK
        string file_name
        string file_path
        string file_type
        int file_size
        string entity_type
        datetime uploaded_at
    }
```

---

## Entity Relationship Cardinality Table

| Parent Entity | Child Entity | Foreign Key Field | Cardinality | Action on Delete |
|---|---|---|---|---|
| `branches` | `facilities` | `facilities.branch_id` | 1 to Many | `ON DELETE CASCADE` |
| `clients` | `bookings` | `bookings.client_id` | 1 to Many | `ON DELETE CASCADE` |
| `clients` | `client_communications` | `client_communications.client_id` | 1 to Many | `ON DELETE CASCADE` |
| `clients` | `payments` | `payments.client_id` | 1 to Many | `ON DELETE CASCADE` |
| `bookings` | `booking_items` | `booking_items.booking_id` | 1 to Many | `ON DELETE CASCADE` |
| `bookings` | `payments` | `payments.booking_id` | 1 to Many (Optional) | `ON DELETE SET NULL` |

---

*End of ERD.md*
