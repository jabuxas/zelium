import { useState, useCallback } from "react";
import { PatrimonioPhotoRepositoryImpl } from "../data/photoRepository";
import { useToast } from "@/src/shared/ui/toast";
import type {
  PatrimonioFoto,
  PatrimonioFotoUploadInput,
} from "../domain/types";

const repository = new PatrimonioPhotoRepositoryImpl();

export function usePatrimonioFotos() {
  const [fotos, setFotos] = useState<PatrimonioFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(
    async (patrimonioId: number) => {
      setLoading(true);
      try {
        const result = await repository.listFotos(patrimonioId);
        setFotos(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar fotos.";
        toast(message, "error");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const upload = useCallback(
    async (patrimonioId: number, input: PatrimonioFotoUploadInput) => {
      setUploading(true);
      try {
        await repository.uploadFoto(patrimonioId, input);
        const result = await repository.listFotos(patrimonioId);
        setFotos(result);
        toast("Foto adicionada com sucesso.", "success");
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao enviar foto.";
        toast(message, "error");
        return false;
      } finally {
        setUploading(false);
      }
    },
    [toast],
  );

  const remove = useCallback(
    async (patrimonioId: number, fotoId: number) => {
      try {
        await repository.deleteFoto(patrimonioId, fotoId);
        const result = await repository.listFotos(patrimonioId);
        setFotos(result);
        toast("Foto removida.", "success");
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao remover foto.";
        toast(message, "error");
        return false;
      }
    },
    [toast],
  );

  const setPrincipal = useCallback(
    async (patrimonioId: number, fotoId: number) => {
      try {
        await repository.setPrincipal(patrimonioId, fotoId);
        const result = await repository.listFotos(patrimonioId);
        setFotos(result);
        toast("Foto principal definida.", "success");
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao definir foto principal.";
        toast(message, "error");
        return false;
      }
    },
    [toast],
  );

  const reset = useCallback(() => setFotos([]), []);

  return { fotos, loading, uploading, load, upload, remove, setPrincipal, reset };
}
