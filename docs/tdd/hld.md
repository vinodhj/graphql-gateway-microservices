# High-Level Design (HLD) - GraphQL Gateway Microservices - Architecture Documentation

### 1.1 System Overview

The system implements a GraphQL gateway that connects two microservices built with Cloudflare Workers:

1. **User Microservice**: Manages user information and accounts with optimized data fetching
2. **Expense Tracker Microservice**: Tracks daily expenses linked to specific users with optimized data fetching

The project implements two gateway approaches for comparison:

1. **GraphQL Mesh Gateway**: Automatically generates a unified schema
2. **Schema-Stitching Gateway**: Manually connects schemas using graphql-tools

### 1.2 Architecture Diagram

- Basic Architecture Diagram

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

- High-Level Design Architecture Diagram

```mermaid
flowchart TD
   Client([Client Applications]) --> MeshGateway
   Client --> StitchingGateway

   subgraph "Gateway Layer"
       MeshGateway[GraphQL Mesh Gateway]
       StitchingGateway[Schema-Stitching Gateway]
   end

   MeshGateway --> UserService
   MeshGateway --> ExpenseService
   StitchingGateway --> UserService
   StitchingGateway --> ExpenseService

   subgraph "Microservices (Cloudflare Workers)"
       subgraph "User Service"
           UserService[GraphQL Yoga Server]
           UserDL[DataLoader]
           UserCache[In-memory Cache]
       end

       subgraph "Expense Service"
           ExpenseService[GraphQL Yoga Server]
           ExpenseDL[DataLoader]
           ExpenseCache[In-memory Cache]
       end
   end

   UserService --> UserDL
   UserDL --> UserCache
   UserCache --> UserDB[(User Database)]
   UserDL -.-> UserDB

   ExpenseService --> ExpenseDL
   ExpenseDL --> ExpenseCache
   ExpenseCache --> ExpenseDB[(Expense Database)]
   ExpenseDL -.-> ExpenseDB

   ExpenseService -.-> UserService

   classDef gateway fill:#f9f,stroke:#333,stroke-width:2px
   classDef service fill:#326ce5,stroke:#fff,stroke-width:1px,color:#fff
   classDef optimization fill:#ffd700,stroke:#333,stroke-width:1px
   classDef db fill:#90ee90,stroke:#333,stroke-width:1px
   classDef client fill:#60a917,stroke:#333,stroke-width:1px,color:#fff

   class MeshGateway,StitchingGateway gateway
   class UserService,ExpenseService service
   class UserDL,UserCache,ExpenseDL,ExpenseCache optimization
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
    participant Mesh as GraphQL Mesh Gateway
    participant Stitching as Schema-stitching Gateway
    participant UserService
    participant UserDB as User Database
    participant ExpenseService
    participant ExpenseDB as Expense Database

    Client->>+Mesh: GraphQL Query
    Mesh->>Mesh: Parse & Plan Query

    alt Query requires User data
        Mesh->>+UserService: Batch User Requests
        UserService->>UserService: Check DataLoader Cache

        alt Cache Hit
            UserService-->>Mesh: Return Cached Data
        else Cache Miss
            UserService->>+UserDB: Fetch from DB
            UserDB-->>-UserService: Return DB Data
            UserService->>UserService: Update Cache
            UserService-->>Mesh: Return Fresh Data
        end
    end

    alt Query requires Expense data
        Mesh->>+ExpenseService: Batch Expense Requests
        ExpenseService->>ExpenseService: Check DataLoader Cache

        alt Cache Hit
            ExpenseService-->>Mesh: Return Cached Data
        else Cache Miss
            ExpenseService->>+ExpenseDB: Fetch from DB
            ExpenseDB-->>-ExpenseService: Return DB Data

            alt Expenses need User data
                ExpenseService->>+UserService: Batch User Lookup
                UserService->>UserService: Check DataLoader Cache

                alt User Cache Hit
                    UserService-->>ExpenseService: Return Cached User Data
                else User Cache Miss
                    UserService->>+UserDB: Fetch from DB
                    UserDB-->>-UserService: Return DB Data
                    UserService->>UserService: Update Cache
                    UserService-->>ExpenseService: Return Fresh User Data
                end

                ExpenseService->>ExpenseService: Cache Results
            end

            ExpenseService-->>Mesh: Return Fresh Data
        end
    end

    Mesh-->>-Client: Combined Response

    Note over Client,ExpenseDB: Similar flow for Schema-stitching Gateway with some differences

    Client->>+Stitching: GraphQL Query
    Stitching->>Stitching: Check Schema Cache TTL
    Stitching->>Stitching: Plan & Delegate to Services

    alt Query requires User data
        Stitching->>+UserService: Batch User Requests (with timeout)

        alt Request within timeout
            UserService->>UserService: Process Request (same flow as above)
            UserService-->>Stitching: Return Data
        else Timeout exceeded
            UserService-->>Stitching: Timeout Error
        end
    end

    alt Query requires Expense data
        Stitching->>+ExpenseService: Batch Expense Requests (with timeout)

        alt Request within timeout
            ExpenseService->>ExpenseService: Process Request (same flow as above)
            ExpenseService-->>Stitching: Return Data
        else Timeout exceeded
            ExpenseService-->>Stitching: Timeout Error
        end
    end

    Stitching-->>-Client: Combined Response
```

### 1.5 Cross-Cutting Concerns

- **Caching**: Implemented at multiple levels (gateway, service, DataLoader)
- **Batching**: Achieved through DataLoader implementation
- **Monitoring**: Worker analytics and custom metrics
- **Performance Optimization**: Designed to minimize redundant lookups
