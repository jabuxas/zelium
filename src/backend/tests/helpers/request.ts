/**
 * Wrapper do supertest que anexa automaticamente um token JWT de usuário
 * "gestor" em todas as requisições, para que os testes das rotas protegidas
 * não precisem gerenciar autenticação individualmente.
 *
 * Uso (substitui `import request from 'supertest'`):
 *   import { request } from './helpers/request';
 *   const res = await request(app).get('/api/ambientes');
 *
 * Para casos sem token ou com outro papel, use `rawRequest` + `bearerToken`:
 *   const res = await rawRequest(app).get('/api/patrimonios');
 *   const res = await rawRequest(app).get('/api/usuarios').set(bearerToken('conferente'));
 */
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";
import { UsuarioPapel } from "../../src/models/Usuario";

export const rawRequest = supertest;

export function bearerToken(
  papel: UsuarioPapel = "gestor",
  subject = "1"
): Record<string, string> {
  const token = jwt.sign(
    { email: `${papel}@teste.zelium.com`, nome: `Teste ${papel}`, papel },
    JWT_SECRET,
    { subject, expiresIn: "1h" }
  );
  return { Authorization: `Bearer ${token}` };
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

export function request(app: unknown) {
  const instance = supertest(app);
  return new Proxy(instance, {
    get(target, prop: string) {
      if (HTTP_METHODS.includes(prop)) {
        return (url: string) => {
          const test = target[prop](url);
          return test.set(bearerToken());
        };
      }
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
