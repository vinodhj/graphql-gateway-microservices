import { Resolvers } from "../.mesh";

export const resolvers: Resolvers = {
  User: {
    expenses: {
      selectionSet: /* GraphQL */ `
        {
          id
        }
      `,
      resolve: async (root, _args, context, info) => {
        try {
          const result = await context.ExpenseService.Query.expensesByUsers({
            root,
            context,
            info,
            key: root.id,
            argsFromKeys: (keys) => ({ userIds: keys }),
            valuesFromResults: (data, keys) => {
              const expensesByUser = new Map<string, any[]>();
              data.forEach((expense: any) => {
                const userId = expense.userId;
                if (!expensesByUser.has(userId)) {
                  expensesByUser.set(userId, []);
                }
                expensesByUser.get(userId)!.push(expense);
              });
              return keys.map((userId) => expensesByUser.get(userId) || []);
            },
          });

          // Ensure we're returning an array
          if (result === null || result === undefined) {
            return []; // Return empty array if no expenses
          }

          // If result is not iterable, wrap it in an array
          return Array.isArray(result) ? result : [result];
        } catch (error) {
          console.error("Error fetching expenses:", error);
          return []; // Return empty array on error
        }
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
      resolve: async (root, _args, context, info) => {
        try {
          return await context.UserService.Query.users({
            root,
            context,
            info,
            key: root.userId,
            argsFromKeys: (keys) => {
              return { ids: keys };
            },
            valuesFromResults: (data: any) => {
              return data;
            },
          });
        } catch (error) {
          console.error(`Error fetching user for expense ${root.id}:`, error);
          return null; // Return null on error
        }
      },
    },
  },
};

export default resolvers;
