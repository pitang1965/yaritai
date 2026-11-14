import { createFileRoute } from '@tanstack/react-router';
import { createAuth } from '../lib/auth';

// better-auth のエンドポイント（/api/auth/*。OAuth のコールバックやセッション）。
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      ANY: ({ request }) => createAuth().handler(request),
    },
  },
});
