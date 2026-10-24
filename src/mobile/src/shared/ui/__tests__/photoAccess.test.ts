import { privatePhotoHeaders } from '../photoAccess';

const previous = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_API_URL = 'https://api.exemplo.local/api'; });
afterAll(() => { if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });

it('autentica somente fotos privadas da API configurada', () => {
  expect(privatePhotoHeaders('https://api.exemplo.local/uploads/patrimonios/bem.png', 'teste')).toEqual({ Authorization: 'Bearer teste' });
});

it.each(['https://outro.local/uploads/patrimonios/bem.png', 'https://api.exemplo.local.atacante/uploads/patrimonios/bem.png', 'blob:local', 'file:///foto.png', undefined])('não vaza token em outra origem ou foto local: %s', uri => {
  expect(privatePhotoHeaders(uri, 'teste')).toBeUndefined();
});

it('não cria credenciais sem sessão', () => {
  expect(privatePhotoHeaders('https://api.exemplo.local/uploads/patrimonios/bem.png', null)).toBeUndefined();
});
