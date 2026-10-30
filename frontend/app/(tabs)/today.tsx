import { ApiStatus } from '../../src/features/today/components/ApiStatus';
import { Screen } from '../../src/shared/ui/Screen';

export default function Today() {
  return (
    <Screen title="Today">
      <ApiStatus />
    </Screen>
  );
}
