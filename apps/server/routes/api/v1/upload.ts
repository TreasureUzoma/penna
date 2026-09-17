import { Hono } from "hono";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { envConfig } from "@/config";
import crypto from "crypto";

const uploadRoute = new Hono();

// Initialize R2 client (S3-compatible)
let s3Client: S3Client | null = null;

function getS3Client() {
  if (
    !s3Client &&
    envConfig.R2_ACCESS_KEY_ID &&
    envConfig.R2_SECRET_ACCESS_KEY &&
    envConfig.R2_ACCOUNT_ID
  ) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${envConfig.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: envConfig.R2_ACCESS_KEY_ID,
        secretAccessKey: envConfig.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

uploadRoute.post("/", async (c) => {
  try {
    // Verify user is authenticated
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          success: false,
          message: "Authentication required",
          data: null,
        },
        401,
      );
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      return c.json(
        {
          success: false,
          message: "No image file provided",
          data: null,
        },
        400,
      );
    }

    // Validate file type
    if (file instanceof File) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        return c.json(
          {
            success: false,
            message:
              "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
            data: null,
          },
          400,
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        return c.json(
          {
            success: false,
            message: "File size exceeds 10MB limit",
            data: null,
          },
          400,
        );
      }
    }

    // Check R2 configuration
    const bucketName = envConfig.R2_BUCKET_NAME;
    const publicUrl = envConfig.R2_PUBLIC_URL;

    if (!bucketName || !publicUrl) {
      return c.json(
        {
          success: false,
          message: "R2 storage is not configured. Please contact support.",
          data: null,
        },
        500,
      );
    }

    const client = getS3Client();
    if (!client) {
      return c.json(
        {
          success: false,
          message: "R2 storage is not configured. Please contact support.",
          data: null,
        },
        500,
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg";
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const key = `images/${timestamp}-${uniqueId}.${fileExtension}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await client.send(command);

    // Build public URL
    const imageUrl = `${publicUrl.replace(/\/$/, "")}/${key}`;

    return c.json({
      success: true,
      data: { url: imageUrl, key },
      message: "Image uploaded successfully",
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return c.json(
      {
        success: false,
        message: err?.message || "Failed to process image upload",
        data: null,
      },
      500,
    );
  }
});

export default uploadRoute;
