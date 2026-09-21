import { useState, useCallback, useMemo } from "react";
import { EstadoItemRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import { DependencyConflictError } from "@/src/shared/api/errors";
import type {
  EstadoItem,
  EstadoItemCreateDto,
  EstadoItemUpdateDto,
} from "../domain/types";

const repository = new EstadoItemRepositoryImpl();

export function useEstadosItem() {
  const [data, setData] = useState<EstadoItem[]>([]);
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
        (item.descricao?.toLowerCase().includes(q) ?? false),
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
        err instanceof Error ? err.message : "Erro ao carregar estados do item.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const create = useCallback(
    async (dto: EstadoItemCreateDto) => {
      try {
        const created = await repository.create(dto);
        setData((prev) => [...prev, created]);
        toast("Estado do item criado com sucesso.", "success");
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar estado do item.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const update = useCallback(
    async (id: number, dto: EstadoItemUpdateDto) => {
      try {
        const updated = await repository.update(id, dto);
        setData((prev) => prev.map((item) => (item.id === id ? updated : item)));
        toast("Estado do item atualizado com sucesso.", "success");
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar estado do item.";
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
        toast("Estado do item excluído com sucesso.", "success");
      } catch (err) {
        if (err instanceof DependencyConflictError) {
          toast(
            err.message || "Este estado do item está em uso e não pode ser excluído.",
            "error",
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Erro ao excluir estado do item.";
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
