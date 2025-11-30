import { defineConfig } from "@junobuild/config";

export default defineConfig({
  satellite: {
    ids: {
      staging: "5yoof-ciaaa-aaaal-asevq-cai",
      production: "uocd6-laaaa-aaaal-asfga-cai",
    },
    source: "out",
    predeploy: ["pnpm run build"],
    collections: {
      datastore: [
        {
          collection: "ENV_VARS",
          memory: "stable",
          read: "controllers",
          write: "controllers", 
        },
      ],
    },
  },
  orbiter: {
    ids: {
      production: "cybmd-iiaaa-aaaal-asskq-cai",
    },
  },
});
