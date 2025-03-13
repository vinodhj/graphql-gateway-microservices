import { createSchema, createYoga } from "graphql-yoga";

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

// Define resolvers
const resolvers = {
  Query: {
    expense: (_: any, { id }: { id: string }) => {
      return expenses.get(id) || null;
    },
    expenses: () => {
      return Array.from(expenses.values());
    },
    expensesByUser: (_: any, { userId }: { userId: string }) => {
      return Array.from(expenses.values()).filter((expense) => expense.userId === userId);
    },
    expensesByDate: (_: any, { startDate, endDate }: { startDate: string; endDate?: string }) => {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();

      return Array.from(expenses.values()).filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
      });
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
      return expense;
    },
    updateExpense: (
      _: any,
      { id, amount, description, category }: { id: string; amount?: number; description?: string; category?: string },
    ) => {
      const expense = expenses.get(id);
      if (!expense) return null;

      if (amount !== undefined) expense.amount = amount;
      if (description) expense.description = description;
      if (category) expense.category = category;

      expenses.set(id, expense);
      return expense;
    },
    deleteExpense: (_: any, { id }: { id: string }) => {
      if (!expenses.has(id)) return false;
      expenses.delete(id);
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
