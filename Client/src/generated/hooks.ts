import { DateTimeString } from '../scalars';
import { EmailAddress } from '../scalars';
import { JWT } from '../scalars';
import { NonEmptyString } from '../scalars';
import { URL } from '../scalars';
import { UUID } from '../scalars';
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: DateTimeString; output: DateTimeString; }
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
 * Studio generation signal only. Persist image/description on tree-of-life;
 * clients refetch TreeOfLifeSubtree for the node after settle.
 */
export type TaxonVisual = {
  __typename?: 'TaxonVisual';
  assetId?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  nodeId?: Maybe<Scalars['String']['output']>;
  ottId: Scalars['Int']['output'];
  status: TaxonVisualStatus;
  visualScore?: Maybe<TaxonVisualScore>;
};

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

export type Kicl_AssetVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type Kicl_AssetData = { __typename?: 'Query', Asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null };

export type Kicl_MeVariables = Exact<{ [key: string]: never; }>;


export type Kicl_MeData = { __typename?: 'Query', Me?: { __typename?: 'MePayload', UserGUID?: UUID | null, Email?: EmailAddress | null, FirstName?: string | null, LastName?: string | null, Avatar?: string | null, Active?: boolean | null, aud?: string | null } | null };

export type Kicl_TaxonVisualVariables = Exact<{
  ottId: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  rank?: InputMaybe<Scalars['String']['input']>;
}>;


export type Kicl_TaxonVisualData = { __typename?: 'Query', TaxonVisual: { __typename?: 'TaxonVisual', status: TaxonVisualStatus, ottId: number, nodeId?: string | null, assetId?: string | null, description?: string | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null } };

export type Kicl_TreeOfLifeSubtreeVariables = Exact<{
  ottId?: InputMaybe<Scalars['Int']['input']>;
  nodeId?: InputMaybe<Scalars['String']['input']>;
  heightLimit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type Kicl_TreeOfLifeSubtreeData = { __typename?: 'Query', TreeOfLifeSubtree?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null }> | null }> | null }> | null } | null };

export type Kicl_TreeOfLifeSubtreesVariables = Exact<{
  ottIds?: InputMaybe<Array<Scalars['Int']['input']> | Scalars['Int']['input']>;
  nodeIds?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  heightLimit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type Kicl_TreeOfLifeSubtreesData = { __typename?: 'Query', TreeOfLifeSubtrees: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null }> | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null, descendants?: Array<{ __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null, numTips?: number | null, assetId?: string | null, description?: string | null, visualStatus?: TaxonVisualStatus | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null, ancestor?: { __typename?: 'TreeOfLifeNode', nodeId: string, ottId?: number | null, name?: string | null, rank?: string | null } | null, asset?: { __typename?: 'Asset', id: string, url: string, generator?: string | null } | null }> | null }> | null }> | null } | null> };

export type Kicl_ActivateVariables = Exact<{
  Activate: ActivateInput;
}>;


export type Kicl_ActivateData = { __typename?: 'Mutation', Activate?: boolean | null };

export type Kicl_ExchangeTokenVariables = Exact<{ [key: string]: never; }>;


export type Kicl_ExchangeTokenData = { __typename?: 'Mutation', ExchangeToken?: boolean | null };

export type Kicl_RefreshTokenVariables = Exact<{ [key: string]: never; }>;


export type Kicl_RefreshTokenData = { __typename?: 'Mutation', RefreshToken?: boolean | null };

export type Kicl_RegisterVariables = Exact<{
  Register: RegisterInput;
}>;


export type Kicl_RegisterData = { __typename?: 'Mutation', Register?: boolean | null };

export type Kicl_SignInVariables = Exact<{
  SignIn: SignInInput;
}>;


export type Kicl_SignInData = { __typename?: 'Mutation', SignIn?: boolean | null };

export type Kicl_SignOutVariables = Exact<{ [key: string]: never; }>;


export type Kicl_SignOutData = { __typename?: 'Mutation', SignOut?: boolean | null };

export type Kicl_SocialSignInVariables = Exact<{
  SocialSignIn: SocialSignInInput;
}>;


export type Kicl_SocialSignInData = { __typename?: 'Mutation', SocialSignIn?: boolean | null };

export type Kicl_TaxonVisualUpdatedVariables = Exact<{
  ottId: Scalars['Int']['input'];
}>;


export type Kicl_TaxonVisualUpdatedData = { __typename?: 'Subscription', TaxonVisualUpdated: { __typename?: 'TaxonVisual', status: TaxonVisualStatus, ottId: number, nodeId?: string | null, assetId?: string | null, description?: string | null, visualScore?: { __typename?: 'TaxonVisualScore', overall: number, taxonMatch: number, pass: boolean } | null } };


export const Kicl_AssetDocument = gql`
    query kicl_Asset($id: ID!) {
  Asset(id: $id) {
    id
    url
    generator
  }
}
    `;

/**
 * __useKicl_Asset__
 *
 * To run a query within a React component, call `useKicl_Asset` and pass it any options that fit your needs.
 * When your component renders, `useKicl_Asset` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKicl_Asset({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useKicl_Asset(baseOptions: Apollo.QueryHookOptions<Kicl_AssetData, Kicl_AssetVariables> & ({ variables: Kicl_AssetVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Kicl_AssetData, Kicl_AssetVariables>(Kicl_AssetDocument, options);
      }
export function useKicl_AssetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Kicl_AssetData, Kicl_AssetVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Kicl_AssetData, Kicl_AssetVariables>(Kicl_AssetDocument, options);
        }
// @ts-ignore
export function useKicl_AssetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Kicl_AssetData, Kicl_AssetVariables>): Apollo.UseSuspenseQueryResult<Kicl_AssetData, Kicl_AssetVariables>;
export function useKicl_AssetSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_AssetData, Kicl_AssetVariables>): Apollo.UseSuspenseQueryResult<Kicl_AssetData | undefined, Kicl_AssetVariables>;
export function useKicl_AssetSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_AssetData, Kicl_AssetVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Kicl_AssetData, Kicl_AssetVariables>(Kicl_AssetDocument, options);
        }
export type Kicl_AssetHookResult = ReturnType<typeof useKicl_Asset>;
export type Kicl_AssetLazyQueryHookResult = ReturnType<typeof useKicl_AssetLazyQuery>;
export type Kicl_AssetSuspenseQueryHookResult = ReturnType<typeof useKicl_AssetSuspenseQuery>;
export type Kicl_AssetQueryResult = Apollo.QueryResult<Kicl_AssetData, Kicl_AssetVariables>;
export const Kicl_MeDocument = gql`
    query kicl_Me {
  Me {
    UserGUID
    Email
    FirstName
    LastName
    Avatar
    Active
    aud
  }
}
    `;

/**
 * __useKicl_Me__
 *
 * To run a query within a React component, call `useKicl_Me` and pass it any options that fit your needs.
 * When your component renders, `useKicl_Me` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKicl_Me({
 *   variables: {
 *   },
 * });
 */
export function useKicl_Me(baseOptions?: Apollo.QueryHookOptions<Kicl_MeData, Kicl_MeVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Kicl_MeData, Kicl_MeVariables>(Kicl_MeDocument, options);
      }
export function useKicl_MeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Kicl_MeData, Kicl_MeVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Kicl_MeData, Kicl_MeVariables>(Kicl_MeDocument, options);
        }
// @ts-ignore
export function useKicl_MeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Kicl_MeData, Kicl_MeVariables>): Apollo.UseSuspenseQueryResult<Kicl_MeData, Kicl_MeVariables>;
export function useKicl_MeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_MeData, Kicl_MeVariables>): Apollo.UseSuspenseQueryResult<Kicl_MeData | undefined, Kicl_MeVariables>;
export function useKicl_MeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_MeData, Kicl_MeVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Kicl_MeData, Kicl_MeVariables>(Kicl_MeDocument, options);
        }
export type Kicl_MeHookResult = ReturnType<typeof useKicl_Me>;
export type Kicl_MeLazyQueryHookResult = ReturnType<typeof useKicl_MeLazyQuery>;
export type Kicl_MeSuspenseQueryHookResult = ReturnType<typeof useKicl_MeSuspenseQuery>;
export type Kicl_MeQueryResult = Apollo.QueryResult<Kicl_MeData, Kicl_MeVariables>;
export const Kicl_TaxonVisualDocument = gql`
    query kicl_TaxonVisual($ottId: Int!, $name: String!, $rank: String) {
  TaxonVisual(ottId: $ottId, name: $name, rank: $rank) {
    status
    ottId
    nodeId
    assetId
    description
    visualScore {
      overall
      taxonMatch
      pass
    }
  }
}
    `;

/**
 * __useKicl_TaxonVisual__
 *
 * To run a query within a React component, call `useKicl_TaxonVisual` and pass it any options that fit your needs.
 * When your component renders, `useKicl_TaxonVisual` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKicl_TaxonVisual({
 *   variables: {
 *      ottId: // value for 'ottId'
 *      name: // value for 'name'
 *      rank: // value for 'rank'
 *   },
 * });
 */
export function useKicl_TaxonVisual(baseOptions: Apollo.QueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables> & ({ variables: Kicl_TaxonVisualVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>(Kicl_TaxonVisualDocument, options);
      }
export function useKicl_TaxonVisualLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>(Kicl_TaxonVisualDocument, options);
        }
// @ts-ignore
export function useKicl_TaxonVisualSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>): Apollo.UseSuspenseQueryResult<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>;
export function useKicl_TaxonVisualSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>): Apollo.UseSuspenseQueryResult<Kicl_TaxonVisualData | undefined, Kicl_TaxonVisualVariables>;
export function useKicl_TaxonVisualSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>(Kicl_TaxonVisualDocument, options);
        }
export type Kicl_TaxonVisualHookResult = ReturnType<typeof useKicl_TaxonVisual>;
export type Kicl_TaxonVisualLazyQueryHookResult = ReturnType<typeof useKicl_TaxonVisualLazyQuery>;
export type Kicl_TaxonVisualSuspenseQueryHookResult = ReturnType<typeof useKicl_TaxonVisualSuspenseQuery>;
export type Kicl_TaxonVisualQueryResult = Apollo.QueryResult<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>;
export const Kicl_TreeOfLifeSubtreeDocument = gql`
    query kicl_TreeOfLifeSubtree($ottId: Int, $nodeId: String, $heightLimit: Int = 3) {
  TreeOfLifeSubtree(ottId: $ottId, nodeId: $nodeId, heightLimit: $heightLimit) {
    nodeId
    ottId
    name
    rank
    numTips
    assetId
    description
    visualStatus
    visualScore {
      overall
      taxonMatch
      pass
    }
    ancestor {
      nodeId
      ottId
      name
      rank
      numTips
      assetId
      description
      visualStatus
      descendants {
        nodeId
        ottId
        name
        rank
        numTips
        assetId
        description
        visualStatus
      }
      ancestor {
        nodeId
        ottId
        name
        rank
        numTips
        assetId
        description
        visualStatus
        descendants {
          nodeId
          ottId
          name
          rank
          numTips
          assetId
          description
          visualStatus
        }
        ancestor {
          nodeId
          ottId
          name
          rank
          numTips
          assetId
          description
          visualStatus
          descendants {
            nodeId
            ottId
            name
            rank
            numTips
            assetId
            description
            visualStatus
          }
          ancestor {
            nodeId
            ottId
            name
            rank
            numTips
            assetId
            description
            visualStatus
            descendants {
              nodeId
              ottId
              name
              rank
              numTips
              assetId
              description
              visualStatus
            }
            ancestor {
              nodeId
              ottId
              name
              rank
              numTips
              assetId
              description
              visualStatus
              descendants {
                nodeId
                ottId
                name
                rank
                numTips
                assetId
                description
                visualStatus
              }
              ancestor {
                nodeId
                ottId
                name
                rank
                numTips
                assetId
                description
                visualStatus
                descendants {
                  nodeId
                  ottId
                  name
                  rank
                  numTips
                  assetId
                  description
                  visualStatus
                }
                ancestor {
                  nodeId
                  ottId
                  name
                  rank
                  numTips
                  assetId
                  description
                  visualStatus
                  descendants {
                    nodeId
                    ottId
                    name
                    rank
                    numTips
                    assetId
                    description
                    visualStatus
                  }
                  ancestor {
                    nodeId
                    ottId
                    name
                    rank
                    numTips
                    assetId
                    description
                    visualStatus
                    descendants {
                      nodeId
                      ottId
                      name
                      rank
                      numTips
                      assetId
                      description
                      visualStatus
                    }
                    ancestor {
                      nodeId
                      ottId
                      name
                      rank
                      numTips
                      assetId
                      description
                      visualStatus
                      descendants {
                        nodeId
                        ottId
                        name
                        rank
                        numTips
                        assetId
                        description
                        visualStatus
                      }
                      ancestor {
                        nodeId
                        ottId
                        name
                        rank
                        numTips
                        assetId
                        description
                        visualStatus
                        descendants {
                          nodeId
                          ottId
                          name
                          rank
                          numTips
                          assetId
                          description
                          visualStatus
                        }
                        ancestor {
                          nodeId
                          ottId
                          name
                          rank
                          numTips
                          assetId
                          description
                          visualStatus
                          descendants {
                            nodeId
                            ottId
                            name
                            rank
                            numTips
                            assetId
                            description
                            visualStatus
                          }
                          ancestor {
                            nodeId
                            ottId
                            name
                            rank
                            numTips
                            assetId
                            description
                            visualStatus
                            descendants {
                              nodeId
                              ottId
                              name
                              rank
                              numTips
                              assetId
                              description
                              visualStatus
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    asset {
      id
      url
      generator
    }
    descendants {
      nodeId
      ottId
      name
      rank
      numTips
      assetId
      description
      visualStatus
      visualScore {
        overall
        taxonMatch
        pass
      }
      ancestor {
        nodeId
        ottId
        name
        rank
      }
      asset {
        id
        url
        generator
      }
      descendants {
        nodeId
        ottId
        name
        rank
        numTips
        assetId
        description
        visualStatus
        visualScore {
          overall
          taxonMatch
          pass
        }
        ancestor {
          nodeId
          ottId
          name
          rank
        }
        asset {
          id
          url
          generator
        }
        descendants {
          nodeId
          ottId
          name
          rank
          numTips
          assetId
          description
          visualStatus
          visualScore {
            overall
            taxonMatch
            pass
          }
          ancestor {
            nodeId
            ottId
            name
            rank
          }
          asset {
            id
            url
            generator
          }
        }
      }
    }
  }
}
    `;

/**
 * __useKicl_TreeOfLifeSubtree__
 *
 * To run a query within a React component, call `useKicl_TreeOfLifeSubtree` and pass it any options that fit your needs.
 * When your component renders, `useKicl_TreeOfLifeSubtree` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKicl_TreeOfLifeSubtree({
 *   variables: {
 *      ottId: // value for 'ottId'
 *      nodeId: // value for 'nodeId'
 *      heightLimit: // value for 'heightLimit'
 *   },
 * });
 */
export function useKicl_TreeOfLifeSubtree(baseOptions?: Apollo.QueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>(Kicl_TreeOfLifeSubtreeDocument, options);
      }
export function useKicl_TreeOfLifeSubtreeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>(Kicl_TreeOfLifeSubtreeDocument, options);
        }
// @ts-ignore
export function useKicl_TreeOfLifeSubtreeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>): Apollo.UseSuspenseQueryResult<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>;
export function useKicl_TreeOfLifeSubtreeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>): Apollo.UseSuspenseQueryResult<Kicl_TreeOfLifeSubtreeData | undefined, Kicl_TreeOfLifeSubtreeVariables>;
export function useKicl_TreeOfLifeSubtreeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>(Kicl_TreeOfLifeSubtreeDocument, options);
        }
export type Kicl_TreeOfLifeSubtreeHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtree>;
export type Kicl_TreeOfLifeSubtreeLazyQueryHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtreeLazyQuery>;
export type Kicl_TreeOfLifeSubtreeSuspenseQueryHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtreeSuspenseQuery>;
export type Kicl_TreeOfLifeSubtreeQueryResult = Apollo.QueryResult<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>;
export const Kicl_TreeOfLifeSubtreesDocument = gql`
    query kicl_TreeOfLifeSubtrees($ottIds: [Int!], $nodeIds: [String!], $heightLimit: Int = 3) {
  TreeOfLifeSubtrees(
    ottIds: $ottIds
    nodeIds: $nodeIds
    heightLimit: $heightLimit
  ) {
    nodeId
    ottId
    name
    rank
    numTips
    assetId
    description
    visualStatus
    visualScore {
      overall
      taxonMatch
      pass
    }
    ancestor {
      nodeId
      ottId
      name
      rank
      numTips
      assetId
      description
      visualStatus
      descendants {
        nodeId
        ottId
        name
        rank
        numTips
        assetId
        description
        visualStatus
      }
      ancestor {
        nodeId
        ottId
        name
        rank
        numTips
        assetId
        description
        visualStatus
        descendants {
          nodeId
          ottId
          name
          rank
          numTips
          assetId
          description
          visualStatus
        }
        ancestor {
          nodeId
          ottId
          name
          rank
          numTips
          assetId
          description
          visualStatus
          descendants {
            nodeId
            ottId
            name
            rank
            numTips
            assetId
            description
            visualStatus
          }
          ancestor {
            nodeId
            ottId
            name
            rank
            numTips
            assetId
            description
            visualStatus
            descendants {
              nodeId
              ottId
              name
              rank
              numTips
              assetId
              description
              visualStatus
            }
            ancestor {
              nodeId
              ottId
              name
              rank
              numTips
              assetId
              description
              visualStatus
              descendants {
                nodeId
                ottId
                name
                rank
                numTips
                assetId
                description
                visualStatus
              }
              ancestor {
                nodeId
                ottId
                name
                rank
                numTips
                assetId
                description
                visualStatus
                descendants {
                  nodeId
                  ottId
                  name
                  rank
                  numTips
                  assetId
                  description
                  visualStatus
                }
                ancestor {
                  nodeId
                  ottId
                  name
                  rank
                  numTips
                  assetId
                  description
                  visualStatus
                  descendants {
                    nodeId
                    ottId
                    name
                    rank
                    numTips
                    assetId
                    description
                    visualStatus
                  }
                  ancestor {
                    nodeId
                    ottId
                    name
                    rank
                    numTips
                    assetId
                    description
                    visualStatus
                    descendants {
                      nodeId
                      ottId
                      name
                      rank
                      numTips
                      assetId
                      description
                      visualStatus
                    }
                    ancestor {
                      nodeId
                      ottId
                      name
                      rank
                      numTips
                      assetId
                      description
                      visualStatus
                      descendants {
                        nodeId
                        ottId
                        name
                        rank
                        numTips
                        assetId
                        description
                        visualStatus
                      }
                      ancestor {
                        nodeId
                        ottId
                        name
                        rank
                        numTips
                        assetId
                        description
                        visualStatus
                        descendants {
                          nodeId
                          ottId
                          name
                          rank
                          numTips
                          assetId
                          description
                          visualStatus
                        }
                        ancestor {
                          nodeId
                          ottId
                          name
                          rank
                          numTips
                          assetId
                          description
                          visualStatus
                          descendants {
                            nodeId
                            ottId
                            name
                            rank
                            numTips
                            assetId
                            description
                            visualStatus
                          }
                          ancestor {
                            nodeId
                            ottId
                            name
                            rank
                            numTips
                            assetId
                            description
                            visualStatus
                            descendants {
                              nodeId
                              ottId
                              name
                              rank
                              numTips
                              assetId
                              description
                              visualStatus
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    asset {
      id
      url
      generator
    }
    descendants {
      nodeId
      ottId
      name
      rank
      numTips
      assetId
      description
      visualStatus
      visualScore {
        overall
        taxonMatch
        pass
      }
      ancestor {
        nodeId
        ottId
        name
        rank
      }
      asset {
        id
        url
        generator
      }
      descendants {
        nodeId
        ottId
        name
        rank
        numTips
        assetId
        description
        visualStatus
        visualScore {
          overall
          taxonMatch
          pass
        }
        ancestor {
          nodeId
          ottId
          name
          rank
        }
        asset {
          id
          url
          generator
        }
        descendants {
          nodeId
          ottId
          name
          rank
          numTips
          assetId
          description
          visualStatus
          visualScore {
            overall
            taxonMatch
            pass
          }
          ancestor {
            nodeId
            ottId
            name
            rank
          }
          asset {
            id
            url
            generator
          }
        }
      }
    }
  }
}
    `;

/**
 * __useKicl_TreeOfLifeSubtrees__
 *
 * To run a query within a React component, call `useKicl_TreeOfLifeSubtrees` and pass it any options that fit your needs.
 * When your component renders, `useKicl_TreeOfLifeSubtrees` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKicl_TreeOfLifeSubtrees({
 *   variables: {
 *      ottIds: // value for 'ottIds'
 *      nodeIds: // value for 'nodeIds'
 *      heightLimit: // value for 'heightLimit'
 *   },
 * });
 */
export function useKicl_TreeOfLifeSubtrees(baseOptions?: Apollo.QueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>(Kicl_TreeOfLifeSubtreesDocument, options);
      }
export function useKicl_TreeOfLifeSubtreesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>(Kicl_TreeOfLifeSubtreesDocument, options);
        }
// @ts-ignore
export function useKicl_TreeOfLifeSubtreesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>): Apollo.UseSuspenseQueryResult<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>;
export function useKicl_TreeOfLifeSubtreesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>): Apollo.UseSuspenseQueryResult<Kicl_TreeOfLifeSubtreesData | undefined, Kicl_TreeOfLifeSubtreesVariables>;
export function useKicl_TreeOfLifeSubtreesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>(Kicl_TreeOfLifeSubtreesDocument, options);
        }
export type Kicl_TreeOfLifeSubtreesHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtrees>;
export type Kicl_TreeOfLifeSubtreesLazyQueryHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtreesLazyQuery>;
export type Kicl_TreeOfLifeSubtreesSuspenseQueryHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtreesSuspenseQuery>;
export type Kicl_TreeOfLifeSubtreesQueryResult = Apollo.QueryResult<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>;
export const Kicl_ActivateDocument = gql`
    mutation kicl_Activate($Activate: ActivateInput!) {
  Activate(Activate: $Activate)
}
    `;
export type Kicl_ActivateMutationFn = Apollo.MutationFunction<Kicl_ActivateData, Kicl_ActivateVariables>;

/**
 * __useKicl_Activate__
 *
 * To run a mutation, you first call `useKicl_Activate` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_Activate` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclActivate, { data, loading, error }] = useKicl_Activate({
 *   variables: {
 *      Activate: // value for 'Activate'
 *   },
 * });
 */
export function useKicl_Activate(baseOptions?: Apollo.MutationHookOptions<Kicl_ActivateData, Kicl_ActivateVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_ActivateData, Kicl_ActivateVariables>(Kicl_ActivateDocument, options);
      }
export type Kicl_ActivateHookResult = ReturnType<typeof useKicl_Activate>;
export type Kicl_ActivateMutationResult = Apollo.MutationResult<Kicl_ActivateData>;
export type Kicl_ActivateMutationOptions = Apollo.BaseMutationOptions<Kicl_ActivateData, Kicl_ActivateVariables>;
export const Kicl_ExchangeTokenDocument = gql`
    mutation kicl_ExchangeToken {
  ExchangeToken
}
    `;
export type Kicl_ExchangeTokenMutationFn = Apollo.MutationFunction<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>;

/**
 * __useKicl_ExchangeToken__
 *
 * To run a mutation, you first call `useKicl_ExchangeToken` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_ExchangeToken` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclExchangeToken, { data, loading, error }] = useKicl_ExchangeToken({
 *   variables: {
 *   },
 * });
 */
export function useKicl_ExchangeToken(baseOptions?: Apollo.MutationHookOptions<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>(Kicl_ExchangeTokenDocument, options);
      }
export type Kicl_ExchangeTokenHookResult = ReturnType<typeof useKicl_ExchangeToken>;
export type Kicl_ExchangeTokenMutationResult = Apollo.MutationResult<Kicl_ExchangeTokenData>;
export type Kicl_ExchangeTokenMutationOptions = Apollo.BaseMutationOptions<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>;
export const Kicl_RefreshTokenDocument = gql`
    mutation kicl_RefreshToken {
  RefreshToken
}
    `;
export type Kicl_RefreshTokenMutationFn = Apollo.MutationFunction<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>;

/**
 * __useKicl_RefreshToken__
 *
 * To run a mutation, you first call `useKicl_RefreshToken` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_RefreshToken` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclRefreshToken, { data, loading, error }] = useKicl_RefreshToken({
 *   variables: {
 *   },
 * });
 */
export function useKicl_RefreshToken(baseOptions?: Apollo.MutationHookOptions<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>(Kicl_RefreshTokenDocument, options);
      }
export type Kicl_RefreshTokenHookResult = ReturnType<typeof useKicl_RefreshToken>;
export type Kicl_RefreshTokenMutationResult = Apollo.MutationResult<Kicl_RefreshTokenData>;
export type Kicl_RefreshTokenMutationOptions = Apollo.BaseMutationOptions<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>;
export const Kicl_RegisterDocument = gql`
    mutation kicl_Register($Register: RegisterInput!) {
  Register(Register: $Register)
}
    `;
export type Kicl_RegisterMutationFn = Apollo.MutationFunction<Kicl_RegisterData, Kicl_RegisterVariables>;

/**
 * __useKicl_Register__
 *
 * To run a mutation, you first call `useKicl_Register` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_Register` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclRegister, { data, loading, error }] = useKicl_Register({
 *   variables: {
 *      Register: // value for 'Register'
 *   },
 * });
 */
export function useKicl_Register(baseOptions?: Apollo.MutationHookOptions<Kicl_RegisterData, Kicl_RegisterVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_RegisterData, Kicl_RegisterVariables>(Kicl_RegisterDocument, options);
      }
export type Kicl_RegisterHookResult = ReturnType<typeof useKicl_Register>;
export type Kicl_RegisterMutationResult = Apollo.MutationResult<Kicl_RegisterData>;
export type Kicl_RegisterMutationOptions = Apollo.BaseMutationOptions<Kicl_RegisterData, Kicl_RegisterVariables>;
export const Kicl_SignInDocument = gql`
    mutation kicl_SignIn($SignIn: SignInInput!) {
  SignIn(SignIn: $SignIn)
}
    `;
export type Kicl_SignInMutationFn = Apollo.MutationFunction<Kicl_SignInData, Kicl_SignInVariables>;

/**
 * __useKicl_SignIn__
 *
 * To run a mutation, you first call `useKicl_SignIn` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_SignIn` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclSignIn, { data, loading, error }] = useKicl_SignIn({
 *   variables: {
 *      SignIn: // value for 'SignIn'
 *   },
 * });
 */
export function useKicl_SignIn(baseOptions?: Apollo.MutationHookOptions<Kicl_SignInData, Kicl_SignInVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_SignInData, Kicl_SignInVariables>(Kicl_SignInDocument, options);
      }
export type Kicl_SignInHookResult = ReturnType<typeof useKicl_SignIn>;
export type Kicl_SignInMutationResult = Apollo.MutationResult<Kicl_SignInData>;
export type Kicl_SignInMutationOptions = Apollo.BaseMutationOptions<Kicl_SignInData, Kicl_SignInVariables>;
export const Kicl_SignOutDocument = gql`
    mutation kicl_SignOut {
  SignOut
}
    `;
export type Kicl_SignOutMutationFn = Apollo.MutationFunction<Kicl_SignOutData, Kicl_SignOutVariables>;

/**
 * __useKicl_SignOut__
 *
 * To run a mutation, you first call `useKicl_SignOut` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_SignOut` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclSignOut, { data, loading, error }] = useKicl_SignOut({
 *   variables: {
 *   },
 * });
 */
export function useKicl_SignOut(baseOptions?: Apollo.MutationHookOptions<Kicl_SignOutData, Kicl_SignOutVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_SignOutData, Kicl_SignOutVariables>(Kicl_SignOutDocument, options);
      }
export type Kicl_SignOutHookResult = ReturnType<typeof useKicl_SignOut>;
export type Kicl_SignOutMutationResult = Apollo.MutationResult<Kicl_SignOutData>;
export type Kicl_SignOutMutationOptions = Apollo.BaseMutationOptions<Kicl_SignOutData, Kicl_SignOutVariables>;
export const Kicl_SocialSignInDocument = gql`
    mutation kicl_SocialSignIn($SocialSignIn: SocialSignInInput!) {
  SocialSignIn(SocialSignIn: $SocialSignIn)
}
    `;
export type Kicl_SocialSignInMutationFn = Apollo.MutationFunction<Kicl_SocialSignInData, Kicl_SocialSignInVariables>;

/**
 * __useKicl_SocialSignIn__
 *
 * To run a mutation, you first call `useKicl_SocialSignIn` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKicl_SocialSignIn` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kiclSocialSignIn, { data, loading, error }] = useKicl_SocialSignIn({
 *   variables: {
 *      SocialSignIn: // value for 'SocialSignIn'
 *   },
 * });
 */
export function useKicl_SocialSignIn(baseOptions?: Apollo.MutationHookOptions<Kicl_SocialSignInData, Kicl_SocialSignInVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Kicl_SocialSignInData, Kicl_SocialSignInVariables>(Kicl_SocialSignInDocument, options);
      }
export type Kicl_SocialSignInHookResult = ReturnType<typeof useKicl_SocialSignIn>;
export type Kicl_SocialSignInMutationResult = Apollo.MutationResult<Kicl_SocialSignInData>;
export type Kicl_SocialSignInMutationOptions = Apollo.BaseMutationOptions<Kicl_SocialSignInData, Kicl_SocialSignInVariables>;
export const Kicl_TaxonVisualUpdatedDocument = gql`
    subscription kicl_TaxonVisualUpdated($ottId: Int!) {
  TaxonVisualUpdated(ottId: $ottId) {
    status
    ottId
    nodeId
    assetId
    description
    visualScore {
      overall
      taxonMatch
      pass
    }
  }
}
    `;

/**
 * __useKicl_TaxonVisualUpdated__
 *
 * To run a query within a React component, call `useKicl_TaxonVisualUpdated` and pass it any options that fit your needs.
 * When your component renders, `useKicl_TaxonVisualUpdated` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKicl_TaxonVisualUpdated({
 *   variables: {
 *      ottId: // value for 'ottId'
 *   },
 * });
 */
export function useKicl_TaxonVisualUpdated(baseOptions: Apollo.SubscriptionHookOptions<Kicl_TaxonVisualUpdatedData, Kicl_TaxonVisualUpdatedVariables> & ({ variables: Kicl_TaxonVisualUpdatedVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<Kicl_TaxonVisualUpdatedData, Kicl_TaxonVisualUpdatedVariables>(Kicl_TaxonVisualUpdatedDocument, options);
      }
export type Kicl_TaxonVisualUpdatedHookResult = ReturnType<typeof useKicl_TaxonVisualUpdated>;
export type Kicl_TaxonVisualUpdatedSubscriptionResult = Apollo.SubscriptionResult<Kicl_TaxonVisualUpdatedData>;