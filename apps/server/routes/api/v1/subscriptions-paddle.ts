import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings, AuthType } from "@/types";
import {
  createCheckoutSession,
  getUserInvoices,
  cancelSubscription,
  getInvoice,
} from "@/services/paddle";
import { validationErrorResponse } from "@/utils/validation-error-response";

const subscriptionsPaddleRoute = new Hono<AppBindings>();

/**
 * Create checkout session for subscription. The Paddle webhook itself lives
 * at a separate, public route (`routes/api/v1/webhooks/paddle.ts`, mounted
 * before session auth in index.ts) since Paddle's servers can't carry a
 * Penna session cookie.
 */
subscriptionsPaddleRoute.post(
  "/checkout",
  zValidator(
    "json",
    z.object({
      planSlug: z.enum(["hobby", "professional", "business", "enterprise"]),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    try {
      const user = c.get("user") as AuthType;
      const { planSlug, successUrl } = c.req.valid("json");

      if (!user?.id) {
        return c.json(
          {
            success: false,
            message: "Unauthorized",
          },
          400
        );
      }

      if (planSlug === "hobby") {
        return c.json(
          {
            success: false,
            message: "The Hobby plan is free — no checkout needed.",
          },
          400
        );
      }

      if (planSlug === "enterprise") {
        return c.json(
          {
            success: false,
            message: "Enterprise is custom-priced — contact sales instead of checking out.",
          },
          400
        );
      }

      const result = await createCheckoutSession({
        userId: user.id,
        planSlug,
        successUrl,
      });

      if (!result.success) {
        return c.json(result as any, 400);
      }

      return c.json(
        {
          success: true,
          message: "Checkout session created",
          data: result.data,
        },
        200
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create checkout";

      return c.json(
        {
          success: false,
          message,
        },
        400
      );
    }
  }
);

/**
 * Get user invoices
 */
subscriptionsPaddleRoute.get("/invoices", async (c) => {
  try {
    const user = c.get("user") as AuthType;

    const result = await getUserInvoices(user.id);

    return c.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      result.success ? 200 : 400
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch invoices";

    return c.json(
      {
        success: false,
        message,
      },
      400
    );
  }
});

/**
 * Get specific invoice
 */
subscriptionsPaddleRoute.get(
  "/invoices/:transactionId",
  zValidator(
    "param",
    z.object({ transactionId: z.string().min(1) }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    try {
      const { transactionId } = c.req.valid("param");

      const result = await getInvoice(transactionId);

      return c.json(
        {
          success: result.success,
          message: result.message,
          data: result.data,
        },
        result.success ? 200 : 400
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch invoice";

      return c.json(
        {
          success: false,
          message,
        },
        400
      );
    }
  }
);

/**
 * Cancel subscription
 */
subscriptionsPaddleRoute.post("/cancel", async (c) => {
  try {
    const user = c.get("user") as AuthType;

    const result = await cancelSubscription(user.id);

    return c.json(
      {
        success: result.success,
        message: result.message,
      },
      result.success ? 200 : 400
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel subscription";

    return c.json(
      {
        success: false,
        message,
      },
      400
    );
  }
});

export default subscriptionsPaddleRoute;
