import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function PatrimoniosPlaceholder() {
  return <PlaceholderScreen resource={getResource("patrimonios")} />;
}