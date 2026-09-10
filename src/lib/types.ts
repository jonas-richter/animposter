// Core domain types for the Impostor party game.
//
// Key concept: a DEVICE (one phone/browser) can own several SEATS (players).
// There is no separate "pass the phone" mode: whoever scans the QR code plays
// on their own phone, and any extra players added on a device simply share it.
// A device with more than one seat automatically gets the handoff flow.
// The game master is a DEVICE, not a seat, so a GM can play along or not.

export type Phase =
  | 'lobby' // players gather / seats are created
  | 'topicVote' // everyone votes for a topic
  | 'topicReveal' // the winning topic is announced (confetti moment)
  | 'reveal' // role cards are handed out, tap to reveal
  | 'discussion' // talking
  | 'voting' // everyone votes for the suspected impostors
  | 'results' // resolution + scores
  | 'gameOver'; // final standings, podium

export interface Device {
  id: string;
  /** Secret. Only ever sent to the owning client, never inside a room view. */
  token: string;
  lastSeen: number;
  /**
   * Two-letter country from the edge header. We deliberately never store the
   * IP address itself - this is enough to moderate a public deployment and is
   * far less personal data. See lib/limits.ts.
   */
  country?: string;
  userAgent?: string;
  /** An admin watching without appearing in the room. */
  hidden?: boolean;
}

export interface Seat {
  id: string;
  name: string;
  /** Device currently responsible for this seat; null = seat is free to claim. */
  deviceId: string | null;
  /** Spectator for the CURRENT round (set when the round starts). */
  spectator: boolean;
  /**
   * Joined while a round was already running. Sits out this round like a
   * spectator, but must NOT see any roles - a spectator chose to see
   * everything, a newcomer would just be handed the solution.
   */
  waiting: boolean;
  /** Toggle: take part in the NEXT round? */
  playNextRound: boolean;
  score: number;
  createdAt: number;
}

export interface Assignment {
  seatId: string;
  characterName: string;
  characterImage?: string;
  isImpostor: boolean;
  /** Has the player looked at their card yet? */
  revealed: boolean;
}

export interface RoundPair {
  pairId: string;
  realName: string;
  realImage?: string;
  impostorName: string;
  impostorImage?: string;
  similarities: string[];
  traps: string[];
}

export interface Round {
  n: number;
  topicId: string;
  topicName: string;
  pair: RoundPair;
  /** seatId -> assignment */
  assignments: Record<string, Assignment>;
  impostorSeatIds: string[];
  /** voterSeatId -> array of suspected seatIds */
  votes: Record<string, string[]>;
  /** Snapshot of the setting that was active when the round started. */
  impostorsKnow: boolean;
  impostorCount: number;
  /** Seats that actively played this round. */
  activeSeatIds: string[];
  /** Snapshot of the topic vote, for the announcement screen. */
  topicTally: { name: string; votes: number }[];
  /** True when the game master picked a topic instead of taking the winner. */
  topicOverridden: boolean;
  /** Points earned in this round, seatId -> points. Filled at results time. */
  points: Record<string, number>;
}

export interface Settings {
  /** Do impostors get told that they are the impostor? */
  impostorsKnow: boolean;
  /** How many impostors per round (also = number of votes each player casts). */
  impostorCount: number;
  /** When on, player suggestions are hidden until the game master waves them through. */
  proposalsNeedApproval: boolean;
  /** Approval voting: tick every universe you know instead of picking one. */
  multiTopicVote: boolean;
  /** Run discussion and voting on a countdown so nobody has to play referee. */
  timerEnabled: boolean;
  discussionSec: number;
  votingSec: number;
  /** First player to reach this ends the game. null = play until someone stops. */
  targetScore: number | null;
}

/** A short-lived emote floating across everyone's screen. */
export interface Reaction {
  id: string;
  seatName: string;
  emoji: string;
  at: number;
}

export interface CharacterPair {
  id: string;
  real: { name: string; image?: string };
  impostor: { name: string; image?: string };
  similarities: string[];
  traps: string[];
}

export interface Topic {
  id: string;
  name: string;
  custom?: boolean;
  /** Name of the player who suggested it (empty when the GM added it). */
  proposedBy?: string;
  /** Only relevant while "Vorschläge erst freigeben" is on. */
  approved?: boolean;
  pairs: CharacterPair[];
}

export interface Room {
  code: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  phase: Phase;
  devices: Device[];
  seats: Seat[];
  gmDeviceId: string;
  settings: Settings;
  /**
   * seatId -> chosen topic ids. Always an array: in the normal mode it holds
   * exactly one, in "Was kennt ihr?" mode a player ticks everything they know.
   */
  topicVotes: Record<string, string[]>;
  /** Topic chosen by the GM for the running round. */
  currentTopicId: string | null;
  round: Round | null;
  roundCounter: number;
  /** Room-bound custom topics added via the JSON import. */
  customTopics: Topic[];
  /** Topics the admin made permanent; filled in when the room is loaded. */
  globalTopics?: Topic[];
  /** Pair ids already used in this room, to avoid repeats. */
  usedPairIds: string[];
  /**
   * When the current phase runs out on its own. Serverless has no background
   * jobs, so the transition is applied by whichever request notices first.
   */
  deadline: number | null;
  deadlineAction: 'startRound' | 'reveal' | 'discussion' | 'voting' | 'finish' | null;
  /** Recent emotes; pruned on every write. */
  reactions: Reaction[];
  /** seatId -> timestamp, for the emote cooldown. */
  lastReactionAt: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Client-facing view types (redacted server output)
// ---------------------------------------------------------------------------

export interface SeatPublic {
  id: string;
  name: string;
  /** Which device holds this seat. Public id, NOT the secret token. */
  deviceId: string | null;
  online: boolean;
  mine: boolean;
  spectator: boolean;
  waiting: boolean;
  playNextRound: boolean;
  score: number;
  isGmSeat: boolean;
  unclaimed: boolean;
  /** Did this seat already look at its card / cast its vote? */
  revealed: boolean;
  hasVoted: boolean;
}

export interface MyRole {
  seatId: string;
  seatName: string;
  characterName: string;
  characterImage?: string;
  /** Only present when impostors are told, or in the results phase. */
  isImpostor?: boolean;
  revealed: boolean;
}

export interface ResultRow {
  seatId: string;
  seatName: string;
  characterName: string;
  characterImage?: string;
  isImpostor: boolean;
  votesReceived: number;
  votedFor: string[];
  points: number;
  totalScore: number;
}

export interface RoundResults {
  topicName: string;
  realName: string;
  realImage?: string;
  impostorName: string;
  impostorImage?: string;
  similarities: string[];
  traps: string[];
  rows: ResultRow[];
  impostorSeatIds: string[];
}

export interface TopicMeta {
  id: string;
  name: string;
  pairCount: number;
  custom: boolean;
  votes: number;
  /** Suggested by this player and not yet played. */
  proposedBy?: string;
  /** Waiting for the game master to approve it. */
  pending: boolean;
}

export interface RoomView {
  code: string;
  phase: Phase;
  version: number;
  roundNumber: number;
  isGm: boolean;
  deviceId: string;
  /** Seats this device is responsible for, in display order. */
  mySeatIds: string[];
  seats: SeatPublic[];
  topics: TopicMeta[];
  /** seatId -> chosen topic ids, only for my own seats. */
  myTopicVotes: Record<string, string[]>;
  currentTopicId: string | null;
  /** Roles for my own seats (redacted). Empty before the reveal phase. */
  myRoles: MyRole[];
  /** Votes my seats have already cast (seatId -> seatIds). */
  myVotes: Record<string, string[]>;
  /** Settings are only sent to the GM (and spectators) so the gear menu stays discreet. */
  settings?: Settings;
  /**
   * The voting mode is NOT secret - everyone has to know whether they pick one
   * universe or tick everything they know.
   */
  multiTopicVote: boolean;
  /** Winning-topic announcement, only during the topicReveal phase. */
  topicReveal?: {
    name: string;
    tally: { name: string; votes: number }[];
    overridden: boolean;
  };
  /** Full information: spectators during the round, everybody at results time. */
  results?: RoundResults;
  /** True when the viewer is a pure spectator device seeing everything. */
  spectating: boolean;
  activeCount: number;
  spectatorCount: number;
  /** Players who joined mid-round and are in from the next one. */
  waitingCount: number;
  /** Epoch ms when the phase advances by itself, or null. */
  deadline: number | null;
  /** Length of the running phase in seconds - needed to draw the progress bar. */
  phaseSeconds: number | null;
  /** Emotes from the last few seconds. */
  reactions: Reaction[];
  /** Final standings, only in the gameOver phase. */
  standings?: { seatId: string; seatName: string; score: number }[];
  /** Somebody hit the target score - the results screen offers the podium. */
  targetReached: boolean;
}
