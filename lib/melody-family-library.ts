import { FAMILY_STORIES, type FamilyStoryId } from "./melody-pretend";

type Adventure = (typeof FAMILY_STORIES)[FamilyStoryId];
function adventure(title: string, emoji: string, text: [string, string, string, string, string], choices: [[string, string], [string, string], [string, string]]): Adventure {
  return { title, emoji, nodes: text.map((text, index) => ({ text, choices: index < 3 ? choices[index].map((label, choice) => ({ label, next: index === 0 ? choice + 1 : choice + 3 })) : [] })) };
}

export const FAMILY_ADVENTURES: Record<FamilyStoryId, Adventure[]> = {
  garden: [FAMILY_STORIES.garden,
    adventure("Garden bug parade", "🐞", [
      "Hello, little nature friend! Our pretend garden bugs are planning a parade. Who shall lead the way?",
      "The ladybug is wearing a tiny red hat! Shall we make a leaf float or play a flower trumpet?",
      "The butterfly is fluttering with excitement! Shall we decorate its wings or make a petal path?",
      "March, march, little garden team! Can you wiggle your fingers like tiny bug feet? Our parade is full of happy friends!",
      "Toot, toot! The garden band is playing! Let's flap our arms and dance like butterflies at the parade.",
    ], [["🐞 A ladybug", "🦋 A butterfly"], ["🍃 A leaf float", "🎺 Flower music"], ["🎨 Colorful wings", "🌸 A petal path"]]),
    adventure("Garden treasure hunt", "🌱", [
      "Hello, curious explorer! I found a pretend treasure map in our garden. Where shall we look first?",
      "Under the flowerpot is a tiny shiny key! Shall we look behind the watering can or beside the sunflower?",
      "Beside the little pond is a leaf with a clue! Shall we follow the frog hops or the butterfly trail?",
      "We found a box of pretend rainbow seeds! Let's plant a little kindness garden and give someone a smile.",
      "Our treasure is a tiny garden crown! Pretend to put it on and give your garden team a royal wave!",
    ], [["🪴 A flowerpot", "🐸 The little pond"], ["💦 Watering can", "🌻 Sunflower"], ["🐸 Frog hops", "🦋 Butterfly trail"]]),
  ],
  space: [FAMILY_STORIES.space,
    adventure("Alien pet rescue", "👽", [
      "Hello from our pretend space station! A friendly alien needs help finding a little pet. Who shall we look for?",
      "The moon puppy left bouncy paw prints! Shall we search the crater or the rocket garden?",
      "The star kitten left a sparkly whisker trail! Shall we look behind Saturn or in the space library?",
      "We found our little space pet! Give it a pretend cuddle and show me your happiest animal face.",
      "Here comes our space pet in a tiny flying basket! Let's welcome it home with a silly astronaut dance.",
    ], [["🐶 A moon puppy", "🐱 A star kitten"], ["🌑 A crater", "🌱 Rocket garden"], ["🪐 Saturn", "📚 Space library"]]),
    adventure("Rocket repair team", "🛠️", [
      "Hello, rocket helper! Our pretend spaceship needs a little fixing before takeoff. What should we check?",
      "The rocket button needs a shiny new shape! Shall we choose a circle or a triangle?",
      "Our space window needs some color! Shall we paint blue bubbles or purple hearts?",
      "Click, clack! Our pretend rocket is ready! Let's count down three, two, one, and stretch up toward the sky!",
      "Whoosh! What a colorful spaceship we made! Wave to our pretend family as we fly past the moon.",
    ], [["🔘 Rocket buttons", "🪟 Space window"], ["🔴 A circle", "🔺 A triangle"], ["🔵 Blue bubbles", "💜 Purple hearts"]]),
  ],
  bakery: [FAMILY_STORIES.bakery,
    adventure("Cookie delivery", "🎁", [
      "Hello, my little helper! Our pretend bakery is delivering treats today. What should we put in the box?",
      "These heart cookies are full of pretend kindness! Shall we tie a ribbon or draw a happy card?",
      "Our fruit muffins smell wonderful in our imagination! Shall we pack a banana muffin or a strawberry muffin?",
      "Our pretend delivery is ready! Who would you like to share a treat with? Tell me, then send them a big smile.",
      "Knock, knock! A box of kindness has arrived! Let's pretend to hand a treat to someone in our family.",
    ], [["❤️ Heart cookies", "🧁 Fruit muffins"], ["🎀 A ribbon", "💌 A happy card"], ["🍌 Banana", "🍓 Strawberry"]]),
    adventure("Shape sandwich cafe", "🥪", [
      "Hello from our pretend sandwich cafe! Our family is coming for lunch. What shape should our sandwiches be?",
      "Our circle sandwiches look like tiny suns! Shall we add pretend cheese or crunchy cucumber?",
      "Our triangle sandwiches have three tasty corners! Shall we put fruit or little carrots beside them?",
      "Our pretend lunch is ready to share! Can you make a big circle with your arms for our circle cafe sign?",
      "Welcome to our happy little cafe! Let's pretend to serve lunch and ask our family how their day is going.",
    ], [["🟠 Circle sandwiches", "🔺 Triangle sandwiches"], ["🧀 Cheese", "🥒 Cucumber"], ["🍊 Fruit", "🥕 Carrots"]]),
  ],
  camp: [FAMILY_STORIES.camp,
    adventure("Cozy pet sleepover", "🐾", [
      "Hello from our pretend pet sleepover! A little animal friend is visiting our tent. Who is coming tonight?",
      "Our puppy has brought a tiny blanket! Shall we make a pillow nest or tell a silly story?",
      "Our bunny is wearing pretend pajamas! Shall we sing a quiet song or make a soft little bed?",
      "Our little pet is all cozy now! Can you curl up your hands like a tiny sleeping animal? What a kind sleepover helper you are!",
      "The pretend stars are twinkling above our tent! Send our sleepy pet a whispery goodnight and a gentle little wave.",
    ], [["🐶 A puppy", "🐰 A bunny"], ["🛏️ A pillow nest", "📖 A silly story"], ["🎵 A quiet song", "🧺 A cozy bed"]]),
    adventure("Rainbow trail", "🌈", [
      "Hello, trail explorer! Our pretend family is following a rainbow through the woods. Which color shall we follow?",
      "The red trail leads to a picnic of pretend strawberries! Shall we collect leaves or draw a trail sign?",
      "The blue trail leads to a little pretend stream! Shall we hop across stones or make a leaf boat?",
      "We reached the end of our rainbow trail! Our treasure is a big family hug. Give yourself a lovely little squeeze!",
      "What a colorful adventure we shared! Can you name a color you spotted on our pretend trail?",
    ], [["❤️ The red trail", "💙 The blue trail"], ["🍃 Collect leaves", "🎨 Draw a sign"], ["🪨 Hop on stones", "⛵ A leaf boat"]]),
  ],
};

export function familyAdventure(story: FamilyStoryId, visit: number): Adventure {
  const adventures = FAMILY_ADVENTURES[story];
  return adventures[Math.max(0, Math.floor(Number.isFinite(visit) ? visit : 0)) % adventures.length];
}
