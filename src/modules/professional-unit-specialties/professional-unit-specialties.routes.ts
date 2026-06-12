import { Elysia, t } from "elysia"
import {
    professionalUnitSpecialtyListSchema,
    professionalUnitSpecialtySchema,
    createProfessionalUnitSpecialtySchema,
    updateProfessionalUnitSpecialtySchema,
    professionalUnitSpecialtiesErrorSchema,
} from "./professional-unit-specialties.schemas.js"
import { ProfessionalUnitSpecialtiesService } from "./professional-unit-specialties.service.js"
import { ProfessionalUnitSpecialtiesRepository } from "./professional-unit-specialties.repository.js"

export const professionalUnitSpecialtiesRoutes = new Elysia({ prefix: "/professional-unit-specialties" })
    .get(
        "/list-by-professional-unit/:professionalUnitId",
        async ({ params }) => {
            const repository = new ProfessionalUnitSpecialtiesRepository()
            const service = new ProfessionalUnitSpecialtiesService(repository)
            const specialties = await service.listByProfessionalUnit(params.professionalUnitId)
            return specialties
        },
        {
            response: {
                200: professionalUnitSpecialtyListSchema,
            },
        },
    )
    .post(
        "/",
        async ({ body, set }) => {
            const repository = new ProfessionalUnitSpecialtiesRepository()
            const service = new ProfessionalUnitSpecialtiesService(repository)
            try {
                const specialty = await service.create(body)
                return specialty
            } catch (error) {
                if (error instanceof Error && error.message === "Professional unit specialty already exists and is active") {
                    set.status = 409
                    return { message: error.message }
                }
                throw error
            }
        },
        {
            body: createProfessionalUnitSpecialtySchema,
            response: {
                200: professionalUnitSpecialtySchema,
                409: professionalUnitSpecialtiesErrorSchema,
            },
        },
    )
    .patch(
        "/",
        async ({ body }) => {
            const repository = new ProfessionalUnitSpecialtiesRepository()
            const service = new ProfessionalUnitSpecialtiesService(repository)
            const specialty = await service.update(body)
            return specialty
        },
        {
            body: updateProfessionalUnitSpecialtySchema,
            response: {
                200: professionalUnitSpecialtySchema,
            },
        },
    )
