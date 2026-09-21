import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function EstadosItemPlaceholder() {
  return <PlaceholderScreen resource={getResource("estados-item")} />;
}