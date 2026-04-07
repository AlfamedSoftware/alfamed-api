-- Migration para adicionar FKs nas tabelas criadas

ALTER TABLE "requests" 
ADD CONSTRAINT "requests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;

ALTER TABLE "requests_procedures" 
ADD CONSTRAINT "requests_procedures_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE,
ADD CONSTRAINT "requests_procedures_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE CASCADE;

ALTER TABLE "request_status_logs" 
ADD CONSTRAINT "request_status_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE,
ADD CONSTRAINT "request_status_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id");

ALTER TABLE "requests_procedures_outcomes" 
ADD CONSTRAINT "requests_procedures_outcomes_request_procedure_id_fkey" FOREIGN KEY ("request_procedure_id") REFERENCES "requests_procedures"("id") ON DELETE CASCADE,
ADD CONSTRAINT "requests_procedures_outcomes_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id");
