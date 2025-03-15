# High-Level Design (HLD) - GraphQL Gateway Microservices - Architecture Documentation

### 1.1 System Overview

The system implements a GraphQL gateway that connects two microservices built with Cloudflare Workers:

1. **User Microservice**: Manages user information and accounts with optimized data fetching
2. **Expense Tracker Microservice**: Tracks daily expenses linked to specific users with optimized data fetching

The project implements two gateway approaches for comparison:

1. **GraphQL Mesh Gateway**: Automatically generates a unified schema
2. **Schema-Stitching Gateway**: Manually connects schemas using graphql-tools

### 1.2 Architecture Diagram

```mermaid
flowchart TD
    Client([Client Applications]) --> MeshGateway
    Client --> StitchingGateway
    MeshGateway[GraphQL Mesh Gateway] --> UserService[User Microservice]
    MeshGateway --> ExpenseService[Expense Tracker Microservice]
    StitchingGateway[Schema-Stitching Gateway] --> UserService
    StitchingGateway --> ExpenseService

    subgraph "Cloudflare Workers"
    MeshGateway
    StitchingGateway
    UserService
    ExpenseService
    end

    UserService --- UserDB[(User Data)]
    ExpenseService --- ExpenseDB[(Expense Data)]

    classDef service fill:#326ce5,stroke:#fff,stroke-width:1px,color:#fff
    classDef db fill:#f9f,stroke:#333,stroke-width:1px
    classDef client fill:#60a917,stroke:#333,stroke-width:1px,color:#fff

    class MeshGateway,StitchingGateway,UserService,ExpenseService service
    class UserDB,ExpenseDB db
    class Client client
```

### 1.3 Key Components

#### 1.3.1 GraphQL Mesh Gateway

- **Purpose**: Acts as a unified entry point for client requests
- **Technology**: GraphQL Mesh, Cloudflare Workers
- **Responsibility**: Automated schema stitching, type merging, request routing
- **Optimization**: Implements DataLoader for batching and caching
- **Prebuild Process**: Generates a prebuilt `.mesh` file for deployment

#### 1.3.2 Schema-Stitching Gateway

- **Purpose**: Provides an alternative approach to schema composition
- **Technology**: graphql-tools, Cloudflare Workers
- **Responsibility**: Manual schema stitching, federation setup
- **Optimization**: Configures schema cache TTL and service executor timeouts

#### 1.3.3 User Microservice

- **Purpose**: Manages user data and operations
- **Technology**: GraphQL Yoga, Cloudflare Workers
- **Responsibility**: CRUD operations for user entities
- **Optimization**: Implements in-memory caching and DataLoader

#### 1.3.4 Expense Tracker Microservice

- **Purpose**: Manages expense records linked to users
- **Technology**: GraphQL Yoga, Cloudflare Workers
- **Responsibility**: CRUD operations for expense entities
- **Optimization**: Implements in-memory caching and DataLoader

### 1.4 Data Flow Sequence

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as GraphQL Gateways
    participant UserMS as User Microservice
    participant ExpenseMS as Expense Microservice

    Client->>Gateway: GraphQL Query/Mutation

    alt Simple User Query
        Gateway->>UserMS: Forward User Query
        UserMS->>UserMS: Check DataLoader Cache
        UserMS-->>Gateway: User Data
        Gateway-->>Client: User Data Response

    else Simple Expense Query
        Gateway->>ExpenseMS: Forward Expense Query
        ExpenseMS->>ExpenseMS: Check DataLoader Cache
        ExpenseMS-->>Gateway: Expense Data
        Gateway-->>Client: Expense Data Response

    else Complex Query (User with Expenses)
        Gateway->>UserMS: Batch User Requests
        UserMS->>UserMS: Check DataLoader Cache
        UserMS-->>Gateway: User Data
        Gateway->>ExpenseMS: Batch Expense Requests
        ExpenseMS->>ExpenseMS: Check DataLoader Cache
        ExpenseMS-->>Gateway: Expense Data
        Gateway-->>Client: Combined Response
    end
```

### 1.5 Cross-Cutting Concerns

- **Caching**: Implemented at multiple levels (gateway, service, DataLoader)
- **Batching**: Achieved through DataLoader implementation
- **Monitoring**: Worker analytics and custom metrics
- **Performance Optimization**: Designed to minimize redundant lookups
