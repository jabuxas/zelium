import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function ConferentesPlaceholder() {
  return <PlaceholderScreen resource={getResource("conferentes")} />;
}