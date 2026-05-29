import { and, asc, eq, ne } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { procedures } from "../../db/schema/procedures.js";
import { procedureSchema } from "./procedures.schemas.js";

type DatabaseClient = typeof dbType;

export type ProcedureProfile = z.infer<typeof procedureSchema>;

export class ProceduresRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findByCodeAndUnitId(
        code: string,
        unitId: string,
        excludeProcedureId?: string,
    ): Promise<ProcedureProfile | null> {
        const whereClause = excludeProcedureId
            ? and(
                eq(procedures.code, code),
                eq(procedures.unitId, unitId),
                ne(procedures.id, excludeProcedureId),
            )
            : and(eq(procedures.code, code), eq(procedures.unitId, unitId));

        const [row] = await this.db
            .select({
                id: procedures.id,
                unitId: procedures.unitId,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            })
            .from(procedures)
            .where(whereClause)
            .limit(1);

        if (!row) {
            return null;
        }

        return procedureSchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async findByIdAndUnitId(procedureId: string, unitId: string): Promise<ProcedureProfile | null> {
        const [row] = await this.db
            .select({
                id: procedures.id,
                unitId: procedures.unitId,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            })
            .from(procedures)
            .where(eq(procedures.id, procedureId))
            .limit(1);

        if (!row) {
            return null;
        }

        if (row.unitId !== unitId) {
            return null;
        }

        return procedureSchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async listByUnitId(unitId: string): Promise<ProcedureProfile[]> {
        const rows = await this.db
            .select({
                id: procedures.id,
                unitId: procedures.unitId,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            })
            .from(procedures)
            .where(eq(procedures.unitId, unitId))
            .orderBy(asc(procedures.description));

        return rows.map((row) =>
            procedureSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }

    async createForUnit(unitId: string, data: {
        description: string;
        observation?: string | null;
        code: string;
        price: string;
        isActive?: boolean;
    }): Promise<ProcedureProfile> {
        const [row] = await this.db
            .insert(procedures)
            .values({
                unitId,
                description: data.description,
                observation: data.observation ?? null,
                code: data.code,
                price: data.price,
                isActive: data.isActive ?? true,
            })
            .returning({
                id: procedures.id,
                unitId: procedures.unitId,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            });

        return procedureSchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async updateByIdAndUnitId(
        procedureId: string,
        unitId: string,
        data: {
            description?: string;
            observation?: string | null;
            code?: string;
            price?: string;
            isActive?: boolean;
        },
    ): Promise<ProcedureProfile | null> {
        const [row] = await this.db
            .update(procedures)
            .set({
                ...(typeof data.description !== "undefined" ? { description: data.description } : {}),
                ...(typeof data.observation !== "undefined" ? { observation: data.observation } : {}),
                ...(typeof data.code !== "undefined" ? { code: data.code } : {}),
                ...(typeof data.price !== "undefined" ? { price: data.price } : {}),
                ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            })
            .where(and(eq(procedures.id, procedureId), eq(procedures.unitId, unitId)))
            .returning({
                id: procedures.id,
                unitId: procedures.unitId,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            });

        if (!row) {
            return null;
        }

        return procedureSchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
}