import { buildApp } from "./app.js";
import { db } from "./db/client.js";
import { UsersRepository } from "./modules/users/users.repository.js";
import { ProfessionalsRepository } from "./modules/professionals/professionals.repository.js";
import { PatientsRepository } from "./modules/patients/patients.repository.js";
import { UnitsRepository } from "./modules/units/units.repository.js";
import { AppointmentsRepository } from "./modules/appointments/appointments.repository.js";
import { betterAuthPlugin } from "./http/plugins/better-auth.js";

const usersRepository = new UsersRepository(db);
const professionalsRepository = new ProfessionalsRepository(db);
const patientsRepository = new PatientsRepository(db);
const unitsRepository = new UnitsRepository(db);
const appointmentsRepository = new AppointmentsRepository(db);
const app = await buildApp({
    db,
    usersRepository,
    professionalsRepository,
    patientsRepository,
    unitsRepository,
    appointmentsRepository,
    authPlugin: betterAuthPlugin,
    withDocs: true,
});
const port = Number(process.env.PORT || 3333);

app.listen(port);

console.log(`🚀 API running on http://localhost:${port}`);
