import { routeStatus } from "@/lib/utils";
import { getProfileDataById, updateUserProfile } from "@/services/profile";
import type { AuthType } from "@/types";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { zValidator } from "@hono/zod-validator";
import { updateProfileSchema } from "@workspace/validations";
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

export default profileRoutes;
