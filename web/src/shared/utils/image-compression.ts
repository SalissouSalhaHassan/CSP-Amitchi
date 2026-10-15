/**
 * Client-side Image Compression & Resizing Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Resizes and compresses images in browser memory using HTML Canvas before
 * uploading to Supabase Storage. Reduces bandwidth (Egress) by 90-99%.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.82)
  format?: "image/webp" | "image/jpeg" | "image/png";
}

export async function compressImage(
  input: string | File | Blob,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; blob: Blob; sizeBytes: number; format: string }> {
  const {
    maxWidth = 480,
    maxHeight = 480,
    quality = 0.82,
    format = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    let srcUrl = "";
    let isObjectUrl = false;

    if (typeof input === "string") {
      srcUrl = input;
    } else if (typeof Blob !== "undefined" && input instanceof Blob) {
      srcUrl = URL.createObjectURL(input);
      isObjectUrl = true;
    } else {
      return reject(new Error("Invalid image input type"));
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to create canvas 2d context");
        }

        // Fill background with white for JPEG transparency fallback
        if (format === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try preferred format (webp), fallback to jpeg if unsupported
        let targetFormat = format;
        let dataUrl = canvas.toDataURL(targetFormat, quality);
        if (!dataUrl.startsWith(`data:${targetFormat}`)) {
          targetFormat = "image/jpeg";
          dataUrl = canvas.toDataURL(targetFormat, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (isObjectUrl) URL.revokeObjectURL(srcUrl);
            if (!blob) {
              return reject(new Error("Canvas blob conversion failed"));
            }
            resolve({
              dataUrl,
              blob,
              sizeBytes: blob.size,
              format: targetFormat,
            });
          },
          targetFormat,
          quality
        );
      } catch (err) {
        if (isObjectUrl) URL.revokeObjectURL(srcUrl);
        reject(err);
      }
    };

    img.onerror = (e) => {
      if (isObjectUrl) URL.revokeObjectURL(srcUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = srcUrl;
  });
}
