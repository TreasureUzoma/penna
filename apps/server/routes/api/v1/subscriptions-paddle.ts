import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings, AuthType } from "@/types";
import { getUserInvoices, getInvoice } from "@/services/paddle";
import { validationErrorResponse } from "@/utils/validation-error-response";

const subscriptionsPaddleRoute = new Hono<AppBindings>();

// `POST /checkout` and `POST /cancel` used to live here, user-scoped
// (quantity hardcoded to 1, no team concept). Retired in favor of the
// team-scoped `POST /teams/:id/checkout` and `POST /teams/:id/cancel-subscription`
// (routes/api/v1/teams.ts) — billing is per-team now, and keeping both a
// user-scoped and a team-scoped entry point invites exactly the "which one
// actually gates features" confusion. The Paddle webhook itself lives at a
// separate, public route (`routes/api/v1/webhooks/paddle.ts`, mounted
// before session auth in index.ts) since Paddle's servers can't carry a
// Penna session cookie.

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

export default subscriptionsPaddleRoute;
