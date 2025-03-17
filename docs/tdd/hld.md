# High-Level Design (HLD) - GraphQL Gateway Microservices - Architecture Documentation

### 1.1 System Overview

The system implements a GraphQL gateway that connects two microservices built with Cloudflare Workers:

1. **User Microservice**: Manages user information and accounts with optimized data fetching
2. **Expense Tracker Microservice**: Tracks daily expenses linked to specific users with optimized data fetching

The project implements three gateway approaches for comparison:

1. **GraphQL Mesh Gateway**: Automatically generates a unified schema
2. **Schema-Stitching Gateway**: Manually connects schemas using graphql-tools
3. **Hive Gateway**: Provides a fully managed GraphQL gateway solution with advanced features

### 1.2 Architecture Diagram

- Basic Architecture Diagram

```mermaid
flowchart TD
    Client([Client Applications]) --> MeshGateway
    Client --> StitchingGateway
    Client --> HiveGateway
    MeshGateway[GraphQL Mesh Gateway] --> UserService[User Microservice]
    MeshGateway --> ExpenseService[Expense Tracker Microservice]
    StitchingGateway[Schema-Stitching Gateway] --> UserService
    StitchingGateway --> ExpenseService
    HiveGateway[Hive Gateway] --> UserService
    HiveGateway --> ExpenseService

    subgraph "Cloudflare Workers"
    MeshGateway
    StitchingGateway
    HiveGateway
    UserService
    ExpenseService
    end

    UserService --- UserDB[(User Data)]
    ExpenseService --- ExpenseDB[(Expense Data)]
    HiveGateway --- SchemaRegistry[(Schema Registry)]

    classDef service fill:#326ce5,stroke:#fff,stroke-width:1px,color:#fff
    classDef db fill:#45a386,stroke:#333,stroke-width:1px,color:#fff
    classDef client fill:#60a917,stroke:#333,stroke-width:1px,color:#fff

    class MeshGateway,StitchingGateway,HiveGateway,UserService,ExpenseService service
    class UserDB,ExpenseDB,SchemaRegistry db
    class Client client
```

- High-Level Design Architecture Diagram

```mermaid
flowchart TD
    Client([Client Applications]) --> MeshGateway
    Client --> StitchingGateway
    Client --> HiveGateway

    subgraph CloudflareWorkers["Cloudflare Workers Platform"]
        subgraph Gateway["Gateway Layer"]
            MeshGateway["GraphQL Mesh Gateway"]
            StitchingGateway["Schema-Stitching Gateway"]
            HiveGateway["Hive Gateway"]
        end

        subgraph Microservices["Microservices"]
            subgraph UserSvc["User Service"]
                UserService["GraphQL Yoga Server"]
                UserDL["DataLoader"]
                UserCache["In-memory Cache"]
            end

            subgraph ExpenseSvc["Expense Service"]
                ExpenseService["GraphQL Yoga Server"]
                ExpenseDL["DataLoader"]
                ExpenseCache["In-memory Cache"]
            end
        end
    end

    MeshGateway --> UserService
    MeshGateway --> ExpenseService
    StitchingGateway --> UserService
    StitchingGateway --> ExpenseService
    HiveGateway --> UserService
    HiveGateway --> ExpenseService

    HiveGateway --- SchemaRegistry[(Schema Registry)]

    UserService --> UserDL
    UserDL --> UserCache
    UserCache --> UserDB[(User Database)]
    UserDL -.-> UserDB

    ExpenseService --> ExpenseDL
    ExpenseDL --> ExpenseCache
    ExpenseCache --> ExpenseDB[(Expense Database)]
    ExpenseDL -.-> ExpenseDB

    ExpenseService -.-> UserService

    classDef gateway fill:#f9f,stroke:#333,stroke-width:2px,color:#fff
    classDef service fill:#326ce5,stroke:#fff,stroke-width:1px,color:#fff
    classDef optimization fill:#818b98,stroke:#333,stroke-width:1px,color:#fff
    classDef db fill:#45a386,stroke:#333,stroke-width:1px,color:#fff
    classDef client fill:#60a917,stroke:#333,stroke-width:1px,color:#fff
    classDef platform fill:#605e5c,stroke:#333,stroke-width:1px,color:#fff

    class MeshGateway,StitchingGateway,HiveGateway gateway
    class UserService,ExpenseService service
    class UserDL,UserCache,ExpenseDL,ExpenseCache optimization
    class UserDB,ExpenseDB,SchemaRegistry db
    class Client client
    class CloudflareWorkers platform
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

#### 1.3.3 Hive Gateway

- **Purpose**: Provides a fully managed, feature-rich GraphQL gateway solution
- **Technology**: Hive Gateway, Cloudflare Workers
- **Responsibility**: Schema registry integration, schema validation, query planning, monitoring
- **Key Features**:
  - Centralized schema management via Schema Registry
  - Intelligent request routing and caching strategies
  - Automatic schema updates and versioning

#### 1.3.4 User Microservice

- **Purpose**: Manages user data and operations
- **Technology**: GraphQL Yoga, Cloudflare Workers
- **Responsibility**: CRUD operations for user entities
- **Optimization**: Implements in-memory caching and DataLoader

#### 1.3.5 Expense Tracker Microservice

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
    participant Hive as Hive Gateway
    participant Registry as Schema Registry
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

    Note over Client,ExpenseDB: Hive Gateway with enhanced capabilities

    Client->>+Hive: GraphQL Query
    Hive->>+Registry: Validate Schema
    Registry-->>-Hive: Schema Validation Result
    Hive->>Hive: Optimize Query Plan
    Hive->>Hive: Apply Caching Strategies

    alt Query requires User data
        Hive->>+UserService: Optimized User Requests
        UserService->>UserService: Process User Request
        UserService-->>-Hive: Return User Data
    end

    alt Query requires Expense data
        Hive->>+ExpenseService: Optimized Expense Requests
        ExpenseService->>ExpenseService: Process Expense Request
        ExpenseService-->>-Hive: Return Expense Data
    end

    Hive-->>-Client: Optimized Combined Response
```

### 1.5 Cross-Cutting Concerns

- **Caching**: Implemented at multiple levels (gateway, service, DataLoader)
- **Batching**: Achieved through DataLoader implementation
- **Monitoring**: Worker analytics and custom metrics
- **Performance Optimization**: Designed to minimize redundant lookups
- **Schema Management**: Centralized via Hive Schema Registry for the Hive Gateway implementation

## 1.6 Hive Gateway Serverless Deployment Strategy

### 1.6.1 Cloudflare Workers Deployment

The GraphQL Gateway utilizes Hive Gateway deployed on Cloudflare Workers to provide a serverless, globally distributed entry point for the application. This deployment strategy offers several architectural advantages:

- **Global Distribution**: Automatically deployed to Cloudflare's global edge network for low-latency responses
- **Serverless Execution**: No infrastructure management required, with auto-scaling based on demand
- **Service Mesh Integration**: Direct service-to-service communication through Cloudflare Workers service bindings

### 1.6.2 Architectural Considerations

The serverless gateway architecture introduces specific considerations:

1. **Pre-compiled Schema**: The supergraph schema must be pre-compiled during the build process due to serverless constraints
2. **Cross-Service Communication**: Service bindings are used for direct worker-to-worker communication, reducing network latency
3. **Deployment Pipeline**: Schema generation is integrated into the CI/CD pipeline to ensure consistency between environments
4. **Schema Updates**: Schema changes require a coordinated deployment strategy across services

### 1.6.3 Resilience Strategy

The gateway implements several strategies to ensure resilience in the serverless environment:

- **Graceful Degradation**: Services can operate independently if other services are unavailable
- **Query Optimization**: Automatic query planning to minimize cross-service requests
- **Response Caching**: Strategic caching at the edge for frequently requested data
- **Resource Management**: Proper disposal of resources to optimize serverless execution

For implementation details, refer to the comprehensive Hive Gateway Cloudflare Workers documentation.
