export const mailConfig = {
  host: process.env.SMTP_HOST ?? "",
  port: Number(process.env.SMTP_PORT ?? 587),
  user: process.env.SMTP_USER ?? "",
  password: process.env.SMTP_PASSWORD ?? "",
  from: process.env.SMTP_FROM ?? "Zelium <no-reply@zelium.local>",
};

export function smtpConfigurado(): boolean {
  return Boolean(mailConfig.host && mailConfig.user && mailConfig.password);
}
