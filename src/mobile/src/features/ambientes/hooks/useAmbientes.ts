import { useState, useCallback, useMemo } from "react";
import { AmbienteRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import { DependencyConflictError } from "@/src/shared/api/errors";
import type {
  Ambiente,
  AmbienteCreateDto,
  AmbienteLocalizacaoDto,
  AmbienteUpdateDto,
} from "../domain/types";

const repository = new AmbienteRepositoryImpl();

export function useAmbientes() {
  const [data, setData] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        item.nome.toLowerCase().includes(q) ||
        (item.bloco?.toLowerCase().includes(q) ?? false) ||
        (item.andar?.toLowerCase().includes(q) ?? false),
    );
  }, [data, searchQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await repository.list();
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar ambientes.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const create = useCallback(
    async (dto: AmbienteCreateDto) => {
      try {
        const created = await repository.create(dto);
        setData((prev) => [...prev, created]);
        toast("Ambiente criado com sucesso.", "success");
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar ambiente.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const update = useCallback(
    async (id: number, dto: AmbienteUpdateDto) => {
      try {
        const updated = await repository.update(id, dto);
        setData((prev) => prev.map((item) => (item.id === id ? updated : item)));
        toast("Ambiente atualizado com sucesso.", "success");
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar ambiente.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const remove = useCallback(
    async (id: number) => {
      try {
        await repository.delete(id);
        setData((prev) => prev.filter((item) => item.id !== id));
        toast("Ambiente excluído com sucesso.", "success");
      } catch (err) {
        if (err instanceof DependencyConflictError) {
          toast(
            err.message || "Este ambiente está em uso e não pode ser excluído.",
            "error",
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Erro ao excluir ambiente.";
          toast(message, "error");
        }
        throw err;
      }
    },
    [toast],
  );

  const setLocalizacao = useCallback(
    async (id: number, dto: AmbienteLocalizacaoDto) => {
      const updated = await repository.updateLocalizacao(id, dto);
      setData((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    [],
  );

  const clearLocalizacao = useCallback(async (id: number) => {
    const updated = await repository.clearLocalizacao(id);
    setData((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  return {
    data,
    filteredData,
    loading,
    error,
    searchQuery,
    load,
    create,
    update,
    remove,
    setLocalizacao,
    clearLocalizacao,
    setSearchQuery,
  };
}
