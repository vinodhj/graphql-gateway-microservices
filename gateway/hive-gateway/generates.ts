import { DocumentNode, ExecutionResult } from "graphql";
import gql from "graphql-tag";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  TransportOptions: { input: any; output: any };
  _DirectiveExtensions: { input: any; output: any };
  join__FieldSet: { input: any; output: any };
  link__Import: { input: any; output: any };
};

export type Expense = {
  __typename?: "Expense";
  amount: Scalars["Float"]["output"];
  category?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["String"]["output"];
  date: Scalars["String"]["output"];
  description: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  user: User;
  userId: Scalars["ID"]["output"];
};

export type Mutation = {
  __typename?: "Mutation";
  createExpense?: Maybe<Expense>;
  createUser?: Maybe<User>;
  deleteExpense?: Maybe<Scalars["Boolean"]["output"]>;
  deleteUser?: Maybe<Scalars["Boolean"]["output"]>;
  updateExpense?: Maybe<Expense>;
  updateUser?: Maybe<User>;
};

export type MutationCreateExpenseArgs = {
  amount: Scalars["Float"]["input"];
  category?: InputMaybe<Scalars["String"]["input"]>;
  date: Scalars["String"]["input"];
  description: Scalars["String"]["input"];
  userId: Scalars["ID"]["input"];
};

export type MutationCreateUserArgs = {
  email: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
};

export type MutationDeleteExpenseArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationDeleteUserArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationUpdateExpenseArgs = {
  amount?: InputMaybe<Scalars["Float"]["input"]>;
  category?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type MutationUpdateUserArgs = {
  email?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type Query = {
  __typename?: "Query";
  allUsers?: Maybe<Array<Maybe<User>>>;
  expense?: Maybe<Expense>;
  expenses?: Maybe<Array<Maybe<Expense>>>;
  expensesByDate?: Maybe<Array<Maybe<Expense>>>;
  expensesByUser?: Maybe<Array<Maybe<Expense>>>;
  expensesByUsers: Array<Maybe<Expense>>;
  user?: Maybe<User>;
  users: Array<Maybe<User>>;
};

export type QueryExpenseArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryExpensesByDateArgs = {
  endDate?: InputMaybe<Scalars["String"]["input"]>;
  startDate: Scalars["String"]["input"];
};

export type QueryExpensesByUserArgs = {
  userId: Scalars["ID"]["input"];
};

export type QueryExpensesByUsersArgs = {
  userIds: Array<Scalars["ID"]["input"]>;
};

export type QueryUserArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryUsersArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type User = {
  __typename?: "User";
  createdAt: Scalars["String"]["output"];
  email: Scalars["String"]["output"];
  expenses: Array<Expense>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  updatedAt?: Maybe<Scalars["String"]["output"]>;
};

export enum Join__Graph {
  ExpenseService = "EXPENSE_SERVICE",
  UserService = "USER_SERVICE",
}

export enum Link__Purpose {
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  Execution = "EXECUTION",
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  Security = "SECURITY",
}

export type Requester<C = {}, E = unknown> = <R, V>(
  doc: DocumentNode,
  vars?: V,
  options?: C,
) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>;
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {};
}
export type Sdk = ReturnType<typeof getSdk>;
