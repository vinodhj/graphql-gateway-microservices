// @ts-nocheck

import { InContextSdkMethod } from "@graphql-mesh/types";
import { MeshContext } from "@graphql-mesh/runtime";

export namespace ExpenseServiceTypes {
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
  };

  export type Expense = {
    id: Scalars["ID"]["output"];
    userId: Scalars["ID"]["output"];
    amount: Scalars["Float"]["output"];
    description: Scalars["String"]["output"];
    category?: Maybe<Scalars["String"]["output"]>;
    date: Scalars["String"]["output"];
    createdAt: Scalars["String"]["output"];
  };

  export type Query = {
    expense?: Maybe<Expense>;
    expenses?: Maybe<Array<Maybe<Expense>>>;
    expensesByUser?: Maybe<Array<Maybe<Expense>>>;
    expensesByUsers: Array<Maybe<Expense>>;
    expensesByDate?: Maybe<Array<Maybe<Expense>>>;
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
    createExpense?: Maybe<Expense>;
    updateExpense?: Maybe<Expense>;
    deleteExpense?: Maybe<Scalars["Boolean"]["output"]>;
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

  export type QuerySdk = {
    /** null **/
    expense: InContextSdkMethod<Query["expense"], QueryexpenseArgs, MeshContext>;
    /** null **/
    expenses: InContextSdkMethod<Query["expenses"], {}, MeshContext>;
    /** null **/
    expensesByUser: InContextSdkMethod<Query["expensesByUser"], QueryexpensesByUserArgs, MeshContext>;
    /** null **/
    expensesByUsers: InContextSdkMethod<Query["expensesByUsers"], QueryexpensesByUsersArgs, MeshContext>;
    /** null **/
    expensesByDate: InContextSdkMethod<Query["expensesByDate"], QueryexpensesByDateArgs, MeshContext>;
  };

  export type MutationSdk = {
    /** null **/
    createExpense: InContextSdkMethod<Mutation["createExpense"], MutationcreateExpenseArgs, MeshContext>;
    /** null **/
    updateExpense: InContextSdkMethod<Mutation["updateExpense"], MutationupdateExpenseArgs, MeshContext>;
    /** null **/
    deleteExpense: InContextSdkMethod<Mutation["deleteExpense"], MutationdeleteExpenseArgs, MeshContext>;
  };

  export type SubscriptionSdk = {};

  export type Context = {
    ["ExpenseService"]: { Query: QuerySdk; Mutation: MutationSdk; Subscription: SubscriptionSdk };
  };
}
