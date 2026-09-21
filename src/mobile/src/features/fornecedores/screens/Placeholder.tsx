import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function FornecedoresPlaceholder() {
  return <PlaceholderScreen resource={getResource("fornecedores")} />;
}