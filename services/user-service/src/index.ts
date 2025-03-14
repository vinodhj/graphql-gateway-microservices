import { createSchema, createYoga } from "graphql-yoga";
import DataLoader from "dataloader";

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

// Sample in-memory database
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

// Type definitions for cache items
interface CacheItem<T> {
  value: T;
  expiry: number;
}

// Worker-compatible memory cache implementation
class ServiceCache {
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL: number; // in seconds

  constructor(ttl = 300) {
    this.defaultTTL = ttl;
  }

  set<T>(key: string, value: T, ttl = this.defaultTTL): boolean {
    try {
      const expiry = Date.now() + ttl * 1000;
      this.cache.set(key, { value, expiry });
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    try {
      if (!this.cache.has(key)) return null;

      const item = this.cache.get(key);
      if (!item) return null;

      if (Date.now() > item.expiry) {
        this.delete(key);
        return null;
      }

      return item.value as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  delete(key: string): boolean {
    try {
      return this.cache.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  // Useful for invalidating cache by prefix
  deleteByPrefix(prefix: string): void {
    try {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error(`Cache deleteByPrefix error for prefix ${prefix}:`, error);
    }
  }
}

// Global service-level cache instance
const serviceCache = new ServiceCache();

// Type for User object
type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string | null;
};

// Create a DataLoader factory with cache integration
const createUserLoader = () => {
  return new DataLoader<string, User | null>(
    async (ids: readonly string[]) => {
      try {
        console.log(`BatchLoading users: ${ids.join(", ")}`);

        // Check service cache first
        const cachedUsers: Array<User | null> = new Array(ids.length).fill(null);
        const uncachedIds: string[] = [];

        // More efficient iteration using index directly
        ids.forEach((id, index) => {
          const cachedUser = serviceCache.get<User>(`user:${id}`);
          if (cachedUser) {
            console.log(`Cache hit for user:${id}`);
            cachedUsers[index] = cachedUser;
          } else {
            console.log(`Cache miss for user:${id}`);
            uncachedIds.push(id);
            // cachedUsers[index] already set to null by default
          }
        });

        // Fetch uncached users from database
        if (uncachedIds.length > 0) {
          console.log(`Fetching users from DB: ${uncachedIds.join(", ")}`);

          // Map uncached IDs to database lookups
          for (const id of uncachedIds) {
            const user = users.get(id) || null;

            if (user) {
              // Find the original index in the ids array
              const originalIndex = ids.findIndex((originalId) => originalId === id);
              if (originalIndex !== -1) {
                // Update the cache
                serviceCache.set<User>(`user:${id}`, user);
                // Update our return array
                cachedUsers[originalIndex] = user;
              }
            }
          }
        }

        return cachedUsers;
      } catch (error) {
        console.error("Error in user loader:", error);
        // In case of error, return nulls for all requested IDs
        return new Array(ids.length).fill(null);
      }
    },
    {
      // This cache is per-request
      cache: true,
    },
  );
};

// Create a new context for each request
const createContext = () => {
  return {
    userLoader: createUserLoader(),
  };
};

// Define resolvers
const resolvers = {
  Query: {
    user: async (_: any, { id }: { id: string }, context: any) => {
      try {
        return context.userLoader.load(id);
      } catch (error) {
        console.error(`Error fetching user ${id}:`, error);
        return null;
      }
    },
    users: async (_: any, { ids }: { ids: string[] }, context: any) => {
      try {
        return context.userLoader.loadMany(ids);
      } catch (error) {
        console.error(`Error fetching users:`, error);
        return ids.map(() => null);
      }
    },
    allUsers: () => {
      try {
        const cacheKey = "allUsers";
        // Try to get from cache first
        const cachedResult = serviceCache.get<User[]>(cacheKey);

        if (cachedResult) {
          console.log("Cache hit: allUsers");
          return cachedResult;
        }

        console.log("Cache miss: allUsers");
        const result = Array.from(users.values());
        // Store in cache for future requests
        serviceCache.set<User[]>(cacheKey, result);
        return result;
      } catch (error) {
        console.error("Error fetching all users:", error);
        return [];
      }
    },
  },
  Mutation: {
    createUser: (_: any, { name, email }: { name: string; email: string }) => {
      try {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const user: User = { id, name, email, createdAt: now, updatedAt: null };
        users.set(id, user);

        // Update cache
        serviceCache.set<User>(`user:${id}`, user);

        // Invalidate allUsers cache
        serviceCache.delete("allUsers");

        return user;
      } catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Failed to create user");
      }
    },
    updateUser: (_: any, { id, name, email }: { id: string; name?: string; email?: string }) => {
      try {
        const user = users.get(id);
        if (!user) return null;

        if (name) user.name = name;
        if (email) user.email = email;
        user.updatedAt = new Date().toISOString();

        users.set(id, user);

        // Update cache
        serviceCache.set<User>(`user:${id}`, user);

        // Invalidate allUsers cache
        serviceCache.delete("allUsers");

        return user;
      } catch (error) {
        console.error(`Error updating user ${id}:`, error);
        throw new Error("Failed to update user");
      }
    },
    deleteUser: (_: any, { id }: { id: string }) => {
      try {
        if (!users.has(id)) return false;
        users.delete(id);

        // Remove from cache
        serviceCache.delete(`user:${id}`);

        // Invalidate allUsers cache
        serviceCache.delete("allUsers");

        return true;
      } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        throw new Error("Failed to delete user");
      }
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
  context: createContext,
  landingPage: false,
  graphiql: true,
});

// Handle Cloudflare Worker requests
export default {
  fetch: yoga.fetch,
};
