"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { API_URL } from "../../lib/api";
import { apiFetch } from "../../lib/api-client";

interface ResumoImportacao {
  total_linhas: number;
  validas: number;
  invalidas: number;
  existentes: number;
  duplicadas_arquivo: number;
  erros: Array<{ linha: number; erro: string }>;
}

/**
 * Importação de patrimônios por CSV (Gestor). Duas etapas explícitas:
 * analisar (preview sem gravação) e importar (gravação atômica — ou entra
 * tudo que é novo, ou nada). Números já existentes são pulados: reenviar
 * o mesmo arquivo não duplica nada.
 */
export default function ImportarPatrimoniosPage() {
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  function arquivoAtual(): File | null {
    return inputArquivo.current?.files?.[0] ?? null;
  }

  async function chamar(rota: 'preview' | 'confirmar') {
    const arquivo = arquivoAtual();
    if (!arquivo) {
      setErro("Escolha um arquivo CSV antes de continuar.");
      return;
    }
    setErro(null);
    setResultado(null);
    setEnviando(true);
    try {
      const corpo = new FormData();
      corpo.append('arquivo', arquivo);
      const res = await apiFetch(`${API_URL}/patrimonios/importacao/${rota}`, {
        method: 'POST',
        body: corpo,
      });
      const data = await res.json().catch(() => ({}));
      if (rota === 'preview' && res.ok) {
        setResumo(data as ResumoImportacao);
        return;
      }
      if (rota === 'confirmar' && res.status === 201) {
        setResumo(null);
        const plural = data.inseridos === 1 ? '' : 's';
        setResultado(
          `${data.inseridos} patrimônio${plural} importado${plural}, ` +
          `${data.existentes} já existente${data.existentes === 1 ? '' : 's'} pulado${data.existentes === 1 ? '' : 's'}.`,
        );
        if (inputArquivo.current) inputArquivo.current.value = '';
        return;
      }
      setErro(
        data.error
          ?? (res.status === 413
            ? 'Arquivo acima do limite de 2 MB.'
            : 'Não foi possível processar o arquivo. Tente novamente.'),
      );
    } catch {
      setErro("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Importar patrimônios</h1>
          <p className="text-gray-600">CSV com ponto-e-vírgula ou vírgula, até 2 MB e 1.000 linhas</p>
        </div>
        <Link
          href="/patrimonios"
          className="text-sm text-blue-600 hover:underline"
        >
          Voltar para patrimônios
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <label htmlFor="importar-arquivo" className="block text-sm font-medium text-gray-700 mb-1">
            Arquivo CSV
          </label>
          <input
            id="importar-arquivo"
            ref={inputArquivo}
            type="file"
            accept=".csv,text/csv"
            onChange={() => { setResumo(null); setResultado(null); setErro(null); }}
            className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-2">
            Colunas obrigatórias: numero_patrimonio, descricao, valor, tipo_material,
            estado_item, ambiente, responsavel. Opcional: fornecedor, data_aquisicao
            (AAAA-MM-DD), vida_util_anos, valor_residual. Catálogos casam pelo nome.
          </p>
        </div>

        {(erro || resultado) && (
          <p className={`text-sm rounded-lg px-4 py-3 border whitespace-pre-line ${resultado
            ? "text-green-700 bg-green-50 border-green-200"
            : "text-red-600 bg-red-50 border-red-200"}`}>
            {resultado ?? erro}
          </p>
        )}

        {resumo && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-800">
              {resumo.validas > 0
                ? `${resumo.validas} linha${resumo.validas > 1 ? 's' : ''} prontas para importar`
                : 'Nenhuma linha pronta para importar'}
              {resumo.existentes > 0 && ` · ${resumo.existentes} já existente(s) serão pulada(s)`}
            </p>
            {resumo.invalidas > 0 && (
              <p className="text-sm text-red-600">
                {resumo.invalidas} linha(s) com problema
                {resumo.duplicadas_arquivo > 0 && ` · ${resumo.duplicadas_arquivo} repetida(s) no arquivo`}
              </p>
            )}
            {resumo.erros.length > 0 && (
              <ul className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1 max-h-40 overflow-auto">
                {resumo.erros.map(item => (
                  <li key={item.linha}>Linha {item.linha}: {item.erro}</li>
                ))}
              </ul>
            )}
            {resumo.validas > 0 && resumo.invalidas === 0 && resumo.duplicadas_arquivo === 0 && (
              <button
                type="button"
                onClick={() => chamar('confirmar')}
                disabled={enviando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {enviando ? 'Importando...' : `Importar ${resumo.validas} patrimônio${resumo.validas > 1 ? 's' : ''}`}
              </button>
            )}
            {(resumo.invalidas > 0 || resumo.duplicadas_arquivo > 0) && (
              <p className="text-xs text-gray-500">
                Corrija as linhas com problema no arquivo e analise novamente:
                a importação é integral — com qualquer linha inválida, nada é gravado.
              </p>
            )}
          </div>
        )}

        {!resumo && (
          <button
            type="button"
            onClick={() => chamar('preview')}
            disabled={enviando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
          >
            <Upload size={18} />
            {enviando ? 'Analisando...' : 'Analisar arquivo'}
          </button>
        )}

        <p className="text-xs text-gray-500">
          A análise não grava nada. A importação é atômica: ou todos os bens
          novos entram, ou nada muda.
        </p>
      </div>
    </div>
  );
}
