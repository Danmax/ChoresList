// Shared by the room renderer and server: every clue points at a real object.
export const TREASURE_OBJECTS = [
  { id: "trail-plant", name: "Little plant", emoji: "🪴", sprite: 0, x: 18, y: 76, clue: "Find something green that grows.", olderClue: "Find something that needs water and sunlight.", hint: "Look for green leaves in a pink pot." },
  { id: "trail-book", name: "Blue storybook", emoji: "📘", sprite: 1, x: 50, y: 76, clue: "Find the blue book.", olderClue: "Find something with pages and a star on its cover.", hint: "Look for the blue cover with a gold star." },
  { id: "trail-bear", name: "Teddy bear", emoji: "🧸", sprite: 2, x: 82, y: 76, clue: "Find the cuddly bear.", olderClue: "Find a cuddly toy wearing a pink bow.", hint: "Look for a little bear with round ears." },
  { id: "flower-wall", name: "Flower wall art", emoji: "🖼️", x: 17, y: 27, clue: "Find the flower picture.", olderClue: "Find flowers inside a frame.", hint: "Look for the framed picture on the wall." },
  { id: "potted-palm", name: "Potted palm", emoji: "🌿", x: 12, y: 49, clue: "Find the tall palm.", olderClue: "Find the tall palm leaves.", hint: "Find the tall leafy palm, not the little pink pot." },
  { id: "cozy-sofa", name: "Cozy sofa", emoji: "🛋️", x: 85, y: 49, clue: "Find the sofa.", olderClue: "Find a soft seat to share with a friend.", hint: "Look for the soft couch." },
  { id: "reading-lamp", name: "Reading lamp", emoji: "💡", x: 85, y: 27, clue: "Find the light.", olderClue: "Find something that lights up a reading spot.", hint: "Look for the glowing light bulb." },
  { id: "tea-table", name: "Tea table", emoji: "🪑", x: 50, y: 27, clue: "Find the tea seat.", olderClue: "Find the wooden seat for a tea break.", hint: "Look for the wooden chair, not the soft sofa." },
  { id: "wall-shelves", name: "Wall shelves", emoji: "🗄️", x: 50, y: 47, clue: "Find the shelves.", olderClue: "Find somewhere to store things.", hint: "Look for the little storage cabinet." },
] as const;

export type TreasureObjectId = typeof TREASURE_OBJECTS[number]["id"];
export type RoomItemPosition = { x: number; y: number };
export type RoomPositions = Record<string, Partial<Record<TreasureObjectId, RoomItemPosition>>>;
export type TreasureView = {
  room: string; objectIds: TreasureObjectId[]; found: TreasureObjectId[];
  step: number; total: number; clue: string; hint: string; picture: string | null;
  chestReady: boolean;
};
export function treasureRoomObjects(owned: readonly string[]) {
  return TREASURE_OBJECTS.filter((object) => object.id.startsWith("trail-") || owned.includes(object.id));
}
export function roomItemPosition(positions: RoomPositions | undefined, room: string, id: TreasureObjectId) {
  const fallback = TREASURE_OBJECTS.find((object) => object.id === id)!;
  return positions?.[room]?.[id] ?? { x: fallback.x, y: fallback.y };
}
export function treasureClue(object: typeof TREASURE_OBJECTS[number], age: number, position: RoomItemPosition) {
  if (age < 9) return object.clue;
  const horizontal = position.x < 36 ? "left" : position.x > 64 ? "right" : "middle";
  const vertical = position.y < 48 ? "upper" : position.y > 66 ? "lower" : "center";
  return `Look near the ${vertical}-${horizontal} of the room. ${object.olderClue}`;
}
