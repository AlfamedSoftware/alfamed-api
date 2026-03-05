import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "@/db/client";
import { users } from "@/db/schema/users";
import { professionals } from "@/db/schema/professionals";
import { userProfileSchema } from "./users.schemas";

export type UserProfile = z.infer<typeof userProfileSchema>;

export interface UsersRepository {
    findProfileById(userId: string): Promise<UserProfile | null>;
}

type DatabaseClient = typeof dbType;

export class DrizzleUsersRepository implements UsersRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findProfileById(userId: string): Promise<UserProfile | null> {
        const [result] = await this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                sex: users.sex,
                professionalId: professionals.id,
            })
            .from(users)
            .leftJoin(professionals, eq(professionals.userId, users.id))
            .where(eq(users.id, userId))
            .limit(1);

        if (!result) {
            return null;
        }

        return userProfileSchema.parse({
            id: result.id,
            name: result.name,
            email: result.email,
            sex: result.sex,
            role: result.professionalId ? "professional" : "patient",
        });
    }
}
