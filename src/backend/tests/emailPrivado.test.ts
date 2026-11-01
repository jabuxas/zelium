import nodemailer from 'nodemailer';
import { EmailService, EmailPayload } from '../src/services/EmailService';
import { smtpConfigurado } from '../src/config/mail';

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
jest.mock('../src/config/mail', () => ({ mailConfig: {}, smtpConfigurado: jest.fn() }));

const email: EmailPayload = {
  para: ['titular@example.test'], assunto: 'Confirme seu cadastro',
  corpoTexto: 'link-privado', corpoHtml: '<a href="link-privado">Confirmar</a>',
};

afterEach(() => jest.restoreAllMocks());

it('envio privado usa somente o destinatário solicitado e não registra o link', async () => {
  jest.mocked(smtpConfigurado).mockReturnValue(true);
  const sendMail = jest.fn().mockResolvedValue({});
  jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>);
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  expect(await new EmailService().enviar(email, { privado: true })).toEqual({ status: 'enviada' });
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
    to: 'titular@example.test', text: 'link-privado',
  }));
  expect(log).not.toHaveBeenCalled();
});

it('falha privada não expõe erro bruto SMTP, destinatário ou link', async () => {
  jest.mocked(smtpConfigurado).mockReturnValue(true);
  const sendMail = jest.fn().mockRejectedValue(new Error('titular@example.test link-privado credencial-smtp'));
  jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>);
  const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
  const resultado = await new EmailService().enviar(email, { privado: true });
  expect(resultado).toEqual({ status: 'falha', erro: 'Falha no transporte de email privado' });
  expect(erro).not.toHaveBeenCalled();
});

it('sem SMTP não simula envio privado nem registra destinatário', async () => {
  jest.mocked(smtpConfigurado).mockReturnValue(false);
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  expect(await new EmailService().enviar(email, { privado: true }))
    .toEqual({ status: 'falha', erro: 'SMTP nao configurado' });
  expect(log).not.toHaveBeenCalled();
});
