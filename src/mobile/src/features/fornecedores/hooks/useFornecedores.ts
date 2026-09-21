import { useState, useCallback, useMemo } from "react";
import { FornecedorRepositoryImpl } from "../data/repository";
import { useToast } from "@/src/shared/ui/toast";
import { DependencyConflictError } from "@/src/shared/api/errors";
import type {
  Fornecedor,
  FornecedorCreateDto,
  FornecedorUpdateDto,
} from "../domain/types";

const repository = new FornecedorRepositoryImpl();

export function useFornecedores() {
  const [data, setData] = useState<Fornecedor[]>([]);
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
        (item.cnpj?.toLowerCase().includes(q) ?? false) ||
        (item.contato?.toLowerCase().includes(q) ?? false),
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
        err instanceof Error ? err.message : "Erro ao carregar fornecedores.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const create = useCallback(
    async (dto: FornecedorCreateDto) => {
      try {
        const created = await repository.create(dto);
        setData((prev) => [...prev, created]);
        toast("Fornecedor criado com sucesso.", "success");
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar fornecedor.";
        toast(message, "error");
        throw err;
      }
    },
    [toast],
  );

  const update = useCallback(
    async (id: number, dto: FornecedorUpdateDto) => {
      try {
        const updated = await repository.update(id, dto);
        setData((prev) => prev.map((item) => (item.id === id ? updated : item)));
        toast("Fornecedor atualizado com sucesso.", "success");
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar fornecedor.";
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
        toast("Fornecedor excluído com sucesso.", "success");
      } catch (err) {
        if (err instanceof DependencyConflictError) {
          toast(
            err.message || "Este fornecedor está em uso e não pode ser excluído.",
            "error",
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Erro ao remover fornecedor.";
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
