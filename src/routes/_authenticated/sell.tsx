import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/sell')({
  beforeLoad: () => {
    throw redirect({ to: '/submit' as never });
  },
});
