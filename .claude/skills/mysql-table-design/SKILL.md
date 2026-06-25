---
name: mysql-table-design
description: Design MySQL-specific schemas with best practices. Covers data types, indexing, constraints, performance patterns, and MySQL-specific optimizations for InnoDB.
license: MIT
compatibility: opencode
---

# MySQL Table Design

## Core Rules

- Define a **PRIMARY KEY** for every table (prefer `INT AUTO_INCREMENT` or `BIGINT AUTO_INCREMENT`)
- **Normalize first (to 3NF)** to eliminate data redundancy; denormalize only for proven performance needs
- Add **NOT NULL** everywhere semantically required; use sensible **DEFAULT** values
- Create **indexes for actual query patterns**: PK (auto), **FK columns (manual!)**, frequent WHERE clauses, and ORDER BY columns
- Use **utf8mb4** character set for full Unicode support including emoji
- **Avoid foreign keys for high-concurrency scenarios** (MySQL-specific recommendation)

## MySQL "Gotchas"

- **Storage Engine**: Use **InnoDB** for transactional tables; MyISAM only for read-heavy, non-transactional data
- **Case Sensitivity**: Database and table names are case-sensitive on Linux/macOS, case-insensitive on Windows
- **Foreign Key Constraints**: Can impact write performance in high-concurrency scenarios
- **Query Cache**: Removed in MySQL 8.0; focus on proper indexing instead
- **NULL Values**: Multiple NULL values are allowed in UNIQUE constraints (same as PostgreSQL)
- **Auto Increment Gaps**: Gaps in IDs are normal behavior from rollbacks and concurrent transactions

## Data Types

### Best Practices for MySQL

- **IDs**: `INT AUTO_INCREMENT PRIMARY KEY` for most cases; use `BIGINT AUTO_INCREMENT` for high-volume tables
- **Integers**: Use `UNSIGNED` when values are non-negative to double the range
- **Strings**: Use `VARCHAR(N)` with appropriate length limits; avoid `TEXT` when possible
- **Money**: Use `DECIMAL(P,S)` for exact financial calculations (never `FLOAT` or `DOUBLE`)
- **Time**: Use `TIMESTAMP` for creation/last-modified dates; `DATETIME` for arbitrary dates
- **Booleans**: Use `TINYINT(1)` with `NOT NULL DEFAULT 0/1` constraints
- **Enums**: Use `ENUM` for small, stable sets of string values

### Recommended Data Types

```sql
-- IDs
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY

-- Strings
name VARCHAR(100) NOT NULL
email VARCHAR(255) NOT NULL UNIQUE
description TEXT

-- Numbers
quantity INT UNSIGNED DEFAULT 1
price DECIMAL(10,2) NOT NULL
rating TINYINT UNSIGNED

-- Time
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
event_date DATETIME

-- Booleans
is_active TINYINT(1) NOT NULL DEFAULT 1
has_permission TINYINT(1) NOT NULL DEFAULT 0
```

### Data Types to Avoid

- **DO NOT** use `FLOAT`/`DOUBLE` for money; use `DECIMAL`
- **DO NOT** use `TEXT` for frequently queried columns; use `VARCHAR`
- **DO NOT** use `CHAR` unless for fixed-length data (MD5 hashes, UUIDs)
- **DO NOT** use `BLOB` in frequently updated tables; consider file storage

## Indexing Strategy

### When to Index

- **Primary Keys**: Automatic with PRIMARY KEY constraint
- **Foreign Keys**: Manual indexing recommended for JOIN performance
- **WHERE clauses**: Columns frequently used in WHERE conditions
- **ORDER BY**: Columns used for sorting
- **Composite Indexes**: Multiple columns often queried together

### Index Types

```sql
-- B-tree (default)
CREATE INDEX idx_user_email ON users(email);

-- Composite index (order matters!)
CREATE INDEX idx_posts_status_date ON posts(status, published_at);

-- Full-text search
CREATE FULLTEXT INDEX idx_posts_content ON posts(title, content);

-- Unique index
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

### Index Optimization Tips

- **Leftmost Prefix**: Composite indexes work from left to right
- **Selectivity**: Put most selective columns first in composite indexes
- **Covering Indexes**: Include frequently selected columns with `INCLUDE` (MySQL 8.0+)
- **Partial Indexes**: Use filtered indexes for common subsets (MySQL 8.0+)

## Table Design Patterns

### Users Table
```sql
CREATE TABLE users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Products Table
```sql
CREATE TABLE products (
    product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INT UNSIGNED,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_products_category (category_id),
    INDEX idx_products_active (is_active),
    INDEX idx_products_price (price),
    FULLTEXT INDEX idx_products_search (name, description),
    
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Orders Table
```sql
CREATE TABLE orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created (created_at),
    INDEX idx_orders_number (order_number)
    
    -- Consider omitting FK for high-concurrency scenarios
    -- FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Performance Optimization

### High-Concurrency Considerations

- **Minimize Foreign Keys**: Consider application-level constraints for high-write tables
- **Optimize for Covering Indexes**: Design queries to use index-only scans
- **Batch Operations**: Use multi-row INSERT statements instead of single rows
- **Connection Pooling**: Implement proper connection management in application

### Partitioning (MySQL 8.0+)

```sql
-- Range partitioning by date
CREATE TABLE logs (
    id BIGINT AUTO_INCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT,
    PRIMARY KEY (id, created_at)
) ENGINE=InnoDB
PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
    PARTITION p202401 VALUES LESS THAN (UNIX_TIMESTAMP('2024-02-01')),
    PARTITION p202402 VALUES LESS THAN (UNIX_TIMESTAMP('2024-03-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

## MySQL-Specific Features

### Generated Columns (MySQL 5.7+)

```sql
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0825,
    price_with_tax DECIMAL(12,2) GENERATED ALWAYS AS (price * (1 + tax_rate)) STORED,
    
    INDEX idx_products_price_with_tax (price_with_tax)
) ENGINE=InnoDB;
```

### JSON Columns (MySQL 5.7+)

```sql
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- JSON indexes (MySQL 8.0+)
    INDEX idx_preferences_theme ((CAST(preferences->>'$.theme' AS CHAR(20))))
) ENGINE=InnoDB;

-- Query examples
SELECT * FROM users WHERE preferences->>'$.theme' = 'dark';
SELECT * FROM users WHERE JSON_CONTAINS(preferences, '"newsletter"', '$.subscriptions');
```

## Security Best Practices

- **Character Set**: Always use `utf8mb4` with `utf8mb4_unicode_ci` collation
- **Password Storage**: Use `VARCHAR(255)` for password hashes (bcrypt, Argon2)
- **Sensitive Data**: Encrypt sensitive information before storage
- **Input Validation**: Use proper data types and constraints
- **Prepared Statements**: Always use parameterized queries

## Query Optimization

```sql
-- Good: Uses indexes efficiently
SELECT p.* FROM products p
WHERE p.category_id = 5 AND p.is_active = 1
ORDER BY p.created_at DESC
LIMIT 10;

-- Bad: Can't use index on category_id due to function
SELECT * FROM products WHERE LOWER(category_name) = 'electronics';

-- Good: Uses covering index
SELECT id, name, price FROM products 
WHERE category_id = 5 AND is_active = 1;
```

## Example Schema for E-commerce

```sql
-- Categories
CREATE TABLE categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT UNSIGNED NULL,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    INDEX idx_categories_parent (parent_id),
    INDEX idx_categories_slug (slug),
    
    FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE products (
    product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_products_category (category_id),
    INDEX idx_products_sku (sku),
    INDEX idx_products_active (is_active),
    INDEX idx_products_price (price),
    FULLTEXT INDEX idx_products_search (name, description)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items
CREATE TABLE order_items (
    order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

This skill provides MySQL-specific guidance for designing robust, performant database schemas in your car rental project.