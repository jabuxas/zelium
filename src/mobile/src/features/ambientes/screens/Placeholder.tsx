import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function AmbientesPlaceholder() {
  return <PlaceholderScreen resource={getResource("ambientes")} />;
}