export const idlFactory = ({ IDL }) => {
  const MemoryAccess = IDL.Rec();
  const Error = IDL.Variant({
    'Internal' : IDL.Text,
    'NotFound' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'InvalidArgument' : IDL.Text,
    'ResourceExhausted' : IDL.Null,
    'Conflict' : IDL.Text,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : Error });
  const GalleryStorageLocation = IDL.Variant({
    'Web2Only' : IDL.Null,
    'Failed' : IDL.Null,
    'Both' : IDL.Null,
    'Migrating' : IDL.Null,
    'ICPOnly' : IDL.Null,
  });
  const GalleryMemoryEntry = IDL.Record({
    'memory_id' : IDL.Text,
    'is_featured' : IDL.Bool,
    'position' : IDL.Nat32,
    'gallery_metadata' : IDL.Text,
    'gallery_caption' : IDL.Opt(IDL.Text),
  });
  const Gallery = IDL.Record({
    'id' : IDL.Text,
    'is_public' : IDL.Bool,
    'title' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'storage_location' : GalleryStorageLocation,
    'memory_entries' : IDL.Vec(GalleryMemoryEntry),
    'description' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'bound_to_neon' : IDL.Bool,
    'owner_principal' : IDL.Principal,
  });
  const ResourceType = IDL.Variant({
    'Memory' : IDL.Null,
    'Capsule' : IDL.Null,
    'Gallery' : IDL.Null,
  });
  const PersonRef = IDL.Variant({
    'Opaque' : IDL.Text,
    'Principal' : IDL.Principal,
  });
  const ControllerState = IDL.Record({
    'granted_at' : IDL.Nat64,
    'granted_by' : PersonRef,
  });
  const OwnerState = IDL.Record({
    'last_activity_at' : IDL.Nat64,
    'since' : IDL.Nat64,
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
  MemoryAccess.fill(
    IDL.Variant({
      'Private' : IDL.Null,
      'Custom' : IDL.Record({
        'groups' : IDL.Vec(IDL.Text),
        'individuals' : IDL.Vec(PersonRef),
      }),
      'EventTriggered' : IDL.Record({
        'access' : MemoryAccess,
        'trigger_event' : AccessEvent,
      }),
      'Public' : IDL.Null,
      'Scheduled' : IDL.Record({
        'access' : MemoryAccess,
        'accessible_after' : IDL.Nat64,
      }),
    })
  );
  const MemoryMetadataBase = IDL.Record({
    'date_of_memory' : IDL.Opt(IDL.Text),
    'size' : IDL.Nat64,
    'people_in_memory' : IDL.Opt(IDL.Vec(IDL.Text)),
    'mime_type' : IDL.Text,
    'bound_to_neon' : IDL.Bool,
    'original_name' : IDL.Text,
    'uploaded_at' : IDL.Text,
    'format' : IDL.Opt(IDL.Text),
  });
  const NoteMetadata = IDL.Record({
    'base' : MemoryMetadataBase,
    'tags' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const ImageMetadata = IDL.Record({
    'base' : MemoryMetadataBase,
    'dimensions' : IDL.Opt(IDL.Tuple(IDL.Nat32, IDL.Nat32)),
  });
  const DocumentMetadata = IDL.Record({ 'base' : MemoryMetadataBase });
  const AudioMetadata = IDL.Record({
    'duration' : IDL.Opt(IDL.Nat32),
    'base' : MemoryMetadataBase,
    'channels' : IDL.Opt(IDL.Nat8),
    'sample_rate' : IDL.Opt(IDL.Nat32),
    'bitrate' : IDL.Opt(IDL.Nat32),
    'format' : IDL.Opt(IDL.Text),
  });
  const VideoMetadata = IDL.Record({
    'height' : IDL.Opt(IDL.Nat32),
    'duration' : IDL.Opt(IDL.Nat32),
    'thumbnail' : IDL.Opt(IDL.Text),
    'base' : MemoryMetadataBase,
    'width' : IDL.Opt(IDL.Nat32),
  });
  const MemoryMetadata = IDL.Variant({
    'Note' : NoteMetadata,
    'Image' : ImageMetadata,
    'Document' : DocumentMetadata,
    'Audio' : AudioMetadata,
    'Video' : VideoMetadata,
  });
  const MemoryBlobKind = IDL.Variant({
    'MemoryBlobKindExternal' : IDL.Null,
    'ICPCapsule' : IDL.Null,
  });
  const BlobRef = IDL.Record({
    'len' : IDL.Nat64,
    'locator' : IDL.Text,
    'hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'kind' : MemoryBlobKind,
  });
  const MemoryMeta = IDL.Record({
    'name' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
  });
  const MemoryData = IDL.Variant({
    'BlobRef' : IDL.Record({ 'blob' : BlobRef, 'meta' : MemoryMeta }),
    'Inline' : IDL.Record({ 'meta' : MemoryMeta, 'bytes' : IDL.Vec(IDL.Nat8) }),
  });
  const MemoryType = IDL.Variant({
    'Note' : IDL.Null,
    'Image' : IDL.Null,
    'Document' : IDL.Null,
    'Audio' : IDL.Null,
    'Video' : IDL.Null,
  });
  const MemoryInfo = IDL.Record({
    'updated_at' : IDL.Nat64,
    'date_of_memory' : IDL.Opt(IDL.Nat64),
    'memory_type' : MemoryType,
    'name' : IDL.Text,
    'content_type' : IDL.Text,
    'created_at' : IDL.Nat64,
    'uploaded_at' : IDL.Nat64,
  });
  const Memory = IDL.Record({
    'id' : IDL.Text,
    'access' : MemoryAccess,
    'metadata' : MemoryMetadata,
    'data' : MemoryData,
    'info' : MemoryInfo,
    'idempotency_key' : IDL.Opt(IDL.Text),
  });
  const Capsule = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'controllers' : IDL.Vec(IDL.Tuple(PersonRef, ControllerState)),
    'subject' : PersonRef,
    'owners' : IDL.Vec(IDL.Tuple(PersonRef, OwnerState)),
    'inline_bytes_used' : IDL.Nat64,
    'created_at' : IDL.Nat64,
    'connection_groups' : IDL.Vec(IDL.Tuple(IDL.Text, ConnectionGroup)),
    'connections' : IDL.Vec(IDL.Tuple(PersonRef, Connection)),
    'memories' : IDL.Vec(IDL.Tuple(IDL.Text, Memory)),
    'bound_to_neon' : IDL.Bool,
    'galleries' : IDL.Vec(IDL.Tuple(IDL.Text, Gallery)),
  });
  const Result_1 = IDL.Variant({ 'Ok' : Capsule, 'Err' : Error });
  const CapsuleHeader = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'subject' : PersonRef,
    'owner_count' : IDL.Nat32,
    'created_at' : IDL.Nat64,
    'controller_count' : IDL.Nat32,
    'memory_count' : IDL.Nat32,
  });
  const CapsuleInfo = IDL.Record({
    'updated_at' : IDL.Nat64,
    'gallery_count' : IDL.Nat32,
    'subject' : PersonRef,
    'capsule_id' : IDL.Text,
    'is_owner' : IDL.Bool,
    'created_at' : IDL.Nat64,
    'bound_to_neon' : IDL.Bool,
    'memory_count' : IDL.Nat32,
    'connection_count' : IDL.Nat32,
    'is_self_capsule' : IDL.Bool,
    'is_controller' : IDL.Bool,
  });
  const Result_2 = IDL.Variant({ 'Ok' : CapsuleInfo, 'Err' : Error });
  const CapsuleUpdateData = IDL.Record({ 'bound_to_neon' : IDL.Opt(IDL.Bool) });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Bool, 'Err' : Error });
  const PersonalCanisterCreationResponse = IDL.Record({
    'canister_id' : IDL.Opt(IDL.Principal),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : Error });
  const GalleryData = IDL.Record({
    'owner_principal' : IDL.Principal,
    'gallery' : Gallery,
  });
  const Result_5 = IDL.Variant({ 'Ok' : Gallery, 'Err' : Error });
  const GalleryHeader = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'storage_location' : GalleryStorageLocation,
    'name' : IDL.Text,
    'created_at' : IDL.Nat64,
    'memory_count' : IDL.Nat32,
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
  const Result_6 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(IDL.Principal, DetailedCreationStatus)),
    'Err' : Error,
  });
  const CreationStatusResponse = IDL.Record({
    'status' : CreationStatus,
    'canister_id' : IDL.Opt(IDL.Principal),
    'message' : IDL.Opt(IDL.Text),
  });
  const GallerySizeInfo = IDL.Record({
    'is_over_limit' : IDL.Bool,
    'gallery_id' : IDL.Text,
    'memory_entries_count' : IDL.Nat32,
    'total_size' : IDL.Nat64,
    'estimated_memory_entries_size' : IDL.Nat64,
    'over_limit_by' : IDL.Nat64,
  });
  const PersonalCanisterCreationStats = IDL.Record({
    'total_successes' : IDL.Nat64,
    'total_failures' : IDL.Nat64,
    'total_attempts' : IDL.Nat64,
    'total_cycles_consumed' : IDL.Nat,
  });
  const Result_7 = IDL.Variant({
    'Ok' : PersonalCanisterCreationStats,
    'Err' : Error,
  });
  const Result_8 = IDL.Variant({
    'Ok' : IDL.Opt(DetailedCreationStatus),
    'Err' : Error,
  });
  const MemoryOperationResponse = IDL.Record({
    'memory_id' : IDL.Opt(IDL.Text),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const MemoryHeader = IDL.Record({
    'id' : IDL.Text,
    'access' : MemoryAccess,
    'updated_at' : IDL.Nat64,
    'memory_type' : MemoryType,
    'name' : IDL.Text,
    'size' : IDL.Nat64,
    'created_at' : IDL.Nat64,
  });
  const MemoryListResponse = IDL.Record({
    'memories' : IDL.Vec(MemoryHeader),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const MemoryPresenceResult = IDL.Record({
    'metadata_present' : IDL.Bool,
    'memory_id' : IDL.Text,
    'asset_present' : IDL.Bool,
  });
  const Result_9 = IDL.Variant({
    'Ok' : IDL.Vec(MemoryPresenceResult),
    'Err' : Error,
  });
  const Result_10 = IDL.Variant({ 'Ok' : Memory, 'Err' : Error });
  const MemoryUpdateData = IDL.Record({
    'access' : IDL.Opt(MemoryAccess),
    'metadata' : IDL.Opt(MemoryMetadata),
    'name' : IDL.Opt(IDL.Text),
  });
  const UploadConfig = IDL.Record({
    'inline_max' : IDL.Nat32,
    'chunk_size' : IDL.Nat32,
    'inline_budget_per_capsule' : IDL.Nat32,
  });
  const Result_11 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : Error });
  const Result_12 = IDL.Variant({ 'Ok' : IDL.Principal, 'Err' : Error });
  return IDL.Service({
    'add_admin' : IDL.Func([IDL.Principal], [Result], []),
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
    'capsules_create' : IDL.Func([IDL.Opt(PersonRef)], [Result_1], []),
    'capsules_delete' : IDL.Func([IDL.Text], [Result], []),
    'capsules_list' : IDL.Func([], [IDL.Vec(CapsuleHeader)], ['query']),
    'capsules_read_basic' : IDL.Func(
        [IDL.Opt(IDL.Text)],
        [Result_2],
        ['query'],
      ),
    'capsules_read_full' : IDL.Func([IDL.Opt(IDL.Text)], [Result_1], ['query']),
    'capsules_update' : IDL.Func([IDL.Text, CapsuleUpdateData], [Result_1], []),
    'clear_all_stable_memory' : IDL.Func([], [Result], []),
    'clear_creation_state' : IDL.Func([IDL.Principal], [Result_3], []),
    'clear_migration_state' : IDL.Func([IDL.Principal], [Result_3], []),
    'create_personal_canister' : IDL.Func(
        [],
        [PersonalCanisterCreationResponse],
        [],
      ),
    'debug_finish_hex' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Nat64],
        [Result_4],
        [],
      ),
    'debug_put_chunk_b64' : IDL.Func(
        [IDL.Nat64, IDL.Nat32, IDL.Text],
        [Result],
        [],
      ),
    'debug_sha256' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], ['query']),
    'galleries_create' : IDL.Func([GalleryData], [Result_5], []),
    'galleries_create_with_memories' : IDL.Func(
        [GalleryData, IDL.Bool],
        [Result_5],
        [],
      ),
    'galleries_delete' : IDL.Func([IDL.Text], [Result], []),
    'galleries_list' : IDL.Func([], [IDL.Vec(GalleryHeader)], ['query']),
    'galleries_read' : IDL.Func([IDL.Text], [Result_5], ['query']),
    'galleries_update' : IDL.Func(
        [IDL.Text, GalleryUpdateData],
        [Result_5],
        [],
      ),
    'get_canister_size_stats' : IDL.Func([], [CanisterSizeStats], ['query']),
    'get_creation_states_by_status' : IDL.Func(
        [CreationStatus],
        [Result_6],
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
        [Result_6],
        ['query'],
      ),
    'get_migration_stats' : IDL.Func([], [Result_7], ['query']),
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
        [Result_7],
        ['query'],
      ),
    'get_personal_canister_id' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'get_user_creation_status' : IDL.Func(
        [IDL.Principal],
        [Result_8],
        ['query'],
      ),
    'get_user_migration_status' : IDL.Func(
        [IDL.Principal],
        [Result_8],
        ['query'],
      ),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'is_migration_enabled' : IDL.Func([], [Result_3], ['query']),
    'is_personal_canister_creation_enabled' : IDL.Func(
        [],
        [Result_3],
        ['query'],
      ),
    'list_admins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'list_all_creation_states' : IDL.Func([], [Result_6], ['query']),
    'list_all_migration_states' : IDL.Func([], [Result_6], ['query']),
    'list_superadmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'memories_create' : IDL.Func(
        [IDL.Text, MemoryData, IDL.Text],
        [Result_4],
        [],
      ),
    'memories_delete' : IDL.Func([IDL.Text], [MemoryOperationResponse], []),
    'memories_list' : IDL.Func([IDL.Text], [MemoryListResponse], ['query']),
    'memories_ping' : IDL.Func([IDL.Vec(IDL.Text)], [Result_9], ['query']),
    'memories_read' : IDL.Func([IDL.Text], [Result_10], ['query']),
    'memories_update' : IDL.Func(
        [IDL.Text, MemoryUpdateData],
        [MemoryOperationResponse],
        [],
      ),
    'migrate_capsule' : IDL.Func([], [PersonalCanisterCreationResponse], []),
    'register_with_nonce' : IDL.Func([IDL.Text], [Result], []),
    'remove_admin' : IDL.Func([IDL.Principal], [Result], []),
    'set_migration_enabled' : IDL.Func([IDL.Bool], [Result], []),
    'set_personal_canister_creation_enabled' : IDL.Func(
        [IDL.Bool],
        [Result],
        [],
      ),
    'update_gallery_storage_location' : IDL.Func(
        [IDL.Text, GalleryStorageLocation],
        [Result],
        [],
      ),
    'upload_config' : IDL.Func([], [UploadConfig], ['query']),
    'uploads_abort' : IDL.Func([IDL.Nat64], [Result], []),
    'uploads_begin' : IDL.Func(
        [IDL.Text, MemoryMeta, IDL.Nat32, IDL.Text],
        [Result_11],
        [],
      ),
    'uploads_finish' : IDL.Func(
        [IDL.Nat64, IDL.Vec(IDL.Nat8), IDL.Nat64],
        [Result_4],
        [],
      ),
    'uploads_put_chunk' : IDL.Func(
        [IDL.Nat64, IDL.Nat32, IDL.Vec(IDL.Nat8)],
        [Result],
        [],
      ),
    'verify_nonce' : IDL.Func([IDL.Text], [Result_12], ['query']),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
