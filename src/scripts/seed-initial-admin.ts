import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { accounts } from "../db/schema/accounts.js";
import { professionals } from "../db/schema/professionals.js";
import { users } from "../db/schema/users.js";

const seedAdminSchema = z.object({
    name: z.string().min(1),
    email: z.email().refine((value) => value.toLowerCase().endsWith("@alfamed.com"), {
        message: "O e-mail do administrador inicial precisa terminar com @alfamed.com",
    }),
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
    const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedInitialAdmin.email))
        .limit(1);

    if (existingUser) {
        console.log(`Usuário admin já existe: ${normalizedInitialAdmin.email}`);
        return;
    }

    const [createdUser] = await db
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

    await db.insert(accounts).values({
        userId: createdUser.id,
        accountId: createdUser.id,
        providerId: "credential",
        password: await hash(normalizedInitialAdmin.password, 12),
        updatedAt: new Date(),
    });

    await db.insert(professionals).values({
        userId: createdUser.id,
        isActive: true,
    });

    console.log(`Usuário admin criado com sucesso: ${normalizedInitialAdmin.email}`);
}

main().catch((error) => {
    console.error("Falha ao criar o usuário admin", error);
    process.exitCode = 1;
});