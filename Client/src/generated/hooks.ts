/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { EmailAddress, UUID } from '../scalars';
import { gql } from '@apollo/client';
import * as ApolloReactCommon from '@apollo/client/react';
import * as ApolloReactHooks from '@apollo/client/react';
const defaultOptions = {} as const;
export type ActivateInput = {
  RegistrationGUID: UUID;
  Secret: string;
  UserGUID: UUID;
};

export type Provider =
  | 'apple'
  | 'google';

export type RegisterInput = {
  Email: EmailAddress;
  FirstName?: string | null | undefined;
  LastName?: string | null | undefined;
  Password: string;
};

export type SignInInput = {
  Email: EmailAddress;
  Password: string;
};

export type SocialSignInInput = {
  Provider: Provider;
  Token: string;
};

export type TaxonVisualStatus =
  | 'ERROR'
  | 'EXHAUSTED'
  | 'PENDING'
  | 'READY';

export type Kicl_AssetVariables = Exact<{
  id: string | number;
}>;


export type Kicl_AssetData = { Asset: { id: string, url: string, generator: string | null } | null };

export type Kicl_MeVariables = Exact<{ [key: string]: never; }>;


export type Kicl_MeData = { Me: { UserGUID: UUID | null, Email: EmailAddress | null, FirstName: string | null, LastName: string | null, Avatar: string | null, Active: boolean | null, aud: string | null } | null };

export type Kicl_TaxonVisualVariables = Exact<{
  ottId: number;
  name: string;
  rank?: string | null | undefined;
}>;


export type Kicl_TaxonVisualData = { TaxonVisual: { status: TaxonVisualStatus, ottId: number, nodeId: string | null, assetId: string | null, description: string | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null } };

export type Kicl_TreeOfLifeSubtreeVariables = Exact<{
  ottId?: number | null | undefined;
  nodeId?: string | null | undefined;
  heightLimit?: number | null | undefined;
}>;


export type Kicl_TreeOfLifeSubtreeData = { TreeOfLifeSubtree: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null, asset: { id: string, url: string, generator: string | null } | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null } | null, asset: { id: string, url: string, generator: string | null } | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null } | null, asset: { id: string, url: string, generator: string | null } | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null } | null, asset: { id: string, url: string, generator: string | null } | null }> | null }> | null }> | null } | null };

export type Kicl_TreeOfLifeSubtreesVariables = Exact<{
  ottIds?: Array<number> | number | null | undefined;
  nodeIds?: Array<string> | string | null | undefined;
  heightLimit?: number | null | undefined;
}>;


export type Kicl_TreeOfLifeSubtreesData = { TreeOfLifeSubtrees: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null }> | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null } | null, asset: { id: string, url: string, generator: string | null } | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null } | null, asset: { id: string, url: string, generator: string | null } | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null } | null, asset: { id: string, url: string, generator: string | null } | null, descendants: Array<{ nodeId: string, ottId: number | null, name: string | null, rank: string | null, numTips: number | null, assetId: string | null, description: string | null, visualStatus: TaxonVisualStatus | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null, ancestor: { nodeId: string, ottId: number | null, name: string | null, rank: string | null } | null, asset: { id: string, url: string, generator: string | null } | null }> | null }> | null }> | null } | null> };

export type Kicl_ActivateVariables = Exact<{
  Activate: ActivateInput;
}>;


export type Kicl_ActivateData = { Activate: boolean | null };

export type Kicl_ExchangeTokenVariables = Exact<{ [key: string]: never; }>;


export type Kicl_ExchangeTokenData = { ExchangeToken: boolean | null };

export type Kicl_RefreshTokenVariables = Exact<{ [key: string]: never; }>;


export type Kicl_RefreshTokenData = { RefreshToken: boolean | null };

export type Kicl_RegisterVariables = Exact<{
  Register: RegisterInput;
}>;


export type Kicl_RegisterData = { Register: boolean | null };

export type Kicl_SignInVariables = Exact<{
  SignIn: SignInInput;
}>;


export type Kicl_SignInData = { SignIn: boolean | null };

export type Kicl_SignOutVariables = Exact<{ [key: string]: never; }>;


export type Kicl_SignOutData = { SignOut: boolean | null };

export type Kicl_SocialSignInVariables = Exact<{
  SocialSignIn: SocialSignInInput;
}>;


export type Kicl_SocialSignInData = { SocialSignIn: boolean | null };

export type Kicl_TaxonVisualUpdatedVariables = Exact<{
  ottId: number;
}>;


export type Kicl_TaxonVisualUpdatedData = { TaxonVisualUpdated: { status: TaxonVisualStatus, ottId: number, nodeId: string | null, assetId: string | null, description: string | null, visualScore: { overall: number, taxonMatch: number, pass: boolean } | null } };


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
export function useKicl_Asset(baseOptions: ApolloReactHooks.QueryHookOptions<Kicl_AssetData, Kicl_AssetVariables> & ({ variables: Kicl_AssetVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Kicl_AssetData, Kicl_AssetVariables>(Kicl_AssetDocument, options);
      }
export function useKicl_AssetLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Kicl_AssetData, Kicl_AssetVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Kicl_AssetData, Kicl_AssetVariables>(Kicl_AssetDocument, options);
        }
export type Kicl_AssetHookResult = ReturnType<typeof useKicl_Asset>;
export type Kicl_AssetLazyQueryHookResult = ReturnType<typeof useKicl_AssetLazyQuery>;
export type Kicl_AssetQueryResult = ApolloReactCommon.QueryResult<Kicl_AssetData, Kicl_AssetVariables>;
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
export function useKicl_Me(baseOptions?: ApolloReactHooks.QueryHookOptions<Kicl_MeData, Kicl_MeVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Kicl_MeData, Kicl_MeVariables>(Kicl_MeDocument, options);
      }
export function useKicl_MeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Kicl_MeData, Kicl_MeVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Kicl_MeData, Kicl_MeVariables>(Kicl_MeDocument, options);
        }
export type Kicl_MeHookResult = ReturnType<typeof useKicl_Me>;
export type Kicl_MeLazyQueryHookResult = ReturnType<typeof useKicl_MeLazyQuery>;
export type Kicl_MeQueryResult = ApolloReactCommon.QueryResult<Kicl_MeData, Kicl_MeVariables>;
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
export function useKicl_TaxonVisual(baseOptions: ApolloReactHooks.QueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables> & ({ variables: Kicl_TaxonVisualVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>(Kicl_TaxonVisualDocument, options);
      }
export function useKicl_TaxonVisualLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>(Kicl_TaxonVisualDocument, options);
        }
export type Kicl_TaxonVisualHookResult = ReturnType<typeof useKicl_TaxonVisual>;
export type Kicl_TaxonVisualLazyQueryHookResult = ReturnType<typeof useKicl_TaxonVisualLazyQuery>;
export type Kicl_TaxonVisualQueryResult = ApolloReactCommon.QueryResult<Kicl_TaxonVisualData, Kicl_TaxonVisualVariables>;
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
export function useKicl_TreeOfLifeSubtree(baseOptions?: ApolloReactHooks.QueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>(Kicl_TreeOfLifeSubtreeDocument, options);
      }
export function useKicl_TreeOfLifeSubtreeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>(Kicl_TreeOfLifeSubtreeDocument, options);
        }
export type Kicl_TreeOfLifeSubtreeHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtree>;
export type Kicl_TreeOfLifeSubtreeLazyQueryHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtreeLazyQuery>;
export type Kicl_TreeOfLifeSubtreeQueryResult = ApolloReactCommon.QueryResult<Kicl_TreeOfLifeSubtreeData, Kicl_TreeOfLifeSubtreeVariables>;
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
export function useKicl_TreeOfLifeSubtrees(baseOptions?: ApolloReactHooks.QueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>(Kicl_TreeOfLifeSubtreesDocument, options);
      }
export function useKicl_TreeOfLifeSubtreesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>(Kicl_TreeOfLifeSubtreesDocument, options);
        }
export type Kicl_TreeOfLifeSubtreesHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtrees>;
export type Kicl_TreeOfLifeSubtreesLazyQueryHookResult = ReturnType<typeof useKicl_TreeOfLifeSubtreesLazyQuery>;
export type Kicl_TreeOfLifeSubtreesQueryResult = ApolloReactCommon.QueryResult<Kicl_TreeOfLifeSubtreesData, Kicl_TreeOfLifeSubtreesVariables>;
export const Kicl_ActivateDocument = gql`
    mutation kicl_Activate($Activate: ActivateInput!) {
  Activate(Activate: $Activate)
}
    `;

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
export function useKicl_Activate(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_ActivateData, Kicl_ActivateVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_ActivateData, Kicl_ActivateVariables>(Kicl_ActivateDocument, options);
      }
export type Kicl_ActivateHookResult = ReturnType<typeof useKicl_Activate>;
export type Kicl_ActivateMutationResult = ApolloReactCommon.MutationResult<Kicl_ActivateData>;
export type Kicl_ActivateMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_ActivateData, Kicl_ActivateVariables>;
export const Kicl_ExchangeTokenDocument = gql`
    mutation kicl_ExchangeToken {
  ExchangeToken
}
    `;

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
export function useKicl_ExchangeToken(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>(Kicl_ExchangeTokenDocument, options);
      }
export type Kicl_ExchangeTokenHookResult = ReturnType<typeof useKicl_ExchangeToken>;
export type Kicl_ExchangeTokenMutationResult = ApolloReactCommon.MutationResult<Kicl_ExchangeTokenData>;
export type Kicl_ExchangeTokenMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_ExchangeTokenData, Kicl_ExchangeTokenVariables>;
export const Kicl_RefreshTokenDocument = gql`
    mutation kicl_RefreshToken {
  RefreshToken
}
    `;

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
export function useKicl_RefreshToken(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>(Kicl_RefreshTokenDocument, options);
      }
export type Kicl_RefreshTokenHookResult = ReturnType<typeof useKicl_RefreshToken>;
export type Kicl_RefreshTokenMutationResult = ApolloReactCommon.MutationResult<Kicl_RefreshTokenData>;
export type Kicl_RefreshTokenMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_RefreshTokenData, Kicl_RefreshTokenVariables>;
export const Kicl_RegisterDocument = gql`
    mutation kicl_Register($Register: RegisterInput!) {
  Register(Register: $Register)
}
    `;

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
export function useKicl_Register(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_RegisterData, Kicl_RegisterVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_RegisterData, Kicl_RegisterVariables>(Kicl_RegisterDocument, options);
      }
export type Kicl_RegisterHookResult = ReturnType<typeof useKicl_Register>;
export type Kicl_RegisterMutationResult = ApolloReactCommon.MutationResult<Kicl_RegisterData>;
export type Kicl_RegisterMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_RegisterData, Kicl_RegisterVariables>;
export const Kicl_SignInDocument = gql`
    mutation kicl_SignIn($SignIn: SignInInput!) {
  SignIn(SignIn: $SignIn)
}
    `;

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
export function useKicl_SignIn(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_SignInData, Kicl_SignInVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_SignInData, Kicl_SignInVariables>(Kicl_SignInDocument, options);
      }
export type Kicl_SignInHookResult = ReturnType<typeof useKicl_SignIn>;
export type Kicl_SignInMutationResult = ApolloReactCommon.MutationResult<Kicl_SignInData>;
export type Kicl_SignInMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_SignInData, Kicl_SignInVariables>;
export const Kicl_SignOutDocument = gql`
    mutation kicl_SignOut {
  SignOut
}
    `;

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
export function useKicl_SignOut(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_SignOutData, Kicl_SignOutVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_SignOutData, Kicl_SignOutVariables>(Kicl_SignOutDocument, options);
      }
export type Kicl_SignOutHookResult = ReturnType<typeof useKicl_SignOut>;
export type Kicl_SignOutMutationResult = ApolloReactCommon.MutationResult<Kicl_SignOutData>;
export type Kicl_SignOutMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_SignOutData, Kicl_SignOutVariables>;
export const Kicl_SocialSignInDocument = gql`
    mutation kicl_SocialSignIn($SocialSignIn: SocialSignInInput!) {
  SocialSignIn(SocialSignIn: $SocialSignIn)
}
    `;

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
export function useKicl_SocialSignIn(baseOptions?: ApolloReactHooks.MutationHookOptions<Kicl_SocialSignInData, Kicl_SocialSignInVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Kicl_SocialSignInData, Kicl_SocialSignInVariables>(Kicl_SocialSignInDocument, options);
      }
export type Kicl_SocialSignInHookResult = ReturnType<typeof useKicl_SocialSignIn>;
export type Kicl_SocialSignInMutationResult = ApolloReactCommon.MutationResult<Kicl_SocialSignInData>;
export type Kicl_SocialSignInMutationOptions = ApolloReactCommon.MutationHookOptions<Kicl_SocialSignInData, Kicl_SocialSignInVariables>;
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
export function useKicl_TaxonVisualUpdated(baseOptions: ApolloReactHooks.SubscriptionHookOptions<Kicl_TaxonVisualUpdatedData, Kicl_TaxonVisualUpdatedVariables> & ({ variables: Kicl_TaxonVisualUpdatedVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<Kicl_TaxonVisualUpdatedData, Kicl_TaxonVisualUpdatedVariables>(Kicl_TaxonVisualUpdatedDocument, options);
      }
export type Kicl_TaxonVisualUpdatedHookResult = ReturnType<typeof useKicl_TaxonVisualUpdated>;
export type Kicl_TaxonVisualUpdatedSubscriptionResult = ApolloReactCommon.SubscriptionResult<Kicl_TaxonVisualUpdatedData>;