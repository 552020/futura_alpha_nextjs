import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CallerStats {
  'created_count' : number,
  'last_created_at' : [] | [bigint],
}
export interface Config {
  'next_upload_id' : bigint,
  'emergency_stop' : boolean,
  'min_factory_cycles' : bigint,
  'upload_ttl_ns' : bigint,
  'admins' : Array<Principal>,
  'max_canisters_per_caller' : number,
  'allowlist' : [] | [Array<Principal>],
  'max_upload_size' : bigint,
}
export interface CreateInstallRequest {
  'extra_controllers' : [] | [Array<Principal>],
  'handoff' : boolean,
  'mode' : Mode,
  'init_arg' : Uint8Array | number[],
  'upload_id' : bigint,
  'cycles' : bigint,
}
export interface CreateInstallResponse {
  'canister_id' : Principal,
  'module_hash_hex' : string,
  'cycles_used' : bigint,
}
export interface FactoryStats {
  'unique_callers' : bigint,
  'total_canisters_created' : bigint,
  'factory_cycles_balance' : bigint,
  'active_uploads' : bigint,
  'total_uploads' : bigint,
}
export interface InitArg {
  'min_factory_cycles' : [] | [bigint],
  'admins' : [] | [Array<Principal>],
  'max_canisters_per_caller' : [] | [number],
  'allowlist' : [] | [Array<Principal>],
  'upload_ttl_seconds' : [] | [bigint],
  'max_upload_size' : [] | [bigint],
}
export type Mode = { 'Upgrade' : null } |
  { 'Install' : null } |
  { 'Reinstall' : null };
export interface PersonalCanister {
  'last_error' : [] | [string],
  'status' : PersonalStatus,
  'updated_at' : bigint,
  'owner' : Principal,
  'busy' : boolean,
  'canister_id' : [] | [Principal],
  'created_at' : bigint,
  'version' : [] | [string],
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
export type Result_10 = { 'Ok' : Array<[Principal, number]> } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : CreateInstallResponse } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : PersonalCanister } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : UploadInfo } |
  { 'Err' : string };
export type Result_7 = { 'Ok' : Array<PersonalCanister> } |
  { 'Err' : string };
export type Result_8 = { 'Ok' : ReleaseInfo } |
  { 'Err' : string };
export type Result_9 = { 'Ok' : Uint8Array | number[] } |
  { 'Err' : string };
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
   * ===== Factory: create + install (supports Install/Reinstall/Upgrade) =====
   */
  'create_and_install_with' : ActorMethod<[CreateInstallRequest], Result_3>,
  /**
   * Create (or finish creating) the caller's personal canister.
   * Idempotent: once Ready it returns the same canister.
   */
  'create_personal_canister' : ActorMethod<[], Result_4>,
  /**
   * ===== Upload API (chunked) =====
   */
  'create_upload' : ActorMethod<[], Result_5>,
  /**
   * ===== Query endpoints =====
   */
  'get_config' : ActorMethod<[], Config>,
  'get_factory_stats' : ActorMethod<[], FactoryStats>,
  'get_upload_info' : ActorMethod<[bigint], Result_6>,
  'health_check' : ActorMethod<[], string>,
  'my_personal_canister' : ActorMethod<[], [] | [PersonalCanister]>,
  /**
   * How many personal canisters the caller may still create.
   */
  'my_personal_credits' : ActorMethod<[], number>,
  'my_stats' : ActorMethod<[], CallerStats>,
  /**
   * Admin: every personal canister the factory created.
   */
  'personal_canisters_list' : ActorMethod<[], Result_7>,
  /**
   * Admin: set how many personal canisters a principal may still create
   * (0 removes the entry).
   */
  'personal_credit_set' : ActorMethod<[Principal, number], Result>,
  /**
   * Admin: all principals that hold credits.
   */
  'personal_credits_list' : ActorMethod<[], Result_10>,
  'personal_open' : ActorMethod<[], boolean>,
  /**
   * Admin: open creation to every signed-in principal. For local test
   * networks; on mainnet this lets anybody spend the factory's cycles.
   */
  'personal_open_set' : ActorMethod<[boolean], Result>,
  'put_chunk' : ActorMethod<[bigint, Uint8Array | number[]], Result_5>,
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
   * ===== Utility functions =====
   */
  'version' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
