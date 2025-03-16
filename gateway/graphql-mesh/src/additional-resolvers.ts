import { GraphQLResolveInfo } from "graphql";
import { createUsersLoader } from "./loader/user-by-id-loader";
import { createExpensesLoader } from "./loader/expenses-by-user-id-loader";
import DataLoader from "dataloader";
import { User, Expense } from "../generates";

// Define the context for Hive Gateway
export interface HiveGatewayContext {
  subgraphs: {
    USER_SERVICE: any;
    EXPENSE_SERVICE: any;
  };
  expensesLoader?: DataLoader<string, Expense[]>;
  usersLoader?: DataLoader<string, User | null>;
}

function adaptContext(hiveContext: HiveGatewayContext): any {
  return {
    ["UserService"]: {
      query: {
        // Map old methods to new subgraph methods
        users: (args: any) => hiveContext.subgraphs.USER_SERVICE.users(args),
      },
    },
    ["ExpenseService"]: {
      query: {
        // Map old methods to new subgraph methods
        expensesByUsers: (args: any) => hiveContext.subgraphs.EXPENSE_SERVICE.expensesByUsers(args),
      },
    },
  };
}

export default {
  User: {
    expenses: {
      resolve: async (root: User, _args: {}, context: HiveGatewayContext, info: GraphQLResolveInfo): Promise<Expense[]> => {
        if (!context.expensesLoader) {
          context.expensesLoader = createExpensesLoader(adaptContext(context), info);
        }
        return context.expensesLoader.load(root.id);
      },
    },
  },
  Expense: {
    user: {
      resolve: async (root: Expense, _args: {}, context: HiveGatewayContext, info: GraphQLResolveInfo): Promise<User> => {
        if (!context.usersLoader) {
          context.usersLoader = createUsersLoader(adaptContext(context), info);
        }
        const user = await context.usersLoader.load(root.userId);
        if (!user) {
          throw new Error(`User not found for userId: ${root.userId}`);
        }
        return user;
      },
    },
  },
};
