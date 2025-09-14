interface UploadResponse {
  data: {
    id: string;
    ownerId: string;
  };
}

interface MultipleFilesUploadResponse {
  totalFiles: number;
  successful: number;
  failed: number;
  results: Array<{
    fileName: string;
    index: number;
    data: {
      id: string;
      ownerId: string;
    };
  }>;
  errors: Array<{
    fileName: string;
    error: string;
    index: number;
  }>;
}

type UploadMode = "files" | "folder";

export const uploadFile = async (
  file: File,
  isOnboarding: boolean,
  existingUserId?: string,
  mode: UploadMode = "files"
): Promise<UploadResponse> => {
  // Determine endpoint based on onboarding status and mode
  let endpoint: string;
  if (isOnboarding) {
    const onboardingEndpoint =
      mode === "folder"
        ? "/api/memories/upload/onboarding/folder"
        : "/api/memories/upload/onboarding/file";
    endpoint = onboardingEndpoint;
  } else {
    const normalEndpoint =
      mode === "folder"
        ? "/api/memories/upload/folder"
        : "/api/memories/upload/file";
    endpoint = normalEndpoint;
  }

  // Upload file
  const formData = new FormData();
  formData.append("file", file);

  if (existingUserId) {
    formData.append("userId", existingUserId);
  }

  try {
    // console.log("📤 Sending file to server...");
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Server returned error:", data);
      throw new Error(data.error || "Upload failed");
    }

    return data;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
};

export const uploadMultipleFiles = async (
  files: File[],
  isOnboarding: boolean,
  existingUserId?: string
): Promise<MultipleFilesUploadResponse> => {
  // Determine endpoint based on onboarding status
  let endpoint: string;
  if (isOnboarding) {
    endpoint = "/api/memories/upload/onboarding/files";
  } else {
    endpoint = "/api/memories/upload/files";
  }

  // Upload files
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("file", file);
  });

  if (existingUserId) {
    formData.append("userId", existingUserId);
  }

  try {
    console.log(`📤 Sending ${files.length} files to server...`);
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Server returned error:", data);
      throw new Error(data.error || "Multiple files upload failed");
    }

    return data;
  } catch (error) {
    console.error("❌ Multiple files upload failed:", error);
    throw error;
  }
};
