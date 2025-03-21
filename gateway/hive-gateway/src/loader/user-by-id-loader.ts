/**
 * Creates a DataLoader for batching user requests by userId.
 */
import DataLoader from "dataloader";
import { GraphQLResolveInfo } from "graphql";
import { HiveGatewayContext } from "../additional-resolvers";
import { User } from "../../generates";

export interface UserResponse {
  users?: User[];
  allUsers?: User[];
  data?: User[];
  [key: string]: any;
}

/**
 * Groups users by their id.
 */
const groupUsersById = (data: UserResponse): Map<string, User> => {
  const userMap = new Map<string, User>();

  if (Array.isArray(data)) {
    data.forEach((user: User) => {
      if (user?.id) {
        userMap.set(user.id, user);
      }
    });
  } else if (data && typeof data === "object") {
    const usersArray =
      (Array.isArray(data?.data) ? data.data : null) ||
      (Array.isArray(data?.users) ? data.users : null) ||
      (Array.isArray(data?.allUsers) ? data.allUsers : null) ||
      [];
    usersArray.forEach((user: User) => {
      if (user?.id) {
        userMap.set(user.id, user);
      }
    });
  }
  return userMap;
};

export const createUsersLoader = (context: HiveGatewayContext, info: GraphQLResolveInfo): DataLoader<string, User | null> => {
  const userServiceQuery = context.UserService.query || context.UserService.Query;
  if (!userServiceQuery?.users) {
    throw new Error("UserService does not have a valid  query method");
  }

  return new DataLoader<string, User | null>(
    async (userIds: readonly string[]) => {
      try {
        const rawUsers = await userServiceQuery.users({
          root: {},
          args: { ids: userIds as string[] },
          context,
          info,
        });
        const users: UserResponse = rawUsers as UserResponse;
        const userMap = groupUsersById(users);
        return userIds.map((userId) => userMap.get(userId) || null);
      } catch (error: unknown) {
        console.error("Error batch loading users:", error);
        return userIds.map(() => null);
      }
    },
    {
      cacheKeyFn: (key) => key.toString(),
      maxBatchSize: 20,
    },
  );
};
