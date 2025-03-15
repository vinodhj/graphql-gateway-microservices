# GraphQL Gateway Microservices

This project demonstrates a proof-of-concept (PoC) for optimizing GraphQL gateway performance by minimizing redundant lookups. It compares two gateway approaches—**GraphQL Mesh** and **schema-stitching using graphql-tools** to connect two microservices built with Cloudflare Workers.

## Project Architecture

This system implements a GraphQL gateway that connects two microservices built with Cloudflare Workers.

## Microservices

1. **User Microservice**:  
   Manages user information and accounts. This service also leverages in-memory cache and DataLoader for optimized data fetching.
2. **Expense Tracker Microservice**:  
   Tracks daily expenses linked to specific users. This service also leverages in-memory cache and DataLoader for optimized data fetching.

## Gateway Implementations

Two gateway approaches are implemented for comparison:

### GraphQL Mesh Gateway

- **Implementation**:  
  Uses [GraphQL Mesh](https://the-guild.dev/graphql/mesh) to automatically generate a unified schema by stitching together multiple GraphQL APIs.
- **Prebuild Process**:  
  A prebuilt `.mesh` file is generated and deployed on Cloudflare Workers.
- **Optimization**:  
  An additional DataLoader is implemented in `additional-resolvers.ts` to further optimize data fetching and reduce redundant lookups.

### Schema-Stitching Gateway (using graphql-tools)

- **Implementation**:  
  It leverages [graphql-tools](https://www.graphql-tools.com/) to manually stitch schemas together as part of a GraphQL federation setup.

- **Caching Strategies**:  
  Uses settings such as `schemaCacheTtl` and service executor timeouts for performance improvements.

- **Optimization**:  
  Integrates DataLoader for batching and deduplication

## Tech Stack

- **Runtime**: Bun
- **GraphQL Server**: graphql-yoga
- **Workers**: Cloudflare Workers
- **Workspace Structure**:
  ```
  "workspaces": [
    "services/*",
    "gateway/*"
  ]
  ```

```
project-root/
├── services/
│   ├── user-service/
│   └── expense-service/
├── gateway/
│   ├── graphql-mesh/
│   └── graphql-tools/
└── package.json
```

## Performance Optimization Strategies

- **In-Memory Caching**:  
  Both services implement a service-level in-memory cache to store frequently accessed data. This reduces redundant lookups and minimizes latency.
- **DataLoader Integration**:  
  DataLoader is used at the service level and in additional resolvers to batch and cache requests within a single GraphQL operation, further reducing the number of external calls.

## Architecture Diagrams

- [GraphQL Gateway Microservices Architecture Diagram](./docs/diagrams/architecture-diagrams.mermaid)

- [Data Flow Diagram](./docs/diagrams/data-flow-diagram.mermaid)

- [High-Level Design (HLD) Diagram](./docs/diagrams/high-level-design.mermaid)

- [Low-Level Design (LLD) Diagram](./docs/diagrams/low-level-design.mermaid)

## License

This project is licensed under the [MIT License](LICENSE).
