import { useState, useCallback, useMemo } from "react";
import { ConferenteRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import { DependencyConflictError } from "@/src/shared/api/errors";
import type {
  Conferente,
  ConferenteCreateDto,
  ConferenteUpdateDto,
} from "../domain/types";

const repository = new ConferenteRepositoryImpl();

export function useConferentes() {
  const [data, setData] = useState<Conferente[]>([]);
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
        (item.email?.toLowerCase().includes(q) ?? false),
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
        err instanceof Error ? err.message : "Erro ao carregar conferentes.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const create = useCallback(
    async (dto: ConferenteCreateDto) => {
      try {
        const created = await repository.create(dto);
        setData((prev) => [...prev, created]);
        toast("Conferente criado com sucesso.", "success");
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar conferente.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const update = useCallback(
    async (id: number, dto: ConferenteUpdateDto) => {
      try {
        const updated = await repository.update(id, dto);
        setData((prev) => prev.map((item) => (item.id === id ? updated : item)));
        toast("Conferente atualizado com sucesso.", "success");
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar conferente.";
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
        toast("Conferente excluído com sucesso.", "success");
      } catch (err) {
        if (err instanceof DependencyConflictError) {
          toast(
            err.message || "Este conferente está em uso e não pode ser excluído.",
            "error",
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Erro ao excluir conferente.";
          toast(message, "error");
        }
        throw err;
      }
    },
    [toast],
  );

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
    setSearchQuery,
  };
}
