import { test, expect } from '../support/fixtures';

test('cadastro fica acessível sem sessão e a solicitação responde genérico', async ({ page }) => {
  // Proxy deve liberar /cadastro sem cookie de sessão.
  await page.goto('/cadastro');
  await expect(page.getByRole('heading', { name: 'Zelium' })).toBeVisible();

  await page.getByLabel('Nome', { exact: true }).fill('Ana E2E');
  await page.getByLabel('E-mail').fill('ana.e2e@empresa.test');
  await page.getByLabel('Nome da organização').fill('Empresa E2E');
  await page.getByRole('button', { name: /Solicitar cadastro/i }).click();

  // Contrato: a mesma mensagem genérica independe de e-mail existir.
  await expect(page.getByText(/enviaremos um email de confirmacao/i)).toBeVisible();
  await expect(page.getByText(/já existe/i)).toHaveCount(0);
});

test('confirmação com token desconhecido orienta novo cadastro', async ({ page }) => {
  await page.goto(`/cadastro/confirmar#token=${'f'.repeat(64)}`);

  await page.getByLabel('Nova senha', { exact: false }).fill('SenhaSegura@123');
  await page.getByLabel('Confirmar senha').fill('SenhaSegura@123');
  await page.getByRole('button', { name: /Confirmar cadastro/i }).click();

  await expect(page.getByText(/invalida ou expirada|inválida ou expirada/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Solicitar novo cadastro/i })).toBeVisible();
});

test('confirmar sem token no link não envia nada', async ({ page }) => {
  await page.goto('/cadastro/confirmar');
  await expect(page.getByText(/Link incompleto/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Solicitar novo cadastro/i })).toBeVisible();
});

test('login aponta para criar conta', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Criar nova conta' })).toHaveAttribute('href', '/cadastro');
});
