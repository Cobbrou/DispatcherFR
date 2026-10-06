import { GRAVITY_META } from '../../data/statuses';
import type { GravityLevel } from '../../types';
import { Badge } from '../ui/Badge';

export function GravityBadge({ gravity }: { gravity: GravityLevel }) {
  return <Badge className={GRAVITY_META[gravity].badge}>G{gravity}</Badge>;
}
