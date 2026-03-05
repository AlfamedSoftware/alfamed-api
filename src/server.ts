import { buildApp } from "./app";
import { db } from "./db/client";
import { UsersRepository } from "./modules/users/users.repository";
import { betterAuthPlugin } from "./http/plugins/better-auth";

const usersRepository = new UsersRepository(db);
const app = await buildApp({
    usersRepository,
    authPlugin: betterAuthPlugin,
    withDocs: true,
});
const port = Number(process.env.PORT || 3333);

app.listen(port);

console.log(`🚀 API running on http://localhost:${port}`);
