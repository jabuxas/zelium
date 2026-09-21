import { PlaceholderScreen } from "@/src/shared/ui";
import { getResource } from "@/src/shared/domain/registry";

export default function AuditLogPlaceholder() {
  return <PlaceholderScreen resource={getResource("audit-log")} />;
}