import { test, expect } from '../support/fixtures';

test('esqueci minha senha: solicitação genérica na interface', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page).toHaveURL(/\/recuperar-senha$/);

  await page.getByLabel('E-mail').fill('gestor@zelium.com');
  await page.getByRole('button', { name: /Enviar link/i }).click();
  await expect(page.getByText(/recebera um email/i)).toBeVisible();
});

test('redefinição com token desconhecido orienta nova solicitação', async ({ page }) => {
  await page.goto(`/recuperar-senha/redefinir#token=${'c'.repeat(64)}`);
  await page.getByLabel('Nova senha', { exact: false }).fill('SenhaE2EForte@2026');
  await page.getByLabel('Confirmar senha').fill('SenhaE2EForte@2026');
  await page.getByRole('button', { name: /Redefinir senha/i }).click();
  await expect(page.getByText(/invalida ou expirada|inválida ou expirada/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Novo link' })).toBeVisible();
});

test('página Minha conta exige sessão e oferece troca de senha', async ({ page, context }) => {
  // Sem sessão: proxy manda ao login; com sessão: formulário acessível via sidebar.
  await page.goto('/conta');
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/login');
  await page.locator('input[type=email]').fill('gestor@zelium.com');
  await page.locator('input[type=password]').fill('Zelium@2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Total de Patrimônios', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Alterar senha' }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByLabel('Senha atual')).toBeVisible();
  expect(context.pages().length).toBeGreaterThan(0);
});
