import { Platform } from "react-native";
import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import type {
  PatrimonioFoto,
  PatrimonioFotoUpdateDto,
  PatrimonioFotoUploadInput,
} from "../domain/types";

const resource = getResource("patrimonios");

function fotosPath(patrimonioId: number): string {
  return `${resource.apiPath}/${patrimonioId}/fotos`;
}

export class PatrimonioPhotoRepositoryImpl {
  async listFotos(patrimonioId: number): Promise<PatrimonioFoto[]> {
    return (await apiClient(fotosPath(patrimonioId))) as PatrimonioFoto[];
  }

  async uploadFoto(
    patrimonioId: number,
    input: PatrimonioFotoUploadInput,
  ): Promise<PatrimonioFoto> {
    const formData = new FormData();
    const nomeArquivo = input.fileName ?? "patrimonio.jpg";
    if (Platform.OS === "web") {
      const blob = await fetch(input.uri).then((res) => res.blob());
      formData.append("foto", blob, nomeArquivo);
    } else {
      formData.append("foto", {
        uri: input.uri,
        name: nomeArquivo,
        type: input.mimeType ?? "image/jpeg",
      } as unknown as Blob);
    }
    if (input.descricao) formData.append("descricao", input.descricao);
    if (input.principal !== undefined) {
      formData.append("principal", String(input.principal));
    }

    return (await apiClient(fotosPath(patrimonioId), {
      method: "POST",
      body: formData,
    })) as PatrimonioFoto;
  }

  async updateFoto(
    patrimonioId: number,
    fotoId: number,
    dto: PatrimonioFotoUpdateDto,
  ): Promise<PatrimonioFoto> {
    return (await apiClient(`${fotosPath(patrimonioId)}/${fotoId}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    })) as PatrimonioFoto;
  }

  async setPrincipal(
    patrimonioId: number,
    fotoId: number,
  ): Promise<PatrimonioFoto> {
    return (await apiClient(
      `${fotosPath(patrimonioId)}/${fotoId}/principal`,
      { method: "PATCH" },
    )) as PatrimonioFoto;
  }

  async deleteFoto(patrimonioId: number, fotoId: number): Promise<void> {
    await apiClient(`${fotosPath(patrimonioId)}/${fotoId}`, {
      method: "DELETE",
    });
  }
}
