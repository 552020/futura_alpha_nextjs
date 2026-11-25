import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Config {
  'next_upload_id' : bigint,
  'emergency_stop' : boolean,
  'min_factory_cycles' : bigint,
  'upload_ttl_ns' : bigint,
  'admins' : Array<Principal>,
  'allowlist' : [] | [Array<Principal>],
  'max_upload_size' : bigint,
}
export interface FactoryStats {
  'total_canisters_created' : bigint,
  'factory_cycles_balance' : bigint,
  'active_uploads' : bigint,
  'total_uploads' : bigint,
}
export interface InitArg {
  'min_factory_cycles' : [] | [bigint],
  'admins' : [] | [Array<Principal>],
  'allowlist' : [] | [Array<Principal>],
  'upload_ttl_seconds' : [] | [bigint],
  'max_upload_size' : [] | [bigint],
}
export interface PersonalCanister {
  'last_error' : [] | [string],
  'status' : PersonalStatus,
  'updated_at' : bigint,
  'owner' : Principal,
  'busy' : boolean,
  'canister_id' : [] | [Principal],
  'created_at' : bigint,
  'version' : [] | [string],
  'top_up' : [] | [TopUpRecord],
  'module_sha256_hex' : [] | [string],
}
export type PersonalStatus = { 'Ready' : null } |
  { 'Created' : null } |
  { 'Installed' : null } |
  { 'Pending' : null };
export interface ReleaseInfo {
  'size' : bigint,
  'sha256_hex' : string,
  'version' : string,
  'released_at' : bigint,
}
export type Result = { 'Ok' : null } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : number } |
  { 'Err' : string };
export type Result_10 = { 'Ok' : TopUpReport } |
  { 'Err' : string };
export type Result_11 = { 'Ok' : Array<TopUpReport> } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : PersonalCanister } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : UploadInfo } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : Array<PersonalCanister> } |
  { 'Err' : string };
export type Result_7 = { 'Ok' : Array<[Principal, number]> } |
  { 'Err' : string };
export type Result_8 = { 'Ok' : ReleaseInfo } |
  { 'Err' : string };
export type Result_9 = { 'Ok' : Uint8Array | number[] } |
  { 'Err' : string };
export interface TopUpConfig {
  'floor' : bigint,
  'enabled' : boolean,
  'target' : bigint,
  'monthly_cap' : bigint,
}
export interface TopUpRecord {
  'last_error' : [] | [string],
  'month' : [] | [number],
  'last_top_up_at' : [] | [bigint],
  'last_checked_at' : [] | [bigint],
  'month_total' : [] | [bigint],
  'monthly_cap' : [] | [bigint],
  'last_top_up_cycles' : [] | [bigint],
  'last_balance' : [] | [bigint],
}
export interface TopUpReport {
  'balance' : [] | [bigint],
  'owner' : Principal,
  'note' : string,
  'sent' : bigint,
  'canister_id' : [] | [Principal],
}
export interface UploadCommit { 'expected_sha256_hex' : string }
export interface UploadInfo {
  'committed_hash' : [] | [Uint8Array | number[]],
  'created_at_time_ns' : bigint,
  'owner' : Principal,
  'total_len' : bigint,
  'chunks' : Array<Uint8Array | number[]>,
}
export interface _SERVICE {
  '__get_candid_interface_tmp_hack' : ActorMethod<[], string>,
  'add_admin' : ActorMethod<[Principal], Result>,
  'cleanup_expired_uploads_manual' : ActorMethod<[], Result_1>,
  'clear_upload' : ActorMethod<[bigint], Result>,
  'commit_upload' : ActorMethod<[bigint, UploadCommit], Result_2>,
  /**
   * Create (or finish creating) the caller's personal canister.
   * Idempotent: once Ready it returns the same canister.
   */
  'create_personal_canister' : ActorMethod<[], Result_3>,
  /**
   * ===== Upload API (chunked) =====
   */
  'create_upload' : ActorMethod<[], Result_4>,
  /**
   * ===== Query endpoints =====
   */
  'get_config' : ActorMethod<[], Config>,
  'get_factory_stats' : ActorMethod<[], FactoryStats>,
  'get_upload_info' : ActorMethod<[bigint], Result_5>,
  'health_check' : ActorMethod<[], string>,
  'my_personal_canister' : ActorMethod<[], [] | [PersonalCanister]>,
  /**
   * How many personal canisters the caller may still create.
   */
  'my_personal_credits' : ActorMethod<[], number>,
  /**
   * Admin: every personal canister the factory created.
   */
  'personal_canisters_list' : ActorMethod<[], Result_6>,
  /**
   * Admin: set how many personal canisters a principal may still create
   * (0 removes the entry).
   */
  'personal_credit_set' : ActorMethod<[Principal, number], Result>,
  /**
   * Admin: all principals that hold credits.
   */
  'personal_credits_list' : ActorMethod<[], Result_7>,
  'personal_open' : ActorMethod<[], boolean>,
  /**
   * Admin: open creation to every signed-in principal. For local test
   * networks; on mainnet this lets anybody spend the factory's cycles.
   */
  'personal_open_set' : ActorMethod<[boolean], Result>,
  'put_chunk' : ActorMethod<[bigint, Uint8Array | number[]], Result_4>,
  'release_info' : ActorMethod<[], [] | [ReleaseInfo]>,
  /**
   * Admin: make a committed upload the release that new personal canisters get.
   */
  'release_set' : ActorMethod<[bigint, string], Result_8>,
  /**
   * The released wasm, for owners who upgrade their canister themselves.
   * Check it against `release_info().sha256_hex` before installing.
   */
  'release_wasm' : ActorMethod<[], Result_9>,
  'remove_admin' : ActorMethod<[Principal], Result>,
  'set_allowlist' : ActorMethod<[[] | [Array<Principal>]], Result>,
  /**
   * ===== Admin endpoints =====
   */
  'set_emergency_stop' : ActorMethod<[boolean], Result>,
  /**
   * Admin: cycles a new personal canister starts with.
   */
  'set_personal_canister_cycles' : ActorMethod<[bigint], Result>,
  /**
   * Admin: one owner's monthly cap; `null` goes back to the default.
   * A cap of 0 stops top-ups for that owner.
   */
  'top_up_cap_set' : ActorMethod<[Principal, [] | [bigint]], Result>,
  /**
   * Check one owner's canister now and top it up if needed.
   * For admins, and for the owner (the monthly cap applies either way).
   */
  'top_up_check' : ActorMethod<[Principal], Result_10>,
  /**
   * Admin: check every ready canister now. The daily timer does the same.
   */
  'top_up_check_all' : ActorMethod<[], Result_11>,
  'top_up_config' : ActorMethod<[], TopUpConfig>,
  /**
   * Admin: floor, target, default monthly cap, and whether the timer runs.
   */
  'top_up_config_set' : ActorMethod<[TopUpConfig], Result>,
  /**
   * When the check of all canisters last started (network time, ns)
   */
  'top_up_last_run' : ActorMethod<[], [] | [bigint]>,
  /**
   * ===== Utility functions =====
   */
  'version' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
