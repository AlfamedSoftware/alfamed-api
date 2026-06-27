import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { patients } from "../../db/schema/patients.js";
import { users } from "../../db/schema/users.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { units } from "../../db/schema/units.js";
import { externalRequests } from "../../db/schema/external-requests.js";
import { procedures } from "../../db/schema/procedures.js";

type DatabaseClient = typeof dbType;

export class ExternalRequestsRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findRequisitionData(appointmentId: string) {
        const patientUser = alias(users, "patient_user");
        const professionalUser = alias(users, "professional_user");

        const [row] = await this.db
            .select({
                unit: {
                    name: units.name,
                    address: units.address,
                    city: units.city,
                    state: units.state,
                    phone: units.phone,
                },
                patient: {
                    name: patientUser.name,
                    socialName: patientUser.socialName,
                    cpf: patientUser.cpf,
                    birthdate: patientUser.birthdate,
                },
                professional: {
                    name: professionalUser.name,
                    crm: professionals.crm,
                },
            })
            .from(appointments)
            .innerJoin(professionalUnits, eq(appointments.professionalUnitId, professionalUnits.id))
            .innerJoin(units, eq(professionalUnits.unitId, units.id))
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .innerJoin(professionalUser, eq(professionals.userId, professionalUser.id))
            .innerJoin(patients, eq(appointments.patientId, patients.id))
            .innerJoin(patientUser, eq(patients.userId, patientUser.id))
            .where(eq(appointments.id, appointmentId))
            .limit(1);

        return row ?? null;
    }

    async listExamsByAppointmentId(appointmentId: string) {
        const rows = await this.db
            .select({
                code: procedures.code,
                description: procedures.description,
                observation: procedures.observation,
            })
            .from(externalRequests)
            .innerJoin(procedures, eq(externalRequests.procedureId, procedures.id))
            .where(eq(externalRequests.appointmentId, appointmentId));

        return rows;
    }
}
