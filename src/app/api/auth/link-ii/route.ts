import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { accounts } from "@/db/schema";
import { createServerSideActor } from "@/lib/server-actor";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const nonce = typeof body?.nonce === "string" ? (body.nonce as string) : undefined;

    if (!nonce || nonce.length < 10) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 400 });
    }

    // Verify nonce with canister to obtain principal
    const actor = await createServerSideActor();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nonceResult = (await actor.verify_nonce(nonce)) as { Ok: any } | { Err: any };
    if ("Err" in nonceResult) {
      return NextResponse.json(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: `Nonce verification failed: ${JSON.stringify((nonceResult as { Err: any }).Err)}`,
        },
        { status: 400 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const principal = (nonceResult as { Ok: any }).Ok.toString();

    // Check if this Principal is already linked to another user
    const existingAccount = await db.query.accounts.findFirst({
      where: (a, { and, eq }) => and(eq(a.provider, "internet-identity"), eq(a.providerAccountId, principal)),
    });

    if (existingAccount && existingAccount.userId !== session.user.id) {
      return NextResponse.json(
        {
          error: "Principal already linked",
          message:
            "This Internet Identity is already linked to another account. Each II Principal can only be linked to one account for security reasons.",
          code: "PRINCIPAL_CONFLICT",
        },
        { status: 409 }
      );
    }

    // Upsert account link: (provider, providerAccountId) unique
    await db
      .insert(accounts)
      .values({
        userId: session.user.id,
        provider: "internet-identity",
        providerAccountId: principal,
        type: "oidc",
      })
      .onConflictDoUpdate({
        target: [accounts.provider, accounts.providerAccountId],
        set: { userId: session.user.id },
      });

    return NextResponse.json({ success: true, principal });
  } catch (error) {
    console.error("/api/auth/link-ii error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
