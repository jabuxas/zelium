import { Responsavel } from "../models/Responsavel";
import { Usuario } from "../models/Usuario";
import { Notificacao, NotificacaoTipo } from "../models/Notificacao";
import { EmailService } from "./EmailService";
import { currentOrgId, DEFAULT_ORG_ID } from "../context/requestContext";

export interface NotificarParams {
  tipo: NotificacaoTipo;
  assunto: string;
  corpo: string;
  responsavelId?: number | null;
  destinatariosExtras?: string[];
}

const emailService = new EmailService();

/**
 * Resolve os destinatários padrão de uma organização:
 *   - o responsável pelo patrimônio (quando informado)
 *   - todos os gestores ativos da organização
 */
async function destinatariosDaOrganizacao(
  organizacaoId: number,
  responsavelId?: number | null
): Promise<string[]> {
  const emails = new Set<string>();

  if (responsavelId) {
    const responsavel = await Responsavel.findByPk(responsavelId);
    if (responsavel?.email) emails.add(responsavel.email);
  }

  const gestores = await Usuario.findAll({
    where: { papel: "gestor", ativo: true, organizacao_id: organizacaoId },
    attributes: ["email"],
  });
  for (const gestor of gestores) {
    if (gestor.email) emails.add(gestor.email);
  }

  return [...emails];
}

export class NotificacaoService {
  /**
   * Cria o registro da notificação e dispara o e-mail em segundo plano
   * (fire-and-forget). Sem SMTP configurado, o envio é simulado.
   */
  async notificar(params: NotificarParams): Promise<void> {
    const organizacaoId = currentOrgId() ?? DEFAULT_ORG_ID;

    try {
      const destinatarios = new Set<string>(params.destinatariosExtras ?? []);
      for (const email of await destinatariosDaOrganizacao(
        organizacaoId,
        params.responsavelId
      )) {
        destinatarios.add(email);
      }

      const lista = [...destinatarios];
      if (lista.length === 0) {
        console.log(
          `[notificacao] ${params.tipo}: sem destinatarios, ignorando`
        );
        return;
      }

      const notificacao = await Notificacao.create({
        organizacao_id: organizacaoId,
        tipo: params.tipo,
        assunto: params.assunto,
        corpo: params.corpo,
        destinatarios: lista,
        status: "pendente",
      });

      // Disparo assíncrono: não bloqueia a resposta da API
      void emailService
        .enviar({
          para: lista,
          assunto: params.assunto,
          corpoTexto: params.corpo,
          corpoHtml: `<div style="font-family:sans-serif">${params.corpo.replace(/\n/g, "<br/>")}</div>`,
        })
        .then((resultado) =>
          notificacao.update({
            status: resultado.status,
            erro: resultado.erro ?? null,
          })
        )
        .catch((err) =>
          notificacao
            .update({
              status: "falha",
              erro: err instanceof Error ? err.message : String(err),
            })
            .catch(() => undefined)
        );
    } catch (err) {
      // Notificação jamais pode derrubar o fluxo principal
      console.error("[notificacao] falha ao registrar:", err);
    }
  }

  async listar(limit = 50): Promise<Notificacao[]> {
    return Notificacao.findAll({
      order: [["created_at", "DESC"]],
      limit,
    });
  }
}
