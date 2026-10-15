import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, fileName, contentType } = await req.json();

    if (!imageBase64 || !fileName) {
      return NextResponse.json(
        { error: "Image data and file name are required" },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;

    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing on server" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Ensure bucket exists (create if missing)
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some((b) => b.id === "student-photos" || b.name === "student-photos");
      if (!hasBucket) {
        await supabase.storage.createBucket("student-photos", {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        });
      }
    } catch (e) {
      console.warn("Bucket ensure check notice:", e);
    }

    // Convert Base64 data URL to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const mime = contentType || "image/webp";

    const { data, error } = await supabase.storage
      .from("student-photos")
      .upload(fileName, buffer, {
        contentType: mime,
        cacheControl: "31536000, public, immutable",
        upsert: true,
      });

    if (error) {
      console.error("Server photo upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("student-photos")
      .getPublicUrl(data.path);

    return NextResponse.json({ publicUrl: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error("API upload student photo uncaught error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload photo" },
      { status: 500 }
    );
  }
}
