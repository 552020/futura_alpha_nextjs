"use client";

import { type MemoryWithType } from "@/app/api/memories/utils/memory";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Edit, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import type { DBImage, DBDocument, DBNote, DBVideo } from "@/db/schema";
import { shortenTitle } from "@/lib/utils";

interface MemoryViewerProps {
  memory: MemoryWithType;
  isOwner: boolean;
  accessLevel: "read" | "write";
}

export function MemoryViewer({ memory, isOwner }: MemoryViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/memories/${memory.data.id}/download`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadFileName(memory.data.title || "memory");
    } catch (error) {
      console.error("Error downloading memory:", error);
    }
  };

  // Cleanup URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        window.URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this memory?")) return;

    try {
      const response = await fetch(`/api/memories/${memory.data.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      // Redirect to home or show success message
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting memory:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title and Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" title={memory.data.title || ""}>
          {shortenTitle(memory.data.title || "", 40)}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          {isOwner && (
            <>
              <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Memory Content */}
      <div className="mt-4">
        {memory.type === "image" && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={(memory.data as DBImage).url}
              alt={(memory.data as DBImage).title || "Shared memory"}
              fill
              className="object-cover"
            />
          </div>
        )}

        {memory.type === "video" && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <video controls className="h-full w-full">
              <source src={(memory.data as DBVideo).url} type={(memory.data as DBVideo).mimeType} />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {memory.type === "document" && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Document Type: {(memory.data as DBDocument).mimeType}</p>
            <p className="text-sm text-muted-foreground">Size: {(memory.data as DBDocument).size}</p>
          </div>
        )}

        {memory.type === "note" && (
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground">{(memory.data as DBNote).content}</p>
          </div>
        )}

        {(memory.data as DBImage | DBDocument | DBVideo).description && (
          <p className="mt-4 text-muted-foreground">{(memory.data as DBImage | DBDocument | DBVideo).description}</p>
        )}
      </div>

      {downloadUrl && downloadFileName && (
        <a
          href={downloadUrl}
          download={downloadFileName}
          className="hidden"
          ref={(el) => {
            if (el) {
              el.click();
              setDownloadUrl(null);
              setDownloadFileName(null);
            }
          }}
        />
      )}
    </div>
  );
}
