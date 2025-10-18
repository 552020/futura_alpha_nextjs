export const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'Internal' : IDL.Text,
    'NotFound' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'InvalidArgument' : IDL.Text,
    'ResourceExhausted' : IDL.Null,
    'NotImplemented' : IDL.Text,
    'Conflict' : IDL.Text,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : Error });
  const MemoryAssetData = IDL.Variant({
    'ExternalUrl' : IDL.Record({
      'url' : IDL.Text,
      'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)),
      'size' : IDL.Opt(IDL.Nat64),
    }),
    'Inline' : IDL.Record({
      'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)),
      'size' : IDL.Nat64,
      'content_type' : IDL.Text,
      'bytes' : IDL.Vec(IDL.Nat8),
    }),
    'InternalBlob' : IDL.Record({
      'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)),
      'blob_id' : IDL.Text,
      'size' : IDL.Nat64,
    }),
  });
  const Result_1 = IDL.Variant({ 'Ok' : MemoryAssetData, 'Err' : Error });
  const AssetRemovalResult = IDL.Record({
    'memory_id' : IDL.Text,
    'asset_removed' : IDL.Bool,
    'message' : IDL.Text,
  });
  const Result_2 = IDL.Variant({ 'Ok' : AssetRemovalResult, 'Err' : Error });
  const Result6 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : Error });
  const BlobMeta = IDL.Record({
    'size' : IDL.Nat64,
    'chunk_count' : IDL.Nat32,
  });
  const Result_3 = IDL.Variant({ 'Ok' : BlobMeta, 'Err' : Error });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Vec(IDL.Nat8), 'Err' : Error });
  const SharingStatus = IDL.Variant({
    'Shared' : IDL.Null,
    'Private' : IDL.Null,
    'Public' : IDL.Null,
  });
  const BlobHosting = IDL.Variant({
    'S3' : IDL.Null,
    'Icp' : IDL.Null,
    'VercelBlob' : IDL.Null,
    'Ipfs' : IDL.Null,
    'Neon' : IDL.Null,
    'Arweave' : IDL.Null,
  });
  const FolderMetadata = IDL.Record({
    'total_memories' : IDL.Nat32,
    'title' : IDL.Opt(IDL.Text),
    'sharing_status' : SharingStatus,
    'storage_location' : IDL.Vec(BlobHosting),
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'shared_count' : IDL.Nat32,
  });
  const MemoryType = IDL.Variant({
    'Note' : IDL.Null,
    'Image' : IDL.Null,
    'Document' : IDL.Null,
    'Audio' : IDL.Null,
    'Video' : IDL.Null,
  });
  const GalleryItem = IDL.Record({
    'memory_type' : MemoryType,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'memory_id' : IDL.Text,
    'caption' : IDL.Opt(IDL.Text),
    'position' : IDL.Nat32,
  });
  const ResourceRole = IDL.Variant({
    'Guest' : IDL.Null,
    'Member' : IDL.Null,
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
    'Owner' : IDL.Null,
  });
  const PersonRef = IDL.Variant({
    'Opaque' : IDL.Text,
    'Principal' : IDL.Principal,
  });
  const GrantSource = IDL.Variant({
    'MagicLink' : IDL.Null,
    'System' : IDL.Null,
    'Group' : IDL.Null,
    'User' : IDL.Null,
  });
  const AccessEvent = IDL.Variant({
    'CapsuleMaturity' : IDL.Nat32,
    'Graduation' : IDL.Null,
    'AfterDeath' : IDL.Null,
    'Wedding' : IDL.Null,
    'Birthday' : IDL.Nat32,
    'Custom' : IDL.Text,
    'ConnectionCount' : IDL.Nat32,
    'Anniversary' : IDL.Nat32,
  });
  const AccessCondition = IDL.Variant({
    'Immediate' : IDL.Null,
    'EventTriggered' : IDL.Record({ 'event' : AccessEvent }),
    'Scheduled' : IDL.Record({ 'accessible_after' : IDL.Nat64 }),
    'ExpiresAt' : IDL.Record({ 'expires' : IDL.Nat64 }),
  });
  const AccessEntry = IDL.Record({
    'id' : IDL.Text,
    'is_public' : IDL.Bool,
    'updated_at' : IDL.Nat64,
    'role' : ResourceRole,
    'source_id' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'person_ref' : IDL.Opt(PersonRef),
    'invited_by_person_ref' : IDL.Opt(PersonRef),
    'grant_source' : GrantSource,
    'perm_mask' : IDL.Nat32,
    'condition' : AccessCondition,
  });
  const Gallery = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'capsule_id' : IDL.Text,
    'metadata' : FolderMetadata,
    'cover_memory_id' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'items' : IDL.Vec(GalleryItem),
    'access_entries' : IDL.Vec(AccessEntry),
  });
  const ResourceType = IDL.Variant({
    'Memory' : IDL.Null,
    'Capsule' : IDL.Null,
    'Gallery' : IDL.Null,
  });
  const ControllerState = IDL.Record({
    'granted_at' : IDL.Nat64,
    'granted_by' : PersonRef,
  });
  const OwnerState = IDL.Record({
    'last_activity_at' : IDL.Nat64,
    'since' : IDL.Nat64,
  });
  const Folder = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'capsule_id' : IDL.Text,
    'metadata' : FolderMetadata,
    'created_at' : IDL.Nat64,
    'access_entries' : IDL.Vec(AccessEntry),
  });
  const ConnectionGroup = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'members' : IDL.Vec(PersonRef),
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
  });
  const ConnectionStatus = IDL.Variant({
    'Blocked' : IDL.Null,
    'Accepted' : IDL.Null,
    'Revoked' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const Connection = IDL.Record({
    'status' : ConnectionStatus,
    'updated_at' : IDL.Nat64,
    'peer' : PersonRef,
    'created_at' : IDL.Nat64,
  });
  const AssetType = IDL.Variant({
    'Metadata' : IDL.Null,
    'Display' : IDL.Null,
    'Placeholder' : IDL.Null,
    'Original' : IDL.Null,
    'Thumbnail' : IDL.Null,
  });
  const AssetMetadataBase = IDL.Record({
    'url' : IDL.Opt(IDL.Text),
    'height' : IDL.Opt(IDL.Nat32),
    'updated_at' : IDL.Nat64,
    'asset_type' : AssetType,
    'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'name' : IDL.Text,
    'storage_key' : IDL.Opt(IDL.Text),
    'tags' : IDL.Vec(IDL.Text),
    'processing_error' : IDL.Opt(IDL.Text),
    'mime_type' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'deleted_at' : IDL.Opt(IDL.Nat64),
    'bytes' : IDL.Nat64,
    'asset_location' : IDL.Opt(IDL.Text),
    'width' : IDL.Opt(IDL.Nat32),
    'processing_status' : IDL.Opt(IDL.Text),
    'bucket' : IDL.Opt(IDL.Text),
  });
  const NoteAssetMetadata = IDL.Record({
    'base' : AssetMetadataBase,
    'language' : IDL.Opt(IDL.Text),
    'word_count' : IDL.Opt(IDL.Nat32),
    'format' : IDL.Opt(IDL.Text),
  });
  const ImageAssetMetadata = IDL.Record({
    'dpi' : IDL.Opt(IDL.Nat32),
    'color_space' : IDL.Opt(IDL.Text),
    'base' : AssetMetadataBase,
    'exif_data' : IDL.Opt(IDL.Text),
    'compression_ratio' : IDL.Opt(IDL.Float32),
    'orientation' : IDL.Opt(IDL.Nat8),
  });
  const DocumentAssetMetadata = IDL.Record({
    'document_type' : IDL.Opt(IDL.Text),
    'base' : AssetMetadataBase,
    'language' : IDL.Opt(IDL.Text),
    'page_count' : IDL.Opt(IDL.Nat32),
    'word_count' : IDL.Opt(IDL.Nat32),
  });
  const AudioAssetMetadata = IDL.Record({
    'duration' : IDL.Opt(IDL.Nat64),
    'base' : AssetMetadataBase,
    'codec' : IDL.Opt(IDL.Text),
    'channels' : IDL.Opt(IDL.Nat8),
    'sample_rate' : IDL.Opt(IDL.Nat32),
    'bit_depth' : IDL.Opt(IDL.Nat8),
    'bitrate' : IDL.Opt(IDL.Nat64),
  });
  const VideoAssetMetadata = IDL.Record({
    'duration' : IDL.Opt(IDL.Nat64),
    'base' : AssetMetadataBase,
    'codec' : IDL.Opt(IDL.Text),
    'frame_rate' : IDL.Opt(IDL.Float32),
    'resolution' : IDL.Opt(IDL.Text),
    'bitrate' : IDL.Opt(IDL.Nat64),
    'aspect_ratio' : IDL.Opt(IDL.Float32),
  });
  const AssetMetadata = IDL.Variant({
    'Note' : NoteAssetMetadata,
    'Image' : ImageAssetMetadata,
    'Document' : DocumentAssetMetadata,
    'Audio' : AudioAssetMetadata,
    'Video' : VideoAssetMetadata,
  });
  const MemoryAssetInline = IDL.Record({
    'metadata' : AssetMetadata,
    'bytes' : IDL.Vec(IDL.Nat8),
    'asset_id' : IDL.Text,
  });
  const DatabaseHosting = IDL.Variant({ 'Icp' : IDL.Null, 'Neon' : IDL.Null });
  const MemoryMetadata = IDL.Record({
    'title' : IDL.Opt(IDL.Text),
    'updated_at' : IDL.Nat64,
    'sharing_status' : SharingStatus,
    'date_of_memory' : IDL.Opt(IDL.Nat64),
    'memory_type' : MemoryType,
    'tags' : IDL.Vec(IDL.Text),
    'content_type' : IDL.Text,
    'people_in_memory' : IDL.Opt(IDL.Vec(IDL.Text)),
    'database_storage_edges' : IDL.Vec(DatabaseHosting),
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'created_by' : IDL.Opt(IDL.Text),
    'total_size' : IDL.Nat64,
    'parent_folder_id' : IDL.Opt(IDL.Text),
    'asset_count' : IDL.Nat32,
    'deleted_at' : IDL.Opt(IDL.Nat64),
    'shared_count' : IDL.Nat32,
    'file_created_at' : IDL.Opt(IDL.Nat64),
    'location' : IDL.Opt(IDL.Text),
    'memory_notes' : IDL.Opt(IDL.Text),
    'uploaded_at' : IDL.Nat64,
  });
  const BlobRef = IDL.Record({
    'len' : IDL.Nat64,
    'locator' : IDL.Text,
    'hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const MemoryAssetBlobInternal = IDL.Record({
    'metadata' : AssetMetadata,
    'blob_ref' : BlobRef,
    'asset_id' : IDL.Text,
  });
  const MemoryAssetBlobExternal = IDL.Record({
    'url' : IDL.Opt(IDL.Text),
    'metadata' : AssetMetadata,
    'storage_key' : IDL.Text,
    'asset_id' : IDL.Text,
    'location' : BlobHosting,
  });
  const Memory = IDL.Record({
    'id' : IDL.Text,
    'inline_assets' : IDL.Vec(MemoryAssetInline),
    'capsule_id' : IDL.Text,
    'metadata' : MemoryMetadata,
    'blob_internal_assets' : IDL.Vec(MemoryAssetBlobInternal),
    'blob_external_assets' : IDL.Vec(MemoryAssetBlobExternal),
    'access_entries' : IDL.Vec(AccessEntry),
  });
  const BackendHosting = IDL.Variant({ 'Icp' : IDL.Null, 'Vercel' : IDL.Null });
  const HostingPreferences = IDL.Record({
    'backend_hosting' : BackendHosting,
    'database_hosting' : DatabaseHosting,
    'blob_hosting' : BlobHosting,
    'frontend_hosting' : BackendHosting,
  });
  const Capsule = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'has_advanced_settings' : IDL.Bool,
    'controllers' : IDL.Vec(IDL.Tuple(PersonRef, ControllerState)),
    'subject' : PersonRef,
    'owners' : IDL.Vec(IDL.Tuple(PersonRef, OwnerState)),
    'inline_bytes_used' : IDL.Nat64,
    'folders' : IDL.Vec(IDL.Tuple(IDL.Text, Folder)),
    'created_at' : IDL.Nat64,
    'connection_groups' : IDL.Vec(IDL.Tuple(IDL.Text, ConnectionGroup)),
    'connections' : IDL.Vec(IDL.Tuple(PersonRef, Connection)),
    'memories' : IDL.Vec(IDL.Tuple(IDL.Text, Memory)),
    'bound_to_neon' : IDL.Bool,
    'galleries' : IDL.Vec(IDL.Tuple(IDL.Text, Gallery)),
    'hosting_preferences' : HostingPreferences,
  });
  const Result_5 = IDL.Variant({ 'Ok' : Capsule, 'Err' : Error });
  const CapsuleHeader = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'subject' : PersonRef,
    'owner_count' : IDL.Nat64,
    'created_at' : IDL.Nat64,
    'controller_count' : IDL.Nat64,
    'memory_count' : IDL.Nat64,
  });
  const CapsuleInfo = IDL.Record({
    'updated_at' : IDL.Nat64,
    'gallery_count' : IDL.Nat64,
    'subject' : PersonRef,
    'capsule_id' : IDL.Text,
    'is_owner' : IDL.Bool,
    'created_at' : IDL.Nat64,
    'bound_to_neon' : IDL.Bool,
    'memory_count' : IDL.Nat64,
    'connection_count' : IDL.Nat64,
    'is_self_capsule' : IDL.Bool,
    'is_controller' : IDL.Bool,
  });
  const Result_6 = IDL.Variant({ 'Ok' : CapsuleInfo, 'Err' : Error });
  const CapsuleUpdateData = IDL.Record({ 'bound_to_neon' : IDL.Opt(IDL.Bool) });
  const Result_7 = IDL.Variant({ 'Ok' : IDL.Bool, 'Err' : Error });
  const PersonalCanisterCreationResponse = IDL.Record({
    'canister_id' : IDL.Opt(IDL.Principal),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const BulkDeleteResult = IDL.Record({
    'deleted_count' : IDL.Nat32,
    'message' : IDL.Text,
    'failed_count' : IDL.Nat32,
  });
  const Result_8 = IDL.Variant({ 'Ok' : BulkDeleteResult, 'Err' : Error });
  const FolderData = IDL.Record({ 'folder' : Folder });
  const Result_9 = IDL.Variant({ 'Ok' : Folder, 'Err' : Error });
  const FolderHeader = IDL.Record({
    'id' : IDL.Text,
    'total_memories' : IDL.Nat32,
    'title' : IDL.Opt(IDL.Text),
    'updated_at' : IDL.Nat64,
    'sharing_status' : SharingStatus,
    'storage_location' : IDL.Vec(BlobHosting),
    'name' : IDL.Text,
    'created_at' : IDL.Nat64,
    'memory_count' : IDL.Nat64,
    'shared_count' : IDL.Nat32,
  });
  const FolderUpdateData = IDL.Record({
    'title' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
  });
  const GalleryData = IDL.Record({
    'owner_principal' : IDL.Principal,
    'gallery' : Gallery,
  });
  const Result_10 = IDL.Variant({ 'Ok' : Gallery, 'Err' : Error });
  const GalleryMemoryEntry = IDL.Record({
    'memory_id' : IDL.Text,
    'is_featured' : IDL.Bool,
    'position' : IDL.Nat32,
    'gallery_metadata' : IDL.Text,
    'gallery_caption' : IDL.Opt(IDL.Text),
  });
  const GalleryUpdateData = IDL.Record({
    'is_public' : IDL.Opt(IDL.Bool),
    'title' : IDL.Opt(IDL.Text),
    'memory_entries' : IDL.Opt(IDL.Vec(GalleryMemoryEntry)),
    'description' : IDL.Opt(IDL.Text),
  });
  const CanisterSizeStats = IDL.Record({
    'remaining_capacity_bytes' : IDL.Nat64,
    'max_size_bytes' : IDL.Nat64,
    'total_size_bytes' : IDL.Nat64,
    'usage_percentage' : IDL.Float64,
  });
  const CreationStatus = IDL.Variant({
    'Importing' : IDL.Null,
    'Creating' : IDL.Null,
    'Failed' : IDL.Null,
    'Exporting' : IDL.Null,
    'Installing' : IDL.Null,
    'Completed' : IDL.Null,
    'Verifying' : IDL.Null,
    'NotStarted' : IDL.Null,
  });
  const DetailedCreationStatus = IDL.Record({
    'status' : CreationStatus,
    'progress_message' : IDL.Text,
    'canister_id' : IDL.Opt(IDL.Principal),
    'error_message' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'cycles_consumed' : IDL.Nat,
    'completed_at' : IDL.Opt(IDL.Nat64),
  });
  const Result_11 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(IDL.Principal, DetailedCreationStatus)),
    'Err' : Error,
  });
  const CreationStatusResponse = IDL.Record({
    'status' : CreationStatus,
    'canister_id' : IDL.Opt(IDL.Principal),
    'message' : IDL.Opt(IDL.Text),
  });
  const GallerySizeInfo = IDL.Record({
    'total_size_bytes' : IDL.Nat64,
    'memory_count' : IDL.Nat64,
    'metadata_size' : IDL.Nat64,
    'average_memory_size' : IDL.Nat64,
  });
  const PersonalCanisterCreationStats = IDL.Record({
    'total_successes' : IDL.Nat64,
    'total_failures' : IDL.Nat64,
    'total_attempts' : IDL.Nat64,
    'total_cycles_consumed' : IDL.Nat,
  });
  const Result_12 = IDL.Variant({
    'Ok' : PersonalCanisterCreationStats,
    'Err' : Error,
  });
  const Result_13 = IDL.Variant({
    'Ok' : IDL.Opt(DetailedCreationStatus),
    'Err' : Error,
  });
  const UserSettingsResponse = IDL.Record({
    'has_advanced_settings' : IDL.Bool,
    'hosting_preferences' : HostingPreferences,
  });
  const Result_14 = IDL.Variant({ 'Ok' : UserSettingsResponse, 'Err' : Error });
  const HttpRequest = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'certificate_version' : IDL.Opt(IDL.Nat16),
  });
  const HttpResponse = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'upgrade' : IDL.Opt(IDL.Bool),
    'status_code' : IDL.Nat16,
  });
  const InternalBlobAssetInput = IDL.Record({
    'metadata' : AssetMetadata,
    'blob_id' : IDL.Text,
  });
  const InlineAssetInput = IDL.Record({
    'metadata' : AssetMetadata,
    'bytes' : IDL.Vec(IDL.Nat8),
  });
  const AssetCleanupResult = IDL.Record({
    'assets_cleaned' : IDL.Nat32,
    'memory_id' : IDL.Text,
    'message' : IDL.Text,
  });
  const Result_15 = IDL.Variant({ 'Ok' : AssetCleanupResult, 'Err' : Error });
  const BulkFailure = IDL.Record({ 'id' : IDL.Text, 'err' : Error });
  const BulkResult = IDL.Record({
    'ok' : IDL.Vec(IDL.Text),
    'failed' : IDL.Vec(BulkFailure),
  });
  const Result_16 = IDL.Variant({ 'Ok' : BulkResult, 'Err' : Error });
  const AssetKind = IDL.Variant({
    'Display' : IDL.Null,
    'Original' : IDL.Null,
    'Thumbnail' : IDL.Null,
  });
  const AssetLink = IDL.Record({
    'height' : IDL.Opt(IDL.Nat32),
    'asset_kind' : AssetKind,
    'token' : IDL.Text,
    'etag' : IDL.Opt(IDL.Text),
    'path' : IDL.Text,
    'content_type' : IDL.Text,
    'bytes' : IDL.Opt(IDL.Nat64),
    'asset_id' : IDL.Text,
    'width' : IDL.Opt(IDL.Nat32),
    'expires_at_ns' : IDL.Nat,
  });
  const AssetLinks = IDL.Record({
    'thumbnail' : IDL.Opt(AssetLink),
    'display' : IDL.Opt(AssetLink),
    'original' : IDL.Opt(AssetLink),
  });
  const MemoryHeader = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Opt(IDL.Text),
    'updated_at' : IDL.Nat64,
    'sharing_status' : SharingStatus,
    'capsule_id' : IDL.Text,
    'memory_type' : MemoryType,
    'name' : IDL.Text,
    'assets' : AssetLinks,
    'size' : IDL.Nat64,
    'tags' : IDL.Vec(IDL.Text),
    'database_storage_edges' : IDL.Vec(DatabaseHosting),
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'parent_folder_id' : IDL.Opt(IDL.Text),
    'asset_count' : IDL.Nat32,
    'placeholder_data' : IDL.Opt(IDL.Text),
    'shared_count' : IDL.Nat32,
  });
  const Page = IDL.Record({
    'next_cursor' : IDL.Opt(IDL.Text),
    'items' : IDL.Vec(MemoryHeader),
  });
  const Result_17 = IDL.Variant({ 'Ok' : Page, 'Err' : Error });
  const MemoryAssetsList = IDL.Record({
    'inline_assets' : IDL.Vec(IDL.Text),
    'internal_assets' : IDL.Vec(IDL.Text),
    'external_assets' : IDL.Vec(IDL.Text),
    'memory_id' : IDL.Text,
    'total_count' : IDL.Nat32,
  });
  const Result_18 = IDL.Variant({ 'Ok' : MemoryAssetsList, 'Err' : Error });
  const MemoryPresenceResult = IDL.Record({
    'metadata_present' : IDL.Bool,
    'memory_id' : IDL.Text,
    'asset_present' : IDL.Bool,
  });
  const Result_19 = IDL.Variant({
    'Ok' : IDL.Vec(MemoryPresenceResult),
    'Err' : Error,
  });
  const Result_20 = IDL.Variant({ 'Ok' : Memory, 'Err' : Error });
  const MemoryUpdateData = IDL.Record({
    'metadata' : IDL.Opt(MemoryMetadata),
    'name' : IDL.Opt(IDL.Text),
    'access_entries' : IDL.Opt(IDL.Vec(AccessEntry)),
  });
  const UserSettingsUpdateData = IDL.Record({
    'has_advanced_settings' : IDL.Opt(IDL.Bool),
  });
  const UploadConfig = IDL.Record({
    'inline_max' : IDL.Nat32,
    'chunk_size' : IDL.Nat32,
    'inline_budget_per_capsule' : IDL.Nat32,
  });
  const Result13 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : Error });
  const StorageBackend = IDL.Variant({
    'S3' : IDL.Null,
    'Icp' : IDL.Null,
    'VercelBlob' : IDL.Null,
    'Ipfs' : IDL.Null,
    'Arweave' : IDL.Null,
  });
  const UploadFinishResult = IDL.Record({
    'checksum_sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'storage_location' : IDL.Text,
    'blob_id' : IDL.Text,
    'storage_backend' : StorageBackend,
    'size' : IDL.Nat64,
    'memory_id' : IDL.Text,
    'remote_id' : IDL.Opt(IDL.Text),
    'expires_at' : IDL.Opt(IDL.Nat64),
    'uploaded_at' : IDL.Nat64,
  });
  const Result15 = IDL.Variant({ 'Ok' : UploadFinishResult, 'Err' : Error });
  const Result14 = IDL.Variant({ 'Ok' : IDL.Principal, 'Err' : Error });
  return IDL.Service({
    '_probe_inline_len' : IDL.Func(
        [IDL.Opt(IDL.Vec(IDL.Nat8))],
        [IDL.Nat64, IDL.Vec(IDL.Nat8)],
        [],
      ),
    'add_admin' : IDL.Func([IDL.Principal], [Result], []),
    'asset_get_by_id' : IDL.Func([IDL.Text, IDL.Text], [Result_1], ['query']),
    'asset_remove' : IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'asset_remove_by_id' : IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'asset_remove_external' : IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'asset_remove_inline' : IDL.Func([IDL.Text, IDL.Nat32], [Result_2], []),
    'asset_remove_internal' : IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'blob_delete' : IDL.Func([IDL.Text], [Result6], []),
    'blob_get_meta' : IDL.Func([IDL.Text], [Result_3], ['query']),
    'blob_read' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'blob_read_chunk' : IDL.Func([IDL.Text, IDL.Nat32], [Result_4], ['query']),
    'calculate_gallery_capsule_size' : IDL.Func(
        [Gallery],
        [IDL.Nat64],
        ['query'],
      ),
    'calculate_gallery_size' : IDL.Func([Gallery], [IDL.Nat64], ['query']),
    'capsules_bind_neon' : IDL.Func(
        [ResourceType, IDL.Text, IDL.Bool],
        [Result],
        [],
      ),
    'capsules_create' : IDL.Func([IDL.Opt(PersonRef)], [Result_5], []),
    'capsules_delete' : IDL.Func([IDL.Text], [Result], []),
    'capsules_list' : IDL.Func([], [IDL.Vec(CapsuleHeader)], ['query']),
    'capsules_read_basic' : IDL.Func(
        [IDL.Opt(IDL.Text)],
        [Result_6],
        ['query'],
      ),
    'capsules_read_full' : IDL.Func([IDL.Opt(IDL.Text)], [Result_5], ['query']),
    'capsules_update' : IDL.Func([IDL.Text, CapsuleUpdateData], [Result_5], []),
    'clear_all_stable_memory' : IDL.Func([], [Result], []),
    'clear_creation_state' : IDL.Func([IDL.Principal], [Result_7], []),
    'clear_migration_state' : IDL.Func([IDL.Principal], [Result_7], []),
    'create_personal_canister' : IDL.Func(
        [],
        [PersonalCanisterCreationResponse],
        [],
      ),
    'debug_blob_read_canary' : IDL.Func(
        [IDL.Text, IDL.Nat32],
        [IDL.Opt(IDL.Nat32)],
        ['query'],
      ),
    'debug_blob_write_canary' : IDL.Func(
        [IDL.Text, IDL.Nat32, IDL.Nat32],
        [],
        [],
      ),
    'debug_finish_hex' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Nat64],
        [Result6],
        [],
      ),
    'debug_put_chunk_b64' : IDL.Func(
        [IDL.Nat64, IDL.Nat32, IDL.Text],
        [Result],
        [],
      ),
    'debug_sha256' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], ['query']),
    'dev_clear_all_memories_in_capsule' : IDL.Func(
        [IDL.Text, IDL.Bool],
        [Result_8],
        [],
      ),
    'folders_create' : IDL.Func([FolderData], [Result_9], []),
    'folders_delete' : IDL.Func([IDL.Text], [Result], []),
    'folders_list' : IDL.Func([], [IDL.Vec(FolderHeader)], ['query']),
    'folders_update' : IDL.Func([IDL.Text, FolderUpdateData], [Result_9], []),
    'galleries_create' : IDL.Func([GalleryData], [Result_10], []),
    'galleries_create_with_memories' : IDL.Func(
        [GalleryData, IDL.Bool],
        [Result_10],
        [],
      ),
    'galleries_delete' : IDL.Func([IDL.Text], [Result], []),
    'galleries_list' : IDL.Func([], [IDL.Vec(FolderHeader)], ['query']),
    'galleries_read' : IDL.Func([IDL.Text], [Result_10], ['query']),
    'galleries_update' : IDL.Func(
        [IDL.Text, GalleryUpdateData],
        [Result_10],
        [],
      ),
    'get_canister_size_stats' : IDL.Func([], [CanisterSizeStats], ['query']),
    'get_creation_states_by_status' : IDL.Func(
        [CreationStatus],
        [Result_11],
        ['query'],
      ),
    'get_creation_status' : IDL.Func(
        [],
        [IDL.Opt(CreationStatusResponse)],
        ['query'],
      ),
    'get_detailed_creation_status' : IDL.Func(
        [],
        [IDL.Opt(DetailedCreationStatus)],
        ['query'],
      ),
    'get_detailed_migration_status' : IDL.Func(
        [],
        [IDL.Opt(DetailedCreationStatus)],
        ['query'],
      ),
    'get_gallery_size_breakdown' : IDL.Func(
        [Gallery],
        [GallerySizeInfo],
        ['query'],
      ),
    'get_gallery_size_info' : IDL.Func([Gallery], [IDL.Text], ['query']),
    'get_migration_states_by_status' : IDL.Func(
        [CreationStatus],
        [Result_11],
        ['query'],
      ),
    'get_migration_stats' : IDL.Func([], [Result_12], ['query']),
    'get_migration_status' : IDL.Func(
        [],
        [IDL.Opt(CreationStatusResponse)],
        ['query'],
      ),
    'get_my_personal_canister_id' : IDL.Func(
        [],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'get_personal_canister_creation_stats' : IDL.Func(
        [],
        [Result_12],
        ['query'],
      ),
    'get_personal_canister_id' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'get_user_creation_status' : IDL.Func(
        [IDL.Principal],
        [Result_13],
        ['query'],
      ),
    'get_user_migration_status' : IDL.Func(
        [IDL.Principal],
        [Result_13],
        ['query'],
      ),
    'get_user_settings' : IDL.Func([], [Result_14], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'http_request' : IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'is_migration_enabled' : IDL.Func([], [Result_7], ['query']),
    'is_personal_canister_creation_enabled' : IDL.Func(
        [],
        [Result_7],
        ['query'],
      ),
    'list_admins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'list_all_creation_states' : IDL.Func([], [Result_11], ['query']),
    'list_all_migration_states' : IDL.Func([], [Result_11], ['query']),
    'list_superadmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'memories_add_asset' : IDL.Func(
        [IDL.Text, InternalBlobAssetInput, IDL.Text],
        [Result6],
        [],
      ),
    'memories_add_inline_asset' : IDL.Func(
        [IDL.Text, InlineAssetInput, IDL.Text],
        [Result6],
        [],
      ),
    'memories_cleanup_assets_all' : IDL.Func([IDL.Text], [Result_15], []),
    'memories_cleanup_assets_bulk' : IDL.Func(
        [IDL.Vec(IDL.Text)],
        [Result_16],
        [],
      ),
    'memories_create' : IDL.Func(
        [
          IDL.Text,
          IDL.Opt(IDL.Vec(IDL.Nat8)),
          IDL.Opt(BlobRef),
          IDL.Opt(BlobHosting),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Vec(IDL.Nat8)),
          AssetMetadata,
          IDL.Text,
        ],
        [Result6],
        [],
      ),
    'memories_create_with_internal_blobs' : IDL.Func(
        [IDL.Text, MemoryMetadata, IDL.Vec(InternalBlobAssetInput), IDL.Text],
        [Result6],
        [],
      ),
    'memories_delete' : IDL.Func([IDL.Text, IDL.Bool], [Result], []),
    'memories_delete_all' : IDL.Func([IDL.Text, IDL.Bool], [Result_8], []),
    'memories_delete_bulk' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Text), IDL.Bool],
        [Result_8],
        [],
      ),
    'memories_list' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat32)],
        [Result_17],
        ['query'],
      ),
    'memories_list_assets' : IDL.Func([IDL.Text], [Result_18], ['query']),
    'memories_list_by_capsule' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat32)],
        [Result_17],
        ['query'],
      ),
    'memories_ping' : IDL.Func([IDL.Vec(IDL.Text)], [Result_19], ['query']),
    'memories_read' : IDL.Func([IDL.Text], [Result_20], ['query']),
    'memories_read_asset' : IDL.Func(
        [IDL.Text, IDL.Nat32],
        [Result_1],
        ['query'],
      ),
    'memories_update' : IDL.Func([IDL.Text, MemoryUpdateData], [Result_20], []),
    'migrate_capsule' : IDL.Func([], [PersonalCanisterCreationResponse], []),
    'mint_http_token' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Text), IDL.Opt(IDL.Vec(IDL.Text)), IDL.Nat32],
        [IDL.Text],
        ['query'],
      ),
    'mint_http_tokens_bulk' : IDL.Func(
        [
          IDL.Vec(IDL.Text),
          IDL.Vec(IDL.Text),
          IDL.Opt(IDL.Vec(IDL.Text)),
          IDL.Nat32,
        ],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        ['query'],
      ),
    'register_with_nonce' : IDL.Func([IDL.Text], [Result], []),
    'remove_admin' : IDL.Func([IDL.Principal], [Result], []),
    'sessions_cleanup_expired' : IDL.Func([], [Result6], []),
    'sessions_clear_all' : IDL.Func([], [Result6], []),
    'sessions_list' : IDL.Func([], [Result6], ['query']),
    'sessions_stats' : IDL.Func([], [Result6], ['query']),
    'set_migration_enabled' : IDL.Func([IDL.Bool], [Result], []),
    'set_personal_canister_creation_enabled' : IDL.Func(
        [IDL.Bool],
        [Result],
        [],
      ),
    'update_gallery_storage_location' : IDL.Func(
        [IDL.Text, IDL.Vec(BlobHosting)],
        [Result],
        [],
      ),
    'update_user_settings' : IDL.Func(
        [UserSettingsUpdateData],
        [Result_14],
        [],
      ),
    'upload_config' : IDL.Func([], [UploadConfig], ['query']),
    'uploads_abort' : IDL.Func([IDL.Nat64], [Result], []),
    'uploads_begin' : IDL.Func([IDL.Text, IDL.Nat32, IDL.Text], [Result13], []),
    'uploads_finish' : IDL.Func(
        [IDL.Nat64, IDL.Vec(IDL.Nat8), IDL.Nat64],
        [Result15],
        [],
      ),
    'uploads_put_chunk' : IDL.Func(
        [IDL.Nat64, IDL.Nat32, IDL.Vec(IDL.Nat8)],
        [Result],
        [],
      ),
    'verify_nonce' : IDL.Func([IDL.Text], [Result14], ['query']),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
