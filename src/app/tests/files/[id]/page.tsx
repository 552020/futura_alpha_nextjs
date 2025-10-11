import { auth } from '@/auth';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { documents, images, notes } from '@/db/schema';
import { notFound } from 'next/navigation';
import FileDetailEditor from '@/app/tests/files/[id]/file-detail-editor';

// Server component to handle data fetching
export default async function FileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Get the authenticated user
  const session = await auth();
  if (!session || !session.user) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-6">File Details</h1>
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-6">You must be logged in to view file details</div>
      </div>
    );
  }

  // Await params to resolve the Promise
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Try to find in photos
  const photo = await db.query.images.findFirst({
    where: eq(images.id, id),
  });

  if (photo) {
    // Verify access
    if (photo.ownerId !== session.user.id && !photo.isPublic) {
      return (
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Access Denied</h1>
          <div className="bg-red-50 text-red-800 p-4 rounded">You don&apos;t have permission to view this file</div>
        </div>
      );
    }

    return <FileDetailEditor fileDetails={{ type: 'image', data: photo }} />;
  }

  // Try to find in files
  const file = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });

  if (file) {
    // Verify access
    if (file.ownerId !== session.user.id) {
      return (
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Access Denied</h1>
          <div className="bg-red-50 text-red-800 p-4 rounded">You don&apos;t have permission to view this file</div>
        </div>
      );
    }

    return <FileDetailEditor fileDetails={{ type: 'document', data: file }} />;
  }

  // Try to find in texts
  const text = await db.query.notes.findFirst({
    where: eq(notes.id, id),
  });

  if (text) {
    // Verify access
    if (text.ownerId !== session.user.id) {
      return (
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Access Denied</h1>
          <div className="bg-red-50 text-red-800 p-4 rounded">You don&apos;t have permission to view this file</div>
        </div>
      );
    }

    return <FileDetailEditor fileDetails={{ type: 'note', data: text }} />;
  }

  // If we get here, the file doesn't exist
  return notFound();
}
