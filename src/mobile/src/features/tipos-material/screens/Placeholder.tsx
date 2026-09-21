import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function TiposMaterialPlaceholder() {
  return <PlaceholderScreen resource={getResource("tipos-material")} />;
}