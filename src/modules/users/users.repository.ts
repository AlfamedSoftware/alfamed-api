import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { users } from "../../db/schema/users.js";
import { userProfileSchema } from "./users.schemas.js";

export type UserProfile = z.infer<typeof userProfileSchema>;

type DatabaseClient = typeof dbType;

export class UsersRepository {
    readonly getUserById: (userId: string) => Promise<UserProfile | null>;

    constructor(db: DatabaseClient) {
        this.getUserById = async (userId: string) => {
            const [result] = await db
                .select({
                    id: users.id,
                    name: users.name,
                    socialName: users.socialName,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    phone: users.phone,
                    email: users.email,
                    sex: users.sex,
                    emailVerified: users.emailVerified,
                    image: users.image,
                    isActive: users.isActive,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    twoFactorEnabled: users.twoFactorEnabled,
                })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (!result) {
                return null;
            }

            return userProfileSchema.parse({
                id: result.id,
                name: result.name,
                socialName: result.socialName,
                cpf: result.cpf,
                birthdate: result.birthdate.toISOString(),
                phone: result.phone,
                email: result.email,
                sex: result.sex,
                emailVerified: result.emailVerified,
                image: result.image,
                isActive: result.isActive,
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
                twoFactorEnabled: result.twoFactorEnabled,
            });
        };
    }
}