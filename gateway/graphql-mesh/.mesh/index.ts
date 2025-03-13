// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode } from "graphql";
import type { GetMeshOptions } from "@graphql-mesh/runtime";
import type { YamlConfig } from "@graphql-mesh/types";
import { defaultImportFn, handleImport } from "@graphql-mesh/utils";
import { PubSub } from "@graphql-mesh/utils";
import { DefaultLogger } from "@graphql-mesh/utils";
import type { MeshResolvedSource } from "@graphql-mesh/runtime";
import type { MeshTransform, MeshPlugin } from "@graphql-mesh/types";
import { parse } from "graphql";
import { createMeshHTTPHandler, MeshHTTPHandler } from "@graphql-mesh/http";
import {
  getMesh,
  type ExecuteMeshFn,
  type SubscribeMeshFn,
  type MeshContext as BaseMeshContext,
  type MeshInstance,
} from "@graphql-mesh/runtime";
import { MeshStore, FsStoreStorageAdapter } from "@graphql-mesh/store";
import { path as pathModule } from "@graphql-mesh/cross-helpers";
import type { ImportFn } from "@graphql-mesh/types";
import type { ExpenseServiceTypes } from "./sources/ExpenseService/types";
import type { UserServiceTypes } from "./sources/UserService/types";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type Query = {
  user?: Maybe<User>;
  users: Array<Maybe<User>>;
  allUsers?: Maybe<Array<Maybe<User>>>;
  expense?: Maybe<Expense>;
  expenses?: Maybe<Array<Maybe<Expense>>>;
  expensesByUser?: Maybe<Array<Maybe<Expense>>>;
  expensesByUsers: Array<Maybe<Expense>>;
  expensesByDate?: Maybe<Array<Maybe<Expense>>>;
};

export type QueryuserArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryusersArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type QueryexpenseArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryexpensesByUserArgs = {
  userId: Scalars["ID"]["input"];
};

export type QueryexpensesByUsersArgs = {
  userIds: Array<Scalars["ID"]["input"]>;
};

export type QueryexpensesByDateArgs = {
  startDate: Scalars["String"]["input"];
  endDate?: InputMaybe<Scalars["String"]["input"]>;
};

export type Mutation = {
  createUser?: Maybe<User>;
  updateUser?: Maybe<User>;
  deleteUser?: Maybe<Scalars["Boolean"]["output"]>;
  createExpense?: Maybe<Expense>;
  updateExpense?: Maybe<Expense>;
  deleteExpense?: Maybe<Scalars["Boolean"]["output"]>;
};

export type MutationcreateUserArgs = {
  name: Scalars["String"]["input"];
  email: Scalars["String"]["input"];
};

export type MutationupdateUserArgs = {
  id: Scalars["ID"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationdeleteUserArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationcreateExpenseArgs = {
  userId: Scalars["ID"]["input"];
  amount: Scalars["Float"]["input"];
  description: Scalars["String"]["input"];
  category?: InputMaybe<Scalars["String"]["input"]>;
  date: Scalars["String"]["input"];
};

export type MutationupdateExpenseArgs = {
  id: Scalars["ID"]["input"];
  amount?: InputMaybe<Scalars["Float"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  category?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationdeleteExpenseArgs = {
  id: Scalars["ID"]["input"];
};

export type User = {
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  email: Scalars["String"]["output"];
  createdAt: Scalars["String"]["output"];
  updatedAt?: Maybe<Scalars["String"]["output"]>;
  expenses: Array<Expense>;
};

export type Expense = {
  id: Scalars["ID"]["output"];
  userId: Scalars["ID"]["output"];
  amount: Scalars["Float"]["output"];
  description: Scalars["String"]["output"];
  category?: Maybe<Scalars["String"]["output"]>;
  date: Scalars["String"]["output"];
  createdAt: Scalars["String"]["output"];
  user: User;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> =
  | LegacyStitchingResolver<TResult, TParent, TContext, TArgs>
  | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Query: ResolverTypeWrapper<{}>;
  Mutation: ResolverTypeWrapper<{}>;
  User: ResolverTypeWrapper<User>;
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  Expense: ResolverTypeWrapper<Expense>;
  Float: ResolverTypeWrapper<Scalars["Float"]["output"]>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Query: {};
  Mutation: {};
  User: User;
  ID: Scalars["ID"]["output"];
  String: Scalars["String"]["output"];
  Boolean: Scalars["Boolean"]["output"];
  Expense: Expense;
  Float: Scalars["Float"]["output"];
}>;

export type QueryResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes["Query"] = ResolversParentTypes["Query"],
> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes["User"]>, ParentType, ContextType, RequireFields<QueryuserArgs, "id">>;
  users?: Resolver<Array<Maybe<ResolversTypes["User"]>>, ParentType, ContextType, RequireFields<QueryusersArgs, "ids">>;
  allUsers?: Resolver<Maybe<Array<Maybe<ResolversTypes["User"]>>>, ParentType, ContextType>;
  expense?: Resolver<Maybe<ResolversTypes["Expense"]>, ParentType, ContextType, RequireFields<QueryexpenseArgs, "id">>;
  expenses?: Resolver<Maybe<Array<Maybe<ResolversTypes["Expense"]>>>, ParentType, ContextType>;
  expensesByUser?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["Expense"]>>>,
    ParentType,
    ContextType,
    RequireFields<QueryexpensesByUserArgs, "userId">
  >;
  expensesByUsers?: Resolver<
    Array<Maybe<ResolversTypes["Expense"]>>,
    ParentType,
    ContextType,
    RequireFields<QueryexpensesByUsersArgs, "userIds">
  >;
  expensesByDate?: Resolver<
    Maybe<Array<Maybe<ResolversTypes["Expense"]>>>,
    ParentType,
    ContextType,
    RequireFields<QueryexpensesByDateArgs, "startDate">
  >;
}>;

export type MutationResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = ResolversObject<{
  createUser?: Resolver<Maybe<ResolversTypes["User"]>, ParentType, ContextType, RequireFields<MutationcreateUserArgs, "name" | "email">>;
  updateUser?: Resolver<Maybe<ResolversTypes["User"]>, ParentType, ContextType, RequireFields<MutationupdateUserArgs, "id">>;
  deleteUser?: Resolver<Maybe<ResolversTypes["Boolean"]>, ParentType, ContextType, RequireFields<MutationdeleteUserArgs, "id">>;
  createExpense?: Resolver<
    Maybe<ResolversTypes["Expense"]>,
    ParentType,
    ContextType,
    RequireFields<MutationcreateExpenseArgs, "userId" | "amount" | "description" | "date">
  >;
  updateExpense?: Resolver<Maybe<ResolversTypes["Expense"]>, ParentType, ContextType, RequireFields<MutationupdateExpenseArgs, "id">>;
  deleteExpense?: Resolver<Maybe<ResolversTypes["Boolean"]>, ParentType, ContextType, RequireFields<MutationdeleteExpenseArgs, "id">>;
}>;

export type UserResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes["User"] = ResolversParentTypes["User"],
> = ResolversObject<{
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  email?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  expenses?: Resolver<Array<ResolversTypes["Expense"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ExpenseResolvers<
  ContextType = MeshContext,
  ParentType extends ResolversParentTypes["Expense"] = ResolversParentTypes["Expense"],
> = ResolversObject<{
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes["Float"], ParentType, ContextType>;
  description?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  category?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  date?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  user?: Resolver<ResolversTypes["User"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext> = ResolversObject<{
  Query?: QueryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  Expense?: ExpenseResolvers<ContextType>;
}>;

export type MeshContext = UserServiceTypes.Context & ExpenseServiceTypes.Context & BaseMeshContext;

import { fileURLToPath } from "@graphql-mesh/utils";
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), "..");

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId)
    .split("\\")
    .join("/")
    .replace(baseDir + "/", "");
  switch (relativeModuleId) {
    case ".mesh/sources/ExpenseService/introspectionSchema":
      return import("./sources/ExpenseService/introspectionSchema") as T;

    case ".mesh/sources/UserService/introspectionSchema":
      return import("./sources/UserService/introspectionSchema") as T;

    default:
      return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
  }
};

const rootStore = new MeshStore(
  ".mesh",
  new FsStoreStorageAdapter({
    cwd: baseDir,
    importFn,
    fileType: "ts",
  }),
  {
    readonly: true,
    validate: false,
  },
);

export const rawServeConfig: YamlConfig.Config["serve"] = undefined as any;
export async function getMeshOptions(): Promise<GetMeshOptions> {
  const pubsub = new PubSub();
  const sourcesStore = rootStore.child("sources");
  const logger = new DefaultLogger("");
  const MeshCache = await import("@graphql-mesh/cache-localforage").then(handleImport);
  const cache = new MeshCache({
    ...{},
    importFn,
    store: rootStore.child("cache"),
    pubsub,
    logger,
  });
  const fetchFn = await import("@whatwg-node/fetch").then((m) => m?.fetch || m);
  const sources: MeshResolvedSource[] = [];
  const transforms: MeshTransform[] = [];
  const additionalEnvelopPlugins: MeshPlugin<any>[] = [];
  const userServiceTransforms = [];
  const expenseServiceTransforms = [];
  const UserServiceHandler = await import("@graphql-mesh/graphql").then(handleImport);
  const userServiceHandler = new UserServiceHandler({
    name: "UserService",
    config: { endpoint: "http://localhost:7501/graphql" },
    baseDir,
    cache,
    pubsub,
    store: sourcesStore.child("UserService"),
    logger: logger.child({ source: "UserService" }),
    importFn,
  });
  const ExpenseServiceHandler = await import("@graphql-mesh/graphql").then(handleImport);
  const expenseServiceHandler = new ExpenseServiceHandler({
    name: "ExpenseService",
    config: { endpoint: "http://localhost:7502/graphql" },
    baseDir,
    cache,
    pubsub,
    store: sourcesStore.child("ExpenseService"),
    logger: logger.child({ source: "ExpenseService" }),
    importFn,
  });
  sources[0] = {
    name: "UserService",
    handler: userServiceHandler,
    transforms: userServiceTransforms,
  };
  sources[1] = {
    name: "ExpenseService",
    handler: expenseServiceHandler,
    transforms: expenseServiceTransforms,
  };
  const additionalTypeDefs = [parse("extend type User {\n  expenses: [Expense!]!\n}\n\nextend type Expense {\n  user: User!\n}")] as any[];
  const additionalResolvers = await Promise.all([import("../src/additional-resolvers.ts").then((m) => m.resolvers || m.default || m)]);
  const Merger = await import("@graphql-mesh/merger-stitching").then(handleImport);
  const merger = new Merger({
    cache,
    pubsub,
    logger: logger.child({ merger: "stitching" }),
    store: rootStore.child("stitching"),
  });

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    pubsub,
    merger,
    logger,
    additionalEnvelopPlugins,
    get documents() {
      return [];
    },
    fetchFn,
  };
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: getBuiltMesh,
    rawServeConfig: undefined,
  });
}

let meshInstance$: Promise<MeshInstance> | undefined;

export const pollingInterval = null;

export function getBuiltMesh(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    if (pollingInterval) {
      setInterval(() => {
        getMeshOptions()
          .then((meshOptions) => getMesh(meshOptions))
          .then((newMesh) =>
            meshInstance$.then((oldMesh) => {
              oldMesh.destroy();
              meshInstance$ = Promise.resolve(newMesh);
            }),
          )
          .catch((err) => {
            console.error("Mesh polling failed so the existing version will be used:", err);
          });
      }, pollingInterval);
    }
    meshInstance$ = getMeshOptions()
      .then((meshOptions) => getMesh(meshOptions))
      .then((mesh) => {
        const id = mesh.pubsub.subscribe("destroy", () => {
          meshInstance$ = undefined;
          mesh.pubsub.unsubscribe(id);
        });
        return mesh;
      });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => getBuiltMesh().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => getBuiltMesh().then(({ subscribe }) => subscribe(...args));
