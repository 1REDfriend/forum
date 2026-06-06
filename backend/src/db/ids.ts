import { init } from '@paralleldrive/cuid2';

// 16 chars: short, URL-safe, collision-resistant at forum scale, non-sequential.
export const newId = init({ length: 16 });
