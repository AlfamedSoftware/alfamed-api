import { and, asc, eq, inArray, ne } from "drizzle-orm";
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
                specialtyId: procedures.specialtyId,
                type: procedures.type,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isPerformedInUnit: procedures.isPerformedInUnit,
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
                specialtyId: procedures.specialtyId,
                type: procedures.type,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isPerformedInUnit: procedures.isPerformedInUnit,
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

    async listByUnitId(unitId: string, specialtyId?: string, isActive?: boolean, type?: number): Promise<ProcedureProfile[]> {
        const conditions = [eq(procedures.unitId, unitId)];
        if (specialtyId) conditions.push(eq(procedures.specialtyId, specialtyId));
        if (isActive !== undefined) conditions.push(eq(procedures.isActive, isActive));
        if (type !== undefined) conditions.push(eq(procedures.type, type));
        const whereClause = and(...conditions);

        const rows = await this.db
            .select({
                id: procedures.id,
                unitId: procedures.unitId,
                specialtyId: procedures.specialtyId,
                type: procedures.type,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isPerformedInUnit: procedures.isPerformedInUnit,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            })
            .from(procedures)
            .where(whereClause)
            .orderBy(asc(procedures.description));

        return rows.map((row) =>
            procedureSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }

    async listByIds(unitId: string, ids: string[], isActive?: boolean): Promise<ProcedureProfile[]> {
        const whereClause = isActive !== undefined
            ? and(eq(procedures.unitId, unitId), inArray(procedures.id, ids), eq(procedures.isActive, isActive))
            : and(eq(procedures.unitId, unitId), inArray(procedures.id, ids));

        const rows = await this.db
            .select({
                id: procedures.id,
                unitId: procedures.unitId,
                specialtyId: procedures.specialtyId,
                type: procedures.type,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isPerformedInUnit: procedures.isPerformedInUnit,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            })
            .from(procedures)
            .where(whereClause)
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
        specialtyId?: string | null;
        type: number;
        description: string;
        observation?: string | null;
        code: string;
        price: string;
        isPerformedInUnit?: boolean;
        isActive?: boolean;
    }): Promise<ProcedureProfile> {
        const [inserted] = await this.db
            .insert(procedures)
            .values({
                unitId,
                specialtyId: data.specialtyId ?? null,
                type: data.type,
                description: data.description,
                observation: data.observation ?? null,
                code: data.code,
                price: data.price,
                isPerformedInUnit: data.isPerformedInUnit ?? false,
                isActive: data.isActive ?? true,
            })
            .returning({
                id: procedures.id,
                unitId: procedures.unitId,
                specialtyId: procedures.specialtyId,
                type: procedures.type,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isPerformedInUnit: procedures.isPerformedInUnit,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            });

        return procedureSchema.parse({
            ...inserted,
            createdAt: inserted.createdAt.toISOString(),
            updatedAt: inserted.updatedAt.toISOString(),
        });
    }

    async updateByIdAndUnitId(
        procedureId: string,
        unitId: string,
        data: {
            specialtyId?: string | null;
            type?: number;
            description?: string;
            observation?: string | null;
            code?: string;
            price?: string;
            isPerformedInUnit?: boolean;
            isActive?: boolean;
        },
    ): Promise<ProcedureProfile | null> {
        const [updated] = await this.db
            .update(procedures)
            .set({
                ...(typeof data.specialtyId !== "undefined" ? { specialtyId: data.specialtyId } : {}),
                ...(typeof data.type !== "undefined" ? { type: data.type } : {}),
                ...(typeof data.description !== "undefined" ? { description: data.description } : {}),
                ...(typeof data.observation !== "undefined" ? { observation: data.observation } : {}),
                ...(typeof data.code !== "undefined" ? { code: data.code } : {}),
                ...(typeof data.price !== "undefined" ? { price: data.price } : {}),
                ...(typeof data.isPerformedInUnit !== "undefined" ? { isPerformedInUnit: data.isPerformedInUnit } : {}),
                ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            })
            .where(and(eq(procedures.id, procedureId), eq(procedures.unitId, unitId)))
            .returning({
                id: procedures.id,
            });

        if (!updated) {
            return null;
        }

        const [row] = await this.db
            .select({
                id: procedures.id,
                unitId: procedures.unitId,
                specialtyId: procedures.specialtyId,
                type: procedures.type,
                description: procedures.description,
                observation: procedures.observation,
                code: procedures.code,
                price: procedures.price,
                isPerformedInUnit: procedures.isPerformedInUnit,
                isActive: procedures.isActive,
                createdAt: procedures.createdAt,
                updatedAt: procedures.updatedAt,
            })
            .from(procedures)
            .where(eq(procedures.id, procedureId))
            .limit(1);

        return procedureSchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
}