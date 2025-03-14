import { createSchema, createYoga } from "graphql-yoga";

// Define User schema
const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String
  }

  type Query {
    user(id: ID!): User
    users(ids: [ID!]!): [User]! 
    allUsers: [User]
  }

  type Mutation {
    createUser(name: String!, email: String!): User
    updateUser(id: ID!, name: String, email: String): User
    deleteUser(id: ID!): Boolean
  }
`;

// Sample in-memory database (in production, use Cloudflare KV or D1)
const users = new Map<string, { id: string; name: string; email: string; createdAt: string; updatedAt: string | null }>([
  [
    "1",
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      createdAt: new Date().toISOString(),
      updatedAt: null,
    },
  ],
  [
    "2",
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      createdAt: new Date().toISOString(),
      updatedAt: null,
    },
  ],
]);

// Define resolvers
const resolvers = {
  Query: {
    user: (_: any, { id }: { id: string }) => {
      const result = users.get(id) || null;
      return result;
    },
    users: (_: any, { ids }: { ids: string[] }) => {
      console.log(ids);
      return ids.map((id) => users.get(id) || null);
    },
    allUsers: () => Array.from(users.values()),
  },
  Mutation: {
    createUser: (_: any, { name, email }: { name: string; email: string }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const user = { id, name, email, createdAt: now, updatedAt: null };
      users.set(id, user);
      return user;
    },
    updateUser: (_: any, { id, name, email }: { id: string; name?: string; email?: string }) => {
      const user = users.get(id);
      if (!user) return null;

      if (name) user.name = name;
      if (email) user.email = email;
      user.updatedAt = new Date().toISOString();

      users.set(id, user);
      return user;
    },
    deleteUser: (_: any, { id }: { id: string }) => {
      if (!users.has(id)) return false;
      users.delete(id);
      return true;
    },
  },
};

// Create schema
const schema = createSchema({
  typeDefs,
  resolvers,
});

// Create Yoga server
const yoga = createYoga({
  schema,
  landingPage: false,
  graphiql: true,
});

// Handle Cloudflare Worker requests
export default {
  fetch: yoga.fetch,
};
