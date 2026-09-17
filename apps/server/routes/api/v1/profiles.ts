import { routeStatus } from "@/lib/utils";
import {
  deleteAccount,
  getProfileDataById,
  updateUserProfile,
} from "@/services/profile";
import type { AuthType } from "@/types";
import { clearAuthCookies } from "@/utils/auth-tokens";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { zValidator } from "@hono/zod-validator";
import { isValidEmail, updateProfileSchema } from "@workspace/validations";
import { Hono, type Context } from "hono";

const profileRoutes = new Hono();

// get /profile
profileRoutes.get("/", async (c: Context) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await getProfileDataById(cookieUser.id);

  if (!serviceData.success) {
    return c.json(serviceData, 404);
  }

  return c.json(serviceData);
});

profileRoutes.patch(
  "/",
  zValidator("json", updateProfileSchema, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c: Context) => {
    // @ts-ignore
    const body = c.req.valid("json");

    const cookieUser = c.get("user") as AuthType;

    const serviceData = await updateUserProfile(cookieUser.id, body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// DELETE /profile — confirms email, anonymises the account, clears cookies.
profileRoutes.delete(
  "/",
  zValidator("json", isValidEmail, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c: Context) => {
    const cookieUser = c.get("user") as AuthType;
    // @ts-ignore
    const { email } = c.req.valid("json");

    const serviceData = await deleteAccount(cookieUser.id, email);

    if (!serviceData.success) {
      return c.json(serviceData, 400);
    }

    // Kill the session cookies immediately.
    await clearAuthCookies(c);
    return c.json(serviceData, 200);
  }
);

export default profileRoutes;
