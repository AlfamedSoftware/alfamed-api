import { and, eq, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { roles } from "../../db/schema/roles.js";
import { roleSchema } from "./roles.schemas.js";

type DatabaseClient = typeof dbType;

export type Role = z.infer<typeof roleSchema>;

export type ListRolesFilters = {
    isActive?: boolean;
    internal?: boolean;
};

export class RolesRepository {
    constructor(private readonly db: DatabaseClient) { }

    async list(filters: ListRolesFilters = {}): Promise<Role[]> {
        const conditions: SQL[] = [];

        if (filters.isActive !== undefined) {
            conditions.push(eq(roles.isActive, filters.isActive));
        }

        if (filters.internal !== undefined) {
            conditions.push(eq(roles.internal, filters.internal));
        }

        const rows = await this.db
            .select({
                id: roles.id,
                description: roles.description,
                key: roles.key,
                isActive: roles.isActive,
                internal: roles.internal,
                createdAt: roles.createdAt,
                updatedAt: roles.updatedAt,
            })
            .from(roles)
            .where(conditions.length ? and(...conditions) : undefined);

        return rows.map((row) =>
            roleSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }
}
