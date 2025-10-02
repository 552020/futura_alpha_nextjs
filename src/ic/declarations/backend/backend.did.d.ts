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
export type AssetMetadata = { 'Note' : NoteAssetMetadata } |
  { 'Image' : ImageAssetMetadata } |
  { 'Document' : DocumentAssetMetadata } |
  { 'Audio' : AudioAssetMetadata } |
  { 'Video' : VideoAssetMetadata };
export interface AssetMetadataBase {
  'url' : [] | [string],
  'height' : [] | [number],
  'updated_at' : bigint,
  'asset_type' : AssetType,
  'sha256' : [] | [Uint8Array | number[]],
  'name' : string,
  'storage_key' : [] | [string],
  'tags' : Array<string>,
  'processing_error' : [] | [string],
  'mime_type' : string,
  'description' : [] | [string],
  'created_at' : bigint,
  'deleted_at' : [] | [bigint],
  'bytes' : bigint,
  'asset_location' : [] | [string],
  'width' : [] | [number],
  'processing_status' : [] | [string],
  'bucket' : [] | [string],
}
export type AssetType = { 'Preview' : null } |
  { 'Metadata' : null } |
  { 'Derivative' : null } |
  { 'Original' : null } |
  { 'Thumbnail' : null };
export interface AudioAssetMetadata {
  'duration' : [] | [bigint],
  'base' : AssetMetadataBase,
  'codec' : [] | [string],
  'channels' : [] | [number],
  'sample_rate' : [] | [number],
  'bit_depth' : [] | [number],
  'bitrate' : [] | [bigint],
}
export interface BlobMeta { 'size' : bigint, 'chunk_count' : number }
export interface BlobRef {
  'len' : bigint,
  'locator' : string,
  'hash' : [] | [Uint8Array | number[]],
}
export interface CanisterSizeStats {
  'remaining_capacity_bytes' : bigint,
  'max_size_bytes' : bigint,
  'total_size_bytes' : bigint,
  'usage_percentage' : number,
}
export interface Capsule {
  'id' : string,
  'updated_at' : bigint,
  'controllers' : Array<[PersonRef, ControllerState]>,
  'subject' : PersonRef,
  'owners' : Array<[PersonRef, OwnerState]>,
  'inline_bytes_used' : bigint,
  'created_at' : bigint,
  'connection_groups' : Array<[string, ConnectionGroup]>,
  'connections' : Array<[PersonRef, Connection]>,
  'memories' : Array<[string, Memory]>,
  'bound_to_neon' : boolean,
  'galleries' : Array<[string, Gallery]>,
}
export interface CapsuleHeader {
  'id' : string,
  'updated_at' : bigint,
  'subject' : PersonRef,
  'owner_count' : bigint,
  'created_at' : bigint,
  'controller_count' : bigint,
  'memory_count' : bigint,
}
export interface CapsuleInfo {
  'updated_at' : bigint,
  'gallery_count' : bigint,
  'subject' : PersonRef,
  'capsule_id' : string,
  'is_owner' : boolean,
  'created_at' : bigint,
  'bound_to_neon' : boolean,
  'memory_count' : bigint,
  'connection_count' : bigint,
  'is_self_capsule' : boolean,
  'is_controller' : boolean,
}
export interface CapsuleUpdateData { 'bound_to_neon' : [] | [boolean] }
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
export interface DetailedCreationStatus {
  'status' : CreationStatus,
  'progress_message' : string,
  'canister_id' : [] | [Principal],
  'error_message' : [] | [string],
  'created_at' : bigint,
  'cycles_consumed' : bigint,
  'completed_at' : [] | [bigint],
}
export interface DocumentAssetMetadata {
  'document_type' : [] | [string],
  'base' : AssetMetadataBase,
  'language' : [] | [string],
  'page_count' : [] | [number],
  'word_count' : [] | [number],
}
export type Error = { 'Internal' : string } |
  { 'NotFound' : null } |
  { 'Unauthorized' : null } |
  { 'InvalidArgument' : string } |
  { 'ResourceExhausted' : null } |
  { 'NotImplemented' : string } |
  { 'Conflict' : string };
export interface Gallery {
  'id' : string,
  'is_public' : boolean,
  'title' : string,
  'updated_at' : bigint,
  'storage_location' : GalleryStorageLocation,
  'memory_entries' : Array<GalleryMemoryEntry>,
  'description' : [] | [string],
  'created_at' : bigint,
  'bound_to_neon' : boolean,
  'owner_principal' : Principal,
}
export interface GalleryData {
  'owner_principal' : Principal,
  'gallery' : Gallery,
}
export interface GalleryHeader {
  'id' : string,
  'updated_at' : bigint,
  'storage_location' : GalleryStorageLocation,
  'name' : string,
  'created_at' : bigint,
  'memory_count' : bigint,
}
export interface GalleryMemoryEntry {
  'memory_id' : string,
  'is_featured' : boolean,
  'position' : number,
  'gallery_metadata' : string,
  'gallery_caption' : [] | [string],
}
export interface GallerySizeInfo {
  'is_over_limit' : boolean,
  'gallery_id' : string,
  'memory_entries_count' : number,
  'total_size' : bigint,
  'estimated_memory_entries_size' : bigint,
  'over_limit_by' : bigint,
}
export type GalleryStorageLocation = { 'Web2Only' : null } |
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
export interface ImageAssetMetadata {
  'dpi' : [] | [number],
  'color_space' : [] | [string],
  'base' : AssetMetadataBase,
  'exif_data' : [] | [string],
  'compression_ratio' : [] | [number],
  'orientation' : [] | [number],
}
export interface Memory {
  'id' : string,
  'inline_assets' : Array<MemoryAssetInline>,
  'access' : MemoryAccess,
  'metadata' : MemoryMetadata,
  'blob_internal_assets' : Array<MemoryAssetBlobInternal>,
  'blob_external_assets' : Array<MemoryAssetBlobExternal>,
}
export type MemoryAccess = { 'Private' : { 'owner_secure_code' : string } } |
  {
    'Custom' : {
      'groups' : Array<string>,
      'individuals' : Array<PersonRef>,
      'owner_secure_code' : string,
    }
  } |
  {
    'EventTriggered' : {
      'access' : MemoryAccess,
      'trigger_event' : AccessEvent,
      'owner_secure_code' : string,
    }
  } |
  { 'Public' : { 'owner_secure_code' : string } } |
  {
    'Scheduled' : {
      'access' : MemoryAccess,
      'accessible_after' : bigint,
      'owner_secure_code' : string,
    }
  };
export interface MemoryAssetBlobExternal {
  'url' : [] | [string],
  'metadata' : AssetMetadata,
  'storage_key' : string,
  'location' : StorageEdgeBlobType,
}
export interface MemoryAssetBlobInternal {
  'metadata' : AssetMetadata,
  'blob_ref' : BlobRef,
}
export interface MemoryAssetInline {
  'metadata' : AssetMetadata,
  'bytes' : Uint8Array | number[],
}
export interface MemoryHeader {
  'id' : string,
  'access' : MemoryAccess,
  'updated_at' : bigint,
  'memory_type' : MemoryType,
  'name' : string,
  'size' : bigint,
  'created_at' : bigint,
}
export interface MemoryListResponse {
  'memories' : Array<MemoryHeader>,
  'message' : string,
  'success' : boolean,
}
export interface MemoryMetadata {
  'title' : [] | [string],
  'updated_at' : bigint,
  'date_of_memory' : [] | [bigint],
  'memory_type' : MemoryType,
  'tags' : Array<string>,
  'content_type' : string,
  'people_in_memory' : [] | [Array<string>],
  'database_storage_edges' : Array<StorageEdgeDatabaseType>,
  'description' : [] | [string],
  'created_at' : bigint,
  'created_by' : [] | [string],
  'parent_folder_id' : [] | [string],
  'deleted_at' : [] | [bigint],
  'file_created_at' : [] | [bigint],
  'location' : [] | [string],
  'memory_notes' : [] | [string],
  'uploaded_at' : bigint,
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
export interface NoteAssetMetadata {
  'base' : AssetMetadataBase,
  'language' : [] | [string],
  'word_count' : [] | [number],
  'format' : [] | [string],
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
export type Result_1 = { 'Ok' : BlobMeta } |
  { 'Err' : Error };
export type Result_10 = { 'Ok' : [] | [DetailedCreationStatus] } |
  { 'Err' : Error };
export type Result_11 = { 'Ok' : string } |
  { 'Err' : Error };
export type Result_12 = { 'Ok' : Array<MemoryPresenceResult> } |
  { 'Err' : Error };
export type Result_13 = { 'Ok' : bigint } |
  { 'Err' : Error };
export type Result_14 = { 'Ok' : Principal } |
  { 'Err' : Error };
export type Result_15 = { 'Ok' : UploadFinishResult } |
  { 'Err' : Error };
export type Result_2 = { 'Ok' : Uint8Array | number[] } |
  { 'Err' : Error };
export type Result_3 = { 'Ok' : Capsule } |
  { 'Err' : Error };
export type Result_4 = { 'Ok' : CapsuleInfo } |
  { 'Err' : Error };
export type Result_5 = { 'Ok' : boolean } |
  { 'Err' : Error };
export type Result_6 = { 'Ok' : [string, string] } |
  { 'Err' : Error };
export type Result_7 = { 'Ok' : Gallery } |
  { 'Err' : Error };
export type Result_8 = { 'Ok' : Array<[Principal, DetailedCreationStatus]> } |
  { 'Err' : Error };
export type Result_9 = { 'Ok' : PersonalCanisterCreationStats } |
  { 'Err' : Error };
export type StorageBackend = { 'S3' : null } |
  { 'Icp' : null } |
  { 'VercelBlob' : null } |
  { 'Ipfs' : null } |
  { 'Arweave' : null };
export type StorageEdgeBlobType = { 'S3' : null } |
  { 'Icp' : null } |
  { 'VercelBlob' : null } |
  { 'Ipfs' : null } |
  { 'Neon' : null } |
  { 'Arweave' : null };
export type StorageEdgeDatabaseType = { 'Icp' : null } |
  { 'Neon' : null };
export interface UploadConfig {
  'inline_max' : number,
  'chunk_size' : number,
  'inline_budget_per_capsule' : number,
}
export interface UploadFinishResult {
  'checksum_sha256' : [] | [Uint8Array | number[]],
  'storage_location' : string,
  'blob_id' : string,
  'storage_backend' : StorageBackend,
  'size' : bigint,
  'memory_id' : string,
  'remote_id' : [] | [string],
  'expires_at' : [] | [bigint],
  'uploaded_at' : bigint,
}
export interface VideoAssetMetadata {
  'duration' : [] | [bigint],
  'base' : AssetMetadataBase,
  'codec' : [] | [string],
  'frame_rate' : [] | [number],
  'resolution' : [] | [string],
  'bitrate' : [] | [bigint],
  'aspect_ratio' : [] | [number],
}
export interface _SERVICE {
  '_probe_inline_len' : ActorMethod<
    [[] | [Uint8Array | number[]]],
    [bigint, Uint8Array | number[]]
  >,
  'add_admin' : ActorMethod<[Principal], Result>,
  'blob_get_meta' : ActorMethod<[string], Result_1>,
  'blob_read' : ActorMethod<[string], Result_2>,
  'blob_read_chunk' : ActorMethod<[string, number], Result_2>,
  'calculate_gallery_capsule_size' : ActorMethod<[Gallery], bigint>,
  'calculate_gallery_size' : ActorMethod<[Gallery], bigint>,
  'capsules_bind_neon' : ActorMethod<[ResourceType, string, boolean], Result>,
  'capsules_create' : ActorMethod<[[] | [PersonRef]], Result_3>,
  'capsules_delete' : ActorMethod<[string], Result>,
  'capsules_list' : ActorMethod<[], Array<CapsuleHeader>>,
  'capsules_read_basic' : ActorMethod<[[] | [string]], Result_4>,
  'capsules_read_full' : ActorMethod<[[] | [string]], Result_3>,
  'capsules_update' : ActorMethod<[string, CapsuleUpdateData], Result_3>,
  'clear_all_stable_memory' : ActorMethod<[], Result>,
  'clear_creation_state' : ActorMethod<[Principal], Result_5>,
  'clear_migration_state' : ActorMethod<[Principal], Result_5>,
  'create_personal_canister' : ActorMethod<
    [],
    PersonalCanisterCreationResponse
  >,
  'debug_blob_read_canary' : ActorMethod<[string, number], [] | [number]>,
  'debug_blob_write_canary' : ActorMethod<[string, number, number], undefined>,
  'debug_finish_hex' : ActorMethod<[bigint, string, bigint], Result_6>,
  'debug_put_chunk_b64' : ActorMethod<[bigint, number, string], Result>,
  'debug_sha256' : ActorMethod<[Uint8Array | number[]], string>,
  'galleries_create' : ActorMethod<[GalleryData], Result_7>,
  'galleries_create_with_memories' : ActorMethod<
    [GalleryData, boolean],
    Result_7
  >,
  'galleries_delete' : ActorMethod<[string], Result>,
  'galleries_list' : ActorMethod<[], Array<GalleryHeader>>,
  'galleries_read' : ActorMethod<[string], Result_7>,
  'galleries_update' : ActorMethod<[string, GalleryUpdateData], Result_7>,
  'get_canister_size_stats' : ActorMethod<[], CanisterSizeStats>,
  'get_creation_states_by_status' : ActorMethod<[CreationStatus], Result_8>,
  'get_creation_status' : ActorMethod<[], [] | [CreationStatusResponse]>,
  'get_detailed_creation_status' : ActorMethod<
    [],
    [] | [DetailedCreationStatus]
  >,
  'get_detailed_migration_status' : ActorMethod<
    [],
    [] | [DetailedCreationStatus]
  >,
  'get_gallery_size_breakdown' : ActorMethod<[Gallery], GallerySizeInfo>,
  'get_gallery_size_info' : ActorMethod<[Gallery], string>,
  'get_migration_states_by_status' : ActorMethod<[CreationStatus], Result_8>,
  'get_migration_stats' : ActorMethod<[], Result_9>,
  'get_migration_status' : ActorMethod<[], [] | [CreationStatusResponse]>,
  'get_my_personal_canister_id' : ActorMethod<[], [] | [Principal]>,
  'get_personal_canister_creation_stats' : ActorMethod<[], Result_9>,
  'get_personal_canister_id' : ActorMethod<[Principal], [] | [Principal]>,
  'get_user_creation_status' : ActorMethod<[Principal], Result_10>,
  'get_user_migration_status' : ActorMethod<[Principal], Result_10>,
  'greet' : ActorMethod<[string], string>,
  'is_migration_enabled' : ActorMethod<[], Result_5>,
  'is_personal_canister_creation_enabled' : ActorMethod<[], Result_5>,
  'list_admins' : ActorMethod<[], Array<Principal>>,
  'list_all_creation_states' : ActorMethod<[], Result_8>,
  'list_all_migration_states' : ActorMethod<[], Result_8>,
  'list_superadmins' : ActorMethod<[], Array<Principal>>,
  'memories_create' : ActorMethod<
    [
      string,
      [] | [Uint8Array | number[]],
      [] | [BlobRef],
      [] | [StorageEdgeBlobType],
      [] | [string],
      [] | [string],
      [] | [bigint],
      [] | [Uint8Array | number[]],
      AssetMetadata,
      string,
    ],
    Result_11
  >,
  'memories_delete' : ActorMethod<[string], MemoryOperationResponse>,
  'memories_list' : ActorMethod<[string], MemoryListResponse>,
  'memories_ping' : ActorMethod<[Array<string>], Result_12>,
  'memories_read' : ActorMethod<[string], Result_13>,
  'memories_read_asset' : ActorMethod<[string, number], Result_2>,
  'memories_read_with_assets' : ActorMethod<[string], Result_13>,
  'memories_update' : ActorMethod<
    [string, MemoryUpdateData],
    MemoryOperationResponse
  >,
  'migrate_capsule' : ActorMethod<[], PersonalCanisterCreationResponse>,
  'register_with_nonce' : ActorMethod<[string], Result>,
  'remove_admin' : ActorMethod<[Principal], Result>,
  'sessions_cleanup_expired' : ActorMethod<[], Result_11>,
  'sessions_clear_all' : ActorMethod<[], Result_11>,
  'sessions_list' : ActorMethod<[], Result_11>,
  'sessions_stats' : ActorMethod<[], Result_11>,
  'set_migration_enabled' : ActorMethod<[boolean], Result>,
  'set_personal_canister_creation_enabled' : ActorMethod<[boolean], Result>,
  'update_gallery_storage_location' : ActorMethod<
    [string, GalleryStorageLocation],
    Result
  >,
  'upload_config' : ActorMethod<[], UploadConfig>,
  'uploads_abort' : ActorMethod<[bigint], Result>,
  'uploads_begin' : ActorMethod<
    [string, AssetMetadata, number, string],
    Result_13
  >,
  'uploads_finish' : ActorMethod<
    [bigint, Uint8Array | number[], bigint],
    Result_15
  >,
  'uploads_put_chunk' : ActorMethod<
    [bigint, number, Uint8Array | number[]],
    Result
  >,
  'verify_nonce' : ActorMethod<[string], Result_14>,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
