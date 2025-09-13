"use client";

import { Card } from "@/components/ui/card";
import Image from "next/image";
import { Plus, Share2, FileText, Music, Video, Archive, File, Loader2 } from "lucide-react";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useFileUpload } from "@/hooks/user-file-upload";

interface ProfileProps {
  isOnboarding?: boolean;
  uploadedFile?: {
    url: string;
    file: File;
  } | null;
}

export function Profile({ isOnboarding = false }: ProfileProps) {
  const { files, currentStep } = useOnboarding();
  const { isLoading, fileInputRef, handleUploadClick, handleFileChange } = useFileUpload({
    isOnboarding,
  });

  const getFileIcon = (type: string) => {
    if (type.startsWith("text/") || type.includes("pdf")) return <FileText size={48} />;
    if (type.startsWith("audio/")) return <Music size={48} />;
    if (type.startsWith("video/")) return <Video size={48} />;
    if (type.includes("zip") || type.includes("rar")) return <Archive size={48} />;
    return <File size={48} />;
  };

  return (
    <div className="w-full max-w-[95%] sm:max-w-[90%] lg:max-w-[85%] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold">Your Digital Vault</h2>
      </div>

      {/* Grid of Memories */}
      {files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file, index) => (
            <Card key={index} className="aspect-square overflow-hidden relative">
              {file.file.type.startsWith("image/") ? (
                <Image
                  src={file.url}
                  alt="Your memory"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  {getFileIcon(file.file.type)}
                  <div className="text-center">
                    <p className="font-medium">{file.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.file.type.split("/")[1].toUpperCase()}
                      {" • "}
                      {Math.round(file.file.size / 1024)}KB
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="aspect-square w-full max-w-2xl mx-auto overflow-hidden relative">
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground">Your vault awaits its first memory</p>
          </div>
        </Card>
      )}

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple={false} />

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <div
          role="button"
          tabIndex={0}
          onClick={handleUploadClick}
          onKeyDown={(e) => e.key === "Enter" && handleUploadClick()}
          className="w-14 h-14 rounded-full bg-black hover:bg-white dark:bg-white dark:hover:bg-black flex items-center justify-center cursor-pointer text-white hover:text-black dark:text-black dark:hover:text-white border-2 border-transparent hover:border-black dark:hover:border-white transition-all"
        >
          {isLoading ? <Loader2 size={32} className="animate-spin" /> : <Plus size={32} />}
        </div>
        <div
          role="button"
          tabIndex={0}
          className="w-14 h-14 rounded-full bg-black hover:bg-white dark:bg-white dark:hover:bg-black flex items-center justify-center cursor-pointer text-white hover:text-black dark:text-black dark:hover:text-white border-2 border-transparent hover:border-black dark:hover:border-white transition-all"
        >
          <Share2 size={32} />
        </div>
      </div>

      {/* Celebration Layer */}
      {isOnboarding && files.length > 0 && currentStep === "complete" && (
        <Card className="mt-8 p-6 text-center">
          <h3 className="text-xl font-semibold mb-4">First Memory Secured! 🔒</h3>
          <p className="text-muted-foreground">Your digital vault has received its first treasure.</p>
        </Card>
      )}
    </div>
  );
}
