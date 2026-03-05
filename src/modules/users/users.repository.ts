import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "@/db/client";
import { users } from "@/db/schema/users";
import { userProfileSchema } from "./users.schemas";

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
                    email: users.email,
                    emailVerified: users.emailVerified,
                    image: users.image,
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
                user: {
                    id: result.id,
                    name: result.name,
                    email: result.email,
                    emailVerified: result.emailVerified,
                    image: result.image,
                    createdAt: result.createdAt.toISOString(),
                    updatedAt: result.updatedAt.toISOString(),
                    twoFactorEnabled: result.twoFactorEnabled,
                },
            });
        };
    }
}