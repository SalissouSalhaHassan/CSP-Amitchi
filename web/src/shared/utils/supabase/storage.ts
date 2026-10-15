import { createClient } from "./client";
import { compressImage } from "../image-compression";

/**
 * Uploads student photo to Supabase Storage with automatic client-side compression
 * and maximum Cache-Control headers to minimize Egress bandwidth.
 */
export async function uploadStudentPhoto(
  imageData: string | File | Blob,
  fileName: string
) {
  const supabase = createClient();

  // 1. Compress image to WebP/JPEG before upload (Max 480x480, quality 82%)
  let uploadBlob: Blob;
  let contentType = "image/webp";

  try {
    const compressed = await compressImage(imageData, {
      maxWidth: 480,
      maxHeight: 480,
      quality: 0.82,
      format: "image/webp",
    });
    uploadBlob = compressed.blob;
    contentType = compressed.format;
  } catch (err) {
    console.warn("Client compression failed, using original image:", err);
    if (typeof imageData === "string") {
      const res = await fetch(imageData);
      uploadBlob = await res.blob();
    } else {
      uploadBlob = imageData;
    }
  }

  // Ensure file extension matches contentType
  let finalFileName = fileName;
  if (contentType === "image/webp" && !finalFileName.endsWith(".webp")) {
    finalFileName = finalFileName.replace(/\.[^/.]+$/, "") + ".webp";
  }

  // 2. Try direct client upload with 1 year immutable cache header
  try {
    const { data, error } = await supabase.storage
      .from("student-photos")
      .upload(finalFileName, uploadBlob, {
        contentType: contentType,
        cacheControl: "31536000, public, immutable",
        upsert: true,
      });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from("student-photos")
        .getPublicUrl(data.path);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (clientErr) {
    console.warn("Direct client storage upload failed, attempting server-side upload fallback:", clientErr);
  }

  // 3. Fallback: upload via secure server endpoint (/api/students/upload-photo)
  try {
    let base64String = "";
    if (typeof imageData === "string" && imageData.startsWith("data:image")) {
      base64String = imageData;
    } else {
      const reader = new FileReader();
      base64String = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadBlob);
      });
    }

    const res = await fetch("/api/students/upload-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64String,
        fileName: finalFileName,
        contentType,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.publicUrl) {
        return json.publicUrl;
      }
    } else {
      const json = await res.json().catch(() => ({}));
      console.warn("Server photo upload returned non-OK:", json);
    }
  } catch (serverErr) {
    console.error("Server upload fallback also failed:", serverErr);
  }

  // If all cloud uploads fail, return original imageData so student registration never breaks
  if (typeof imageData === "string") {
    return imageData;
  }
  return "";
}

/**
 * Uploads school logos, stamps, and official headers with compression
 */
export async function uploadSchoolAsset(
  bucketName: string,
  imageData: string | File | Blob,
  fileName: string,
  maxWidth = 600
) {
  const supabase = createClient();

  let uploadBlob: Blob;
  let contentType = "image/webp";

  try {
    const compressed = await compressImage(imageData, {
      maxWidth,
      maxHeight: maxWidth,
      quality: 0.85,
      format: "image/webp",
    });
    uploadBlob = compressed.blob;
    contentType = compressed.format;
  } catch (_) {
    if (typeof imageData === "string") {
      const res = await fetch(imageData);
      uploadBlob = await res.blob();
    } else {
      uploadBlob = imageData;
    }
  }

  let finalFileName = fileName;
  if (contentType === "image/webp" && !finalFileName.endsWith(".webp")) {
    finalFileName = finalFileName.replace(/\.[^/.]+$/, "") + ".webp";
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(finalFileName, uploadBlob, {
      contentType: contentType,
      cacheControl: "31536000, public, immutable",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || `Failed to upload to ${bucketName}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
