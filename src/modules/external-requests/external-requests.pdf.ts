import PDFDocument from "pdfkit";

type RequisitionData = {
    unit: {
        name: string;
        address: string | null;
        city: string | null;
        state: string | null;
        phone: string | null;
    };
    patient: {
        name: string;
        socialName: string | null;
        cpf: string;
        birthdate: Date;
    };
    professional: {
        name: string;
        crm: string | null;
    };
    exams: Array<{
        code: string;
        description: string;
        observation: string | null;
    }>;
};

function formatCpf(cpf: string): string {
    const d = cpf.replace(/\D/g, "");
    return d.length === 11
        ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
        : cpf;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function generateRequisitionPdf(data: RequisitionData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const left = 50;
        const right = doc.page.width - 50;
        const contentWidth = right - left;

        const line = () => doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#999").stroke().strokeColor("#000");

        // === CABEÇALHO ===
        doc.fontSize(16).font("Helvetica-Bold").text(data.unit.name, { align: "center" });

        const locationParts = [
            data.unit.address,
            [data.unit.city, data.unit.state].filter(Boolean).join("/"),
        ].filter(Boolean);

        if (locationParts.length > 0) {
            doc.fontSize(9).font("Helvetica").text(locationParts.join(" — "), { align: "center" });
        }
        if (data.unit.phone) {
            doc.fontSize(9).font("Helvetica").text(`Tel: ${data.unit.phone}`, { align: "center" });
        }

        doc.moveDown(0.6);
        line();
        doc.moveDown(0.6);

        // === TÍTULO ===
        doc.fontSize(13).font("Helvetica-Bold").text("REQUISIÇÃO DE EXAMES", { align: "center" });
        doc.moveDown(0.4);
        doc.fontSize(9).font("Helvetica").text(`Data de emissão: ${formatDate(new Date())}`, { align: "right" });
        doc.moveDown(0.6);
        line();
        doc.moveDown(0.8);

        // === PACIENTE ===
        const patientName = data.patient.socialName ?? data.patient.name;

        doc.fontSize(10)
            .font("Helvetica-Bold").text("Paciente: ", { continued: true })
            .font("Helvetica").text(patientName);

        doc.fontSize(10)
            .font("Helvetica-Bold").text("CPF: ", { continued: true })
            .font("Helvetica").text(formatCpf(data.patient.cpf), { continued: true })
            .font("Helvetica-Bold").text("     Nascimento: ", { continued: true })
            .font("Helvetica").text(formatDate(data.patient.birthdate));

        doc.moveDown(0.8);

        // === PROFISSIONAL ===
        doc.fontSize(10)
            .font("Helvetica-Bold").text("Médico(a): ", { continued: true })
            .font("Helvetica").text(data.professional.name, { continued: !!data.professional.crm });

        if (data.professional.crm) {
            doc.font("Helvetica-Bold").text("     CRM: ", { continued: true })
                .font("Helvetica").text(data.professional.crm);
        }

        doc.moveDown(0.8);
        line();
        doc.moveDown(0.8);

        // === EXAMES ===
        doc.fontSize(11).font("Helvetica-Bold").text("EXAMES SOLICITADOS:");
        doc.moveDown(0.6);

        if (data.exams.length === 0) {
            doc.fontSize(10).font("Helvetica").fillColor("#666").text("Nenhum exame solicitado neste atendimento.");
            doc.fillColor("#000");
        } else {
            for (const exam of data.exams) {
                doc.fontSize(10)
                    .font("Helvetica-Bold").text(`• ${exam.code}`, { continued: true })
                    .font("Helvetica").text(` — ${exam.description}`);

                if (exam.observation) {
                    doc.fontSize(9).font("Helvetica").fillColor("#444")
                        .text(`   Obs: ${exam.observation}`, { indent: 10 });
                    doc.fillColor("#000");
                }

                doc.moveDown(0.4);
            }
        }

        doc.moveDown(1.5);
        line();
        doc.moveDown(1.5);

        // === ASSINATURA ===
        const sigLineWidth = 200;
        const sigX = left + (contentWidth - sigLineWidth) / 2;
        const sigY = doc.y;

        doc.moveTo(sigX, sigY).lineTo(sigX + sigLineWidth, sigY).stroke();
        doc.moveDown(0.4);

        const sigLabel = data.professional.crm
            ? `${data.professional.name} — CRM: ${data.professional.crm}`
            : data.professional.name;

        doc.fontSize(9).font("Helvetica").text(sigLabel, { align: "center" });

        doc.end();
    });
}
