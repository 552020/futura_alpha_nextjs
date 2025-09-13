import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { memoryShares, allUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { findMemory } from "@/app/api/memories/utils/memory";
import { MemoryViewer } from "@/components/memory/memory-viewer";
import { Card } from "@/components/ui/card";
import { auth } from "@/auth";

interface SharedMemoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SharedMemoryPage({ params }: SharedMemoryPageProps) {
  const { id } = await params;
  const session = await auth();

  console.log("🔍 DEBUG SharedMemoryPage - Auth Check:", {
    id,
    hasSession: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString(),
  });

  if (!session?.user?.id) {
    console.log("❌ DEBUG SharedMemoryPage - No authenticated user");
    notFound();
  }

  try {
    // Get the allUserId for the authenticated user
    const allUserRecord = await db.query.allUsers.findFirst({
      where: eq(allUsers.userId, session.user.id),
    });

    console.log("🔍 DEBUG SharedMemoryPage - AllUser Lookup:", {
      found: !!allUserRecord,
      userId: session.user.id,
      allUserId: allUserRecord?.id,
      timestamp: new Date().toISOString(),
    });

    if (!allUserRecord) {
      console.log("❌ DEBUG SharedMemoryPage - No allUser record found");
      notFound();
    }

    // First try to find the memory
    const memory = await findMemory(id);
    console.log("🔍 DEBUG SharedMemoryPage - Memory Lookup:", {
      memoryFound: !!memory,
      memoryId: id,
      ownerId: memory?.data?.ownerId,
      timestamp: new Date().toISOString(),
    });

    if (!memory) {
      console.log("❌ DEBUG SharedMemoryPage - Memory not found");
      notFound();
    }

    const isOwner = memory.data.ownerId === allUserRecord.id;
    console.log("🔍 DEBUG SharedMemoryPage - Ownership Check:", {
      isOwner,
      memoryOwnerId: memory.data.ownerId,
      currentUserAllId: allUserRecord.id,
      timestamp: new Date().toISOString(),
    });

    // Check if the user has access to this memory
    const share = await db.query.memoryShares.findFirst({
      where: and(eq(memoryShares.memoryId, id), eq(memoryShares.sharedWithId, allUserRecord.id)),
    });

    console.log("🔍 DEBUG SharedMemoryPage - Share Check:", {
      hasShare: !!share,
      shareDetails: share
        ? {
            accessLevel: share.accessLevel,
            sharedWithId: share.sharedWithId,
            memoryId: share.memoryId,
          }
        : null,
      timestamp: new Date().toISOString(),
    });

    // User should have access if they are either:
    // 1. The owner of the memory OR
    // 2. Have a share record
    if (!isOwner && !share) {
      console.log("❌ DEBUG SharedMemoryPage - Access Denied:", {
        reason: "User is not owner and has no share record",
        isOwner,
        hasShare: !!share,
        userId: allUserRecord.id,
        memoryId: id,
        timestamp: new Date().toISOString(),
      });
      notFound();
    }

    console.log("✅ DEBUG SharedMemoryPage - Access Granted:", {
      reason: isOwner ? "User is owner" : "User has share record",
      accessLevel: isOwner ? "write" : share?.accessLevel || "read",
      timestamp: new Date().toISOString(),
    });

    const accessLevel = isOwner ? "write" : share?.accessLevel || "read";

    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{isOwner ? "Your Memory" : "Shared Memory"}</h1>
            <p className="text-muted-foreground">
              {isOwner ? "You are viewing this memory as the owner" : `You have ${accessLevel} access to this memory`}
            </p>
          </div>

          <MemoryViewer memory={memory} isOwner={isOwner} accessLevel={accessLevel} />
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error accessing shared memory:", error);
    notFound();
  }
}
