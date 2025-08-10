// test-upload.js

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // load env from .env.local

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Check env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Check .env.local");
  process.exit(1);
}

// Init Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadFile() {
  try {
    const filePath = "hello.txt"; // make sure this file exists
    const fileBuffer = fs.readFileSync(filePath);

    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET)
      .upload(`test/${Date.now()}-hello.txt`, fileBuffer, {
        contentType: "text/plain",
      });

    if (error) throw error;
    console.log("Uploaded:", data);
  } catch (err) {
    console.error("Upload error:", err.message);
  }
}

uploadFile();
