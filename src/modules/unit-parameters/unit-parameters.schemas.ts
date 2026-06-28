import { t } from "elysia";
import { z } from "zod";

export const unitParametersSchema = z.object({
    id: z.string().uuid(),
    unitId: z.string().uuid(),
    modulo1GestaoExames: z.boolean(),
});

export const unitParametersErrorSchema = t.Object({ message: t.String() });
