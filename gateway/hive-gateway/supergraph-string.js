export const supergraphSdl = /* GraphQL */ `
  schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
    @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
    @link(url: "https://the-guild.dev/graphql/mesh/spec/v1.0", import: ["@transport", "@merge", "@extraSchemaDefinitionDirective"]) {
    query: Query
    mutation: Mutation
  }

  directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

  directive @join__field(
    graph: join__Graph
    requires: join__FieldSet
    provides: join__FieldSet
    type: String
    external: Boolean
    override: String
    usedOverridden: Boolean
  ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

  directive @join__graph(name: String!, url: String!) on ENUM_VALUE

  directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

  directive @join__type(
    graph: join__Graph!
    key: join__FieldSet
    extension: Boolean! = false
    resolvable: Boolean! = true
    isInterfaceObject: Boolean! = false
  ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

  directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

  directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

  directive @transport(
    kind: String!
    subgraph: String!
    location: String!
    headers: [[String]]
    options: TransportOptions
  ) repeatable on SCHEMA

  directive @merge(
    subgraph: String
    argsExpr: String
    keyArg: String
    keyField: String
    key: [String!]
    additionalArgs: String
  ) repeatable on FIELD_DEFINITION

  directive @extraSchemaDefinitionDirective(directives: _DirectiveExtensions) repeatable on OBJECT

  directive @additionalField on FIELD_DEFINITION

  scalar join__FieldSet

  scalar link__Import

  enum link__Purpose {
    # \`SECURITY\` features provide metadata necessary to securely resolve fields.
    # \`EXECUTION\` features provide metadata necessary for operation execution.
    SECURITY
    EXECUTION
  }

  enum join__Graph {
    EXPENSE_SERVICE @join__graph(name: "ExpenseService", url: "http://localhost:7502/graphql")
    USER_SERVICE @join__graph(name: "UserService", url: "http://localhost:7501/graphql")
  }

  scalar TransportOptions @join__type(graph: EXPENSE_SERVICE) @join__type(graph: USER_SERVICE)

  scalar _DirectiveExtensions @join__type(graph: EXPENSE_SERVICE) @join__type(graph: USER_SERVICE)

  type Expense @join__type(graph: EXPENSE_SERVICE, key: "id") {
    id: ID!
    userId: ID!
    amount: Float!
    description: String!
    category: String
    date: String!
    createdAt: String!
    user: User! @additionalField
  }

  type Query
    @extraSchemaDefinitionDirective(
      directives: {
        transport: [
          {
            kind: "http"
            subgraph: "ExpenseService"
            location: "http://localhost:7502/graphql"
            headers: [
              ["Content-Type", "application/json"]
              ["Accept", "application/json"]
              ["Authorization", "{context.headers.Authorization}"]
              ["X-Project-Token", "{context.headers.X-Project-Token}"]
            ]
            options: { method: "POST", retry: 3, timeout: 10000 }
          }
        ]
      }
    )
    @extraSchemaDefinitionDirective(
      directives: {
        transport: [
          {
            kind: "http"
            subgraph: "UserService"
            location: "http://localhost:7501/graphql"
            headers: [
              ["Content-Type", "application/json"]
              ["Accept", "application/json"]
              ["Authorization", "{context.headers.Authorization}"]
              ["X-Project-Token", "{context.headers.X-Project-Token}"]
            ]
            options: { method: "POST", retry: 3, timeout: 10000 }
          }
        ]
      }
    )
    @join__type(graph: EXPENSE_SERVICE)
    @join__type(graph: USER_SERVICE) {
    expense(id: ID!): Expense @merge(subgraph: "ExpenseService", keyField: "id", keyArg: "id") @join__field(graph: EXPENSE_SERVICE)
    expenses: [Expense] @join__field(graph: EXPENSE_SERVICE)
    expensesByUser(userId: ID!): [Expense] @join__field(graph: EXPENSE_SERVICE)
    expensesByUsers(userIds: [ID!]!): [Expense]! @join__field(graph: EXPENSE_SERVICE)
    expensesByDate(startDate: String!, endDate: String): [Expense] @join__field(graph: EXPENSE_SERVICE)
    user(id: ID!): User @merge(subgraph: "UserService", keyField: "id", keyArg: "id") @join__field(graph: USER_SERVICE)
    users(ids: [ID!]!): [User]! @merge(subgraph: "UserService", keyField: "id", keyArg: "ids") @join__field(graph: USER_SERVICE)
    allUsers: [User] @join__field(graph: USER_SERVICE)
  }

  type Mutation @join__type(graph: EXPENSE_SERVICE) @join__type(graph: USER_SERVICE) {
    createExpense(userId: ID!, amount: Float!, description: String!, category: String, date: String!): Expense
      @join__field(graph: EXPENSE_SERVICE)
    updateExpense(id: ID!, amount: Float, description: String, category: String): Expense @join__field(graph: EXPENSE_SERVICE)
    deleteExpense(id: ID!): Boolean @join__field(graph: EXPENSE_SERVICE)
    createUser(name: String!, email: String!): User @join__field(graph: USER_SERVICE)
    updateUser(id: ID!, name: String, email: String): User @join__field(graph: USER_SERVICE)
    deleteUser(id: ID!): Boolean @join__field(graph: USER_SERVICE)
  }

  type User @join__type(graph: USER_SERVICE, key: "id") {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String
    expenses: [Expense!]! @additionalField
  }
`;
