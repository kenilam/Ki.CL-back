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
  AcceptLanguage: { input: string; output: string; }
  DateTime: { input: DateTime; output: DateTime; }
  EmailAddress: { input: EmailAddress; output: EmailAddress; }
  JSONObject: { input: Record<string, string | number>; output: Record<string, string | number>; }
  JWT: { input: JWT; output: JWT; }
  NonEmptyString: { input: NonEmptyString; output: NonEmptyString; }
  URL: { input: URL; output: URL; }
  UUID: { input: UUID; output: UUID; }
};

/** Whether a language can be shown yet. */
export type AcceptLanguageStatus = {
  __typename?: 'AcceptLanguageStatus';
  acceptLanguage: Scalars['AcceptLanguage']['output'];
  /** Every `en-US` string is in this language. Only a complete language can be picked or answered in. */
  complete: Scalars['Boolean']['output'];
  /** `make translations.translate` is working on this language now. */
  translating: Scalars['Boolean']['output'];
};

export type ActivateInput = {
  registrationGUID: Scalars['UUID']['input'];
  secret: Scalars['String']['input'];
  userGUID: Scalars['UUID']['input'];
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

export type ContactInput = {
  email: Scalars['EmailAddress']['input'];
  message: Scalars['String']['input'];
};

export type DeleteMeInput = {
  currentPassword: Scalars['String']['input'];
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
  /** The caller's conversations with a turn running, most recent first. */
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

/** Sheets the caller may still read today. */
export type KineticLightAllowance = {
  __typename?: 'KineticLightAllowance';
  /** One of the caller's sheets is being read. A new one is refused until it ends. */
  busy: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  /** Set while the caller has to wait before the next read. */
  nextAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Also 0 while the service is at its own limit. */
  remaining: Scalars['Int']['output'];
};

/**
 * How a song starts, chosen by a model from the song's outline: the piano, the
 * drums, the scene's settings and a drum part in sections. `zoom` runs from 3
 * to 20, `hue` from 0 to 1 and `glow` from 0 to 3, as in the player's settings.
 */
export type KineticLightArrangement = {
  __typename?: 'KineticLightArrangement';
  beat: KineticLightBeat;
  glow: Scalars['Float']['output'];
  hue: Scalars['Float']['output'];
  sections: Array<KineticLightSection>;
  /** The outline's `steps`, which the patterns are written in. */
  steps: Scalars['Int']['output'];
  voice: KineticLightVoice;
  zoom: Scalars['Float']['output'];
};

/**
 * The drums a song starts with: none, the acoustic kit, the same kit recorded
 * lo-fi, hand percussion, or the LinnDrum and TR-808 drum machines.
 */
export enum KineticLightBeat {
  Kit = 'KIT',
  Linndrum = 'LINNDRUM',
  Lofi = 'LOFI',
  Machine = 'MACHINE',
  None = 'NONE',
  Percussion = 'PERCUSSION'
}

/** A chord symbol printed above the staff. `bar` and `beat` count from 1, in quarter notes. */
export type KineticLightChord = {
  __typename?: 'KineticLightChord';
  bar: Scalars['Int']['output'];
  beat: Scalars['Float']['output'];
  symbol: Scalars['String']['output'];
};

/**
 * The attached image or PDF. `data` is its bytes in base64. `name` is the file's
 * name: the song's title until the reader finds one, and a hint for finding it.
 * The name itself isn't kept.
 */
export type KineticLightFile = {
  data: Scalars['String']['input'];
  name: Scalars['NonEmptyString']['input'];
};

/**
 * What a model is told about a song so it can arrange it. `steps` is how many
 * steps a beat is split into: 2 for eighth notes, 3 for triplets, 4 for
 * sixteenths. `bars` has one string for each bar, with one character for each
 * step: `b` where a note below middle C starts, `x` where another note starts,
 * and `.` where none does.
 */
export type KineticLightOutline = {
  bars: Array<Scalars['String']['input']>;
  beatsPerBar: Scalars['Int']['input'];
  steps: Scalars['Int']['input'];
  /** Quarter-note beats per minute. */
  tempo: Scalars['Float']['input'];
  title: Scalars['NonEmptyString']['input'];
};

/**
 * One bar of drums, one string for each drum with one character for each step:
 * `X` an accented hit, `x` a hit, `.` nothing. On the drum machine, `snare` is
 * played as a clap. In hand percussion, `kick` is a low conga, `snare` a conga
 * slap, `hat` and `openHat` a shaker, `ride` a high bongo, `highTom` a high
 * conga, `lowTom` a low bongo, and `crash` a big low conga.
 */
export type KineticLightPattern = {
  __typename?: 'KineticLightPattern';
  hat: Scalars['String']['output'];
  highTom: Scalars['String']['output'];
  kick: Scalars['String']['output'];
  lowTom: Scalars['String']['output'];
  openHat: Scalars['String']['output'];
  ride: Scalars['String']['output'];
  snare: Scalars['String']['output'];
};

/**
 * A song behind a link, kept for 30 days, or for good when it's an example: a
 * sheet the API read, or a MIDI or MusicXML file. For a sheet, the notes come
 * from the sheet reader and everything else from a vision model. While READING,
 * the counts, title, tempo and chords fill in as each reader gets to them, and
 * `musicxml` waits for the end. When READY, a field is null, or `chords` empty,
 * when its reader failed or found nothing.
 */
export type KineticLightReading = {
  __typename?: 'KineticLightReading';
  /** Null until the owner has asked a model to arrange the song. */
  arrangement?: Maybe<KineticLightArrangement>;
  /** Bars the sheet reader found. */
  bars?: Maybe<Scalars['Int']['output']>;
  beatsPerBar?: Maybe<Scalars['Int']['output']>;
  chords: Array<KineticLightChord>;
  createdAt: Scalars['DateTime']['output'];
  /** Why the read failed, in the visitor's language. Null unless FAILED. */
  failure?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The MIDI file, in base64. */
  midi?: Maybe<Scalars['String']['output']>;
  /** The caller made this song, so they can ask for an arrangement. */
  mine: Scalars['Boolean']['output'];
  /** The notes on the staff, as MusicXML. */
  musicxml?: Maybe<Scalars['String']['output']>;
  /** Pitched notes the sheet reader found. */
  notes?: Maybe<Scalars['Int']['output']>;
  source: KineticLightSource;
  /** Null once the reading has finished. */
  stage?: Maybe<KineticLightStage>;
  status: KineticLightStatus;
  /** Quarter-note beats per minute. */
  tempo?: Maybe<Scalars['Float']['output']>;
  /** The file's name without its extension, until a reader finds the title. */
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Bars `from` to `to`, counted from 1, that share a drum pattern. With no
 * `pattern` the drums rest. `fill` replaces the pattern on the section's last bar.
 */
export type KineticLightSection = {
  __typename?: 'KineticLightSection';
  /** A crash on the section's first beat. */
  crash: Scalars['Boolean']['output'];
  fill?: Maybe<KineticLightPattern>;
  from: Scalars['Int']['output'];
  pattern?: Maybe<KineticLightPattern>;
  to: Scalars['Int']['output'];
};

/** A song in a list, without its notes. */
export type KineticLightSong = {
  __typename?: 'KineticLightSong';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  source: KineticLightSource;
  title: Scalars['String']['output'];
};

/**
 * A MIDI or MusicXML file the browser has read, to keep behind a link, with the
 * title the browser read from it: `midi` is the MIDI file in base64, `musicxml`
 * the MusicXML text. Give one of them.
 */
export type KineticLightSongInput = {
  midi?: InputMaybe<Scalars['String']['input']>;
  musicxml?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['NonEmptyString']['input'];
};

/** Where a song came from: a sheet the API read, or a MIDI or MusicXML file. */
export enum KineticLightSource {
  File = 'FILE',
  Sheet = 'SHEET'
}

/** What a reading is busy with: the notes on the staff, then the chord symbols. */
export enum KineticLightStage {
  Chords = 'CHORDS',
  Notes = 'NOTES'
}

export enum KineticLightStatus {
  Failed = 'FAILED',
  Reading = 'READING',
  Ready = 'READY'
}

export enum KineticLightVoice {
  Grand = 'GRAND',
  Sixteen = 'SIXTEEN',
  Synth = 'SYNTH',
  Upright = 'UPRIGHT',
  Wurlitzer = 'WURLITZER'
}

export type MePayload = {
  __typename?: 'MePayload';
  active?: Maybe<Scalars['Boolean']['output']>;
  aud?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['EmailAddress']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  /** The portfolio pieces this user may open. Empty for an anonymous session. */
  portfolios: Array<Portfolio>;
  userGUID?: Maybe<Scalars['UUID']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  activate?: Maybe<Scalars['Boolean']['output']>;
  /** Sends a message to the site's owner and acknowledges it at the sender's address. Needs a session that passed the Turnstile check. */
  contact?: Maybe<Scalars['Boolean']['output']>;
  deleteMe?: Maybe<Scalars['Boolean']['output']>;
  exchangeToken?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Go back to one of the person's messages and ask it again. Everything from
   * that message on leaves the conversation, and the message is sent again.
   * Without `messageId`, the person's last message.
   */
  imageAgentRetry: ImageAgentThread;
  /**
   * Say something to the agent. Starts a conversation when `threadId` is not
   * given. Returns as soon as the message is recorded; the reply arrives on
   * ImageAgentThreadUpdated.
   */
  imageAgentSend: ImageAgentThread;
  /**
   * Asks a model to choose how the caller's song starts and to write its drums,
   * from an outline the browser made of it. A song is arranged once: one that
   * already has an arrangement comes back as it is.
   */
  kineticLightArrange: KineticLightReading;
  /**
   * Starts reading the notes and chord symbols in an image or PDF of sheet music,
   * and answers at once with the reading as READING. KineticLightReadingUpdated
   * pushes it when it's done. A caller has one reading at a time.
   */
  kineticLightRead: KineticLightReading;
  /** Keeps a MIDI or MusicXML file as a song, so it has a link. */
  kineticLightSave: KineticLightReading;
  /** Takes the caller's notifications out of their list, and returns their ids. */
  notificationsDismiss: Array<Scalars['ID']['output']>;
  /** Sets the password kept with the request, once it has been confirmed. */
  passwordChangeComplete?: Maybe<Scalars['Boolean']['output']>;
  /** Called from the emailed link. Any session may call it: the secret is the proof. */
  passwordChangeConfirm?: Maybe<Scalars['Boolean']['output']>;
  /** Checks the current password, keeps the new one hashed, and emails the signed-in user a link to confirm the change. */
  passwordChangeRequest: PasswordChange;
  refreshToken?: Maybe<Scalars['Boolean']['output']>;
  register?: Maybe<Scalars['Boolean']['output']>;
  signIn?: Maybe<Scalars['Boolean']['output']>;
  signOut?: Maybe<Scalars['Boolean']['output']>;
  socialSignIn?: Maybe<Scalars['Boolean']['output']>;
  updateMe?: Maybe<Scalars['Boolean']['output']>;
};


export type MutationActivateArgs = {
  activate: ActivateInput;
};


export type MutationContactArgs = {
  contact: ContactInput;
};


export type MutationDeleteMeArgs = {
  deleteMe: DeleteMeInput;
};


export type MutationImageAgentRetryArgs = {
  messageId?: InputMaybe<Scalars['ID']['input']>;
  threadId: Scalars['ID']['input'];
};


export type MutationImageAgentSendArgs = {
  text: Scalars['String']['input'];
  threadId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationKineticLightArrangeArgs = {
  id: Scalars['ID']['input'];
  outline: KineticLightOutline;
};


export type MutationKineticLightReadArgs = {
  file: KineticLightFile;
};


export type MutationKineticLightSaveArgs = {
  song: KineticLightSongInput;
};


export type MutationNotificationsDismissArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationPasswordChangeCompleteArgs = {
  passwordChangeComplete: PasswordChangeCompleteInput;
};


export type MutationPasswordChangeConfirmArgs = {
  passwordChangeConfirm: PasswordChangeConfirmInput;
};


export type MutationPasswordChangeRequestArgs = {
  passwordChangeRequest: PasswordChangeRequestInput;
};


export type MutationRegisterArgs = {
  register: RegisterInput;
};


export type MutationSignInArgs = {
  signIn: SignInInput;
};


export type MutationSocialSignInArgs = {
  socialSignIn: SocialSignInInput;
};


export type MutationUpdateMeArgs = {
  updateMe: UpdateMeInput;
};

/**
 * Work that carries on after its page is left: a sheet reading, an image agent
 * turn, a Tree of Life plate or a password change. There is one for each record
 * a visitor is told about, written again at each step. The site links it from
 * `collection`, the record's Mongo collection, and `documentId`.
 */
export type Notification = {
  __typename?: 'Notification';
  collection: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  dismissedAt?: Maybe<Scalars['DateTime']['output']>;
  documentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  message: NotificationText;
  title: NotificationText;
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Words translated where they're shown: an i18next key in the host's `common`
 * namespace, or `api:` and a key in the API's, with the values it takes.
 */
export type NotificationText = {
  __typename?: 'NotificationText';
  key: Scalars['String']['output'];
  values: Scalars['JSONObject']['output'];
};

export type PasswordChange = {
  __typename?: 'PasswordChange';
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  status: PasswordChangeStatus;
};

export type PasswordChangeCompleteInput = {
  id: Scalars['ID']['input'];
};

export type PasswordChangeConfirmInput = {
  id: Scalars['ID']['input'];
  secret: Scalars['String']['input'];
};

export type PasswordChangeRequestInput = {
  currentPassword: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export enum PasswordChangeStatus {
  Confirmed = 'CONFIRMED',
  Expired = 'EXPIRED',
  Pending = 'PENDING'
}

export type Portfolio = {
  __typename?: 'Portfolio';
  path?: Maybe<Scalars['String']['output']>;
  portfolioGUID?: Maybe<Scalars['UUID']['output']>;
};

export enum Provider {
  Apple = 'apple',
  Google = 'google'
}

export type Query = {
  __typename?: 'Query';
  asset?: Maybe<Asset>;
  imageAgentAllowance: ImageAgentAllowance;
  /**
   * The best-scored pictures from anyone's conversations, highest first.
   * Only the asset: no text, owner or conversation.
   * At most 24; 12 when `limit` is not given.
   */
  imageAgentGallery: Array<Asset>;
  /**
   * The caller's conversations that already cover most of what `text` asks for,
   * closest first, at most three. For offering to continue one instead of
   * starting over.
   */
  imageAgentSimilar: Array<ImageAgentThread>;
  imageAgentThread?: Maybe<ImageAgentThread>;
  /** The caller's conversations, most recently active first. */
  imageAgentThreads: Array<ImageAgentThread>;
  kineticLightAllowance: KineticLightAllowance;
  /** The example songs every visitor can play, in the order they were added. */
  kineticLightExamples: Array<KineticLightSong>;
  /** A song by its id, for anyone with the link. Null once it has expired. */
  kineticLightReading?: Maybe<KineticLightReading>;
  /** The caller's sheets still being read, newest first. */
  kineticLightReadings: Array<KineticLightReading>;
  /** The caller's songs that are ready to play, newest first. */
  kineticLightSongs: Array<KineticLightSong>;
  me?: Maybe<MePayload>;
  /** The caller's notifications that haven't been dismissed, newest first. */
  notifications: Array<Notification>;
  /** The signed-in user's request that is still waiting or confirmed, so a reloaded page can pick it up. */
  passwordChange?: Maybe<PasswordChange>;
  /** Whether the emailed link can still be confirmed. Any session may ask: the secret is the proof. */
  passwordChangeLink: Scalars['Boolean']['output'];
  /**
   * Find taxa by name.
   *
   * Stored nodes are searched first, since they are the ones already placed in
   * the tree and can be navigated to immediately. Only when nothing is stored
   * does this fall through to Open Tree's name index - so exploring somewhere new
   * still works, and the cost of the remote call is paid only when it buys
   * something.
   */
  taxonSearch: Array<TaxonSearchResult>;
  taxonVisual: TaxonVisual;
  /**
   * Every string of the namespaces asked for. Each comes from the first language
   * that has it: the request's Accept-Language header in its q order, then
   * `en-US`. A namespace that doesn't exist adds nothing to the answer.
   *
   * Runs without a session: the site needs its words before it can start one,
   * and they are public.
   */
  translations: Array<Translation>;
  /**
   * Subtree from Open Tree of Life (cached in Mongo).
   * `ottId` defaults to 93302 (cellular organisms). `heightLimit` max 3.
   * Warm Mongo rows skip OTOL (known leaf or existing child edges).
   */
  treeOfLifeSubtree?: Maybe<TreeOfLifeNode>;
  /**
   * Batch subtree roots in one request. Prefer this over parallel
   * `TreeOfLifeSubtree` calls (auto expand). Results are
   * `[...ottId roots, ...nodeId roots]` (nullable slots on hard miss).
   * Max 16 ids combined. Uses Mongo DataLoader batching + warm-path.
   */
  treeOfLifeSubtrees: Array<Maybe<TreeOfLifeNode>>;
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


export type QueryKineticLightReadingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPasswordChangeLinkArgs = {
  passwordChangeLink: PasswordChangeConfirmInput;
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


export type QueryTranslationsArgs = {
  namespaces: Array<Scalars['String']['input']>;
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
  email: Scalars['EmailAddress']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
};

export type SignInInput = {
  email: Scalars['EmailAddress']['input'];
  password: Scalars['String']['input'];
};

export type SocialSignInInput = {
  provider: Provider;
  token: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Every language's status now, and again whenever one changes. */
  acceptLanguagesUpdated: Array<AcceptLanguageStatus>;
  /** Pushes the whole conversation on every change. */
  imageAgentThreadUpdated: ImageAgentThread;
  /** Pushes each of the caller's readings as it fills in and when it finishes. */
  kineticLightReadingUpdated: KineticLightReading;
  /** Pushes each of the caller's notifications when it's written or dismissed. */
  notificationUpdated: Notification;
  /** The request's status now and on every change, until it is confirmed or expires. */
  passwordChangeUpdated: PasswordChange;
  /** Pushes when async studio generation settles (READY, ERROR, or EXHAUSTED). */
  taxonVisualUpdated: TaxonVisual;
};


export type SubscriptionImageAgentThreadUpdatedArgs = {
  id: Scalars['ID']['input'];
};


export type SubscriptionPasswordChangeUpdatedArgs = {
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

/** One string of the site's writing. */
export type Translation = {
  __typename?: 'Translation';
  /** The string's path in its namespace, joined with dots: `account.signOut`. */
  field: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

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

export type UpdateMeInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
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
  AcceptLanguage: ResolverTypeWrapper<Scalars['AcceptLanguage']['output']>;
  AcceptLanguageStatus: ResolverTypeWrapper<AcceptLanguageStatus>;
  ActivateInput: ActivateInput;
  Asset: ResolverTypeWrapper<Asset>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ContactInput: ContactInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteMeInput: DeleteMeInput;
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
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']['output']>;
  JWT: ResolverTypeWrapper<Scalars['JWT']['output']>;
  KineticLightAllowance: ResolverTypeWrapper<KineticLightAllowance>;
  KineticLightArrangement: ResolverTypeWrapper<KineticLightArrangement>;
  KineticLightBeat: KineticLightBeat;
  KineticLightChord: ResolverTypeWrapper<KineticLightChord>;
  KineticLightFile: KineticLightFile;
  KineticLightOutline: KineticLightOutline;
  KineticLightPattern: ResolverTypeWrapper<KineticLightPattern>;
  KineticLightReading: ResolverTypeWrapper<KineticLightReading>;
  KineticLightSection: ResolverTypeWrapper<KineticLightSection>;
  KineticLightSong: ResolverTypeWrapper<KineticLightSong>;
  KineticLightSongInput: KineticLightSongInput;
  KineticLightSource: KineticLightSource;
  KineticLightStage: KineticLightStage;
  KineticLightStatus: KineticLightStatus;
  KineticLightVoice: KineticLightVoice;
  MePayload: ResolverTypeWrapper<MePayload>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NonEmptyString: ResolverTypeWrapper<Scalars['NonEmptyString']['output']>;
  Notification: ResolverTypeWrapper<Notification>;
  NotificationText: ResolverTypeWrapper<NotificationText>;
  PasswordChange: ResolverTypeWrapper<PasswordChange>;
  PasswordChangeCompleteInput: PasswordChangeCompleteInput;
  PasswordChangeConfirmInput: PasswordChangeConfirmInput;
  PasswordChangeRequestInput: PasswordChangeRequestInput;
  PasswordChangeStatus: PasswordChangeStatus;
  Portfolio: ResolverTypeWrapper<Portfolio>;
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
  Translation: ResolverTypeWrapper<Translation>;
  TreeOfLifeNode: ResolverTypeWrapper<TreeOfLifeNode>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
  UpdateMeInput: UpdateMeInput;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AcceptLanguage: Scalars['AcceptLanguage']['output'];
  AcceptLanguageStatus: AcceptLanguageStatus;
  ActivateInput: ActivateInput;
  Asset: Asset;
  Boolean: Scalars['Boolean']['output'];
  ContactInput: ContactInput;
  DateTime: Scalars['DateTime']['output'];
  DeleteMeInput: DeleteMeInput;
  EmailAddress: Scalars['EmailAddress']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  ImageAgentAllowance: ImageAgentAllowance;
  ImageAgentMessage: ImageAgentMessage;
  ImageAgentScore: ImageAgentScore;
  ImageAgentThread: ImageAgentThread;
  Int: Scalars['Int']['output'];
  JSONObject: Scalars['JSONObject']['output'];
  JWT: Scalars['JWT']['output'];
  KineticLightAllowance: KineticLightAllowance;
  KineticLightArrangement: KineticLightArrangement;
  KineticLightChord: KineticLightChord;
  KineticLightFile: KineticLightFile;
  KineticLightOutline: KineticLightOutline;
  KineticLightPattern: KineticLightPattern;
  KineticLightReading: KineticLightReading;
  KineticLightSection: KineticLightSection;
  KineticLightSong: KineticLightSong;
  KineticLightSongInput: KineticLightSongInput;
  MePayload: MePayload;
  Mutation: Record<PropertyKey, never>;
  NonEmptyString: Scalars['NonEmptyString']['output'];
  Notification: Notification;
  NotificationText: NotificationText;
  PasswordChange: PasswordChange;
  PasswordChangeCompleteInput: PasswordChangeCompleteInput;
  PasswordChangeConfirmInput: PasswordChangeConfirmInput;
  PasswordChangeRequestInput: PasswordChangeRequestInput;
  Portfolio: Portfolio;
  Query: Record<PropertyKey, never>;
  RegisterInput: RegisterInput;
  SignInInput: SignInInput;
  SocialSignInInput: SocialSignInInput;
  String: Scalars['String']['output'];
  Subscription: Record<PropertyKey, never>;
  TaxonSearchResult: TaxonSearchResult;
  TaxonVisual: TaxonVisual;
  TaxonVisualScore: TaxonVisualScore;
  Translation: Translation;
  TreeOfLifeNode: TreeOfLifeNode;
  URL: Scalars['URL']['output'];
  UUID: Scalars['UUID']['output'];
  UpdateMeInput: UpdateMeInput;
}>;

export interface AcceptLanguageScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AcceptLanguage'], any> {
  name: 'AcceptLanguage';
}

export type AcceptLanguageStatusResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AcceptLanguageStatus'] = ResolversParentTypes['AcceptLanguageStatus']> = ResolversObject<{
  acceptLanguage?: Resolver<ResolversTypes['AcceptLanguage'], ParentType, ContextType>;
  complete?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  translating?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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

export interface JsonObjectScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSONObject'], any> {
  name: 'JSONObject';
}

export interface JwtScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JWT'], any> {
  name: 'JWT';
}

export type KineticLightAllowanceResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightAllowance'] = ResolversParentTypes['KineticLightAllowance']> = ResolversObject<{
  busy?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nextAllowedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  remaining?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type KineticLightArrangementResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightArrangement'] = ResolversParentTypes['KineticLightArrangement']> = ResolversObject<{
  beat?: Resolver<ResolversTypes['KineticLightBeat'], ParentType, ContextType>;
  glow?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  hue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  sections?: Resolver<Array<ResolversTypes['KineticLightSection']>, ParentType, ContextType>;
  steps?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  voice?: Resolver<ResolversTypes['KineticLightVoice'], ParentType, ContextType>;
  zoom?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type KineticLightChordResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightChord'] = ResolversParentTypes['KineticLightChord']> = ResolversObject<{
  bar?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  beat?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  symbol?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type KineticLightPatternResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightPattern'] = ResolversParentTypes['KineticLightPattern']> = ResolversObject<{
  hat?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  highTom?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kick?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lowTom?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  openHat?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ride?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snare?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type KineticLightReadingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightReading'] = ResolversParentTypes['KineticLightReading']> = ResolversObject<{
  arrangement?: Resolver<Maybe<ResolversTypes['KineticLightArrangement']>, ParentType, ContextType>;
  bars?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  beatsPerBar?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  chords?: Resolver<Array<ResolversTypes['KineticLightChord']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  failure?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  midi?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mine?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  musicxml?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['KineticLightSource'], ParentType, ContextType>;
  stage?: Resolver<Maybe<ResolversTypes['KineticLightStage']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['KineticLightStatus'], ParentType, ContextType>;
  tempo?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type KineticLightSectionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightSection'] = ResolversParentTypes['KineticLightSection']> = ResolversObject<{
  crash?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  fill?: Resolver<Maybe<ResolversTypes['KineticLightPattern']>, ParentType, ContextType>;
  from?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pattern?: Resolver<Maybe<ResolversTypes['KineticLightPattern']>, ParentType, ContextType>;
  to?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type KineticLightSongResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KineticLightSong'] = ResolversParentTypes['KineticLightSong']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['KineticLightSource'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MePayloadResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MePayload'] = ResolversParentTypes['MePayload']> = ResolversObject<{
  active?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  aud?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['EmailAddress']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  portfolios?: Resolver<Array<ResolversTypes['Portfolio']>, ParentType, ContextType>;
  userGUID?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  activate?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationActivateArgs, 'activate'>>;
  contact?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationContactArgs, 'contact'>>;
  deleteMe?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteMeArgs, 'deleteMe'>>;
  exchangeToken?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  imageAgentRetry?: Resolver<ResolversTypes['ImageAgentThread'], ParentType, ContextType, RequireFields<MutationImageAgentRetryArgs, 'threadId'>>;
  imageAgentSend?: Resolver<ResolversTypes['ImageAgentThread'], ParentType, ContextType, RequireFields<MutationImageAgentSendArgs, 'text'>>;
  kineticLightArrange?: Resolver<ResolversTypes['KineticLightReading'], ParentType, ContextType, RequireFields<MutationKineticLightArrangeArgs, 'id' | 'outline'>>;
  kineticLightRead?: Resolver<ResolversTypes['KineticLightReading'], ParentType, ContextType, RequireFields<MutationKineticLightReadArgs, 'file'>>;
  kineticLightSave?: Resolver<ResolversTypes['KineticLightReading'], ParentType, ContextType, RequireFields<MutationKineticLightSaveArgs, 'song'>>;
  notificationsDismiss?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType, RequireFields<MutationNotificationsDismissArgs, 'ids'>>;
  passwordChangeComplete?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationPasswordChangeCompleteArgs, 'passwordChangeComplete'>>;
  passwordChangeConfirm?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationPasswordChangeConfirmArgs, 'passwordChangeConfirm'>>;
  passwordChangeRequest?: Resolver<ResolversTypes['PasswordChange'], ParentType, ContextType, RequireFields<MutationPasswordChangeRequestArgs, 'passwordChangeRequest'>>;
  refreshToken?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  register?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRegisterArgs, 'register'>>;
  signIn?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationSignInArgs, 'signIn'>>;
  signOut?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  socialSignIn?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationSocialSignInArgs, 'socialSignIn'>>;
  updateMe?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationUpdateMeArgs, 'updateMe'>>;
}>;

export interface NonEmptyStringScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['NonEmptyString'], any> {
  name: 'NonEmptyString';
}

export type NotificationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = ResolversObject<{
  collection?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dismissedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  documentId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['NotificationText'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['NotificationText'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type NotificationTextResolvers<ContextType = Context, ParentType extends ResolversParentTypes['NotificationText'] = ResolversParentTypes['NotificationText']> = ResolversObject<{
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  values?: Resolver<ResolversTypes['JSONObject'], ParentType, ContextType>;
}>;

export type PasswordChangeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PasswordChange'] = ResolversParentTypes['PasswordChange']> = ResolversObject<{
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PasswordChangeStatus'], ParentType, ContextType>;
}>;

export type PortfolioResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Portfolio'] = ResolversParentTypes['Portfolio']> = ResolversObject<{
  path?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  portfolioGUID?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  asset?: Resolver<Maybe<ResolversTypes['Asset']>, ParentType, ContextType, RequireFields<QueryAssetArgs, 'id'>>;
  imageAgentAllowance?: Resolver<ResolversTypes['ImageAgentAllowance'], ParentType, ContextType>;
  imageAgentGallery?: Resolver<Array<ResolversTypes['Asset']>, ParentType, ContextType, Partial<QueryImageAgentGalleryArgs>>;
  imageAgentSimilar?: Resolver<Array<ResolversTypes['ImageAgentThread']>, ParentType, ContextType, RequireFields<QueryImageAgentSimilarArgs, 'text'>>;
  imageAgentThread?: Resolver<Maybe<ResolversTypes['ImageAgentThread']>, ParentType, ContextType, RequireFields<QueryImageAgentThreadArgs, 'id'>>;
  imageAgentThreads?: Resolver<Array<ResolversTypes['ImageAgentThread']>, ParentType, ContextType, Partial<QueryImageAgentThreadsArgs>>;
  kineticLightAllowance?: Resolver<ResolversTypes['KineticLightAllowance'], ParentType, ContextType>;
  kineticLightExamples?: Resolver<Array<ResolversTypes['KineticLightSong']>, ParentType, ContextType>;
  kineticLightReading?: Resolver<Maybe<ResolversTypes['KineticLightReading']>, ParentType, ContextType, RequireFields<QueryKineticLightReadingArgs, 'id'>>;
  kineticLightReadings?: Resolver<Array<ResolversTypes['KineticLightReading']>, ParentType, ContextType>;
  kineticLightSongs?: Resolver<Array<ResolversTypes['KineticLightSong']>, ParentType, ContextType>;
  me?: Resolver<Maybe<ResolversTypes['MePayload']>, ParentType, ContextType>;
  notifications?: Resolver<Array<ResolversTypes['Notification']>, ParentType, ContextType>;
  passwordChange?: Resolver<Maybe<ResolversTypes['PasswordChange']>, ParentType, ContextType>;
  passwordChangeLink?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<QueryPasswordChangeLinkArgs, 'passwordChangeLink'>>;
  taxonSearch?: Resolver<Array<ResolversTypes['TaxonSearchResult']>, ParentType, ContextType, RequireFields<QueryTaxonSearchArgs, 'limit' | 'query'>>;
  taxonVisual?: Resolver<ResolversTypes['TaxonVisual'], ParentType, ContextType, RequireFields<QueryTaxonVisualArgs, 'name' | 'ottId'>>;
  translations?: Resolver<Array<ResolversTypes['Translation']>, ParentType, ContextType, RequireFields<QueryTranslationsArgs, 'namespaces'>>;
  treeOfLifeSubtree?: Resolver<Maybe<ResolversTypes['TreeOfLifeNode']>, ParentType, ContextType, RequireFields<QueryTreeOfLifeSubtreeArgs, 'heightLimit'>>;
  treeOfLifeSubtrees?: Resolver<Array<Maybe<ResolversTypes['TreeOfLifeNode']>>, ParentType, ContextType, RequireFields<QueryTreeOfLifeSubtreesArgs, 'heightLimit'>>;
}>;

export type SubscriptionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  acceptLanguagesUpdated?: SubscriptionResolver<Array<ResolversTypes['AcceptLanguageStatus']>, "acceptLanguagesUpdated", ParentType, ContextType>;
  imageAgentThreadUpdated?: SubscriptionResolver<ResolversTypes['ImageAgentThread'], "imageAgentThreadUpdated", ParentType, ContextType, RequireFields<SubscriptionImageAgentThreadUpdatedArgs, 'id'>>;
  kineticLightReadingUpdated?: SubscriptionResolver<ResolversTypes['KineticLightReading'], "kineticLightReadingUpdated", ParentType, ContextType>;
  notificationUpdated?: SubscriptionResolver<ResolversTypes['Notification'], "notificationUpdated", ParentType, ContextType>;
  passwordChangeUpdated?: SubscriptionResolver<ResolversTypes['PasswordChange'], "passwordChangeUpdated", ParentType, ContextType, RequireFields<SubscriptionPasswordChangeUpdatedArgs, 'id'>>;
  taxonVisualUpdated?: SubscriptionResolver<ResolversTypes['TaxonVisual'], "taxonVisualUpdated", ParentType, ContextType, RequireFields<SubscriptionTaxonVisualUpdatedArgs, 'ottId'>>;
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

export type TranslationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Translation'] = ResolversParentTypes['Translation']> = ResolversObject<{
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  namespace?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  AcceptLanguage?: GraphQLScalarType;
  AcceptLanguageStatus?: AcceptLanguageStatusResolvers<ContextType>;
  Asset?: AssetResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  EmailAddress?: GraphQLScalarType;
  ImageAgentAllowance?: ImageAgentAllowanceResolvers<ContextType>;
  ImageAgentMessage?: ImageAgentMessageResolvers<ContextType>;
  ImageAgentScore?: ImageAgentScoreResolvers<ContextType>;
  ImageAgentThread?: ImageAgentThreadResolvers<ContextType>;
  JSONObject?: GraphQLScalarType;
  JWT?: GraphQLScalarType;
  KineticLightAllowance?: KineticLightAllowanceResolvers<ContextType>;
  KineticLightArrangement?: KineticLightArrangementResolvers<ContextType>;
  KineticLightChord?: KineticLightChordResolvers<ContextType>;
  KineticLightPattern?: KineticLightPatternResolvers<ContextType>;
  KineticLightReading?: KineticLightReadingResolvers<ContextType>;
  KineticLightSection?: KineticLightSectionResolvers<ContextType>;
  KineticLightSong?: KineticLightSongResolvers<ContextType>;
  MePayload?: MePayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NonEmptyString?: GraphQLScalarType;
  Notification?: NotificationResolvers<ContextType>;
  NotificationText?: NotificationTextResolvers<ContextType>;
  PasswordChange?: PasswordChangeResolvers<ContextType>;
  Portfolio?: PortfolioResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  TaxonSearchResult?: TaxonSearchResultResolvers<ContextType>;
  TaxonVisual?: TaxonVisualResolvers<ContextType>;
  TaxonVisualScore?: TaxonVisualScoreResolvers<ContextType>;
  Translation?: TranslationResolvers<ContextType>;
  TreeOfLifeNode?: TreeOfLifeNodeResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UUID?: GraphQLScalarType;
}>;

