import { DateTime } from '^/Codegen/scalars.js';
import { EmailAddress } from '^/Codegen/scalars.js';
import { JWT } from '^/Codegen/scalars.js';
import { NonEmptyString } from '^/Codegen/scalars.js';
import { URL } from '^/Codegen/scalars.js';
import { UUID } from '^/Codegen/scalars.js';
import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Context } from 'server/Context/index.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: DateTime; output: DateTime; }
  EmailAddress: { input: EmailAddress; output: EmailAddress; }
  JWT: { input: JWT; output: JWT; }
  NonEmptyString: { input: NonEmptyString; output: NonEmptyString; }
  URL: { input: URL; output: URL; }
  UUID: { input: UUID; output: UUID; }
};

export type ActivateInput = {
  RegistrationGUID: Scalars['UUID']['input'];
  Secret: Scalars['String']['input'];
  UserGUID: Scalars['UUID']['input'];
};

export type Asset = {
  __typename?: 'Asset';
  /**
   * How the asset was produced (e.g. openai:gpt-image-1).
   * Null means manually created / uploaded — not AI-generated.
   */
  generator?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
};

export type MePayload = {
  __typename?: 'MePayload';
  Active?: Maybe<Scalars['Boolean']['output']>;
  Avatar?: Maybe<Scalars['String']['output']>;
  Email?: Maybe<Scalars['EmailAddress']['output']>;
  FirstName?: Maybe<Scalars['String']['output']>;
  LastName?: Maybe<Scalars['String']['output']>;
  UserGUID?: Maybe<Scalars['UUID']['output']>;
  aud?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  Activate?: Maybe<Scalars['Boolean']['output']>;
  ExchangeToken?: Maybe<Scalars['Boolean']['output']>;
  RefreshToken?: Maybe<Scalars['Boolean']['output']>;
  Register?: Maybe<Scalars['Boolean']['output']>;
  SignIn?: Maybe<Scalars['Boolean']['output']>;
  SignOut?: Maybe<Scalars['Boolean']['output']>;
  SocialSignIn?: Maybe<Scalars['Boolean']['output']>;
};


export type MutationActivateArgs = {
  Activate: ActivateInput;
};


export type MutationRegisterArgs = {
  Register: RegisterInput;
};


export type MutationSignInArgs = {
  SignIn: SignInInput;
};


export type MutationSocialSignInArgs = {
  SocialSignIn: SocialSignInInput;
};

export enum Provider {
  Apple = 'apple',
  Google = 'google'
}

export type Query = {
  __typename?: 'Query';
  Asset?: Maybe<Asset>;
  Me?: Maybe<MePayload>;
  /**
   * Find taxa by name.
   *
   * Stored nodes are searched first, since they are the ones already placed in
   * the tree and can be navigated to immediately. Only when nothing is stored
   * does this fall through to Open Tree's name index — so exploring somewhere new
   * still works, and the cost of the remote call is paid only when it buys
   * something.
   */
  TaxonSearch: Array<TaxonSearchResult>;
  TaxonVisual: TaxonVisual;
  /**
   * Subtree from Open Tree of Life (cached in Mongo).
   * `ottId` defaults to 93302 (cellular organisms). `heightLimit` max 3.
   * Warm Mongo rows skip OTOL (known leaf or existing child edges).
   */
  TreeOfLifeSubtree?: Maybe<TreeOfLifeNode>;
  /**
   * Batch subtree roots in one request. Prefer this over parallel
   * `TreeOfLifeSubtree` calls (auto expand). Results are
   * `[...ottId roots, ...nodeId roots]` (nullable slots on hard miss).
   * Max 16 ids combined. Uses Mongo DataLoader batching + warm-path.
   */
  TreeOfLifeSubtrees: Array<Maybe<TreeOfLifeNode>>;
};


export type QueryAssetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaxonSearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryTaxonVisualArgs = {
  name: Scalars['String']['input'];
  ottId: Scalars['Int']['input'];
  rank?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTreeOfLifeSubtreeArgs = {
  heightLimit?: InputMaybe<Scalars['Int']['input']>;
  nodeId?: InputMaybe<Scalars['String']['input']>;
  ottId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTreeOfLifeSubtreesArgs = {
  heightLimit?: InputMaybe<Scalars['Int']['input']>;
  nodeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  ottIds?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type RegisterInput = {
  Email: Scalars['EmailAddress']['input'];
  FirstName?: InputMaybe<Scalars['String']['input']>;
  LastName?: InputMaybe<Scalars['String']['input']>;
  Password: Scalars['String']['input'];
};

export type SignInInput = {
  Email: Scalars['EmailAddress']['input'];
  Password: Scalars['String']['input'];
};

export type SocialSignInInput = {
  Provider: Provider;
  Token: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Pushes when async studio generation settles (READY, ERROR, or EXHAUSTED). */
  TaxonVisualUpdated: TaxonVisual;
};


export type SubscriptionTaxonVisualUpdatedArgs = {
  ottId: Scalars['Int']['input'];
};

/**
 * A taxon matching a search, from whichever source could answer.
 *
 * Both sources yield a `nodeId`, so a result navigates the same way wherever it
 * came from. A stored node has one recorded; a name matched against Open Tree's
 * taxonomy has it derived from the ott id, which is the same thing — the
 * synthetic tree names taxon nodes `ott` followed by their ott id.
 */
export type TaxonSearchResult = {
  __typename?: 'TaxonSearchResult';
  name: Scalars['String']['output'];
  nodeId?: Maybe<Scalars['String']['output']>;
  ottId?: Maybe<Scalars['Int']['output']>;
  rank?: Maybe<Scalars['String']['output']>;
  /** Where the match came from, so the client can say so if it wants. */
  source: TaxonSearchSource;
};

export enum TaxonSearchSource {
  /** Already known — matched against stored nodes. */
  Database = 'DATABASE',
  /** Matched against Open Tree's taxonomy because nothing was stored. */
  OpenTree = 'OPEN_TREE'
}

/**
 * Studio generation signal only. Persist image/description on tree-of-life;
 * clients refetch TreeOfLifeSubtree for the node after settle.
 */
export type TaxonVisual = {
  __typename?: 'TaxonVisual';
  assetId?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  /** Set only when status is EXHAUSTED. */
  exhaustion?: Maybe<TaxonVisualExhaustion>;
  nodeId?: Maybe<Scalars['String']['output']>;
  ottId: Scalars['Int']['output'];
  status: TaxonVisualStatus;
  visualScore?: Maybe<TaxonVisualScore>;
};

/**
 * Why generation is out of quota, when status is EXHAUSTED.
 *
 * `REFILLS` — at least one provider's allowance returns on a timer, so waiting
 * works. `BILLING` — every provider is out of credit, and only paying changes
 * that. The difference decides whether telling someone to try again later is
 * true.
 */
export enum TaxonVisualExhaustion {
  Billing = 'BILLING',
  Refills = 'REFILLS'
}

/** Vision QA scores from the studio generate pipeline. */
export type TaxonVisualScore = {
  __typename?: 'TaxonVisualScore';
  overall: Scalars['Float']['output'];
  pass: Scalars['Boolean']['output'];
  taxonMatch: Scalars['Float']['output'];
};

export enum TaxonVisualStatus {
  Error = 'ERROR',
  Exhausted = 'EXHAUSTED',
  Pending = 'PENDING',
  Ready = 'READY'
}

/**
 * Flat OTOL + studio node. Tree edges are nodeId-only, parent-pointer style:
 * `ancestor` ← the node's own ancestorNodeId (shallow stitch by DataLoader),
 * `descendants` ← a live reverse lookup (`{ ancestorNodeId: nodeId }`, batched).
 * Nothing is stored forward on the parent. Studio image via `asset` ← assetId.
 */
export type TreeOfLifeNode = {
  __typename?: 'TreeOfLifeNode';
  /** Parent node, stitched from this node's own ancestorNodeId. Null for the root (no OTOL parent). */
  ancestor?: Maybe<TreeOfLifeNode>;
  asset?: Maybe<Asset>;
  assetId?: Maybe<Scalars['ID']['output']>;
  descendants?: Maybe<Array<TreeOfLifeNode>>;
  description?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  nodeId: Scalars['String']['output'];
  /**
   * OTOL tip count for this clade. `0` means a known leaf (do not expand).
   * At height cutoffs, children may be omitted while numTips stays > 0.
   */
  numTips?: Maybe<Scalars['Int']['output']>;
  /** OTOL taxonomy id — an attribute/lookup key, not a relationship. Missing on some unnamed / synthetic nodes. */
  ottId?: Maybe<Scalars['Int']['output']>;
  rank?: Maybe<Scalars['String']['output']>;
  /** Studio vision QA for the current asset, when generated. */
  visualScore?: Maybe<TaxonVisualScore>;
  visualStatus?: Maybe<TaxonVisualStatus>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
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

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ActivateInput: ActivateInput;
  Asset: ResolverTypeWrapper<Asset>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  EmailAddress: ResolverTypeWrapper<Scalars['EmailAddress']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JWT: ResolverTypeWrapper<Scalars['JWT']['output']>;
  MePayload: ResolverTypeWrapper<MePayload>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NonEmptyString: ResolverTypeWrapper<Scalars['NonEmptyString']['output']>;
  Provider: Provider;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RegisterInput: RegisterInput;
  SignInInput: SignInInput;
  SocialSignInInput: SocialSignInInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  TaxonSearchResult: ResolverTypeWrapper<TaxonSearchResult>;
  TaxonSearchSource: TaxonSearchSource;
  TaxonVisual: ResolverTypeWrapper<TaxonVisual>;
  TaxonVisualExhaustion: TaxonVisualExhaustion;
  TaxonVisualScore: ResolverTypeWrapper<TaxonVisualScore>;
  TaxonVisualStatus: TaxonVisualStatus;
  TreeOfLifeNode: ResolverTypeWrapper<TreeOfLifeNode>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ActivateInput: ActivateInput;
  Asset: Asset;
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  EmailAddress: Scalars['EmailAddress']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JWT: Scalars['JWT']['output'];
  MePayload: MePayload;
  Mutation: Record<PropertyKey, never>;
  NonEmptyString: Scalars['NonEmptyString']['output'];
  Query: Record<PropertyKey, never>;
  RegisterInput: RegisterInput;
  SignInInput: SignInInput;
  SocialSignInInput: SocialSignInInput;
  String: Scalars['String']['output'];
  Subscription: Record<PropertyKey, never>;
  TaxonSearchResult: TaxonSearchResult;
  TaxonVisual: TaxonVisual;
  TaxonVisualScore: TaxonVisualScore;
  TreeOfLifeNode: TreeOfLifeNode;
  URL: Scalars['URL']['output'];
  UUID: Scalars['UUID']['output'];
}>;

export type AssetResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Asset'] = ResolversParentTypes['Asset']> = ResolversObject<{
  generator?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailAddressScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['EmailAddress'], any> {
  name: 'EmailAddress';
}

export interface JwtScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JWT'], any> {
  name: 'JWT';
}

export type MePayloadResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MePayload'] = ResolversParentTypes['MePayload']> = ResolversObject<{
  Active?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  Avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  Email?: Resolver<Maybe<ResolversTypes['EmailAddress']>, ParentType, ContextType>;
  FirstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  LastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  UserGUID?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  aud?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  Activate?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationActivateArgs, 'Activate'>>;
  ExchangeToken?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  RefreshToken?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  Register?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRegisterArgs, 'Register'>>;
  SignIn?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationSignInArgs, 'SignIn'>>;
  SignOut?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  SocialSignIn?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationSocialSignInArgs, 'SocialSignIn'>>;
}>;

export interface NonEmptyStringScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['NonEmptyString'], any> {
  name: 'NonEmptyString';
}

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  Asset?: Resolver<Maybe<ResolversTypes['Asset']>, ParentType, ContextType, RequireFields<QueryAssetArgs, 'id'>>;
  Me?: Resolver<Maybe<ResolversTypes['MePayload']>, ParentType, ContextType>;
  TaxonSearch?: Resolver<Array<ResolversTypes['TaxonSearchResult']>, ParentType, ContextType, RequireFields<QueryTaxonSearchArgs, 'limit' | 'query'>>;
  TaxonVisual?: Resolver<ResolversTypes['TaxonVisual'], ParentType, ContextType, RequireFields<QueryTaxonVisualArgs, 'name' | 'ottId'>>;
  TreeOfLifeSubtree?: Resolver<Maybe<ResolversTypes['TreeOfLifeNode']>, ParentType, ContextType, RequireFields<QueryTreeOfLifeSubtreeArgs, 'heightLimit'>>;
  TreeOfLifeSubtrees?: Resolver<Array<Maybe<ResolversTypes['TreeOfLifeNode']>>, ParentType, ContextType, RequireFields<QueryTreeOfLifeSubtreesArgs, 'heightLimit'>>;
}>;

export type SubscriptionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  TaxonVisualUpdated?: SubscriptionResolver<ResolversTypes['TaxonVisual'], "TaxonVisualUpdated", ParentType, ContextType, RequireFields<SubscriptionTaxonVisualUpdatedArgs, 'ottId'>>;
}>;

export type TaxonSearchResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TaxonSearchResult'] = ResolversParentTypes['TaxonSearchResult']> = ResolversObject<{
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nodeId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ottId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['TaxonSearchSource'], ParentType, ContextType>;
}>;

export type TaxonVisualResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TaxonVisual'] = ResolversParentTypes['TaxonVisual']> = ResolversObject<{
  assetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  exhaustion?: Resolver<Maybe<ResolversTypes['TaxonVisualExhaustion']>, ParentType, ContextType>;
  nodeId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ottId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TaxonVisualStatus'], ParentType, ContextType>;
  visualScore?: Resolver<Maybe<ResolversTypes['TaxonVisualScore']>, ParentType, ContextType>;
}>;

export type TaxonVisualScoreResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TaxonVisualScore'] = ResolversParentTypes['TaxonVisualScore']> = ResolversObject<{
  overall?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pass?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  taxonMatch?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type TreeOfLifeNodeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TreeOfLifeNode'] = ResolversParentTypes['TreeOfLifeNode']> = ResolversObject<{
  ancestor?: Resolver<Maybe<ResolversTypes['TreeOfLifeNode']>, ParentType, ContextType>;
  asset?: Resolver<Maybe<ResolversTypes['Asset']>, ParentType, ContextType>;
  assetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  descendants?: Resolver<Maybe<Array<ResolversTypes['TreeOfLifeNode']>>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nodeId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  numTips?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  ottId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  visualScore?: Resolver<Maybe<ResolversTypes['TaxonVisualScore']>, ParentType, ContextType>;
  visualStatus?: Resolver<Maybe<ResolversTypes['TaxonVisualStatus']>, ParentType, ContextType>;
}>;

export interface UrlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['URL'], any> {
  name: 'URL';
}

export interface UuidScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

export type Resolvers<ContextType = Context> = ResolversObject<{
  Asset?: AssetResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  EmailAddress?: GraphQLScalarType;
  JWT?: GraphQLScalarType;
  MePayload?: MePayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NonEmptyString?: GraphQLScalarType;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  TaxonSearchResult?: TaxonSearchResultResolvers<ContextType>;
  TaxonVisual?: TaxonVisualResolvers<ContextType>;
  TaxonVisualScore?: TaxonVisualScoreResolvers<ContextType>;
  TreeOfLifeNode?: TreeOfLifeNodeResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UUID?: GraphQLScalarType;
}>;

