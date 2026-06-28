import { and, asc, eq, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { requestsStatus } from "../../db/schema/requests-status.js";
import { requestStatusSchema } from "./request-status.schemas.js";

type DatabaseClient = typeof dbType;

export type RequestStatus = z.infer<typeof requestStatusSchema>;

export type ListRequestStatusFilters = {
    isActive?: boolean;
};

export class RequestStatusRepository {
    constructor(private readonly db: DatabaseClient) { }

    async list(filters: ListRequestStatusFilters = {}): Promise<RequestStatus[]> {
        const conditions: SQL[] = [];

        if (filters.isActive !== undefined) {
            conditions.push(eq(requestsStatus.isActive, filters.isActive));
        }

        const rows = await this.db
            .select({
                id: requestsStatus.id,
                code: requestsStatus.code,
                description: requestsStatus.description,
                isActive: requestsStatus.isActive,
                createdAt: requestsStatus.createdAt,
                updatedAt: requestsStatus.updatedAt,
            })
            .from(requestsStatus)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(asc(requestsStatus.code));

        return rows.map((row) =>
            requestStatusSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }
}
