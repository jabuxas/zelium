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
 * testes, ambientes sem SMTP), o envio operacional é SIMULADO (metadados no
 * log; persistência é responsabilidade de NotificacaoService). E-mails de
 * acesso usam privado=true: sem simulação ou log de destinatário/erro bruto.
 */
export class EmailService {
  private transporter: Transporter | null;

  constructor() {
    this.transporter = smtpConfigurado()
      ? nodemailer.createTransport({
          host: mailConfig.host,
          port: mailConfig.port,
          secure: mailConfig.port === 465,
          connectionTimeout: 10_000,
          socketTimeout: 20_000,
          auth: {
            user: mailConfig.user,
            pass: mailConfig.password,
          },
        })
      : null;
  }

  async enviar(email: EmailPayload, options: { privado?: boolean } = {}): Promise<ResultadoEnvio> {
    if (!this.transporter) {
      if (options.privado) return { status: 'falha', erro: 'SMTP nao configurado' };
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
      if (options.privado) return { status: 'falha', erro: 'Falha no transporte de email privado' };
      const mensagem = err instanceof Error ? err.message : String(err);
      console.error(`[notificacao] FALHA ao enviar para ${email.para.join(", ")}:`, mensagem);
      return { status: "falha", erro: mensagem };
    }
  }
}
