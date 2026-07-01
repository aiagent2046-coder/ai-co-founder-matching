import { AccessToken } from 'livekit-server-sdk';

export const ROOM_TTL_SECONDS = 3600;

/**
 * Создаёт JWT-токен участника для комнаты LiveKit.
 * identity — стабильный id пользователя (user.id), name — отображаемое имя.
 */
export async function createRoomToken(
  roomName: string,
  identity: string,
  name?: string,
): Promise<string> {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity, name, ttl: ROOM_TTL_SECONDS },
  );
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  return at.toJwt();
}
