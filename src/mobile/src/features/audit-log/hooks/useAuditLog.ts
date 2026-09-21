import { useState, useCallback, useMemo } from "react";
import { AuditLogRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import type { AuditLog } from "../domain/types";

const repository = new AuditLogRepositoryImpl();

export function useAuditLog() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAcao, setFilterAcao] = useState("");
  const [filterRecurso, setFilterRecurso] = useState("");
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    let result = data;

    if (filterAcao) {
      result = result.filter((item) => item.acao === filterAcao);
    }

    if (filterRecurso) {
      result = result.filter((item) => item.recurso === filterRecurso);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.acao.toLowerCase().includes(q) ||
          item.recurso.toLowerCase().includes(q) ||
          (item.usuario?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [data, searchQuery, filterAcao, filterRecurso]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await repository.list();
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar logs de auditoria.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    data,
    filteredData,
    loading,
    error,
    searchQuery,
    filterAcao,
    filterRecurso,
    load,
    setSearchQuery,
    setFilterAcao,
    setFilterRecurso,
  };
}