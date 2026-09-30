export function publishChessMatchUpdate(matchId: string) {
  const publish = (globalThis as typeof globalThis & { publishChessMatchUpdate?: (id: string) => void }).publishChessMatchUpdate;
  publish?.(matchId);
}
