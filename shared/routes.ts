import { z } from 'zod';
import { 
  insertClaimSchema, 
  insertAttachmentSchema, 
  insertTimelineEventSchema,
  insertCommunicationSchema,
  insertSettlementSchema,
  claims,
  timelineEvents,
  communications,
  settlements
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  claims: {
    list: {
      method: 'GET' as const,
      path: '/api/claims',
      input: z.object({
        status: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof claims.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/claims/:id',
      responses: {
        200: z.custom<typeof claims.$inferSelect & {
          attachments: any[],
          timelineEvents: any[],
          communications: any[],
          settlement: any
        }>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/claims',
      input: insertClaimSchema,
      responses: {
        201: z.object({
          id: z.number(),
          claimId: z.string()
        }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/claims/:id',
      input: insertClaimSchema.partial().extend({
        status: z.string().optional(),
        internalNotes: z.string().optional(),
        draftText: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof claims.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    track: {
      method: 'GET' as const,
      path: '/api/claims/track/:claimId',
      input: z.object({
        phone: z.string()
      }),
      responses: {
        200: z.object({
          claim: z.custom<typeof claims.$inferSelect>(),
          timeline: z.array(z.custom<typeof timelineEvents.$inferSelect>())
        }),
        404: errorSchemas.notFound,
      },
    }
  },
  timeline: {
    create: {
      method: 'POST' as const,
      path: '/api/claims/:id/timeline',
      input: insertTimelineEventSchema.omit({ claimId: true }),
      responses: {
        201: z.custom<typeof timelineEvents.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  communications: {
    create: {
      method: 'POST' as const,
      path: '/api/claims/:id/communications',
      input: insertCommunicationSchema.omit({ claimId: true }),
      responses: {
        201: z.custom<typeof communications.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  settlements: {
    create: {
      method: 'POST' as const,
      path: '/api/claims/:id/settlement',
      input: insertSettlementSchema.omit({ claimId: true }),
      responses: {
        201: z.custom<typeof settlements.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  }
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
