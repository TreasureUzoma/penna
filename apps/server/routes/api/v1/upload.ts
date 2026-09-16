import { Hono } from "hono";
import { envConfig } from "@/config";

const uploadRoute = new Hono();

uploadRoute.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      return c.json(
        {
          success: false,
          message: "No image file provided",
          data: null,
        },
        400
      );
    }

    const accountId = envConfig.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = envConfig.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return c.json(
        {
          success: false,
          message:
            "Cloudflare Images API credentials (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN) are not configured on server.",
          data: null,
        },
        400
      );
    }

    const formData = new FormData();
    formData.append("file", file);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      }
    );

    const cfData = (await cfResponse.json()) as {
      success: boolean;
      errors?: Array<{ message: string }>;
      result?: {
        id: string;
        filename?: string;
        variants?: string[];
      };
    };

    if (!cfResponse.ok || !cfData.success) {
      const errorMsg =
        cfData?.errors?.[0]?.message ||
        "Failed to upload image to Cloudflare Images";
      return c.json({ success: false, message: errorMsg, data: null }, 500);
    }

    const imageUrl =
      cfData.result?.variants?.[0] ||
      (envConfig.CLOUDFLARE_ACCOUNT_HASH && cfData.result?.id
        ? `https://imagedelivery.net/${envConfig.CLOUDFLARE_ACCOUNT_HASH}/${cfData.result.id}/public`
        : null);

    if (!imageUrl) {
      return c.json(
        {
          success: false,
          message: "Cloudflare did not return a valid image URL",
          data: null,
        },
        500
      );
    }

    return c.json({
      success: true,
      data: { url: imageUrl, id: cfData.result?.id },
      message: "Image uploaded successfully",
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err?.message || "Failed to process image upload",
        data: null,
      },
      500
    );
  }
});

export default uploadRoute;
