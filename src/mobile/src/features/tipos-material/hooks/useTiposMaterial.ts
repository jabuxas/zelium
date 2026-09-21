import { useState, useCallback, useMemo } from "react";
import { TipoMaterialRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import { DependencyConflictError } from "@/src/shared/api/errors";
import type {
  TipoMaterial,
  TipoMaterialCreateDto,
  TipoMaterialUpdateDto,
} from "../domain/types";

const repository = new TipoMaterialRepositoryImpl();

export function useTiposMaterial() {
  const [data, setData] = useState<TipoMaterial[]>([]);
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
        err instanceof Error ? err.message : "Erro ao carregar tipos de material.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const create = useCallback(
    async (dto: TipoMaterialCreateDto) => {
      try {
        const created = await repository.create(dto);
        setData((prev) => [...prev, created]);
        toast("Tipo de material criado com sucesso.", "success");
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar tipo de material.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const update = useCallback(
    async (id: number, dto: TipoMaterialUpdateDto) => {
      try {
        const updated = await repository.update(id, dto);
        setData((prev) =>
          prev.map((item) => (item.id === id ? updated : item)),
        );
        toast("Tipo de material atualizado com sucesso.", "success");
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar tipo de material.";
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
        toast("Tipo de material excluído com sucesso.", "success");
      } catch (err) {
        if (err instanceof DependencyConflictError) {
          toast(
            err.message || "Este tipo de material está em uso e não pode ser excluído.",
            "error",
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Erro ao excluir tipo de material.";
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