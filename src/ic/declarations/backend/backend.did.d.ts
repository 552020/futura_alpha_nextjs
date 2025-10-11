import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AccessCondition = { 'Immediate' : null } |
  { 'EventTriggered' : { 'event' : AccessEvent } } |
  { 'Scheduled' : { 'accessible_after' : bigint } } |
  { 'ExpiresAt' : { 'expires' : bigint } };
export interface AccessEntry {
  'id' : string,
  'is_public' : boolean,
  'updated_at' : bigint,
  'role' : ResourceRole,
  'source_id' : [] | [string],
  'created_at' : bigint,
  'person_ref' : [] | [PersonRef],
  'invited_by_person_ref' : [] | [PersonRef],
  'grant_source' : GrantSource,
  'perm_mask' : number,
  'condition' : AccessCondition,
}
export type AccessEvent = { 'CapsuleMaturity' : number } |
  { 'Graduation' : null } |
  { 'AfterDeath' : null } |
  { 'Wedding' : null } |
  { 'Birthday' : number } |
  { 'Custom' : string } |
  { 'ConnectionCount' : number } |
  { 'Anniversary' : number };
export interface AssetCleanupResult {
  'assets_cleaned' : number,
  'memory_id' : string,
  'message' : string,
}
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
export interface AssetRemovalResult {
  'memory_id' : string,
  'asset_removed' : boolean,
  'message' : string,
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
export type BackendHosting = { 'Icp' : null } |
  { 'Vercel' : null };
export type BlobHosting = { 'S3' : null } |
  { 'Icp' : null } |
  { 'VercelBlob' : null } |
  { 'Ipfs' : null } |
  { 'Neon' : null } |
  { 'Arweave' : null };
export interface BlobMeta { 'size' : bigint, 'chunk_count' : number }
export interface BlobRef {
  'len' : bigint,
  'locator' : string,
  'hash' : [] | [Uint8Array | number[]],
}
export interface BulkDeleteResult {
  'deleted_count' : number,
  'message' : string,
  'failed_count' : number,
}
export interface BulkFailure { 'id' : string, 'err' : Error }
export interface BulkResult {
  'ok' : Array<string>,
  'failed' : Array<BulkFailure>,
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
  'has_advanced_settings' : boolean,
  'controllers' : Array<[PersonRef, ControllerState]>,
  'subject' : PersonRef,
  'owners' : Array<[PersonRef, OwnerState]>,
  'inline_bytes_used' : bigint,
  'folders' : Array<[string, Folder]>,
  'created_at' : bigint,
  'connection_groups' : Array<[string, ConnectionGroup]>,
  'connections' : Array<[PersonRef, Connection]>,
  'memories' : Array<[string, Memory]>,
  'bound_to_neon' : boolean,
  'galleries' : Array<[string, Gallery]>,
  'hosting_preferences' : HostingPreferences,
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
export type DatabaseHosting = { 'Icp' : null } |
  { 'Neon' : null };
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
export interface Folder {
  'id' : string,
  'updated_at' : bigint,
  'capsule_id' : string,
  'metadata' : FolderMetadata,
  'created_at' : bigint,
  'access_entries' : Array<AccessEntry>,
}
export interface FolderData { 'folder' : Folder }
export interface FolderHeader {
  'id' : string,
  'total_memories' : number,
  'title' : [] | [string],
  'updated_at' : bigint,
  'sharing_status' : SharingStatus,
  'storage_location' : Array<BlobHosting>,
  'name' : string,
  'created_at' : bigint,
  'memory_count' : bigint,
  'shared_count' : number,
}
export interface FolderMetadata {
  'total_memories' : number,
  'title' : [] | [string],
  'sharing_status' : SharingStatus,
  'storage_location' : Array<BlobHosting>,
  'name' : string,
  'description' : [] | [string],
  'shared_count' : number,
}
export interface FolderUpdateData {
  'title' : [] | [string],
  'description' : [] | [string],
}
export interface Gallery {
  'id' : string,
  'updated_at' : bigint,
  'capsule_id' : string,
  'metadata' : FolderMetadata,
  'cover_memory_id' : [] | [string],
  'created_at' : bigint,
  'items' : Array<GalleryItem>,
  'access_entries' : Array<AccessEntry>,
}
export interface GalleryData {
  'owner_principal' : Principal,
  'gallery' : Gallery,
}
export interface GalleryItem {
  'memory_type' : MemoryType,
  'metadata' : Array<[string, string]>,
  'memory_id' : string,
  'caption' : [] | [string],
  'position' : number,
}
export interface GalleryMemoryEntry {
  'memory_id' : string,
  'is_featured' : boolean,
  'position' : number,
  'gallery_metadata' : string,
  'gallery_caption' : [] | [string],
}
export interface GalleryMetadata {
  'total_memories' : number,
  'title' : [] | [string],
  'sharing_status' : SharingStatus,
  'storage_location' : Array<BlobHosting>,
  'name' : string,
  'description' : [] | [string],
  'shared_count' : number,
}
export interface GallerySizeInfo {
  'total_size_bytes' : bigint,
  'memory_count' : bigint,
  'metadata_size' : bigint,
  'average_memory_size' : bigint,
}
export interface GalleryUpdateData {
  'is_public' : [] | [boolean],
  'title' : [] | [string],
  'memory_entries' : [] | [Array<GalleryMemoryEntry>],
  'description' : [] | [string],
}
export type GrantSource = { 'MagicLink' : null } |
  { 'System' : null } |
  { 'Group' : null } |
  { 'User' : null };
export interface HostingPreferences {
  'backend_hosting' : BackendHosting,
  'database_hosting' : DatabaseHosting,
  'blob_hosting' : BlobHosting,
  'frontend_hosting' : BackendHosting,
}
export interface ImageAssetMetadata {
  'dpi' : [] | [number],
  'color_space' : [] | [string],
  'base' : AssetMetadataBase,
  'exif_data' : [] | [string],
  'compression_ratio' : [] | [number],
  'orientation' : [] | [number],
}
export interface InlineAssetInput {
  'metadata' : AssetMetadata,
  'bytes' : Uint8Array | number[],
}
export interface InternalBlobAssetInput {
  'metadata' : AssetMetadata,
  'blob_id' : string,
}
export interface Memory {
  'id' : string,
  'inline_assets' : Array<MemoryAssetInline>,
  'capsule_id' : string,
  'metadata' : MemoryMetadata,
  'blob_internal_assets' : Array<MemoryAssetBlobInternal>,
  'blob_external_assets' : Array<MemoryAssetBlobExternal>,
  'access_entries' : Array<AccessEntry>,
}
export interface MemoryAssetBlobExternal {
  'url' : [] | [string],
  'metadata' : AssetMetadata,
  'storage_key' : string,
  'asset_id' : string,
  'location' : BlobHosting,
}
export interface MemoryAssetBlobInternal {
  'metadata' : AssetMetadata,
  'blob_ref' : BlobRef,
  'asset_id' : string,
}
export type MemoryAssetData = {
    'ExternalUrl' : {
      'url' : string,
      'sha256' : [] | [Uint8Array | number[]],
      'size' : [] | [bigint],
    }
  } |
  {
    'Inline' : {
      'sha256' : [] | [Uint8Array | number[]],
      'size' : bigint,
      'content_type' : string,
      'bytes' : Uint8Array | number[],
    }
  } |
  {
    'InternalBlob' : {
      'sha256' : [] | [Uint8Array | number[]],
      'blob_id' : string,
      'size' : bigint,
    }
  };
export interface MemoryAssetInline {
  'metadata' : AssetMetadata,
  'bytes' : Uint8Array | number[],
  'asset_id' : string,
}
export interface MemoryAssetsList {
  'inline_assets' : Array<string>,
  'internal_assets' : Array<string>,
  'external_assets' : Array<string>,
  'memory_id' : string,
  'total_count' : number,
}
export interface MemoryHeader {
  'id' : string,
  'title' : [] | [string],
  'updated_at' : bigint,
  'sharing_status' : SharingStatus,
  'capsule_id' : string,
  'memory_type' : MemoryType,
  'name' : string,
  'size' : bigint,
  'tags' : Array<string>,
  'has_thumbnails' : boolean,
  'has_previews' : boolean,
  'database_storage_edges' : Array<DatabaseHosting>,
  'description' : [] | [string],
  'created_at' : bigint,
  'thumbnail_url' : [] | [string],
  'parent_folder_id' : [] | [string],
  'asset_count' : number,
  'primary_asset_url' : [] | [string],
  'shared_count' : number,
}
export interface MemoryMetadata {
  'title' : [] | [string],
  'updated_at' : bigint,
  'sharing_status' : SharingStatus,
  'date_of_memory' : [] | [bigint],
  'memory_type' : MemoryType,
  'tags' : Array<string>,
  'has_thumbnails' : boolean,
  'content_type' : string,
  'people_in_memory' : [] | [Array<string>],
  'has_previews' : boolean,
  'database_storage_edges' : Array<DatabaseHosting>,
  'description' : [] | [string],
  'created_at' : bigint,
  'created_by' : [] | [string],
  'total_size' : bigint,
  'thumbnail_url' : [] | [string],
  'parent_folder_id' : [] | [string],
  'asset_count' : number,
  'deleted_at' : [] | [bigint],
  'primary_asset_url' : [] | [string],
  'shared_count' : number,
  'file_created_at' : [] | [bigint],
  'location' : [] | [string],
  'memory_notes' : [] | [string],
  'uploaded_at' : bigint,
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
  'metadata' : [] | [MemoryMetadata],
  'name' : [] | [string],
  'access_entries' : [] | [Array<AccessEntry>],
}
export interface NoteAssetMetadata {
  'base' : AssetMetadataBase,
  'language' : [] | [string],
  'word_count' : [] | [number],
  'format' : [] | [string],
}
export interface OwnerState { 'last_activity_at' : bigint, 'since' : bigint }
export interface Page {
  'next_cursor' : [] | [string],
  'items' : Array<MemoryHeader>,
}
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
export type ResourceRole = { 'Guest' : null } |
  { 'Member' : null } |
  { 'SuperAdmin' : null } |
  { 'Admin' : null } |
  { 'Owner' : null };
export type ResourceType = { 'Memory' : null } |
  { 'Capsule' : null } |
  { 'Gallery' : null };
export type Result = { 'Ok' : null } |
  { 'Err' : Error };
export type Result13 = { 'Ok' : bigint } |
  { 'Err' : Error };
export type Result14 = { 'Ok' : Principal } |
  { 'Err' : Error };
export type Result15 = { 'Ok' : UploadFinishResult } |
  { 'Err' : Error };
export type Result6 = { 'Ok' : string } |
  { 'Err' : Error };
export type Result_1 = { 'Ok' : MemoryAssetData } |
  { 'Err' : Error };
export type Result_10 = { 'Ok' : Array<[Principal, DetailedCreationStatus]> } |
  { 'Err' : Error };
export type Result_11 = { 'Ok' : PersonalCanisterCreationStats } |
  { 'Err' : Error };
export type Result_12 = { 'Ok' : [] | [DetailedCreationStatus] } |
  { 'Err' : Error };
export type Result_13 = { 'Ok' : UserSettingsResponse } |
  { 'Err' : Error };
export type Result_14 = { 'Ok' : AssetCleanupResult } |
  { 'Err' : Error };
export type Result_15 = { 'Ok' : BulkResult } |
  { 'Err' : Error };
export type Result_16 = { 'Ok' : BulkDeleteResult } |
  { 'Err' : Error };
export type Result_17 = { 'Ok' : Page } |
  { 'Err' : Error };
export type Result_18 = { 'Ok' : MemoryAssetsList } |
  { 'Err' : Error };
export type Result_19 = { 'Ok' : Array<MemoryPresenceResult> } |
  { 'Err' : Error };
export type Result_2 = { 'Ok' : AssetRemovalResult } |
  { 'Err' : Error };
export type Result_20 = { 'Ok' : Memory } |
  { 'Err' : Error };
export type Result_3 = { 'Ok' : BlobMeta } |
  { 'Err' : Error };
export type Result_4 = { 'Ok' : Uint8Array | number[] } |
  { 'Err' : Error };
export type Result_5 = { 'Ok' : Capsule } |
  { 'Err' : Error };
export type Result_6 = { 'Ok' : CapsuleInfo } |
  { 'Err' : Error };
export type Result_7 = { 'Ok' : boolean } |
  { 'Err' : Error };
export type Result_8 = { 'Ok' : Folder } |
  { 'Err' : Error };
export type Result_9 = { 'Ok' : Gallery } |
  { 'Err' : Error };
export type SharingStatus = { 'Shared' : null } |
  { 'Private' : null } |
  { 'Public' : null };
export type StorageBackend = { 'S3' : null } |
  { 'Icp' : null } |
  { 'VercelBlob' : null } |
  { 'Ipfs' : null } |
  { 'Arweave' : null };
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
export interface UserSettingsResponse {
  'has_advanced_settings' : boolean,
  'hosting_preferences' : HostingPreferences,
}
export interface UserSettingsUpdateData {
  'has_advanced_settings' : [] | [boolean],
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
  'asset_get_by_id' : ActorMethod<[string, string], Result_1>,
  'asset_remove' : ActorMethod<[string, string], Result_2>,
  'asset_remove_by_id' : ActorMethod<[string, string], Result_2>,
  'asset_remove_external' : ActorMethod<[string, string], Result_2>,
  'asset_remove_inline' : ActorMethod<[string, number], Result_2>,
  'asset_remove_internal' : ActorMethod<[string, string], Result_2>,
  'blob_delete' : ActorMethod<[string], Result6>,
  'blob_get_meta' : ActorMethod<[string], Result_3>,
  'blob_read' : ActorMethod<[string], Result_4>,
  'blob_read_chunk' : ActorMethod<[string, number], Result_4>,
  'calculate_gallery_capsule_size' : ActorMethod<[Gallery], bigint>,
  'calculate_gallery_size' : ActorMethod<[Gallery], bigint>,
  'capsules_bind_neon' : ActorMethod<[ResourceType, string, boolean], Result>,
  'capsules_create' : ActorMethod<[[] | [PersonRef]], Result_5>,
  'capsules_delete' : ActorMethod<[string], Result>,
  'capsules_list' : ActorMethod<[], Array<CapsuleHeader>>,
  'capsules_read_basic' : ActorMethod<[[] | [string]], Result_6>,
  'capsules_read_full' : ActorMethod<[[] | [string]], Result_5>,
  'capsules_update' : ActorMethod<[string, CapsuleUpdateData], Result_5>,
  'clear_all_stable_memory' : ActorMethod<[], Result>,
  'clear_creation_state' : ActorMethod<[Principal], Result_7>,
  'clear_migration_state' : ActorMethod<[Principal], Result_7>,
  'create_personal_canister' : ActorMethod<
    [],
    PersonalCanisterCreationResponse
  >,
  'debug_blob_read_canary' : ActorMethod<[string, number], [] | [number]>,
  'debug_blob_write_canary' : ActorMethod<[string, number, number], undefined>,
  'debug_finish_hex' : ActorMethod<[bigint, string, bigint], Result6>,
  'debug_put_chunk_b64' : ActorMethod<[bigint, number, string], Result>,
  'debug_sha256' : ActorMethod<[Uint8Array | number[]], string>,
  'folders_create' : ActorMethod<[FolderData], Result_8>,
  'folders_delete' : ActorMethod<[string], Result>,
  'folders_list' : ActorMethod<[], Array<FolderHeader>>,
  'folders_update' : ActorMethod<[string, FolderUpdateData], Result_8>,
  'galleries_create' : ActorMethod<[GalleryData], Result_9>,
  'galleries_create_with_memories' : ActorMethod<
    [GalleryData, boolean],
    Result_9
  >,
  'galleries_delete' : ActorMethod<[string], Result>,
  'galleries_list' : ActorMethod<[], Array<FolderHeader>>,
  'galleries_read' : ActorMethod<[string], Result_9>,
  'galleries_update' : ActorMethod<[string, GalleryUpdateData], Result_9>,
  'get_canister_size_stats' : ActorMethod<[], CanisterSizeStats>,
  'get_creation_states_by_status' : ActorMethod<[CreationStatus], Result_10>,
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
  'get_migration_states_by_status' : ActorMethod<[CreationStatus], Result_10>,
  'get_migration_stats' : ActorMethod<[], Result_11>,
  'get_migration_status' : ActorMethod<[], [] | [CreationStatusResponse]>,
  'get_my_personal_canister_id' : ActorMethod<[], [] | [Principal]>,
  'get_personal_canister_creation_stats' : ActorMethod<[], Result_11>,
  'get_personal_canister_id' : ActorMethod<[Principal], [] | [Principal]>,
  'get_user_creation_status' : ActorMethod<[Principal], Result_12>,
  'get_user_migration_status' : ActorMethod<[Principal], Result_12>,
  'get_user_settings' : ActorMethod<[], Result_13>,
  'greet' : ActorMethod<[string], string>,
  'is_migration_enabled' : ActorMethod<[], Result_7>,
  'is_personal_canister_creation_enabled' : ActorMethod<[], Result_7>,
  'list_admins' : ActorMethod<[], Array<Principal>>,
  'list_all_creation_states' : ActorMethod<[], Result_10>,
  'list_all_migration_states' : ActorMethod<[], Result_10>,
  'list_superadmins' : ActorMethod<[], Array<Principal>>,
  'memories_add_asset' : ActorMethod<
    [string, InternalBlobAssetInput, string],
    Result6
  >,
  'memories_add_inline_asset' : ActorMethod<
    [string, InlineAssetInput, string],
    Result6
  >,
  'memories_cleanup_assets_all' : ActorMethod<[string], Result_14>,
  'memories_cleanup_assets_bulk' : ActorMethod<[Array<string>], Result_15>,
  'memories_create' : ActorMethod<
    [
      string,
      [] | [Uint8Array | number[]],
      [] | [BlobRef],
      [] | [BlobHosting],
      [] | [string],
      [] | [string],
      [] | [bigint],
      [] | [Uint8Array | number[]],
      AssetMetadata,
      string,
    ],
    Result6
  >,
  'memories_create_with_internal_blobs' : ActorMethod<
    [string, MemoryMetadata, Array<InternalBlobAssetInput>, string],
    Result6
  >,
  'memories_delete' : ActorMethod<[string, boolean], Result>,
  'memories_delete_all' : ActorMethod<[string, boolean], Result_16>,
  'memories_delete_bulk' : ActorMethod<
    [string, Array<string>, boolean],
    Result_16
  >,
  'memories_list' : ActorMethod<
    [string, [] | [string], [] | [number]],
    Result_17
  >,
  'memories_list_assets' : ActorMethod<[string], Result_18>,
  'memories_list_by_capsule' : ActorMethod<
    [string, [] | [string], [] | [number]],
    Result_17
  >,
  'memories_ping' : ActorMethod<[Array<string>], Result_19>,
  'memories_read' : ActorMethod<[string], Result_20>,
  'memories_read_asset' : ActorMethod<[string, number], Result_1>,
  'memories_update' : ActorMethod<[string, MemoryUpdateData], Result_20>,
  'migrate_capsule' : ActorMethod<[], PersonalCanisterCreationResponse>,
  'register_with_nonce' : ActorMethod<[string], Result>,
  'remove_admin' : ActorMethod<[Principal], Result>,
  'sessions_cleanup_expired' : ActorMethod<[], Result6>,
  'sessions_clear_all' : ActorMethod<[], Result6>,
  'sessions_list' : ActorMethod<[], Result6>,
  'sessions_stats' : ActorMethod<[], Result6>,
  'set_migration_enabled' : ActorMethod<[boolean], Result>,
  'set_personal_canister_creation_enabled' : ActorMethod<[boolean], Result>,
  'update_gallery_storage_location' : ActorMethod<
    [string, Array<BlobHosting>],
    Result
  >,
  'update_user_settings' : ActorMethod<[UserSettingsUpdateData], Result_13>,
  'upload_config' : ActorMethod<[], UploadConfig>,
  'uploads_abort' : ActorMethod<[bigint], Result>,
  'uploads_begin' : ActorMethod<[string, number, string], Result13>,
  'uploads_finish' : ActorMethod<
    [bigint, Uint8Array | number[], bigint],
    Result15
  >,
  'uploads_put_chunk' : ActorMethod<
    [bigint, number, Uint8Array | number[]],
    Result
  >,
  'verify_nonce' : ActorMethod<[string], Result14>,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
