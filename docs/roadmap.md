# Basket Roadmap

Basket is a production-oriented e-commerce backend built with Go.

The project is designed to model real backend engineering problems such as transactional workflows, inventory consistency, concurrency, authentication, payment processing, asynchronous events, caching, observability, testing, and deployment.

The system will start as a modular monolith. Additional infrastructure and architectural complexity will be introduced only when there is a concrete engineering reason to use it.

---

## Milestones

### M01 — Project Foundation

Establish the core Go application and development foundation.

The application should start reliably, expose a basic HTTP API, connect to PostgreSQL, and follow a clean internal structure.

**Status:** Completed

---

### M02 — Product Catalog

Build the product catalog and its REST API.

Customers should be able to browse products, while administrative users will eventually be able to manage them.

**Status:** Not Started

---

### M03 — Users & Authentication

Introduce users, authentication, authorization, and user roles.

Customers and administrators should have different permissions within the system.

**Status:** Not Started

---

### M04 — Shopping Cart

Implement persistent shopping carts for authenticated customers.

Users should be able to add products, change quantities, remove items, and view the current state of their cart.

**Status:** Not Started

---

### M05 — Order Management

Introduce orders and convert carts into persistent orders.

The system must preserve historical order information independently from future product changes.

**Status:** Not Started

---

### M06 — Inventory Management

Introduce inventory tracking and safe stock operations.

The system must prevent overselling when multiple customers attempt to purchase the same limited-stock product concurrently.

**Status:** Not Started

---

### M07 — Checkout & Payment

Implement the checkout workflow and introduce a payment abstraction.

A fake payment provider will initially be used to model successful, failed, and repeated payment attempts.

**Status:** Not Started

---

### M08 — Order Lifecycle

Implement explicit order states and valid state transitions.

The system should prevent invalid transitions and maintain a consistent order lifecycle from creation to delivery or cancellation.

**Status:** Not Started

---

### M09 — Caching & Rate Limiting

Introduce Redis when the application has concrete caching and rate-limiting requirements.

The system should remain functional if Redis becomes temporarily unavailable.

**Status:** Not Started

---

### M10 — Asynchronous Events

Introduce asynchronous processing for operations that do not need to block the main request.

A message broker will be introduced where event-driven communication provides a meaningful architectural benefit.

**Status:** Not Started

---

### M11 — Observability

Make Basket observable as a real backend service.

Introduce structured logging, metrics, health checks, request tracing, and diagnostic information where appropriate.

**Status:** Not Started

---

### M12 — Testing & Reliability

Build a comprehensive automated test suite around the system's critical behavior.

Testing will focus on business correctness, database behavior, concurrency, failure scenarios, and API behavior.

**Status:** Not Started

---

### M13 — CI/CD

Automate testing, validation, and application builds.

The project should be reproducibly built and tested in a clean CI environment.

Containerization will be introduced here or earlier if a concrete development or testing requirement justifies it.

**Status:** Not Started

---

### M14 — Production Deployment

Deploy Basket as a real service.

The deployment will include the infrastructure required by the application and will address configuration, secrets, persistence, HTTPS, health checks, and recovery.

**Status:** Not Started

---

### M15 — Architecture Evolution

Evaluate whether parts of the modular monolith should be extracted into independent services.

Service extraction will be driven by actual architectural requirements rather than by a desire to use microservices.

**Status:** Not Started

---

## Engineering Principles

### Build Before Scaling

The first priority is a correct and maintainable system. Performance and distributed architecture will be introduced when the system has a real reason to need them.

### Complexity Must Have a Reason

A technology should only be introduced when it solves a concrete problem in Basket.

### Keep the System Working

Every milestone should leave the application in a working state.

### Prefer Explicit Boundaries

Domain boundaries should be clear even while the application remains a modular monolith.

### Correctness Over Features

A smaller system that handles transactions, concurrency, failures, and invalid states correctly is more valuable than a larger system with shallow implementations.
