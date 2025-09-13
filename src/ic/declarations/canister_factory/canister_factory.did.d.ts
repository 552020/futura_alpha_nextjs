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
export type Result = { 'Ok' : null } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : CreateInstallResponse } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : number } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : UploadInfo } |
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
  'cleanup_expired_uploads_manual' : ActorMethod<[], Result_4>,
  'clear_upload' : ActorMethod<[bigint], Result>,
  'commit_upload' : ActorMethod<[bigint, UploadCommit], Result_2>,
  'create_and_install_with' : ActorMethod<[CreateInstallRequest], Result_3>,
  'create_upload' : ActorMethod<[], Result_1>,
  'get_config' : ActorMethod<[], Config>,
  'get_factory_stats' : ActorMethod<[], FactoryStats>,
  'get_upload_info' : ActorMethod<[bigint], Result_5>,
  'health_check' : ActorMethod<[], string>,
  'my_stats' : ActorMethod<[], CallerStats>,
  'put_chunk' : ActorMethod<[bigint, Uint8Array | number[]], Result_1>,
  'remove_admin' : ActorMethod<[Principal], Result>,
  'set_allowlist' : ActorMethod<[[] | [Array<Principal>]], Result>,
  'set_emergency_stop' : ActorMethod<[boolean], Result>,
  'version' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
