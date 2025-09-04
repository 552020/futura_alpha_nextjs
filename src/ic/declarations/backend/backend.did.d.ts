import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AccessEvent = { 'CapsuleMaturity' : number } |
  { 'Graduation' : null } |
  { 'AfterDeath' : null } |
  { 'Wedding' : null } |
  { 'Birthday' : number } |
  { 'Custom' : string } |
  { 'ConnectionCount' : number } |
  { 'Anniversary' : number };
export interface AudioMetadata {
  'duration' : [] | [number],
  'base' : MemoryMetadataBase,
  'channels' : [] | [number],
  'sample_rate' : [] | [number],
  'bitrate' : [] | [number],
  'format' : [] | [string],
}
export interface BlobRef {
  'locator' : string,
  'hash' : [] | [Uint8Array | number[]],
  'kind' : MemoryBlobKind,
}
export interface Capsule {
  'id' : string,
  'updated_at' : bigint,
  'controllers' : Array<[PersonRef, ControllerState]>,
  'subject' : PersonRef,
  'owners' : Array<[PersonRef, OwnerState]>,
  'created_at' : bigint,
  'connection_groups' : Array<[string, ConnectionGroup]>,
  'connections' : Array<[PersonRef, Connection]>,
  'memories' : Array<[string, Memory]>,
  'bound_to_neon' : boolean,
  'galleries' : Array<[string, Gallery]>,
}
export interface CapsuleCreationResult {
  'capsule_id' : [] | [string],
  'message' : string,
  'success' : boolean,
}
export interface CapsuleHeader {
  'id' : string,
  'updated_at' : bigint,
  'subject' : PersonRef,
  'owner_count' : number,
  'created_at' : bigint,
  'controller_count' : number,
  'memory_count' : number,
}
export interface CapsuleInfo {
  'updated_at' : bigint,
  'gallery_count' : number,
  'subject' : PersonRef,
  'capsule_id' : string,
  'is_owner' : boolean,
  'created_at' : bigint,
  'bound_to_neon' : boolean,
  'memory_count' : number,
  'connection_count' : number,
  'is_self_capsule' : boolean,
  'is_controller' : boolean,
}
export interface Connection {
  'status' : ConnectionStatus,
  'updated_at' : bigint,
  'peer' : PersonRef,
  'created_at' : bigint,
}
export interface ConnectionGroup {
  'id' : string,
  'updated_at' : bigint,
  'members' : Array<PersonRef>,
  'name' : string,
  'description' : [] | [string],
  'created_at' : bigint,
}
export type ConnectionStatus = { 'Blocked' : null } |
  { 'Accepted' : null } |
  { 'Revoked' : null } |
  { 'Pending' : null };
export interface ControllerState {
  'granted_at' : bigint,
  'granted_by' : PersonRef,
}
export type CreationStatus = { 'Importing' : null } |
  { 'Creating' : null } |
  { 'Failed' : null } |
  { 'Exporting' : null } |
  { 'Installing' : null } |
  { 'Completed' : null } |
  { 'Verifying' : null } |
  { 'NotStarted' : null };
export interface CreationStatusResponse {
  'status' : CreationStatus,
  'canister_id' : [] | [Principal],
  'message' : [] | [string],
}
export interface DeleteGalleryResponse {
  'message' : string,
  'success' : boolean,
}
export interface DetailedCreationStatus {
  'status' : CreationStatus,
  'progress_message' : string,
  'canister_id' : [] | [Principal],
  'error_message' : [] | [string],
  'created_at' : bigint,
  'cycles_consumed' : bigint,
  'completed_at' : [] | [bigint],
}
export interface DocumentMetadata { 'base' : MemoryMetadataBase }
export type Error = { 'Internal' : string } |
  { 'NotFound' : null } |
  { 'Unauthorized' : null } |
  { 'InvalidArgument' : string } |
  { 'ResourceExhausted' : null } |
  { 'Conflict' : string };
export interface Gallery {
  'id' : string,
  'is_public' : boolean,
  'title' : string,
  'updated_at' : bigint,
  'memory_entries' : Array<GalleryMemoryEntry>,
  'description' : [] | [string],
  'created_at' : bigint,
  'bound_to_neon' : boolean,
  'storage_status' : GalleryStorageStatus,
  'owner_principal' : Principal,
}
export interface GalleryData {
  'owner_principal' : Principal,
  'gallery' : Gallery,
}
export interface GalleryMemoryEntry {
  'memory_id' : string,
  'is_featured' : boolean,
  'position' : number,
  'gallery_metadata' : string,
  'gallery_caption' : [] | [string],
}
export type GalleryStorageStatus = { 'Web2Only' : null } |
  { 'Failed' : null } |
  { 'Both' : null } |
  { 'Migrating' : null } |
  { 'ICPOnly' : null };
export interface GalleryUpdateData {
  'is_public' : [] | [boolean],
  'title' : [] | [string],
  'memory_entries' : [] | [Array<GalleryMemoryEntry>],
  'description' : [] | [string],
}
export interface ImageMetadata {
  'base' : MemoryMetadataBase,
  'dimensions' : [] | [[number, number]],
}
export interface Memory {
  'id' : string,
  'access' : MemoryAccess,
  'metadata' : MemoryMetadata,
  'data' : MemoryData,
  'info' : MemoryInfo,
}
export type MemoryAccess = { 'Private' : null } |
  {
    'Custom' : { 'groups' : Array<string>, 'individuals' : Array<PersonRef> }
  } |
  {
    'EventTriggered' : {
      'access' : MemoryAccess,
      'trigger_event' : AccessEvent,
    }
  } |
  { 'Public' : null } |
  { 'Scheduled' : { 'access' : MemoryAccess, 'accessible_after' : bigint } };
export type MemoryBlobKind = { 'MemoryBlobKindExternal' : null } |
  { 'ICPCapsule' : null };
export interface MemoryData {
  'data' : [] | [Uint8Array | number[]],
  'blob_ref' : BlobRef,
}
export interface MemoryInfo {
  'updated_at' : bigint,
  'date_of_memory' : [] | [bigint],
  'memory_type' : MemoryType,
  'name' : string,
  'content_type' : string,
  'created_at' : bigint,
  'uploaded_at' : bigint,
}
export interface MemoryListResponse {
  'memories' : Array<Memory>,
  'message' : string,
  'success' : boolean,
}
export interface MemoryMeta {
  'name' : string,
  'tags' : Array<string>,
  'description' : [] | [string],
}
export type MemoryMetadata = { 'Note' : NoteMetadata } |
  { 'Image' : ImageMetadata } |
  { 'Document' : DocumentMetadata } |
  { 'Audio' : AudioMetadata } |
  { 'Video' : VideoMetadata };
export interface MemoryMetadataBase {
  'date_of_memory' : [] | [string],
  'size' : bigint,
  'people_in_memory' : [] | [Array<string>],
  'mime_type' : string,
  'bound_to_neon' : boolean,
  'original_name' : string,
  'uploaded_at' : string,
  'format' : [] | [string],
}
export interface MemoryOperationResponse {
  'memory_id' : [] | [string],
  'message' : string,
  'success' : boolean,
}
export interface MemoryPresenceResult {
  'metadata_present' : boolean,
  'memory_id' : string,
  'asset_present' : boolean,
}
export type MemoryType = { 'Note' : null } |
  { 'Image' : null } |
  { 'Document' : null } |
  { 'Audio' : null } |
  { 'Video' : null };
export interface MemoryUpdateData {
  'access' : [] | [MemoryAccess],
  'metadata' : [] | [MemoryMetadata],
  'name' : [] | [string],
}
export interface MetadataResponse {
  'memory_id' : [] | [string],
  'error' : [] | [Error],
  'message' : string,
  'success' : boolean,
}
export interface NoteMetadata {
  'base' : MemoryMetadataBase,
  'tags' : [] | [Array<string>],
}
export interface OwnerState { 'last_activity_at' : bigint, 'since' : bigint }
export type PersonRef = { 'Opaque' : string } |
  { 'Principal' : Principal };
export interface PersonalCanisterCreationResponse {
  'canister_id' : [] | [Principal],
  'message' : string,
  'success' : boolean,
}
export interface PersonalCanisterCreationStats {
  'total_successes' : bigint,
  'total_failures' : bigint,
  'total_attempts' : bigint,
  'total_cycles_consumed' : bigint,
}
export type ResourceType = { 'Memory' : null } |
  { 'Capsule' : null } |
  { 'Gallery' : null };
export type Result = { 'Ok' : null } |
  { 'Err' : Error };
export type Result_1 = { 'Ok' : CapsuleInfo } |
  { 'Err' : Error };
export type Result_10 = { 'Ok' : Array<MemoryPresenceResult> } |
  { 'Err' : Error };
export type Result_11 = { 'Ok' : Memory } |
  { 'Err' : Error };
export type Result_12 = { 'Ok' : MetadataResponse } |
  { 'Err' : Error };
export type Result_13 = { 'Ok' : Principal } |
  { 'Err' : Error };
export type Result_2 = { 'Ok' : Capsule } |
  { 'Err' : Error };
export type Result_3 = { 'Ok' : boolean } |
  { 'Err' : Error };
export type Result_4 = { 'Ok' : Gallery } |
  { 'Err' : Error };
export type Result_5 = { 'Ok' : Array<[Principal, DetailedCreationStatus]> } |
  { 'Err' : Error };
export type Result_6 = { 'Ok' : PersonalCanisterCreationStats } |
  { 'Err' : Error };
export type Result_7 = { 'Ok' : [] | [DetailedCreationStatus] } |
  { 'Err' : Error };
export type Result_8 = { 'Ok' : bigint } |
  { 'Err' : Error };
export type Result_9 = { 'Ok' : string } |
  { 'Err' : Error };
export interface SimpleMemoryMetadata {
  'title' : [] | [string],
  'updated_at' : bigint,
  'size' : [] | [bigint],
  'tags' : Array<string>,
  'content_type' : [] | [string],
  'description' : [] | [string],
  'created_at' : bigint,
  'custom_fields' : Array<[string, string]>,
}
export interface StoreGalleryResponse {
  'gallery_id' : [] | [string],
  'message' : string,
  'storage_status' : GalleryStorageStatus,
  'icp_gallery_id' : [] | [string],
  'success' : boolean,
}
export interface UpdateGalleryResponse {
  'message' : string,
  'success' : boolean,
  'gallery' : [] | [Gallery],
}
export interface VideoMetadata {
  'height' : [] | [number],
  'duration' : [] | [number],
  'thumbnail' : [] | [string],
  'base' : MemoryMetadataBase,
  'width' : [] | [number],
}
export interface _SERVICE {
  'add_admin' : ActorMethod<[Principal], Result>,
  'capsules_bind_neon' : ActorMethod<[ResourceType, string, boolean], Result>,
  'capsules_create' : ActorMethod<[[] | [PersonRef]], CapsuleCreationResult>,
  'capsules_list' : ActorMethod<[], Array<CapsuleHeader>>,
  'capsules_read_basic' : ActorMethod<[[] | [string]], Result_1>,
  'capsules_read_full' : ActorMethod<[[] | [string]], Result_2>,
  'clear_creation_state' : ActorMethod<[Principal], Result_3>,
  'clear_migration_state' : ActorMethod<[Principal], Result_3>,
  'create_personal_canister' : ActorMethod<
    [],
    PersonalCanisterCreationResponse
  >,
  'galleries_create' : ActorMethod<[GalleryData], StoreGalleryResponse>,
  'galleries_create_with_memories' : ActorMethod<
    [GalleryData, boolean],
    StoreGalleryResponse
  >,
  'galleries_delete' : ActorMethod<[string], DeleteGalleryResponse>,
  'galleries_list' : ActorMethod<[], Array<Gallery>>,
  'galleries_read' : ActorMethod<[string], Result_4>,
  'galleries_update' : ActorMethod<
    [string, GalleryUpdateData],
    UpdateGalleryResponse
  >,
  'get_creation_states_by_status' : ActorMethod<[CreationStatus], Result_5>,
  'get_creation_status' : ActorMethod<[], [] | [CreationStatusResponse]>,
  'get_detailed_creation_status' : ActorMethod<
    [],
    [] | [DetailedCreationStatus]
  >,
  'get_detailed_migration_status' : ActorMethod<
    [],
    [] | [DetailedCreationStatus]
  >,
  'get_migration_states_by_status' : ActorMethod<[CreationStatus], Result_5>,
  'get_migration_stats' : ActorMethod<[], Result_6>,
  'get_migration_status' : ActorMethod<[], [] | [CreationStatusResponse]>,
  'get_my_personal_canister_id' : ActorMethod<[], [] | [Principal]>,
  'get_personal_canister_creation_stats' : ActorMethod<[], Result_6>,
  'get_personal_canister_id' : ActorMethod<[Principal], [] | [Principal]>,
  'get_user_creation_status' : ActorMethod<[Principal], Result_7>,
  'get_user_migration_status' : ActorMethod<[Principal], Result_7>,
  'greet' : ActorMethod<[string], string>,
  'is_migration_enabled' : ActorMethod<[], Result_3>,
  'is_personal_canister_creation_enabled' : ActorMethod<[], Result_3>,
  'list_admins' : ActorMethod<[], Array<Principal>>,
  'list_all_creation_states' : ActorMethod<[], Result_5>,
  'list_all_migration_states' : ActorMethod<[], Result_5>,
  'list_superadmins' : ActorMethod<[], Array<Principal>>,
  'memories_abort' : ActorMethod<[bigint], Result>,
  'memories_begin_upload' : ActorMethod<[string, MemoryMeta, number], Result_8>,
  'memories_commit' : ActorMethod<
    [bigint, Uint8Array | number[], bigint],
    Result_9
  >,
  'memories_create' : ActorMethod<
    [string, MemoryData],
    MemoryOperationResponse
  >,
  'memories_create_inline' : ActorMethod<
    [string, Uint8Array | number[], MemoryMeta],
    Result_9
  >,
  'memories_delete' : ActorMethod<[string], MemoryOperationResponse>,
  'memories_list' : ActorMethod<[string], MemoryListResponse>,
  'memories_ping' : ActorMethod<[Array<string>], Result_10>,
  'memories_put_chunk' : ActorMethod<
    [bigint, number, Uint8Array | number[]],
    Result
  >,
  'memories_read' : ActorMethod<[string], Result_11>,
  'memories_update' : ActorMethod<
    [string, MemoryUpdateData],
    MemoryOperationResponse
  >,
  'migrate_capsule' : ActorMethod<[], PersonalCanisterCreationResponse>,
  'prove_nonce' : ActorMethod<[string], Result>,
  'register' : ActorMethod<[], Result>,
  'register_with_nonce' : ActorMethod<[string], Result>,
  'remove_admin' : ActorMethod<[Principal], Result>,
  'set_migration_enabled' : ActorMethod<[boolean], Result>,
  'set_personal_canister_creation_enabled' : ActorMethod<[boolean], Result>,
  'update_gallery_storage_status' : ActorMethod<
    [string, GalleryStorageStatus],
    Result
  >,
  'upsert_metadata' : ActorMethod<
    [string, MemoryType, SimpleMemoryMetadata, string],
    Result_12
  >,
  'verify_nonce' : ActorMethod<[string], Result_13>,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
