import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { unitParameters } from "../../db/schema/unit-parameters.js";
import { procedures } from "../../db/schema/procedures.js";
import { requests } from "../../db/schema/requests.js";
import { requestLogs } from "../../db/schema/request-logs.js";
import { requestsStatus } from "../../db/schema/requests-status.js";
import { externalRequests } from "../../db/schema/external-requests.js";

type DatabaseClient = typeof dbType;

export class RequestsRepository {
    constructor(private readonly db: DatabaseClient) {}

    /**
     * Grava os exames selecionados em um atendimento, separando entre pedidos
     * internos (requests) e externos (external_requests) conforme as regras:
     *  - Se a unidade tem modulo1GestaoExames = false => todos vão para external_requests.
     *  - Se true => procedures.isPerformedInUnit ? requests : external_requests.
     */
    async saveExamRequests(appointmentId: string, procedureIds: string[]): Promise<void> {
        const ids = [...new Set(procedureIds.filter(Boolean))];
        if (ids.length === 0) return;

        // 1. Deriva unitId (da unidade profissional do atendimento) e o userId do
        //    profissional responsável (changedBy dos logs).
        const [appointment] = await this.db
            .select({
                unitId: professionalUnits.unitId,
                userId: professionals.userId,
            })
            .from(appointments)
            .innerJoin(professionalUnits, eq(appointments.professionalUnitId, professionalUnits.id))
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .where(eq(appointments.id, appointmentId))
            .limit(1);

        if (!appointment) return;

        // 2. Parâmetro da unidade.
        const [parameters] = await this.db
            .select({ modulo1GestaoExames: unitParameters.modulo1GestaoExames })
            .from(unitParameters)
            .where(eq(unitParameters.unitId, appointment.unitId))
            .limit(1);

        const gestaoExames = parameters?.modulo1GestaoExames ?? false;

        // 3. Procedimentos (somente os que pertencem à unidade), com isPerformedInUnit.
        const procs = await this.db
            .select({ id: procedures.id, isPerformedInUnit: procedures.isPerformedInUnit })
            .from(procedures)
            .where(and(eq(procedures.unitId, appointment.unitId), inArray(procedures.id, ids)));

        // Idempotência: ignora procedimentos que já possuem pedido ativo neste
        // atendimento, evitando duplicar caso a função seja chamada novamente
        // (ex.: retry de finalização).
        const [existingInternal, existingExternal] = await Promise.all([
            this.db
                .select({ procedureId: requests.procedureId })
                .from(requests)
                .where(and(eq(requests.appointmentId, appointmentId), eq(requests.isActive, true))),
            this.db
                .select({ procedureId: externalRequests.procedureId })
                .from(externalRequests)
                .where(and(eq(externalRequests.appointmentId, appointmentId), eq(externalRequests.isActive, true))),
        ]);
        const alreadySaved = new Set([
            ...existingInternal.map((r) => r.procedureId),
            ...existingExternal.map((r) => r.procedureId),
        ]);

        // 4. Separa as listas.
        const internalIds: string[] = [];
        const externalIds: string[] = [];
        for (const proc of procs) {
            if (alreadySaved.has(proc.id)) continue;
            if (gestaoExames && proc.isPerformedInUnit) {
                internalIds.push(proc.id);
            } else {
                externalIds.push(proc.id);
            }
        }

        // 5. Grava.
        await this.createInternalRequests(appointmentId, internalIds, appointment.userId);
        await this.createExternalRequests(appointmentId, externalIds);
    }

    /**
     * Cria pedidos internos (requests) no status inicial 1 (Prescrito), cada um com
     * o log inicial de transição (null -> 1) em request_logs.
     */
    async createInternalRequests(
        appointmentId: string,
        procedureIds: string[],
        changedByUserId: string,
    ): Promise<void> {
        if (procedureIds.length === 0) return;

        const [status] = await this.db
            .select({ id: requestsStatus.id })
            .from(requestsStatus)
            .where(eq(requestsStatus.code, 1))
            .limit(1);

        if (!status) {
            throw new Error("Requests status with code 1 (Prescrito) not found");
        }

        for (const procedureId of procedureIds) {
            const requestId = randomUUID();

            await this.db.insert(requests).values({
                id: requestId,
                appointmentId,
                procedureId,
                professionalUnitId: null,
                statusId: status.id,
                isActive: true,
            });

            await this.db.insert(requestLogs).values({
                requestId,
                oldStatusId: null,
                newStatusId: status.id,
                changedBy: changedByUserId,
                observation: null,
            });
        }
    }

    /** Lista os exames (internos e externos) gravados em um atendimento. */
    async listByAppointment(appointmentId: string): Promise<Array<{
        id: string;
        procedureId: string;
        description: string;
        kind: "internal" | "external";
        statusCode: number | null;
        statusDescription: string | null;
    }>> {
        const internal = await this.db
            .select({
                id: requests.id,
                procedureId: requests.procedureId,
                description: procedures.description,
                statusCode: requestsStatus.code,
                statusDescription: requestsStatus.description,
            })
            .from(requests)
            .innerJoin(procedures, eq(requests.procedureId, procedures.id))
            .innerJoin(requestsStatus, eq(requests.statusId, requestsStatus.id))
            .where(and(eq(requests.appointmentId, appointmentId), eq(requests.isActive, true)));

        const external = await this.db
            .select({
                id: externalRequests.id,
                procedureId: externalRequests.procedureId,
                description: procedures.description,
            })
            .from(externalRequests)
            .innerJoin(procedures, eq(externalRequests.procedureId, procedures.id))
            .where(and(eq(externalRequests.appointmentId, appointmentId), eq(externalRequests.isActive, true)));

        return [
            ...internal.map((r) => ({
                id: r.id,
                procedureId: r.procedureId,
                description: r.description,
                kind: "internal" as const,
                statusCode: r.statusCode,
                statusDescription: r.statusDescription,
            })),
            ...external.map((r) => ({
                id: r.id,
                procedureId: r.procedureId,
                description: r.description,
                kind: "external" as const,
                statusCode: null,
                statusDescription: null,
            })),
        ];
    }

    /** Cria pedidos externos (external_requests). Sem status nem log. */
    async createExternalRequests(appointmentId: string, procedureIds: string[]): Promise<void> {
        if (procedureIds.length === 0) return;

        await this.db.insert(externalRequests).values(
            procedureIds.map((procedureId) => ({
                id: randomUUID(),
                appointmentId,
                procedureId,
                isActive: true,
            })),
        );
    }
}
