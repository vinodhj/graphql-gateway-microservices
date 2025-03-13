// @ts-nocheck

import { InContextSdkMethod } from "@graphql-mesh/types";
import { MeshContext } from "@graphql-mesh/runtime";

export namespace UserServiceTypes {
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

  export type User = {
    id: Scalars["ID"]["output"];
    name: Scalars["String"]["output"];
    email: Scalars["String"]["output"];
    createdAt: Scalars["String"]["output"];
    updatedAt?: Maybe<Scalars["String"]["output"]>;
  };

  export type Query = {
    user?: Maybe<User>;
    users: Array<Maybe<User>>;
    allUsers?: Maybe<Array<Maybe<User>>>;
  };

  export type QueryuserArgs = {
    id: Scalars["ID"]["input"];
  };

  export type QueryusersArgs = {
    ids: Array<Scalars["ID"]["input"]>;
  };

  export type Mutation = {
    createUser?: Maybe<User>;
    updateUser?: Maybe<User>;
    deleteUser?: Maybe<Scalars["Boolean"]["output"]>;
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

  export type QuerySdk = {
    /** null **/
    user: InContextSdkMethod<Query["user"], QueryuserArgs, MeshContext>;
    /** null **/
    users: InContextSdkMethod<Query["users"], QueryusersArgs, MeshContext>;
    /** null **/
    allUsers: InContextSdkMethod<Query["allUsers"], {}, MeshContext>;
  };

  export type MutationSdk = {
    /** null **/
    createUser: InContextSdkMethod<Mutation["createUser"], MutationcreateUserArgs, MeshContext>;
    /** null **/
    updateUser: InContextSdkMethod<Mutation["updateUser"], MutationupdateUserArgs, MeshContext>;
    /** null **/
    deleteUser: InContextSdkMethod<Mutation["deleteUser"], MutationdeleteUserArgs, MeshContext>;
  };

  export type SubscriptionSdk = {};

  export type Context = {
    ["UserService"]: { Query: QuerySdk; Mutation: MutationSdk; Subscription: SubscriptionSdk };
  };
}
