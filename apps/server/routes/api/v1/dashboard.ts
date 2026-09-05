import {
  getAccountAnalytics,
  getDashboardOverview,
  getRecentActivity,
} from "@/services/dashboard";
import type { AppBindings, AuthType } from "@/types";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { zValidator } from "@hono/zod-validator";
import { dashboardOverviewSchema } from "@workspace/validations";
import { Hono } from "hono";
import { z } from "zod";

const dashboardRoute = new Hono<AppBindings>();

// Get dashboard stats only (doesn't change with search/filter)
dashboardRoute.get("/stats", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await getDashboardOverview(cookieUser.id, 1, 1);

  if (!serviceData.success || !serviceData.data) {
    return c.json(serviceData, routeStatus(serviceData));
  }

  return c.json(
    {
      success: true,
      message: "Dashboard stats fetched successfully",
      data: { stats: serviceData.data.stats },
    },
    200
  );
});

// Get dashboard projects only (filtered by search/sort)
dashboardRoute.get(
  "/projects",
  zValidator("query", dashboardOverviewSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { page, limit, sort, search } = c.req.valid("query");

    const serviceData = await getDashboardOverview(
      cookieUser.id,
      page,
      limit,
      sort,
      search
    );

    if (!serviceData.success || !serviceData.data) {
      return c.json(serviceData, routeStatus(serviceData));
    }

    return c.json(
      {
        success: true,
        message: "Dashboard projects fetched successfully",
        data: { projects: serviceData.data.projects },
      },
      200
    );
  }
);

// Recent activity across all of the user's projects (most recently sent posts)
dashboardRoute.get("/activity", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await getRecentActivity(cookieUser.id);

  return c.json(
    {
      success: serviceData.success,
      message: serviceData.message,
      data: { activity: serviceData.data },
    },
    routeStatus(serviceData)
  );
});

// Account-wide analytics — combined subscriber growth + top projects
dashboardRoute.get(
  "/analytics",
  zValidator(
    "query",
    z.object({ days: z.coerce.number().min(1).max(365).default(30) }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { days } = c.req.valid("query");

    const serviceData = await getAccountAnalytics(cookieUser.id, days);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Get full dashboard overview (backward compatibility)
dashboardRoute.get(
  "/overview",
  zValidator("query", dashboardOverviewSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { page, limit, sort, search } = c.req.valid("query");

    const serviceData = await getDashboardOverview(
      cookieUser.id,
      page,
      limit,
      sort,
      search
    );

    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default dashboardRoute;
