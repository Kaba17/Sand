import { db } from "./db";
import {
  claims,
  attachments,
  timelineEvents,
  communications,
  settlements,
  type Claim,
  type InsertClaim,
  type UpdateClaimRequest,
  type Attachment,
  type TimelineEvent,
  type Communication,
  type Settlement,
  type InsertAttachment,
  type InsertTimelineEvent,
  type InsertCommunication,
  type InsertSettlement
} from "@shared/schema";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // Claims
  getClaims(params?: { status?: string; category?: string; search?: string }): Promise<Claim[]>;
  getClaim(id: number): Promise<Claim | undefined>;
  getClaimByPublicId(claimId: string): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: number, updates: UpdateClaimRequest): Promise<Claim>;
  
  // Attachments
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachments(claimId: number): Promise<Attachment[]>;
  
  // Timeline
  createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent>;
  getTimelineEvents(claimId: number): Promise<TimelineEvent[]>;
  
  // Communications
  createCommunication(comm: InsertCommunication): Promise<Communication>;
  getCommunications(claimId: number): Promise<Communication[]>;
  
  // Settlements
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  getSettlement(claimId: number): Promise<Settlement | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Auth methods delegated to the imported authStorage
  async getUser(id: string) {
    return authStorage.getUser(id);
  }
  
  async upsertUser(user: any) {
    return authStorage.upsertUser(user);
  }

  // Claims
  async getClaims(params?: { status?: string; category?: string; search?: string }): Promise<Claim[]> {
    let conditions = [];
    
    if (params?.status) {
      conditions.push(eq(claims.status, params.status));
    }
    
    if (params?.category) {
      conditions.push(eq(claims.category, params.category));
    }
    
    if (params?.search) {
      const searchLower = `%${params.search.toLowerCase()}%`;
      conditions.push(or(
        ilike(claims.claimId, searchLower),
        ilike(claims.customerName, searchLower),
        ilike(claims.customerPhone, searchLower),
        ilike(claims.companyName, searchLower)
      ));
    }

    return await db.select()
      .from(claims)
      .where(and(...conditions))
      .orderBy(desc(claims.createdAt));
  }

  async getClaim(id: number): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim;
  }

  async getClaimByPublicId(claimId: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.claimId, claimId));
    return claim;
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    // Generate a human readable ID
    const year = new Date().getFullYear();
    const [lastClaim] = await db.select().from(claims).orderBy(desc(claims.id)).limit(1);
    const nextId = (lastClaim?.id || 0) + 1;
    const paddedId = String(nextId).padStart(5, '0');
    const claimId = `SAN-${year}-${paddedId}`;

    const [claim] = await db.insert(claims).values({
      ...insertClaim,
      claimId,
      status: "new"
    }).returning();
    
    return claim;
  }

  async updateClaim(id: number, updates: UpdateClaimRequest): Promise<Claim> {
    const [updated] = await db.update(claims)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(claims.id, id))
      .returning();
    return updated;
  }

  // Attachments
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }

  async getAttachments(claimId: number): Promise<Attachment[]> {
    return await db.select().from(attachments).where(eq(attachments.claimId, claimId));
  }

  // Timeline
  async createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent> {
    const [newEvent] = await db.insert(timelineEvents).values(event).returning();
    return newEvent;
  }

  async getTimelineEvents(claimId: number): Promise<TimelineEvent[]> {
    return await db.select()
      .from(timelineEvents)
      .where(eq(timelineEvents.claimId, claimId))
      .orderBy(desc(timelineEvents.createdAt));
  }

  // Communications
  async createCommunication(comm: InsertCommunication): Promise<Communication> {
    const [newComm] = await db.insert(communications).values(comm).returning();
    return newComm;
  }

  async getCommunications(claimId: number): Promise<Communication[]> {
    return await db.select()
      .from(communications)
      .where(eq(communications.claimId, claimId))
      .orderBy(desc(communications.createdAt));
  }

  // Settlements
  async createSettlement(settlement: InsertSettlement): Promise<Settlement> {
    const [newSettlement] = await db.insert(settlements).values(settlement).returning();
    
    // Auto-update claim status to 'resolved' if not already
    await this.updateClaim(settlement.claimId, { status: "resolved" });
    
    return newSettlement;
  }

  async getSettlement(claimId: number): Promise<Settlement | undefined> {
    const [settlement] = await db.select().from(settlements).where(eq(settlements.claimId, claimId));
    return settlement;
  }
}

export const storage = new DatabaseStorage();
