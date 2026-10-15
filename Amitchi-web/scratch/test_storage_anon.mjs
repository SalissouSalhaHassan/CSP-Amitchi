import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ntlncvstzmfqbqystpwi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bG5jdnN0em1mcWJxeXN0cHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mzc0MTcsImV4cCI6MjA5MTQxMzQxN30.K5jN6G57H5t-OQf648qWb90sT81kU0e8bO4Pq6zTqP4";

async function testUpload() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test listing buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log("List buckets result:", { buckets, bErr });

  // Test uploading a small dummy text/image
  const dummyBuffer = Buffer.from("test photo content");
  const fileName = `test_${Date.now()}.txt`;
  const { data, error } = await supabase.storage
    .from("student-photos")
    .upload(fileName, dummyBuffer, {
      contentType: "text/plain",
      upsert: true
    });

  console.log("Upload result:", { data, error });

  if (data) {
    const { data: urlData } = supabase.storage
      .from("student-photos")
      .getPublicUrl(data.path);
    console.log("Public URL:", urlData.publicUrl);

    // Clean up
    await supabase.storage.from("student-photos").remove([data.path]);
    console.log("Cleaned up test file.");
  }
}

testUpload();
