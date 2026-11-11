import "dotenv/config";
import fs from "fs";
import path from "path";
import { POST } from "../app/api/analyze/route";

export async function runTest(imageFilePath?: string) {
  console.log("=== Testing Snap to Pay /api/analyze Endpoint ===");

  let buffer: Buffer;
  let filename: string;
  let mimeType: string;

  if (imageFilePath && fs.existsSync(imageFilePath)) {
    console.log(`Using provided image file: ${imageFilePath}`);
    buffer = fs.readFileSync(imageFilePath);
    filename = path.basename(imageFilePath);
    mimeType = filename.endsWith(".png") ? "image/png" : "image/jpeg";
  } else {
    console.log("Using synthetic test PNG...");
    // 1x1 transparent PNG
    buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );
    filename = "test.png";
    mimeType = "image/png";
  }

  const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });

  const formData = new FormData();
  formData.append("image", file);

  const request = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    body: formData,
  });

  const startTime = Date.now();
  console.log("Sending POST request to /api/analyze handler...");

  try {
    const response = await POST(request);
    const duration = Date.now() - startTime;
    const status = response.status;
    const data = await response.json();

    console.log(`\nResponse Status: ${status} (${duration}ms)`);
    console.log("Response Body:\n", JSON.stringify(data, null, 2));

    if (status === 200 && data.success) {
      console.log("\n[SUCCESS] /api/analyze route completed cleanly!");
      console.log(`Matched Items: ${data.matchedItems?.length ?? 0}`);
      console.log(`Unknown Items: ${data.unknownItems?.length ?? 0}`);
    } else {
      console.error("\n[FAILURE] Route returned non-success response.");
    }
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

const customImage = process.argv[2];
runTest(customImage);

