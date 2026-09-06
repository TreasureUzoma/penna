import { db } from "@workspace/db";
import {
  segments,
  segmentSubscribers,
  subscribers,
} from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { and, count, desc, eq } from "drizzle-orm";

export const getSegments = async (
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    const segmentList = await db
      .select({
        id: segments.id,
        name: segments.name,
        description: segments.description,
        criteria: segments.criteria,
        createdAt: segments.createdAt,
        updatedAt: segments.updatedAt,
        subscriberCount: count(segmentSubscribers.id),
      })
      .from(segments)
      .leftJoin(
        segmentSubscribers,
        eq(segmentSubscribers.segmentId, segments.id),
      )
      .where(eq(segments.newsletterId, newsletterId))
      .groupBy(segments.id)
      .orderBy(desc(segments.createdAt));

    return {
      success: true,
      message: "Fetched segments successfully",
      data: segmentList,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch segments",
      data: null,
    };
  }
};

export const getSegment = async (
  segmentId: string,
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    const [segment] = await db
      .select()
      .from(segments)
      .where(
        and(eq(segments.id, segmentId), eq(segments.newsletterId, newsletterId)),
      );

    if (!segment) {
      return {
        success: false,
        message: "Segment not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Fetched segment successfully",
      data: segment,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch segment",
      data: null,
    };
  }
};

export const updateSegment = async (
  segmentId: string,
  newsletterId: string,
  updates: {
    name?: string;
    description?: string;
    criteria?: Record<string, unknown>;
  },
): Promise<ServiceResponse> => {
  try {
    const [updated] = await db
      .update(segments)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(eq(segments.id, segmentId), eq(segments.newsletterId, newsletterId)),
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        message: "Segment not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Segment updated successfully",
      data: updated,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update segment",
      data: null,
    };
  }
};

export const createSegment = async (
  newsletterId: string,
  name: string,
  description?: string,
  criteria?: Record<string, unknown>,
): Promise<ServiceResponse> => {
  try {
    const [newSegment] = await db
      .insert(segments)
      .values({
        newsletterId,
        name,
        description,
        criteria: criteria || {},
      })
      .returning();

    return {
      success: true,
      message: "Segment created successfully",
      data: newSegment,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create segment",
      data: null,
    };
  }
};

export const getSegmentSubscribers = async (
  segmentId: string,
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    // First verify the segment belongs to the newsletter
    const [segment] = await db
      .select()
      .from(segments)
      .where(
        and(eq(segments.id, segmentId), eq(segments.newsletterId, newsletterId)),
      );

    if (!segment) {
      return {
        success: false,
        message: "Segment not found",
        data: null,
      };
    }

    // Get all subscribers in this segment
    const subscriberList = await db
      .select({ email: subscribers.email, id: subscribers.id })
      .from(segmentSubscribers)
      .innerJoin(
        subscribers,
        eq(segmentSubscribers.subscriberId, subscribers.id),
      )
      .where(eq(segmentSubscribers.segmentId, segmentId));

    return {
      success: true,
      message: "Fetched segment subscribers successfully",
      data: subscriberList,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Failed to fetch segment subscribers",
      data: null,
    };
  }
};

export const addSubscriberToSegment = async (
  segmentId: string,
  subscriberId: string,
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    // Verify segment belongs to newsletter
    const [segment] = await db
      .select()
      .from(segments)
      .where(
        and(eq(segments.id, segmentId), eq(segments.newsletterId, newsletterId)),
      );

    if (!segment) {
      return {
        success: false,
        message: "Segment not found",
        data: null,
      };
    }

    // Check if already in segment
    const [existing] = await db
      .select()
      .from(segmentSubscribers)
      .where(
        and(
          eq(segmentSubscribers.segmentId, segmentId),
          eq(segmentSubscribers.subscriberId, subscriberId),
        ),
      );

    if (existing) {
      return {
        success: false,
        message: "Subscriber already in segment",
        data: null,
      };
    }

    const [segmentSub] = await db
      .insert(segmentSubscribers)
      .values({
        segmentId,
        subscriberId,
      })
      .returning();

    return {
      success: true,
      message: "Subscriber added to segment",
      data: segmentSub,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Failed to add subscriber to segment",
      data: null,
    };
  }
};

export const removeSubscriberFromSegment = async (
  segmentId: string,
  subscriberId: string,
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    // Verify segment belongs to newsletter
    const [segment] = await db
      .select()
      .from(segments)
      .where(
        and(eq(segments.id, segmentId), eq(segments.newsletterId, newsletterId)),
      );

    if (!segment) {
      return {
        success: false,
        message: "Segment not found",
        data: null,
      };
    }

    const [removed] = await db
      .delete(segmentSubscribers)
      .where(
        and(
          eq(segmentSubscribers.segmentId, segmentId),
          eq(segmentSubscribers.subscriberId, subscriberId),
        ),
      )
      .returning();

    if (!removed) {
      return {
        success: false,
        message: "Subscriber not in segment",
        data: null,
      };
    }

    return {
      success: true,
      message: "Subscriber removed from segment",
      data: removed,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Failed to remove subscriber from segment",
      data: null,
    };
  }
};

export const deleteSegment = async (
  segmentId: string,
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    const [deleted] = await db
      .delete(segments)
      .where(and(eq(segments.id, segmentId), eq(segments.newsletterId, newsletterId)))
      .returning();

    if (!deleted) {
      return {
        success: false,
        message: "Segment not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Segment deleted successfully",
      data: deleted,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete segment",
      data: null,
    };
  }
};
