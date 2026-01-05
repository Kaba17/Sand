import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export * from "./models/auth";
export * from "./models/chat";

// === TABLE DEFINITIONS ===

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimId: text("claim_id").notNull().unique(), // Human readable ID like SAN-2026-00001
  category: text("category").notNull(), // 'flight' | 'delivery'
  issueType: text("issue_type").notNull(),
  status: text("status").notNull().default("new"), 
  companyName: text("company_name").notNull(),
  referenceNumber: text("reference_number").notNull(), // Booking ref / Order ID
  incidentDate: timestamp("incident_date").notNull(),
  description: text("description").notNull(),
  
  // Customer Info
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),

  // Flight Specific
  flightFrom: text("flight_from"),
  flightTo: text("flight_to"),
  flightScheduledTime: timestamp("flight_scheduled_time"),
  flightActualTime: timestamp("flight_actual_time"),

  // Delivery Specific
  deliveryCity: text("delivery_city"),
  deliveryOrderTime: timestamp("delivery_order_time"),
  deliveryDeliveryTime: timestamp("delivery_delivery_time"),

  // Admin/Internal
  draftText: text("draft_text"), // For manual claim drafting
  internalNotes: text("internal_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull(),
  eventType: text("event_type").notNull(), // 'status_change', 'info_request', 'note', 'creation'
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull(),
  method: text("method").notNull(), // 'email', 'sms', 'phone'
  sentAt: timestamp("sent_at"),
  recipient: text("recipient").notNull(),
  companyResponse: text("company_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().unique(), // One settlement per claim usually
  compensationType: text("compensation_type").notNull(), // 'cash', 'voucher', 'refund'
  compensationAmount: integer("compensation_amount").notNull(), // in cents or smallest unit
  feePercent: integer("fee_percent").default(0),
  userNet: integer("user_net").notNull(),
  closedAt: timestamp("closed_at").defaultNow(),
});

export const flightVerifications = pgTable("flight_verifications", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().unique(),
  
  // Extracted from boarding pass
  flightNumber: text("flight_number"),
  airline: text("airline"),
  departureAirport: text("departure_airport"),
  arrivalAirport: text("arrival_airport"),
  scheduledDeparture: timestamp("scheduled_departure"),
  passengerName: text("passenger_name"),
  
  // Verification results from external API
  verificationStatus: text("verification_status").notNull().default("pending"), // 'pending', 'verified', 'unverified', 'error'
  actualDeparture: timestamp("actual_departure"),
  delayMinutes: integer("delay_minutes"),
  flightStatus: text("flight_status"), // 'on_time', 'delayed', 'cancelled', 'diverted'
  verificationSource: text("verification_source"), // 'aerodatabox', 'manual'
  verificationRawData: jsonb("verification_raw_data"),
  
  // OCR metadata
  ocrConfidence: integer("ocr_confidence"), // 0-100
  boardingPassPath: text("boarding_pass_path"),
  
  createdAt: timestamp("created_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

export const aiOutputs = pgTable("ai_outputs", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().unique(),
  
  // AI generated content
  summary: text("summary"),
  caseStrength: text("case_strength"), // 'strong', 'medium', 'weak'
  eligibilityReasoning: text("eligibility_reasoning"),
  claimDraft: text("claim_draft"),
  nextAction: text("next_action"),
  
  // Cache key for avoiding redundant AI calls
  lastInputHash: text("last_input_hash"),
  lastMode: text("last_mode"), // 'analyze', 'draft', 'followup'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===

export const claimsRelations = relations(claims, ({ many, one }) => ({
  attachments: many(attachments),
  timelineEvents: many(timelineEvents),
  communications: many(communications),
  settlement: one(settlements, {
    fields: [claims.id],
    references: [settlements.claimId],
  }),
  flightVerification: one(flightVerifications, {
    fields: [claims.id],
    references: [flightVerifications.claimId],
  }),
  aiOutput: one(aiOutputs, {
    fields: [claims.id],
    references: [aiOutputs.claimId],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  claim: one(claims, {
    fields: [attachments.claimId],
    references: [claims.id],
  }),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  claim: one(claims, {
    fields: [timelineEvents.claimId],
    references: [claims.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  claim: one(claims, {
    fields: [communications.claimId],
    references: [claims.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  claim: one(claims, {
    fields: [settlements.claimId],
    references: [claims.id],
  }),
}));

export const flightVerificationsRelations = relations(flightVerifications, ({ one }) => ({
  claim: one(claims, {
    fields: [flightVerifications.claimId],
    references: [claims.id],
  }),
}));

export const aiOutputsRelations = relations(aiOutputs, ({ one }) => ({
  claim: one(claims, {
    fields: [aiOutputs.claimId],
    references: [claims.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertClaimSchema = createInsertSchema(claims).omit({ 
  id: true, 
  claimId: true, 
  status: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({ 
  id: true, 
  uploadedAt: true 
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({ 
  id: true, 
  createdAt: true 
});

export const insertSettlementSchema = createInsertSchema(settlements).omit({ 
  id: true, 
  closedAt: true 
});

export const insertFlightVerificationSchema = createInsertSchema(flightVerifications).omit({ 
  id: true, 
  createdAt: true,
  verifiedAt: true
});

export const insertAiOutputSchema = createInsertSchema(aiOutputs).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});

// === EXPLICIT API CONTRACT TYPES ===

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
export type FlightVerification = typeof flightVerifications.$inferSelect;
export type AiOutput = typeof aiOutputs.$inferSelect;

// Insert types for sub-resources
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type InsertFlightVerification = z.infer<typeof insertFlightVerificationSchema>;
export type InsertAiOutput = z.infer<typeof insertAiOutputSchema>;

// Request types
export type CreateClaimRequest = InsertClaim;
export type UpdateClaimRequest = Partial<InsertClaim> & { 
  status?: string; 
  internalNotes?: string;
  draftText?: string;
};

// Response types
export type ClaimResponse = Claim & {
  attachments?: Attachment[];
  timelineEvents?: TimelineEvent[];
  communications?: Communication[];
  settlement?: Settlement | null;
  flightVerification?: FlightVerification | null;
  aiOutput?: AiOutput | null;
};

export type ClaimsListResponse = Claim[];

export interface ClaimsQueryParams {
  status?: string;
  category?: string;
  search?: string;
}

export interface FileUploadResponse {
  id: number;
  fileName: string;
  filePath: string;
}

export interface TrackClaimResponse {
  claim: Claim;
  timeline: TimelineEvent[];
}
