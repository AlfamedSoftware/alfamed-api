import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { accounts } from "../db/schema/accounts.js";
import { professionalUnitRoles } from "../db/schema/professional-unit-roles.js";
import { professionalUnits } from "../db/schema/professional-units.js";
import { professionals } from "../db/schema/professionals.js";
import { roles } from "../db/schema/roles.js";
import { units } from "../db/schema/units.js";
import { users } from "../db/schema/users.js";

const INTERNAL_ALFAMED_UNIT_NAME = "Alfamed Interno";
const INTERNAL_ALFAMED_ROLE_KEY = "internal_alfamed";
const DEFAULT_ROLES = [
    {
        description: "Administrador",
        key: "administrative",
        internal: false,
    },
    {
        description: "Assistente Administrativo",
        key: "administrative_assistant",
        internal: false,
    },
    {
        description: "Médico",
        key: "medic",
        internal: false,
    },
    {
        description: "Alfamed",
        key: INTERNAL_ALFAMED_ROLE_KEY,
        internal: true,
    },
] as const;

const seedAdminSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
    cpf: z.string().min(11).max(14),
    phone: z.string().min(8),
    birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD"),
});

const initialAdmin = seedAdminSchema.parse({
    name: process.env.INITIAL_ADMIN_NAME,
    email: process.env.INITIAL_ADMIN_EMAIL,
    password: process.env.INITIAL_ADMIN_PASSWORD,
    cpf: process.env.INITIAL_ADMIN_CPF,
    phone: process.env.INITIAL_ADMIN_PHONE,
    birthdate: process.env.INITIAL_ADMIN_BIRTHDATE,
});

const normalizedInitialAdmin = {
    ...initialAdmin,
    email: initialAdmin.email.toLowerCase(),
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
    const result = await db.transaction(async (tx) => {
        // Etapa 1: garantir que as roles base existam antes de qualquer vínculo.
        await ensureDefaultRoles(tx);

        // Etapa 2: localizar a role interna que libera acesso ao painel admin.
        const [internalRole] = await tx
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.key, INTERNAL_ALFAMED_ROLE_KEY))
            .limit(1);

        if (!internalRole) {
            throw new Error(`Role obrigatória não encontrada: ${INTERNAL_ALFAMED_ROLE_KEY}`);
        }

        // Etapa 3: reaproveitar o usuário admin se ele já existir.
        const [existingUser] = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, normalizedInitialAdmin.email))
            .limit(1);

        // Etapa 4: criar o usuário administrador quando ele ainda não existir.
        const userId = existingUser?.id ?? (await createInitialAdminUser(tx));

        // Etapa 5: criar a credencial apenas para o primeiro cadastro do usuário.
        if (!existingUser) {
            await tx.insert(accounts).values({
                userId,
                accountId: userId,
                providerId: "credential",
                password: await hash(normalizedInitialAdmin.password, 12),
                updatedAt: new Date(),
            });
        }

        // Etapa 6: garantir o perfil profissional vinculado ao usuário admin.
        const professionalId = await ensureInitialAdminProfessional(tx, userId);

        // Etapa 7: garantir a unidade interna da Alfamed.
        const unitId = await ensureInternalUnit(tx);

        // Etapa 8: vincular o profissional admin à unidade interna.
        const professionalUnitId = await ensureProfessionalUnit(tx, professionalId, unitId);

        // Etapa 9: aplicar a role interna ao vínculo profissional-unidade.
        await ensureProfessionalUnitRole(tx, professionalUnitId, internalRole.id);

        return {
            createdUser: !existingUser,
            email: normalizedInitialAdmin.email,
        };
    });

    const message = result.createdUser ? "Usuário admin criado com sucesso" : "Usuário admin já existe";
    console.log(`${message}: ${result.email}`);
}

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ensureDefaultRoles(tx: TransactionClient) {
    // Cria apenas as roles que ainda não existem para manter o seed idempotente.
    for (const defaultRole of DEFAULT_ROLES) {
        const [existingRole] = await tx
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.key, defaultRole.key))
            .limit(1);

        if (existingRole) {
            continue;
        }

        await tx.insert(roles).values({
            description: defaultRole.description,
            key: defaultRole.key,
            internal: defaultRole.internal,
            isActive: true,
        });
    }
}

async function createInitialAdminUser(tx: TransactionClient) {
    // Insere o usuário principal do ambiente interno.
    const [createdUser] = await tx
        .insert(users)
        .values({
            name: normalizedInitialAdmin.name,
            email: normalizedInitialAdmin.email,
            cpf: normalizedInitialAdmin.cpf,
            phone: normalizedInitialAdmin.phone,
            birthdate: toDate(normalizedInitialAdmin.birthdate),
            emailVerified: true,
            isActive: true,
        })
        .returning({
            id: users.id,
        });

    return createdUser.id;
}

async function ensureInitialAdminProfessional(tx: TransactionClient, userId: string) {
    // Cria o cadastro profissional do admin se ele ainda não existir.
    const [existingProfessional] = await tx
        .select({ id: professionals.id })
        .from(professionals)
        .where(eq(professionals.userId, userId))
        .limit(1);

    if (existingProfessional) {
        return existingProfessional.id;
    }

    const [createdProfessional] = await tx
        .insert(professionals)
        .values({
            userId,
            isActive: true,
        })
        .returning({
            id: professionals.id,
        });

    return createdProfessional.id;
}

async function ensureInternalUnit(tx: TransactionClient) {
    // Reutiliza a unidade interna quando já existir no banco.
    const [existingInternalUnit] = await tx
        .select({ id: units.id })
        .from(units)
        .where(eq(units.name, INTERNAL_ALFAMED_UNIT_NAME))
        .limit(1);

    if (existingInternalUnit) {
        return existingInternalUnit.id;
    }

    const [createdInternalUnit] = await tx
        .insert(units)
        .values({
            name: INTERNAL_ALFAMED_UNIT_NAME,
            cnpj: null,
            address: null,
            city: null,
            state: null,
            phone: null,
            email: null,
            ownerUserId: null,
            isActive: true,
        })
        .returning({
            id: units.id,
        });

    return createdInternalUnit.id;
}

async function ensureProfessionalUnit(tx: TransactionClient, professionalId: string, unitId: string) {
    // Garante que o vínculo entre profissional e unidade exista apenas uma vez.
    const [existingProfessionalUnit] = await tx
        .select({ id: professionalUnits.id })
        .from(professionalUnits)
        .where(
            and(
                eq(professionalUnits.professionalId, professionalId),
                eq(professionalUnits.unitId, unitId),
            ),
        )
        .limit(1);

    if (existingProfessionalUnit) {
        return existingProfessionalUnit.id;
    }

    const [createdProfessionalUnit] = await tx
        .insert(professionalUnits)
        .values({
            professionalId,
            unitId,
            isActive: true,
        })
        .returning({
            id: professionalUnits.id,
        });

    return createdProfessionalUnit.id;
}

async function ensureProfessionalUnitRole(
    tx: TransactionClient,
    professionalUnitId: string,
    roleId: string,
) {
    // Aplica a role interna ao vínculo sem duplicar registros.
    const [existingProfessionalUnitRole] = await tx
        .select({ id: professionalUnitRoles.id })
        .from(professionalUnitRoles)
        .where(
            and(
                eq(professionalUnitRoles.professionalUnitId, professionalUnitId),
                eq(professionalUnitRoles.roleId, roleId),
            ),
        )
        .limit(1);

    if (existingProfessionalUnitRole) {
        return;
    }

    await tx.insert(professionalUnitRoles).values({
        professionalUnitId,
        roleId,
        isActive: true,
    });
}

main().catch((error) => {
    console.error("Falha ao criar o usuário admin", error);
    process.exitCode = 1;
});
