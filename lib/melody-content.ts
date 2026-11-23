export const DISCOVERY_TOPICS = [
  { id: "sky", label: "Sky friends", emoji: "🌙" },
  { id: "hearts", label: "Hearts", emoji: "💜" },
  { id: "fruit", label: "Fruit", emoji: "🍓" },
  { id: "shapes", label: "Shapes", emoji: "🔷" },
  { id: "toys", label: "Things & toys", emoji: "🧸" },
  { id: "colors", label: "Colors", emoji: "🎨" },
  { id: "pets", label: "Pets", emoji: "🐶" },
  { id: "nature", label: "Nature", emoji: "🌼" },
] as const;
export type DiscoveryTopic = (typeof DISCOVERY_TOPICS)[number]["id"];
export type DiscoveryFilter = DiscoveryTopic | "all";
export type DiscoveryObject = {
  id: string; topic: DiscoveryTopic; emoji: string; singular: string; plural: string; fact: string;
  shape?: "circle" | "square" | "triangle" | "diamond" | "paint"; color?: string;
};

// Interleaved categories keep free play varied even within a short visit.
export const DISCOVERY_OBJECTS: readonly DiscoveryObject[] = [
  { id: "star", topic: "sky", emoji: "⭐", singular: "star", plural: "stars", fact: "These little stars are ready to twinkle!" },
  { id: "red-heart", topic: "hearts", emoji: "❤️", singular: "red heart", plural: "red hearts", fact: "Red hearts can help us say I love you!" },
  { id: "apple", topic: "fruit", emoji: "🍎", singular: "apple", plural: "apples", fact: "These crunchy apples belong in our pretend picnic!" },
  { id: "circle", topic: "shapes", emoji: "🔴", singular: "red circle", plural: "red circles", shape: "circle", color: "#ed6a68", fact: "Circles are round, with no corners!" },
  { id: "car", topic: "toys", emoji: "🚗", singular: "toy car", plural: "toy cars", fact: "Beep beep! These little cars are going on a pretend trip!" },
  { id: "red-paint", topic: "colors", emoji: "🔴", singular: "red paint drop", plural: "red paint drops", shape: "paint", color: "#ed6a68", fact: "Red is the color of a juicy strawberry!" },
  { id: "puppy", topic: "pets", emoji: "🐶", singular: "puppy", plural: "puppies", fact: "These playful puppies are wagging their pretend tails!" },
  { id: "flower", topic: "nature", emoji: "🌼", singular: "flower", plural: "flowers", fact: "Our pretend flowers are opening in the sunshine!" },
  { id: "moon", topic: "sky", emoji: "🌙", singular: "moon", plural: "moons", fact: "Let's imagine these little moons lighting up a story!" },
  { id: "purple-heart", topic: "hearts", emoji: "💜", singular: "purple heart", plural: "purple hearts", fact: "Purple hearts are full of pretend hugs!" },
  { id: "banana", topic: "fruit", emoji: "🍌", singular: "banana", plural: "bananas", fact: "These yellow bananas look like little smiles!" },
  { id: "square", topic: "shapes", emoji: "🟦", singular: "blue square", plural: "blue squares", shape: "square", color: "#609ce0", fact: "A square has four equal sides and four corners!" },
  { id: "teddy", topic: "toys", emoji: "🧸", singular: "teddy bear", plural: "teddy bears", fact: "Our teddy bears are ready for a cozy cuddle!" },
  { id: "blue-paint", topic: "colors", emoji: "🔵", singular: "blue paint drop", plural: "blue paint drops", shape: "paint", color: "#609ce0", fact: "Blue can remind us of the sky on a sunny day!" },
  { id: "kitten", topic: "pets", emoji: "🐱", singular: "kitten", plural: "kittens", fact: "Meow! These little kittens are ready to play!" },
  { id: "butterfly", topic: "nature", emoji: "🦋", singular: "butterfly", plural: "butterflies", fact: "Let's flutter our hands like butterfly wings!" },
  { id: "cloud", topic: "sky", emoji: "☁️", singular: "cloud", plural: "clouds", fact: "What shapes can you imagine in these fluffy clouds?" },
  { id: "green-heart", topic: "hearts", emoji: "💚", singular: "green heart", plural: "green hearts", fact: "Let's send these green hearts to someone we care about!" },
  { id: "strawberry", topic: "fruit", emoji: "🍓", singular: "strawberry", plural: "strawberries", fact: "These strawberries are wearing tiny green hats!" },
  { id: "triangle", topic: "shapes", emoji: "🔺", singular: "yellow triangle", plural: "yellow triangles", shape: "triangle", color: "#edbf48", fact: "Triangles have three sides and three corners!" },
  { id: "balloon", topic: "toys", emoji: "🎈", singular: "balloon", plural: "balloons", fact: "Our pretend balloons are floating toward a party!" },
  { id: "yellow-paint", topic: "colors", emoji: "🟡", singular: "yellow paint drop", plural: "yellow paint drops", shape: "paint", color: "#edbf48", fact: "Yellow is a lovely color for painting sunshine!" },
  { id: "bunny", topic: "pets", emoji: "🐰", singular: "bunny", plural: "bunnies", fact: "Hop hop! These pretend bunnies love to bounce!" },
  { id: "leaf", topic: "nature", emoji: "🍃", singular: "leaf", plural: "leaves", fact: "Imagine these leaves dancing in a gentle breeze!" },
  { id: "sun", topic: "sky", emoji: "☀️", singular: "sun", plural: "suns", fact: "These suns belong in our make-believe space picture!" },
  { id: "blue-heart", topic: "hearts", emoji: "💙", singular: "blue heart", plural: "blue hearts", fact: "A blue heart can be a little sign of kindness!" },
  { id: "orange", topic: "fruit", emoji: "🍊", singular: "orange", plural: "oranges", fact: "An orange is a fruit and the name of its color!" },
  { id: "diamond", topic: "shapes", emoji: "🔷", singular: "purple diamond", plural: "purple diamonds", shape: "diamond", color: "#aa7ed1", fact: "Our purple diamonds have four sides and four pointy corners!" },
  { id: "book", topic: "toys", emoji: "📕", singular: "storybook", plural: "storybooks", fact: "Every storybook can take us on a new pretend adventure!" },
  { id: "green-paint", topic: "colors", emoji: "🟢", singular: "green paint drop", plural: "green paint drops", shape: "paint", color: "#70a979", fact: "Green is the color of many leaves in a garden!" },
  { id: "fish", topic: "pets", emoji: "🐠", singular: "fish", plural: "fish", fact: "Swish swish! Our pretend fish are swimming together!" },
  { id: "tree", topic: "nature", emoji: "🌳", singular: "tree", plural: "trees", fact: "Let's stretch up tall like a tree in our pretend forest!" },
];

export const COUNT_PROMPTS = [
  (object: DiscoveryObject) => `How many ${object.plural} can you see?`,
  (object: DiscoveryObject) => `Let's count these ${object.plural} together!`,
  (object: DiscoveryObject) => `Can you count the ${object.plural} for me?`,
];
export const FIND_PROMPTS = [
  (name: string) => `Can you find number ${name}?`,
  (name: string) => `I'm thinking of ${name}.`,
  (name: string) => `Let's look for number ${name}!`,
  (name: string) => `Which button shows ${name}?`,
];
export const CALL_INTROS: Record<DiscoveryTopic, readonly string[]> = {
  sky: ["Hello! I'm looking at the night sky.", "Hello! Let's visit a make-believe planet.", "Hello! I'm making a picture of the sky."],
  hearts: ["Hello! I'm making a card for someone I love.", "Hello! Let's send some pretend hugs.", "Hello! I'm planning a kindness party."],
  fruit: ["Hello! I'm packing a little picnic.", "Hello! Welcome to our pretend fruit shop.", "Hello! I'm making a colorful fruit salad."],
  shapes: ["Hello! I'm building a city of shapes.", "Hello! Let's make a pretend shape puzzle.", "Hello! I'm designing a colorful kite."],
  toys: ["Hello! I'm setting up a pretend toy shop.", "Hello! Let's get ready for a playroom parade.", "Hello! I'm packing a toy adventure bag."],
  colors: ["Hello! I'm painting a rainbow picture.", "Hello! Let's open our pretend art studio.", "Hello! I'm mixing up a colorful surprise."],
  pets: ["Hello! I'm visiting a make-believe pet park.", "Hello! Let's plan a pretend pet picnic.", "Hello! Some little animal friends need our help."],
  nature: ["Hello! I'm exploring a pretend garden.", "Hello! Let's go on a little nature walk.", "Hello! I'm making a woodland picture."],
};

export const DIALOGUE_LIBRARY = {
  welcome: ["Hello, I'm Melody! Let's play with numbers.", "Hello, little explorer! What shall we discover today?", "A happy hello to you! My buttons are ready for an adventure.", "Welcome back, number buddy! Let's make some happy discoveries.", "Peekaboo! It's Melody, your pretend phone friend.", "Hello, sunshine! I have a pocketful of playful ideas.", "Ring-a-ding! A new little adventure is waiting for us.", "It's lovely to see you! Shall we count and play together?"],
  explore: ["Tap any number! Let's see what we discover.", "Which button would you like to try today?", "Let's give a little number a big hello!", "My number buttons are ready for curious fingers.", "Pick a number and we'll find a little surprise.", "What shall we count on our next pretend adventure?", "Let's make a tiny tune and a happy discovery.", "Every number has a little something to share."],
  success: ["You found it!", "We did it together!", "What a lovely discovery!", "Hooray for your curious mind!", "You gave that number a happy hello!", "That was some wonderful counting!", "A little cheer for a big discovery!", "You and I make a wonderful team!", "I love exploring numbers with you!", "You spotted it, little detective!", "Our number adventure is getting exciting!", "What a thoughtful little explorer you are!"],
  retry: ["Take your time!", "Let's try together.", "There's room for another try.", "Let's have another little look.", "I'm here to help you explore.", "We can go as slowly as you like.", "Let's give our curious eyes another look.", "A new try is another little adventure."],
  incoming: ["Ring, ring! It's Melody. Would you like to play?", "Hello from your pretend phone friend! Shall we discover something?", "Ring-a-ding! I have a counting adventure for us.", "A happy hello is calling! Would you like to answer?", "It's Melody with a little make-believe surprise!", "Ding-a-ling! Shall we explore something new together?"],
  goodbye: ["What a lovely pretend call! Send a big hug and say goodbye.", "Our pretend adventure was full of happy moments! See you next time.", "Let's send a little wave through our pretend phone! Goodbye for now.", "Thanks for sharing that lovely adventure! A big pretend hug to you.", "Our family story is all tucked up for now! Let's say goodbye.", "What a lovely hello we shared! Talk to you on our next pretend call."],
  rest: ["Thank you for playing with me. See you next time, little explorer!", "Our little phone can rest now. Thank you for a lovely playtime!", "Let's tuck our discoveries away for another day. Goodbye, my friend!", "A soft little goodbye and a big pretend hug!", "Rest those curious fingers. I'll be here for another adventure!", "We made some happy little memories together. See you soon!"],
  telephone: ["Let's play telephone! Listen to a secret number, then dial it back in the same order.", "A secret number is coming through our pretend phone! Listen, remember, and send it back.", "Let's be number messengers! Hear my little code and dial it back to me.", "Our pretend phone has a memory mission! Ready for a secret number?", "You're on the number team! Listen to the code, then pass it back.", "Let's give our listening ears a playful little challenge!"],
  listen: ["Listen carefully!", "Here comes our little number code!", "Ready, listening ears?", "Our secret number is on its way!"],
  repeat: ["Your turn! Dial the secret number in the same order.", "Send that little number code back to me!", "Now it's your turn to be the number messenger.", "You heard the code! Let's dial it back together.", "Ready to pass our secret number along?", "Take your time and dial what you remember."],
  reverse: ["Your turn! Dial the secret number backwards, starting with the last digit.", "A backwards mission! Start with the last number you heard.", "Let's turn our secret code around! Dial it from the end to the beginning.", "Secret agent, send that number back in reverse order!"],
  telephoneRetry: ["Let's listen once more. You can try again!", "Our secret code is ready for another listen!", "Let's give our listening ears another turn.", "No hurry, number messenger! We can hear the code again.", "Let's try that little memory adventure again.", "I'm on your team! Shall we listen one more time?"],
  telephoneSuccess: ["You passed the secret number! What a wonderful telephone team!", "Message delivered! Our pretend phone team did it!", "You remembered our secret code! What a lovely little mission.", "A happy hello came all the way back to me!", "Our number message arrived safe and sound!", "Secret mission complete! Shall we try another little code?", "You listened, remembered, and dialed it back!", "What a brilliant number messenger you are!"],
} as const;
export type DialogueKind = keyof typeof DIALOGUE_LIBRARY;
export type DialogueCursors = Partial<Record<DialogueKind, number>>;

export function discoveryObject(turn: number, topic: DiscoveryFilter = "all", previousId?: string): DiscoveryObject {
  const pool = topic === "all" ? DISCOVERY_OBJECTS : DISCOVERY_OBJECTS.filter(object => object.topic === topic);
  const index = Math.abs(Math.floor(Number.isFinite(turn) ? turn : 0)) % pool.length;
  return pool[index].id === previousId ? pool[(index + 1) % pool.length] : pool[index];
}

export function dialogueLine(kind: DialogueKind, cursor = 0): string {
  const lines = DIALOGUE_LIBRARY[kind];
  return lines[Math.max(0, Math.floor(Number.isFinite(cursor) ? cursor : 0)) % lines.length];
}
