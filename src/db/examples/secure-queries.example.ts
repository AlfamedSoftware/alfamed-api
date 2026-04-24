/**
 * Exemplos de Queries Protegidas com clinicId
 * 
 * Este arquivo mostra como refatorar queries para usar clinicId
 * como filtro obrigatório para garantir isolamento multi-tenant.
 * 
 * PADRÃO SEGURO:
 * - SEMPRE incluir clinicId no WHERE
 * - NUNCA confiar em clinicId do body/params
 * - SEMPRE usar clinicId do context (sessão)
 * 
 * EXEMPLO DE MIGRAÇÃO:
 * 
 * ❌ ANTES (Inseguro):
 * ```typescript
 * const patients = await db.query.patients.findMany({
 *   where: (table) => eq(table.id, patientId)
 * });
 * ```
 * 
 * ✅ DEPOIS (Seguro):
 * ```typescript
 * const patients = await db.query.patients.findMany({
 *   where: (table) => and(
 *     eq(table.id, patientId),
 *     eq(table.clinicId, context.clinicId)  // ← Sempre!
 *   )
 * });
 * ```
 */

import { and, eq } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";

type DatabaseClient = typeof dbType;

/**
 * EXEMPLO 1: Buscar paciente seguramente
 * 
 * Valida que:
 * 1. O paciente existe
 * 2. O paciente pertence à clínica selecionada
 * 3. O usuário está autenticado
 */
export async function getPatientSecurely(
    db: DatabaseClient,
    patientId: string,
    clinicId: string, // ← Sempre vem do context.clinicId
) {
    // TODO: Substituir pela tabela real de pacientes quando disponível
    // const patient = await db.query.patients.findFirst({
    //   where: (table) => and(
    //     eq(table.id, patientId),
    //     eq(table.clinicId, clinicId)  // ← Filtro obrigatório
    //   )
    // });

    // return patient || null;
    return null; // Placeholder
}

/**
 * EXEMPLO 2: Listar pacientes da clínica
 * 
 * Retorna APENAS pacientes da clínica selecionada
 */
export async function listPatientsForClinic(
    db: DatabaseClient,
    clinicId: string,
    limit = 50,
    offset = 0,
) {
    // TODO: Implementar com tabela real
    // const patients = await db.query.patients.findMany({
    //   where: (table) => eq(table.clinicId, clinicId),
    //   limit,
    //   offset,
    // });

    // return patients;
    return [];
}

/**
 * EXEMPLO 3: Criar paciente vinculado à clínica
 * 
 * Garante que o paciente sempre pertença à clínica correta
 */
export async function createPatientForClinic(
    db: DatabaseClient,
    clinicId: string,
    patientData: {
        name: string;
        email: string;
        phone: string;
    },
) {
    // TODO: Implementar com tabela real
    // const patient = await db.insert(patients).values({
    //   id: randomUUID(),
    //   clinicId,  // ← Sempre vem do context, nunca do body
    //   name: patientData.name,
    //   email: patientData.email,
    //   phone: patientData.phone,
    //   createdAt: new Date(),
    // });

    // return patient;
    return null;
}

/**
 * EXEMPLO 4: Proteger DELETE com clinicId
 * 
 * Garante que não é possível deletar pacientes de outra clínica
 */
export async function deletePatientSecurely(
    db: DatabaseClient,
    patientId: string,
    clinicId: string,
) {
    // TODO: Implementar com tabela real
    // const result = await db.delete(patients).where(
    //   and(
    //     eq(patients.id, patientId),
    //     eq(patients.clinicId, clinicId)  // ← Sem isso, pode deletar de outra clínica!
    //   )
    // );

    // return result.rowsAffected > 0;
    return false;
}

/**
 * EXEMPLO 5: Proteger UPDATE com clinicId
 * 
 * Garante que apenas pacientes da clínica podem ser atualizados
 */
export async function updatePatientSecurely(
    db: DatabaseClient,
    patientId: string,
    clinicId: string,
    updates: {
        name?: string;
        email?: string;
        phone?: string;
    },
) {
    // TODO: Implementar com tabela real
    // const result = await db.update(patients)
    //   .set(updates)
    //   .where(
    //     and(
    //       eq(patients.id, patientId),
    //       eq(patients.clinicId, clinicId)  // ← Obrigatório!
    //     )
    //   );

    // return result.rowsAffected > 0;
    return false;
}

/**
 * EXEMPLO 6: Proteger JOINS com clinicId
 * 
 * Quando fazer JOIN entre tabelas, validar clinicId em ambas
 */
export async function getPatientWithAppointments(
    db: DatabaseClient,
    patientId: string,
    clinicId: string,
) {
    // TODO: Implementar com tabelas reais
    // const patient = await db.query.patients.findFirst({
    //   where: (table) => and(
    //     eq(table.id, patientId),
    //     eq(table.clinicId, clinicId)  // ← Filtro em patients
    //   ),
    //   with: {
    //     appointments: {
    //       where: (table) => eq(table.clinicId, clinicId)  // ← Filtro em appointments também!
    //     }
    //   }
    // });

    // return patient;
    return null;
}

/**
 * EXEMPLO 7: Checklist de Segurança
 * 
 * Antes de commitar qualquer query, validate:
 * 
 * ✅ O WHERE inclui `clinicId`?
 * ✅ O clinicId vem do context, não do body/params?
 * ✅ JOINS também filtraram por clinicId?
 * ✅ DELETE, UPDATE, INSERT tudo usa clinicId?
 * ✅ Não há tratamento especial para clinicId no body?
 * ✅ O tipo está correto (vem de ClinicContext)?
 */
