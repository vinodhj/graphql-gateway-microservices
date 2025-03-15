import { Resolvers, MeshContext, User, Expense } from "../.mesh";
import DataLoader from "dataloader";
import { GraphQLResolveInfo } from "graphql";
import { createUsersLoader } from "./loader/user-by-id-loader";
import { createExpensesLoader } from "./loader/expenses-by-user-id-loader";

interface ExtendedContext extends MeshContext {
  expensesLoader?: DataLoader<string, Expense[]>;
  usersLoader?: DataLoader<string, User | null>;
}

export const resolvers: Resolvers = {
  User: {
    expenses: {
      selectionSet: /* GraphQL */ `
        {
          id
        }
      `,
      resolve: async (root: User, _args: {}, context: MeshContext, info: GraphQLResolveInfo): Promise<Expense[]> => {
        const ctx = context as ExtendedContext;
        if (!ctx.expensesLoader) {
          ctx.expensesLoader = createExpensesLoader(context, info);
        }
        return ctx.expensesLoader.load(root.id);
      },
    },
  },
  Expense: {
    user: {
      selectionSet: /* GraphQL */ `
        {
          userId
        }
      `,
      resolve: async (root: Expense, _args: {}, context: MeshContext, info: GraphQLResolveInfo): Promise<User> => {
        const ctx = context as ExtendedContext;
        if (!ctx.usersLoader) {
          ctx.usersLoader = createUsersLoader(context, info);
        }
        const user = await ctx.usersLoader.load(root.userId);
        if (!user) {
          throw new Error(`User not found for userId: ${root.userId}`);
        }
        return user;
      },
    },
  },
};

export default resolvers;
