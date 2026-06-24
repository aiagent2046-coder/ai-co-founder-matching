import { PostHog } from 'posthog-node';

export const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
});

// Функция для отправки ошибок с контекстом пользователя
export async function captureServerError(error: Error, context: { user_id?: string; route?: string }) {
  posthogServer.capture({
    distinctId: context.user_id || 'anonymous',
    event: 'server_error',
    properties: {
      error_message: error.message,
      error_stack: error.stack,
      route: context.route,
    },
  });
  // Отправляем немедленно (не ждем батчинга)
  await posthogServer.shutdown();
}
