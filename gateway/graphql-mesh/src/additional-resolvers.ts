import { GraphQLResolveInfo } from "graphql";
import { createUsersLoader } from "./loader/user-by-id-loader";
import { createExpensesLoader } from "./loader/expenses-by-user-id-loader";
import DataLoader from "dataloader";
import { User, Expense } from "../generates";

// Define the context for Hive Gateway
export interface HiveGatewayContext {
  ExpenseService: any;
  UserService: any;
  expensesLoader?: DataLoader<string, Expense[]>;
  usersLoader?: DataLoader<string, User | null>;
}

function adaptContext(hiveContext: HiveGatewayContext): any {
  // Check for both lowercase and uppercase keys.
  const expenseServiceQuery = hiveContext.ExpenseService.query || hiveContext.ExpenseService.Query;
  if (!expenseServiceQuery?.expensesByUsers) {
    throw new Error("ExpenseService does not have a valid 'expensesByUsers' query method");
  }

  const userServiceQuery = hiveContext.UserService.query || hiveContext.UserService.Query;
  if (!userServiceQuery?.users) {
    throw new Error("UserService does not have a valid 'users' query method");
  }

  return {
    ["UserService"]: {
      query: {
        users: (args: any) => userServiceQuery.users(args),
      },
    },
    ["ExpenseService"]: {
      query: {
        expensesByUsers: (args: any) => expenseServiceQuery.expensesByUsers(args),
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
