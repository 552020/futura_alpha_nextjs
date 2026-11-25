export const idlFactory = ({ IDL }) => {
  const InitArg = IDL.Record({
    'min_factory_cycles' : IDL.Opt(IDL.Nat),
    'admins' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'allowlist' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'upload_ttl_seconds' : IDL.Opt(IDL.Nat64),
    'max_upload_size' : IDL.Opt(IDL.Nat64),
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : IDL.Text });
  const UploadCommit = IDL.Record({ 'expected_sha256_hex' : IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const PersonalStatus = IDL.Variant({
    'Ready' : IDL.Null,
    'Created' : IDL.Null,
    'Installed' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const TopUpRecord = IDL.Record({
    'last_error' : IDL.Opt(IDL.Text),
    'month' : IDL.Opt(IDL.Nat32),
    'last_top_up_at' : IDL.Opt(IDL.Nat64),
    'last_checked_at' : IDL.Opt(IDL.Nat64),
    'month_total' : IDL.Opt(IDL.Nat),
    'monthly_cap' : IDL.Opt(IDL.Nat),
    'last_top_up_cycles' : IDL.Opt(IDL.Nat),
    'last_balance' : IDL.Opt(IDL.Nat),
  });
  const PersonalCanister = IDL.Record({
    'last_error' : IDL.Opt(IDL.Text),
    'status' : PersonalStatus,
    'updated_at' : IDL.Nat64,
    'owner' : IDL.Principal,
    'busy' : IDL.Bool,
    'canister_id' : IDL.Opt(IDL.Principal),
    'created_at' : IDL.Nat64,
    'version' : IDL.Opt(IDL.Text),
    'top_up' : IDL.Opt(TopUpRecord),
    'module_sha256_hex' : IDL.Opt(IDL.Text),
  });
  const Result_3 = IDL.Variant({ 'Ok' : PersonalCanister, 'Err' : IDL.Text });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text });
  const Config = IDL.Record({
    'next_upload_id' : IDL.Nat64,
    'emergency_stop' : IDL.Bool,
    'min_factory_cycles' : IDL.Nat,
    'upload_ttl_ns' : IDL.Nat64,
    'admins' : IDL.Vec(IDL.Principal),
    'allowlist' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'max_upload_size' : IDL.Nat64,
  });
  const FactoryStats = IDL.Record({
    'total_canisters_created' : IDL.Nat64,
    'factory_cycles_balance' : IDL.Nat,
    'active_uploads' : IDL.Nat64,
    'total_uploads' : IDL.Nat64,
  });
  const UploadInfo = IDL.Record({
    'committed_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time_ns' : IDL.Nat64,
    'owner' : IDL.Principal,
    'total_len' : IDL.Nat64,
    'chunks' : IDL.Vec(IDL.Vec(IDL.Nat8)),
  });
  const Result_5 = IDL.Variant({ 'Ok' : UploadInfo, 'Err' : IDL.Text });
  const Result_6 = IDL.Variant({
    'Ok' : IDL.Vec(PersonalCanister),
    'Err' : IDL.Text,
  });
  const Result_7 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat32)),
    'Err' : IDL.Text,
  });
  const ReleaseInfo = IDL.Record({
    'size' : IDL.Nat64,
    'sha256_hex' : IDL.Text,
    'version' : IDL.Text,
    'released_at' : IDL.Nat64,
  });
  const Result_8 = IDL.Variant({ 'Ok' : ReleaseInfo, 'Err' : IDL.Text });
  const Result_9 = IDL.Variant({ 'Ok' : IDL.Vec(IDL.Nat8), 'Err' : IDL.Text });
  const TopUpReport = IDL.Record({
    'balance' : IDL.Opt(IDL.Nat),
    'owner' : IDL.Principal,
    'note' : IDL.Text,
    'sent' : IDL.Nat,
    'canister_id' : IDL.Opt(IDL.Principal),
  });
  const Result_10 = IDL.Variant({ 'Ok' : TopUpReport, 'Err' : IDL.Text });
  const Result_11 = IDL.Variant({
    'Ok' : IDL.Vec(TopUpReport),
    'Err' : IDL.Text,
  });
  const TopUpConfig = IDL.Record({
    'floor' : IDL.Nat,
    'enabled' : IDL.Bool,
    'target' : IDL.Nat,
    'monthly_cap' : IDL.Nat,
  });
  return IDL.Service({
    '__get_candid_interface_tmp_hack' : IDL.Func([], [IDL.Text], ['query']),
    'add_admin' : IDL.Func([IDL.Principal], [Result], []),
    'cleanup_expired_uploads_manual' : IDL.Func([], [Result_1], []),
    'clear_upload' : IDL.Func([IDL.Nat64], [Result], []),
    'commit_upload' : IDL.Func([IDL.Nat64, UploadCommit], [Result_2], []),
    'create_personal_canister' : IDL.Func([], [Result_3], []),
    'create_upload' : IDL.Func([], [Result_4], []),
    'get_config' : IDL.Func([], [Config], ['query']),
    'get_factory_stats' : IDL.Func([], [FactoryStats], ['query']),
    'get_upload_info' : IDL.Func([IDL.Nat64], [Result_5], ['query']),
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
    'my_personal_canister' : IDL.Func(
        [],
        [IDL.Opt(PersonalCanister)],
        ['query'],
      ),
    'my_personal_credits' : IDL.Func([], [IDL.Nat32], ['query']),
    'personal_canisters_list' : IDL.Func([], [Result_6], ['query']),
    'personal_credit_set' : IDL.Func([IDL.Principal, IDL.Nat32], [Result], []),
    'personal_credits_list' : IDL.Func([], [Result_7], ['query']),
    'personal_open' : IDL.Func([], [IDL.Bool], ['query']),
    'personal_open_set' : IDL.Func([IDL.Bool], [Result], []),
    'put_chunk' : IDL.Func([IDL.Nat64, IDL.Vec(IDL.Nat8)], [Result_4], []),
    'release_info' : IDL.Func([], [IDL.Opt(ReleaseInfo)], ['query']),
    'release_set' : IDL.Func([IDL.Nat64, IDL.Text], [Result_8], []),
    'release_wasm' : IDL.Func([], [Result_9], ['query']),
    'remove_admin' : IDL.Func([IDL.Principal], [Result], []),
    'set_allowlist' : IDL.Func([IDL.Opt(IDL.Vec(IDL.Principal))], [Result], []),
    'set_emergency_stop' : IDL.Func([IDL.Bool], [Result], []),
    'set_personal_canister_cycles' : IDL.Func([IDL.Nat], [Result], []),
    'top_up_cap_set' : IDL.Func(
        [IDL.Principal, IDL.Opt(IDL.Nat)],
        [Result],
        [],
      ),
    'top_up_check' : IDL.Func([IDL.Principal], [Result_10], []),
    'top_up_check_all' : IDL.Func([], [Result_11], []),
    'top_up_config' : IDL.Func([], [TopUpConfig], ['query']),
    'top_up_config_set' : IDL.Func([TopUpConfig], [Result], []),
    'top_up_last_run' : IDL.Func([], [IDL.Opt(IDL.Nat64)], ['query']),
    'version' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => {
  const InitArg = IDL.Record({
    'min_factory_cycles' : IDL.Opt(IDL.Nat),
    'admins' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'allowlist' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'upload_ttl_seconds' : IDL.Opt(IDL.Nat64),
    'max_upload_size' : IDL.Opt(IDL.Nat64),
  });
  return [IDL.Opt(InitArg)];
};
