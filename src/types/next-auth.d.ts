import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      businessUserId?: string;
      icpPrincipal?: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    businessUserId?: string;
    icpPrincipal?: string;
  }
}
