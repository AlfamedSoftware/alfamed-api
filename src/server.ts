import { buildApp } from "./app.js";
import { db } from "./db/client.js";
import { UsersRepository } from "./modules/users/users.repository.js";
import { ProfessionalsRepository } from "./modules/professionals/professionals.repository.js";
import { betterAuthPlugin } from "./http/plugins/better-auth.js";

const usersRepository = new UsersRepository(db);
const professionalsRepository = new ProfessionalsRepository(db);
const app = await buildApp({
    usersRepository,
    professionalsRepository,
    authPlugin: betterAuthPlugin,
    withDocs: true,
});
const port = Number(process.env.PORT || 3333);

app.listen(port);

console.log(`🚀 API running on http://localhost:${port}`);
