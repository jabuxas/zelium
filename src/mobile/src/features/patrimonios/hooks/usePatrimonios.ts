import { useState, useCallback, useMemo } from "react";
import { PatrimonioRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import type {
  Patrimonio,
  PatrimonioCreateDto,
  PatrimonioUpdateDto,
} from "../domain/types";

const repository = new PatrimonioRepositoryImpl();

export function usePatrimonios() {
  const [data, setData] = useState<Patrimonio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        item.numero_patrimonio.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q) ||
        (item.observacoes?.toLowerCase().includes(q) ?? false),
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
        err instanceof Error ? err.message : "Erro ao carregar patrimônios.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const create = useCallback(
    async (dto: PatrimonioCreateDto) => {
      try {
        const created = await repository.create(dto);
        setData((prev) => [...prev, created]);
        toast("Patrimônio criado com sucesso.", "success");
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar patrimônio.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const update = useCallback(
    async (id: number, dto: PatrimonioUpdateDto) => {
      try {
        const updated = await repository.update(id, dto);
        setData((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updated,
                  ...(item.foto_principal_url !== undefined
                    ? { foto_principal_url: item.foto_principal_url }
                    : {}),
                }
              : item,
          ),
        );
        toast("Patrimônio atualizado com sucesso.", "success");
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar patrimônio.";
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
        toast("Patrimônio excluído com sucesso.", "success");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao excluir patrimônio.";
        toast(message, "error");
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
