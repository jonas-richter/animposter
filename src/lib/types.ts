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
  | 'reveal' // role cards are handed out, tap to reveal
  | 'discussion' // talking
  | 'voting' // everyone votes for the suspected impostors
  | 'results'; // resolution + scores

export interface Device {
  id: string;
  /** Secret. Only ever sent to the owning client, never inside a room view. */
  token: string;
  lastSeen: number;
}

export interface Seat {
  id: string;
  name: string;
  /** Device currently responsible for this seat; null = seat is free to claim. */
  deviceId: string | null;
  /** Spectator for the CURRENT round (set when the round starts). */
  spectator: boolean;
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
  /** Points earned in this round, seatId -> points. Filled at results time. */
  points: Record<string, number>;
}

export interface Settings {
  /** Do impostors get told that they are the impostor? */
  impostorsKnow: boolean;
  /** How many impostors per round (also = number of votes each player casts). */
  impostorCount: number;
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
  /** seatId -> topicId */
  topicVotes: Record<string, string>;
  /** Topic chosen by the GM for the running round. */
  currentTopicId: string | null;
  round: Round | null;
  roundCounter: number;
  /** Room-bound custom topics added via the JSON import. */
  customTopics: Topic[];
  /** Pair ids already used in this room, to avoid repeats. */
  usedPairIds: string[];
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
  /** seatId -> topicId, only for my own seats. */
  myTopicVotes: Record<string, string>;
  currentTopicId: string | null;
  /** Roles for my own seats (redacted). Empty before the reveal phase. */
  myRoles: MyRole[];
  /** Votes my seats have already cast (seatId -> seatIds). */
  myVotes: Record<string, string[]>;
  /** Settings are only sent to the GM (and spectators) so the gear menu stays discreet. */
  settings?: Settings;
  /** Full information: spectators during the round, everybody at results time. */
  results?: RoundResults;
  /** True when the viewer is a pure spectator device seeing everything. */
  spectating: boolean;
  activeCount: number;
  spectatorCount: number;
}
