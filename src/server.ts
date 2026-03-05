import { buildApp } from "./app";
import { db } from "./db/client";
import { UsersRepository } from "./modules/users/users.repository";
import { betterAuthPlugin } from "./http/plugins/better-auth";
import { env } from "./env";

const usersRepository = new UsersRepository(db);
const app = await buildApp({
    usersRepository,
    authPlugin: betterAuthPlugin,
    withDocs: true,
});

app.listen(env.PORT);

console.log(`🚀 API running on http://localhost:${env.PORT}`);
