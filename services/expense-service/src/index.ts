import { createSchema, createYoga } from "graphql-yoga";
import DataLoader from "dataloader";

// Define Expense schema
const typeDefs = `
  type Expense {
    id: ID!
    userId: ID!
    amount: Float!
    description: String!
    category: String
    date: String!
    createdAt: String!
  }

  type Query {
    expense(id: ID!): Expense
    expenses: [Expense]
    expensesByUser(userId: ID!): [Expense]
    expensesByUsers(userIds: [ID!]!): [Expense]! # New batch endpoint
    expensesByDate(startDate: String!, endDate: String): [Expense]
  }

  type Mutation {
    createExpense(userId: ID!, amount: Float!, description: String!, category: String, date: String!): Expense
    updateExpense(id: ID!, amount: Float, description: String, category: String): Expense
    deleteExpense(id: ID!): Boolean
  }
`;

// Sample in-memory database (in production, use Cloudflare KV or D1)
const expenses = new Map([
  [
    "1",
    {
      id: "1",
      userId: "1",
      amount: 50.0,
      description: "Groceries",
      category: "Food",
      date: "2023-01-01",
      createdAt: "2023-01-01T10:00:00Z",
    },
  ],
  [
    "2",
    {
      id: "2",
      userId: "1",
      amount: 20.0,
      description: "Bus ticket",
      category: "Transport",
      date: "2023-01-02",
      createdAt: "2023-01-02T11:00:00Z",
    },
  ],
  [
    "3",
    {
      id: "3",
      userId: "2",
      amount: 100.0,
      description: "New shoes",
      category: "Clothing",
      date: "2023-01-03",
      createdAt: "2023-01-03T12:00:00Z",
    },
  ],
  [
    "4",
    {
      id: "4",
      userId: "2",
      amount: 15.0,
      description: "Coffee",
      category: "Food",
      date: "2023-01-04",
      createdAt: "2023-01-04T13:00:00Z",
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

// Type for Expense object
type Expense = {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
};

// Create a DataLoader factory with cache integration for single expenses
const createExpenseLoader = () => {
  return new DataLoader<string, Expense | null>(
    async (ids: readonly string[]) => {
      try {
        console.log(`BatchLoading expenses: ${ids.join(", ")}`);

        // Check service cache first
        const cachedExpenses: Array<Expense | null> = new Array(ids.length).fill(null);
        const uncachedIds: string[] = [];

        // Process cached items
        ids.forEach((id, index) => {
          const cachedExpense = serviceCache.get<Expense>(`expense:${id}`);
          if (cachedExpense) {
            console.log(`Cache hit for expense:${id}`);
            cachedExpenses[index] = cachedExpense;
          } else {
            console.log(`Cache miss for expense:${id}`);
            uncachedIds.push(id);
          }
        });

        // Fetch uncached expenses from database
        if (uncachedIds.length > 0) {
          console.log(`Fetching expenses from DB: ${uncachedIds.join(", ")}`);

          for (const id of uncachedIds) {
            const expense = expenses.get(id) || null;

            if (expense) {
              // Find the original index in the ids array
              const originalIndex = ids.findIndex((originalId) => originalId === id);
              if (originalIndex !== -1) {
                // Update the cache
                serviceCache.set<Expense>(`expense:${id}`, expense);
                // Update our return array
                cachedExpenses[originalIndex] = expense;
              }
            }
          }
        }

        return cachedExpenses;
      } catch (error) {
        console.error("Error in expense loader:", error);
        // In case of error, return nulls for all requested IDs
        return new Array(ids.length).fill(null);
      }
    },
    {
      cache: true, // Per-request cache
    },
  );
};

// Create a DataLoader for expenses by user ID
const createUserExpensesLoader = () => {
  return new DataLoader<string, Expense[]>(
    async (userIds: readonly string[]) => {
      try {
        console.log(`BatchLoading expenses for users: ${userIds.join(", ")}`);

        // Check service cache first
        const result: Expense[][] = [];
        const uncachedUserIds: string[] = [];

        // Process cached items
        for (const userId of userIds) {
          const cacheKey = `user-expenses:${userId}`;
          const cachedExpenses = serviceCache.get<Expense[]>(cacheKey);

          if (cachedExpenses) {
            console.log(`Cache hit for ${cacheKey}`);
            result.push(cachedExpenses);
          } else {
            console.log(`Cache miss for ${cacheKey}`);
            uncachedUserIds.push(userId);
            // We'll populate this index later
            result.push([]);
          }
        }

        // If there are any uncached user IDs
        if (uncachedUserIds.length > 0) {
          console.log(`Fetching expenses for users from DB: ${uncachedUserIds.join(", ")}`);

          // Get all expenses
          const allExpenses = Array.from(expenses.values());

          // For each uncached user ID
          for (const userId of uncachedUserIds) {
            // Find expenses for this user
            const userExpenses = allExpenses.filter((expense) => expense.userId === userId);

            // Cache the result
            serviceCache.set<Expense[]>(`user-expenses:${userId}`, userExpenses);

            // Find the index in the original userIds array
            const index = userIds.findIndex((id) => id === userId);
            if (index !== -1) {
              // Update our result array
              result[index] = userExpenses;
            }
          }
        }

        return result;
      } catch (error) {
        console.error("Error in user expenses loader:", error);
        // Return empty arrays in case of error
        return userIds.map(() => []);
      }
    },
    {
      cache: true, // Per-request cache
    },
  );
};

// Create a new context for each request
const createContext = () => {
  return {
    expenseLoader: createExpenseLoader(),
    userExpensesLoader: createUserExpensesLoader(),
  };
};

// Define resolvers
const resolvers = {
  Query: {
    expense: async (_: any, { id }: { id: string }, context: any) => {
      try {
        return context.expenseLoader.load(id);
      } catch (error) {
        console.error(`Error fetching expense ${id}:`, error);
        return null;
      }
    },
    expenses: () => {
      try {
        const cacheKey = "allExpenses";
        // Try to get from cache first
        const cachedResult = serviceCache.get<Expense[]>(cacheKey);

        if (cachedResult) {
          console.log("Cache hit: allExpenses");
          return cachedResult;
        }

        console.log("Cache miss: allExpenses");
        const result = Array.from(expenses.values());
        // Store in cache for future requests
        serviceCache.set<Expense[]>(cacheKey, result);
        return result;
      } catch (error) {
        console.error("Error fetching all expenses:", error);
        return [];
      }
    },
    expensesByUser: async (_: any, { userId }: { userId: string }, context: any) => {
      try {
        return context.userExpensesLoader.load(userId);
      } catch (error) {
        console.error(`Error fetching expenses for user ${userId}:`, error);
        return [];
      }
    },
    expensesByUsers: async (_: any, { userIds }: { userIds: string[] }, context: any) => {
      try {
        const expensesByUserArray = await context.userExpensesLoader.loadMany(userIds);
        // Flatten the array of arrays
        return expensesByUserArray.flat();
      } catch (error) {
        console.error(`Error fetching expenses for users:`, error);
        return [];
      }
    },
    expensesByDate: (_: any, { startDate, endDate }: { startDate: string; endDate?: string }) => {
      try {
        const cacheKey = `expenses:date:${startDate}:${endDate || "now"}`;

        // Try to get from cache first
        const cachedResult = serviceCache.get<Expense[]>(cacheKey);
        if (cachedResult) {
          console.log(`Cache hit: ${cacheKey}`);
          return cachedResult;
        }

        console.log(`Cache miss: ${cacheKey}`);

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();

        const result = Array.from(expenses.values()).filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= start && expenseDate <= end;
        });

        // Store in cache for future requests
        serviceCache.set<Expense[]>(cacheKey, result);
        return result;
      } catch (error) {
        console.error("Error fetching expenses by date:", error);
        return [];
      }
    },
  },
  Mutation: {
    createExpense: (
      _: any,
      {
        userId,
        amount,
        description,
        category,
        date,
      }: { userId: string; amount: number; description: string; category?: string; date: string },
    ) => {
      try {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const expense = {
          id,
          userId,
          amount,
          description,
          category: category || "Uncategorized",
          date,
          createdAt: now,
        };
        expenses.set(id, expense);

        // Update cache
        serviceCache.set<Expense>(`expense:${id}`, expense);

        // Invalidate related caches
        serviceCache.delete("allExpenses");
        serviceCache.delete(`user-expenses:${userId}`);
        serviceCache.deleteByPrefix("expenses:date:");

        return expense;
      } catch (error) {
        console.error("Error creating expense:", error);
        throw new Error("Failed to create expense");
      }
    },
    updateExpense: (
      _: any,
      { id, amount, description, category }: { id: string; amount?: number; description?: string; category?: string },
    ) => {
      try {
        const expense = expenses.get(id);
        if (!expense) return null;

        if (amount !== undefined) expense.amount = amount;
        if (description) expense.description = description;
        if (category) expense.category = category;

        expenses.set(id, expense);

        // Update cache
        serviceCache.set<Expense>(`expense:${id}`, expense);

        // Invalidate related caches
        serviceCache.delete("allExpenses");
        serviceCache.delete(`user-expenses:${expense.userId}`);
        serviceCache.deleteByPrefix("expenses:date:");

        return expense;
      } catch (error) {
        console.error(`Error updating expense ${id}:`, error);
        throw new Error("Failed to update expense");
      }
    },
    deleteExpense: (_: any, { id }: { id: string }) => {
      try {
        const expense = expenses.get(id);
        if (!expense) return false;

        const userId = expense.userId;
        expenses.delete(id);

        // Remove from cache
        serviceCache.delete(`expense:${id}`);

        // Invalidate related caches
        serviceCache.delete("allExpenses");
        serviceCache.delete(`user-expenses:${userId}`);
        serviceCache.deleteByPrefix("expenses:date:");

        return true;
      } catch (error) {
        console.error(`Error deleting expense ${id}:`, error);
        throw new Error("Failed to delete expense");
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
