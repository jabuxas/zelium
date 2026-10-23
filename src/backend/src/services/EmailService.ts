import nodemailer, { Transporter } from "nodemailer";
import { mailConfig, smtpConfigurado } from "../config/mail";

export type StatusEnvio = "enviada" | "simulada" | "falha";

export interface EmailPayload {
  para: string[];
  assunto: string;
  corpoTexto: string;
  corpoHtml: string;
}

export interface ResultadoEnvio {
  status: StatusEnvio;
  erro?: string;
}

/**
 * Envio de e-mails via SMTP. Sem credenciais configuradas (desenvolvimento,
 * testes, ambientes sem SMTP), o envio é SIMULADO: a mensagem é registrada
 * no log e persistida no banco (tabela `notificacao`) com status "simulada".
 */
export class EmailService {
  private transporter: Transporter | null;

  constructor() {
    this.transporter = smtpConfigurado()
      ? nodemailer.createTransport({
          host: mailConfig.host,
          port: mailConfig.port,
          secure: mailConfig.port === 465,
          auth: {
            user: mailConfig.user,
            pass: mailConfig.password,
          },
        })
      : null;
  }

  async enviar(email: EmailPayload): Promise<ResultadoEnvio> {
    if (!this.transporter) {
      console.log(
        `[notificacao] ENVIO SIMULADO -> ${email.para.join(", ")}: ${email.assunto}`
      );
      return { status: "simulada" };
    }

    try {
      await this.transporter.sendMail({
        from: mailConfig.from,
        to: email.para.join(", "),
        subject: email.assunto,
        text: email.corpoTexto,
        html: email.corpoHtml,
      });
      return { status: "enviada" };
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);
      console.error(`[notificacao] FALHA ao enviar para ${email.para.join(", ")}:`, mensagem);
      return { status: "falha", erro: mensagem };
    }
  }
}
