/**
 * Creates a DataLoader for batching expense requests by userId.
 */
import { Expense, MeshContext } from "../../.mesh";
import DataLoader from "dataloader";
import { GraphQLResolveInfo } from "graphql";

export interface ExpenseResponse {
  expenses?: Expense[];
  expensesByUsers?: Expense[];
  data?: Expense[];
  [key: string]: any;
}

/**
 * Groups expenses by userId.
 */
const groupExpensesByUser = (data: ExpenseResponse): Map<string, Expense[]> => {
  const expensesByUser = new Map<string, Expense[]>();

  const processExpense = (expense: Expense) => {
    if (expense?.userId) {
      if (!expensesByUser.has(expense.userId)) {
        expensesByUser.set(expense.userId, []);
      }
      expensesByUser.get(expense.userId)!.push(expense);
    }
  };

  if (Array.isArray(data)) {
    data.forEach(processExpense);
  } else if (data && typeof data === "object") {
    const expensesArray = data.expenses || data.expensesByUsers || data.data;
    if (Array.isArray(expensesArray)) {
      expensesArray.forEach(processExpense);
    } else {
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            if (item && typeof item === "object" && "userId" in item) {
              processExpense(item as Expense);
            }
          });
        }
      });
    }
  }
  return expensesByUser;
};

export const createExpensesLoader = (context: MeshContext, info: GraphQLResolveInfo): DataLoader<string, Expense[]> => {
  return new DataLoader<string, Expense[]>(
    async (userIds: readonly string[]) => {
      try {
        const rawResult = await context.ExpenseService.Query.expensesByUsers({
          root: {},
          args: { userIds: userIds as string[] },
          context,
          info,
        });
        const result: ExpenseResponse = rawResult as ExpenseResponse;
        console.log("Expenses result structure:", JSON.stringify(result, null, 2));
        const expensesByUser = groupExpensesByUser(result);
        return userIds.map((userId) => expensesByUser.get(userId) || []);
      } catch (error: unknown) {
        console.error("Error batch loading expenses:", error);
        return userIds.map(() => []);
      }
    },
    {
      cacheKeyFn: (key) => key.toString(),
      maxBatchSize: 20,
    },
  );
};
