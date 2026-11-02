import { todayContent as c } from '../../src/features/today/content';
import { ComingSoon } from '../../src/shared/ui/hissa/ComingSoon';

export default function Buddy() {
  return <ComingSoon title={c.comingSoon.title.buddy} body={c.comingSoon.body} sub={c.comingSoon.sub} />;
}
