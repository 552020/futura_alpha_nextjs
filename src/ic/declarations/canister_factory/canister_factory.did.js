export const idlFactory = ({ IDL }) => {
  const InitArg = IDL.Record({
    min_factory_cycles: IDL.Opt(IDL.Nat),
    admins: IDL.Opt(IDL.Vec(IDL.Principal)),
    max_canisters_per_caller: IDL.Opt(IDL.Nat32),
    allowlist: IDL.Opt(IDL.Vec(IDL.Principal)),
    upload_ttl_seconds: IDL.Opt(IDL.Nat64),
    max_upload_size: IDL.Opt(IDL.Nat64),
  });
  const Result = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
  const Result_4 = IDL.Variant({ Ok: IDL.Nat32, Err: IDL.Text });
  const UploadCommit = IDL.Record({ expected_sha256_hex: IDL.Text });
  const Result_2 = IDL.Variant({ Ok: IDL.Text, Err: IDL.Text });
  const Mode = IDL.Variant({
    Upgrade: IDL.Null,
    Install: IDL.Null,
    Reinstall: IDL.Null,
  });
  const CreateInstallRequest = IDL.Record({
    extra_controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
    handoff: IDL.Bool,
    mode: Mode,
    init_arg: IDL.Vec(IDL.Nat8),
    upload_id: IDL.Nat64,
    cycles: IDL.Nat,
  });
  const CreateInstallResponse = IDL.Record({
    canister_id: IDL.Principal,
    module_hash_hex: IDL.Text,
    cycles_used: IDL.Nat,
  });
  const Result_3 = IDL.Variant({
    Ok: CreateInstallResponse,
    Err: IDL.Text,
  });
  const Result_1 = IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text });
  const Config = IDL.Record({
    next_upload_id: IDL.Nat64,
    emergency_stop: IDL.Bool,
    min_factory_cycles: IDL.Nat,
    upload_ttl_ns: IDL.Nat64,
    admins: IDL.Vec(IDL.Principal),
    max_canisters_per_caller: IDL.Nat32,
    allowlist: IDL.Opt(IDL.Vec(IDL.Principal)),
    max_upload_size: IDL.Nat64,
  });
  const FactoryStats = IDL.Record({
    unique_callers: IDL.Nat64,
    total_canisters_created: IDL.Nat64,
    factory_cycles_balance: IDL.Nat,
    active_uploads: IDL.Nat64,
    total_uploads: IDL.Nat64,
  });
  const UploadInfo = IDL.Record({
    committed_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time_ns: IDL.Nat64,
    owner: IDL.Principal,
    total_len: IDL.Nat64,
    chunks: IDL.Vec(IDL.Vec(IDL.Nat8)),
  });
  const Result_5 = IDL.Variant({ Ok: UploadInfo, Err: IDL.Text });
  const CallerStats = IDL.Record({
    created_count: IDL.Nat32,
    last_created_at: IDL.Opt(IDL.Nat64),
  });
  return IDL.Service({
    __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
    add_admin: IDL.Func([IDL.Principal], [Result], []),
    cleanup_expired_uploads_manual: IDL.Func([], [Result_4], []),
    clear_upload: IDL.Func([IDL.Nat64], [Result], []),
    commit_upload: IDL.Func([IDL.Nat64, UploadCommit], [Result_2], []),
    create_and_install_with: IDL.Func([CreateInstallRequest], [Result_3], []),
    create_upload: IDL.Func([], [Result_1], []),
    get_config: IDL.Func([], [Config], ['query']),
    get_factory_stats: IDL.Func([], [FactoryStats], ['query']),
    get_upload_info: IDL.Func([IDL.Nat64], [Result_5], ['query']),
    health_check: IDL.Func([], [IDL.Text], ['query']),
    my_stats: IDL.Func([], [CallerStats], ['query']),
    put_chunk: IDL.Func([IDL.Nat64, IDL.Vec(IDL.Nat8)], [Result_1], []),
    remove_admin: IDL.Func([IDL.Principal], [Result], []),
    set_allowlist: IDL.Func([IDL.Opt(IDL.Vec(IDL.Principal))], [Result], []),
    set_emergency_stop: IDL.Func([IDL.Bool], [Result], []),
    version: IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => {
  const InitArg = IDL.Record({
    min_factory_cycles: IDL.Opt(IDL.Nat),
    admins: IDL.Opt(IDL.Vec(IDL.Principal)),
    max_canisters_per_caller: IDL.Opt(IDL.Nat32),
    allowlist: IDL.Opt(IDL.Vec(IDL.Principal)),
    upload_ttl_seconds: IDL.Opt(IDL.Nat64),
    max_upload_size: IDL.Opt(IDL.Nat64),
  });
  return [IDL.Opt(InitArg)];
};
