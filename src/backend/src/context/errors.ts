export class ReferenciaDeOutraOrganizacaoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ReferenciaDeOutraOrganizacaoError";
  }
}
