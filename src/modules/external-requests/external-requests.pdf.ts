import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { join } from "node:path";

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

const BLUE = "#1B4F72";
const GRAY = "#666666";
const LIGHT_GRAY = "#cccccc";

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

        const divider = (color = LIGHT_GRAY) =>
            doc
                .moveTo(left, doc.y)
                .lineTo(right, doc.y)
                .strokeColor(color)
                .stroke()
                .strokeColor("#000000");

        const sectionLabel = (text: string) =>
            doc
                .fontSize(8)
                .font("Helvetica-Bold")
                .fillColor(GRAY)
                .text(text.toUpperCase(), { align: "left" })
                .fillColor("#000000");

        // ================================================================
        // 1. HEADER — Logo + Alfamed
        // ================================================================
        const logoPath = join(process.cwd(), "assets", "images", "logo.png");
        const hasLogo = existsSync(logoPath);
        const logoSize = 52;
        const headerY = doc.y;

        if (hasLogo) {
            doc.image(logoPath, left, headerY, { width: logoSize, height: logoSize });
        }

        // Texto "Alfamed" posicionado ao lado da logo
        doc.fontSize(30)
            .font("Helvetica-Bold")
            .fillColor(BLUE)
            .text("Alfamed", left + (hasLogo ? logoSize + 14 : 0), headerY + 6, { lineBreak: false });

        // Reseta o cursor para a margem esquerda após o texto com coordenadas explícitas
        doc.x = left;
        doc.y = headerY + logoSize + 14;
        doc.fillColor("#000000");

        divider(BLUE);
        doc.moveDown(0.6);

        // ================================================================
        // 5. TÍTULO — Requisição de Exames
        // ================================================================
        doc.fontSize(14).font("Helvetica-Bold").fillColor(BLUE)
            .text("REQUISIÇÃO DE EXAMES", { align: "center" });
        doc.fillColor("#000000");
        doc.moveDown(0.5);
        divider();
        doc.moveDown(0.6);

        // ================================================================
        // 2. UNIDADE
        // ================================================================
        sectionLabel("Unidade");
        doc.moveDown(0.15);

        doc.fontSize(11).font("Helvetica-Bold").text(data.unit.name, { align: "left" });

        const locationParts = [
            data.unit.address,
            [data.unit.city, data.unit.state].filter(Boolean).join("/"),
        ].filter(Boolean);

        if (locationParts.length > 0) {
            doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(locationParts.join(" — "), { align: "left" });
        }
        if (data.unit.phone) {
            doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(`Tel: ${data.unit.phone}`, { align: "left" });
        }
        doc.fillColor("#000000");

        doc.moveDown(0.5);

        // ================================================================
        // 3. MÉDICO
        // ================================================================
        sectionLabel("Médico Responsável");
        doc.moveDown(0.15);

        doc.fontSize(11).font("Helvetica-Bold").text(data.professional.name, { align: "left" });
        if (data.professional.crm) {
            doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(`CRM: ${data.professional.crm}`, { align: "left" });
            doc.fillColor("#000000");
        }

        doc.moveDown(0.5);

        // ================================================================
        // 4. PACIENTE
        // ================================================================
        sectionLabel("Paciente");
        doc.moveDown(0.15);

        const patientName = data.patient.socialName ?? data.patient.name;
        doc.fontSize(12).font("Helvetica-Bold").text(patientName, { align: "left" });
        doc.moveDown(0.15);

        doc.fontSize(9).font("Helvetica").fillColor(GRAY)
            .text(
                `CPF: ${formatCpf(data.patient.cpf)}   •   Nascimento: ${formatDate(data.patient.birthdate)}`,
                { align: "left" },
            );
        doc.fillColor("#000000");

        doc.moveDown(0.6);
        divider();
        doc.moveDown(0.6);

        // ================================================================
        // 6. EXAMES
        // ================================================================
        sectionLabel("Exames Solicitados");
        doc.moveDown(0.3);

        if (data.exams.length === 0) {
            doc.fontSize(10).font("Helvetica").fillColor(GRAY)
                .text("Nenhum exame solicitado neste atendimento.", { align: "left" });
            doc.fillColor("#000000");
        } else {
            for (let i = 0; i < data.exams.length; i++) {
                const exam = data.exams[i];

                doc.fontSize(10)
                    .font("Helvetica-Bold").text(`${i + 1}.  ${exam.code}`, { continued: true })
                    .font("Helvetica").text(`   ${exam.description}`);

                if (exam.observation) {
                    doc.fontSize(9).font("Helvetica").fillColor(GRAY)
                        .text(`Obs: ${exam.observation}`, { indent: 20 });
                    doc.fillColor("#000000");
                }

                doc.moveDown(0.5);
            }
        }
        divider();

        // ================================================================
        // 7. ASSINATURA — fixada no rodapé da página
        // ================================================================
        const sigLineWidth = 230;
        const sigX = left + (contentWidth - sigLineWidth) / 2;

        // Reserva espaço para: linha + nome + crm + data de emissão
        const sigBlockHeight = 58;
        const sigY = doc.page.height - 50 - sigBlockHeight;

        doc.moveTo(sigX, sigY).lineTo(sigX + sigLineWidth, sigY)
            .strokeColor("#333333").stroke().strokeColor("#000000");

        doc.fontSize(10).font("Helvetica-Bold")
            .text(data.professional.name, left, sigY + 8, { width: contentWidth, align: "center" });

        if (data.professional.crm) {
            doc.fontSize(9).font("Helvetica").fillColor(GRAY)
                .text(`CRM: ${data.professional.crm}`, left, doc.y + 2, { width: contentWidth, align: "center" });
            doc.fillColor("#000000");
        }

        doc.fontSize(9).font("Helvetica").fillColor(GRAY)
            .text(`Emitido em ${formatDate(new Date())}`, left, doc.y + 6, { width: contentWidth, align: "center" });
        doc.fillColor("#000000");

        doc.end();
    });
}
