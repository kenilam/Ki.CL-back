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
   * Null means manually created / uploaded - not AI-generated.
   */
  generator?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
};

/** What the caller may still draw today. */
export type ImageAgentAllowance = {
  __typename?: 'ImageAgentAllowance';
  /**
   * A turn is running in one of the caller's conversations. A new message is
   * refused until it ends.
   */
  busy: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  /** Set while the caller has to wait before the next message. */
  nextAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  remaining: Scalars['Int']['output'];
  /**
   * The caller's own conversations with a turn running, most recent first. Can
   * be empty while `busy` is set, when the running one belongs to the same
   * address under another session.
   */
  running: Array<ImageAgentThread>;
};

/**
 * Whether waiting helps, after a FAILURE for quota. `REFILLS` means at least
 * one provider's allowance comes back on a timer; `BILLING` means every one is
 * out of credit.
 */
export enum ImageAgentExhaustion {
  Billing = 'BILLING',
  Refills = 'REFILLS'
}

export type ImageAgentMessage = {
  __typename?: 'ImageAgentMessage';
  asset?: Maybe<Asset>;
  assetId?: Maybe<Scalars['ID']['output']>;
  at: Scalars['DateTime']['output'];
  /**
   * Short replies the person can pick instead of typing, on a QUESTION. Picking
   * one sends its text as the next message. Empty when none fit.
   */
  choices: Array<Scalars['String']['output']>;
  exhaustion?: Maybe<ImageAgentExhaustion>;
  id: Scalars['ID']['output'];
  kind: ImageAgentMessageKind;
  rejection?: Maybe<ImageAgentRejection>;
  role: ImageAgentRole;
  score?: Maybe<ImageAgentScore>;
  text?: Maybe<Scalars['String']['output']>;
};

export enum ImageAgentMessageKind {
  /** The drawing did not finish. `text` says why; see `exhaustion`. */
  Failure = 'FAILURE',
  /** A finished picture: `asset` and `score`. */
  Image = 'IMAGE',
  /** The agent is drawing; `text` says what it is doing right now. */
  Progress = 'PROGRESS',
  /** The agent needs one more thing before it draws. */
  Question = 'QUESTION',
  /** Turned away by the governor. See `rejection`; `text` says why. */
  Refusal = 'REFUSAL',
  Text = 'TEXT'
}

/** Why the governor turned a request away. */
export enum ImageAgentRejection {
  /** Not about a picture: gibberish, tests, or instructions aimed at the model. */
  Spam = 'SPAM',
  UnsafeOther = 'UNSAFE_OTHER',
  UnsafeSexual = 'UNSAFE_SEXUAL',
  UnsafeViolent = 'UNSAFE_VIOLENT'
}

export enum ImageAgentRole {
  Agent = 'AGENT',
  User = 'USER'
}

/** Vision review of a delivered image, 1-10 per criterion. */
export type ImageAgentScore = {
  __typename?: 'ImageAgentScore';
  composition: Scalars['Float']['output'];
  overall: Scalars['Float']['output'];
  pass: Scalars['Boolean']['output'];
  quality: Scalars['Float']['output'];
  relevance: Scalars['Float']['output'];
  styleMatch: Scalars['Float']['output'];
  suggestions: Array<Scalars['String']['output']>;
};

export enum ImageAgentStyle {
  Illustration = 'ILLUSTRATION',
  Minimal = 'MINIMAL',
  Photography = 'PHOTOGRAPHY',
  Render_3D = 'RENDER_3D'
}

/** One conversation with the agent, newest message last. */
export type ImageAgentThread = {
  __typename?: 'ImageAgentThread';
  /**
   * What the agent is doing while THINKING, in a few words, updated as it goes.
   * Null at any other time; while DRAWING the PROGRESS message says it.
   */
  activity?: Maybe<Scalars['String']['output']>;
  /** The agent's current understanding of the picture, once it has one. */
  brief?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  messages: Array<ImageAgentMessage>;
  status: ImageAgentThreadStatus;
  style?: Maybe<ImageAgentStyle>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum ImageAgentThreadStatus {
  Drawing = 'DRAWING',
  /** Waiting on the person. */
  Idle = 'IDLE',
  /** Reading the last message. */
  Thinking = 'THINKING'
}

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
  /**
   * Go back to one of the person's messages and ask it again. Everything from
   * that message on leaves the conversation, and the message is sent again.
   * Without `messageId`, the person's last message.
   */
  ImageAgentRetry: ImageAgentThread;
  /**
   * Say something to the agent. Starts a conversation when `threadId` is not
   * given. Returns as soon as the message is recorded; the reply arrives on
   * ImageAgentThreadUpdated.
   */
  ImageAgentSend: ImageAgentThread;
  RefreshToken?: Maybe<Scalars['Boolean']['output']>;
  Register?: Maybe<Scalars['Boolean']['output']>;
  SignIn?: Maybe<Scalars['Boolean']['output']>;
  SignOut?: Maybe<Scalars['Boolean']['output']>;
  SocialSignIn?: Maybe<Scalars['Boolean']['output']>;
};


export type MutationActivateArgs = {
  Activate: ActivateInput;
};


export type MutationImageAgentRetryArgs = {
  messageId?: InputMaybe<Scalars['ID']['input']>;
  threadId: Scalars['ID']['input'];
};


export type MutationImageAgentSendArgs = {
  text: Scalars['String']['input'];
  threadId?: InputMaybe<Scalars['ID']['input']>;
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
  ImageAgentAllowance: ImageAgentAllowance;
  /**
   * Pictures the reviewer passed, from anyone's conversations, in random order.
   * Answered without a token. Only the asset: no text, owner or conversation.
   * At most 24; 12 when `limit` is not given.
   */
  ImageAgentGallery: Array<Asset>;
  /**
   * The caller's conversations that already cover most of what `text` asks for,
   * closest first, at most three. For offering to continue one instead of
   * starting over.
   */
  ImageAgentSimilar: Array<ImageAgentThread>;
  ImageAgentThread?: Maybe<ImageAgentThread>;
  /** The caller's conversations, most recently active first. */
  ImageAgentThreads: Array<ImageAgentThread>;
  Me?: Maybe<MePayload>;
  /**
   * Find taxa by name.
   *
   * Stored nodes are searched first, since they are the ones already placed in
   * the tree and can be navigated to immediately. Only when nothing is stored
   * does this fall through to Open Tree's name index - so exploring somewhere new
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


export type QueryImageAgentGalleryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryImageAgentSimilarArgs = {
  text: Scalars['String']['input'];
};


export type QueryImageAgentThreadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryImageAgentThreadsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
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
  /** Pushes the whole conversation on every change. */
  ImageAgentThreadUpdated: ImageAgentThread;
  /** Pushes when async studio generation settles (READY, ERROR, or EXHAUSTED). */
  TaxonVisualUpdated: TaxonVisual;
};


export type SubscriptionImageAgentThreadUpdatedArgs = {
  id: Scalars['ID']['input'];
};


export type SubscriptionTaxonVisualUpdatedArgs = {
  ottId: Scalars['Int']['input'];
};

/**
 * A taxon matching a search, from whichever source could answer.
 *
 * Both sources yield a `nodeId`, so a result navigates the same way wherever it
 * came from. A stored node has one recorded; a name matched against Open Tree's
 * taxonomy has it derived from the ott id, which is the same thing - the
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
  /** Already known - matched against stored nodes. */
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
 * `REFILLS` - at least one provider's allowance returns on a timer, so waiting
 * works. `BILLING` - every provider is out of credit, and only paying changes
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
  /** OTOL taxonomy id - an attribute/lookup key, not a relationship. Missing on some unnamed / synthetic nodes. */
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
  ImageAgentAllowance: ResolverTypeWrapper<ImageAgentAllowance>;
  ImageAgentExhaustion: ImageAgentExhaustion;
  ImageAgentMessage: ResolverTypeWrapper<ImageAgentMessage>;
  ImageAgentMessageKind: ImageAgentMessageKind;
  ImageAgentRejection: ImageAgentRejection;
  ImageAgentRole: ImageAgentRole;
  ImageAgentScore: ResolverTypeWrapper<ImageAgentScore>;
  ImageAgentStyle: ImageAgentStyle;
  ImageAgentThread: ResolverTypeWrapper<ImageAgentThread>;
  ImageAgentThreadStatus: ImageAgentThreadStatus;
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
  ImageAgentAllowance: ImageAgentAllowance;
  ImageAgentMessage: ImageAgentMessage;
  ImageAgentScore: ImageAgentScore;
  ImageAgentThread: ImageAgentThread;
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

export type ImageAgentAllowanceResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ImageAgentAllowance'] = ResolversParentTypes['ImageAgentAllowance']> = ResolversObject<{
  busy?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nextAllowedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  remaining?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  running?: Resolver<Array<ResolversTypes['ImageAgentThread']>, ParentType, ContextType>;
}>;

export type ImageAgentMessageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ImageAgentMessage'] = ResolversParentTypes['ImageAgentMessage']> = ResolversObject<{
  asset?: Resolver<Maybe<ResolversTypes['Asset']>, ParentType, ContextType>;
  assetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  at?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  choices?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  exhaustion?: Resolver<Maybe<ResolversTypes['ImageAgentExhaustion']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ImageAgentMessageKind'], ParentType, ContextType>;
  rejection?: Resolver<Maybe<ResolversTypes['ImageAgentRejection']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['ImageAgentRole'], ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['ImageAgentScore']>, ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type ImageAgentScoreResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ImageAgentScore'] = ResolversParentTypes['ImageAgentScore']> = ResolversObject<{
  composition?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  overall?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pass?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  quality?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  relevance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  styleMatch?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  suggestions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type ImageAgentThreadResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ImageAgentThread'] = ResolversParentTypes['ImageAgentThread']> = ResolversObject<{
  activity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  brief?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  messages?: Resolver<Array<ResolversTypes['ImageAgentMessage']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ImageAgentThreadStatus'], ParentType, ContextType>;
  style?: Resolver<Maybe<ResolversTypes['ImageAgentStyle']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

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
  ImageAgentRetry?: Resolver<ResolversTypes['ImageAgentThread'], ParentType, ContextType, RequireFields<MutationImageAgentRetryArgs, 'threadId'>>;
  ImageAgentSend?: Resolver<ResolversTypes['ImageAgentThread'], ParentType, ContextType, RequireFields<MutationImageAgentSendArgs, 'text'>>;
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
  ImageAgentAllowance?: Resolver<ResolversTypes['ImageAgentAllowance'], ParentType, ContextType>;
  ImageAgentGallery?: Resolver<Array<ResolversTypes['Asset']>, ParentType, ContextType, Partial<QueryImageAgentGalleryArgs>>;
  ImageAgentSimilar?: Resolver<Array<ResolversTypes['ImageAgentThread']>, ParentType, ContextType, RequireFields<QueryImageAgentSimilarArgs, 'text'>>;
  ImageAgentThread?: Resolver<Maybe<ResolversTypes['ImageAgentThread']>, ParentType, ContextType, RequireFields<QueryImageAgentThreadArgs, 'id'>>;
  ImageAgentThreads?: Resolver<Array<ResolversTypes['ImageAgentThread']>, ParentType, ContextType, Partial<QueryImageAgentThreadsArgs>>;
  Me?: Resolver<Maybe<ResolversTypes['MePayload']>, ParentType, ContextType>;
  TaxonSearch?: Resolver<Array<ResolversTypes['TaxonSearchResult']>, ParentType, ContextType, RequireFields<QueryTaxonSearchArgs, 'limit' | 'query'>>;
  TaxonVisual?: Resolver<ResolversTypes['TaxonVisual'], ParentType, ContextType, RequireFields<QueryTaxonVisualArgs, 'name' | 'ottId'>>;
  TreeOfLifeSubtree?: Resolver<Maybe<ResolversTypes['TreeOfLifeNode']>, ParentType, ContextType, RequireFields<QueryTreeOfLifeSubtreeArgs, 'heightLimit'>>;
  TreeOfLifeSubtrees?: Resolver<Array<Maybe<ResolversTypes['TreeOfLifeNode']>>, ParentType, ContextType, RequireFields<QueryTreeOfLifeSubtreesArgs, 'heightLimit'>>;
}>;

export type SubscriptionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  ImageAgentThreadUpdated?: SubscriptionResolver<ResolversTypes['ImageAgentThread'], "ImageAgentThreadUpdated", ParentType, ContextType, RequireFields<SubscriptionImageAgentThreadUpdatedArgs, 'id'>>;
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
  ImageAgentAllowance?: ImageAgentAllowanceResolvers<ContextType>;
  ImageAgentMessage?: ImageAgentMessageResolvers<ContextType>;
  ImageAgentScore?: ImageAgentScoreResolvers<ContextType>;
  ImageAgentThread?: ImageAgentThreadResolvers<ContextType>;
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

