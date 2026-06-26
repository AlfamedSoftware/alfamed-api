import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { unitParameters } from "../../db/schema/unit-parameters.js";
import { unitParametersSchema } from "./unit-parameters.schemas.js";

type DatabaseClient = typeof dbType;

export type UnitParametersProfile = z.infer<typeof unitParametersSchema>;

export class UnitParametersRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findByUnitId(unitId: string): Promise<UnitParametersProfile | null> {
        const [row] = await this.db
            .select({
                id: unitParameters.id,
                unitId: unitParameters.unitId,
                modulo1GestaoExames: unitParameters.modulo1GestaoExames,
            })
            .from(unitParameters)
            .where(eq(unitParameters.unitId, unitId))
            .limit(1);

        if (!row) {
            return null;
        }

        return unitParametersSchema.parse(row);
    }
}
