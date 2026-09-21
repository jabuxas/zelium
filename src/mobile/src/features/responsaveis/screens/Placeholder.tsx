import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function ResponsaveisPlaceholder() {
  return <PlaceholderScreen resource={getResource("responsaveis")} />;
}