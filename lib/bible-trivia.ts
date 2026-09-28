export type TriviaLevel = "Explorer" | "Adventurer" | "Scholar";
export type TriviaQuestion = { question: string; choices: string[]; answer: string };
export const TRIVIA_BY_LEVEL: Record<TriviaLevel, TriviaQuestion[]> = {
  Explorer: [
    {"question":"Who created the heavens and the earth?","choices":["God","Noah","Moses","David"],"answer":"God"},
    {"question":"What sign did God place in the sky after the flood?","choices":["A rainbow","A ladder","A crown","A boat"],"answer":"A rainbow"},
    {"question":"Who was the first man in Genesis?","choices":["Adam","Abraham","Isaac","Jacob"],"answer":"Adam"},
    {"question":"Who was the first woman in Genesis?","choices":["Eve","Sarah","Rachel","Leah"],"answer":"Eve"},
    {"question":"In what garden did Adam and Eve live?","choices":["Eden","Gethsemane","Babylon","Jericho"],"answer":"Eden"},
    {"question":"What animals did young David look after?","choices":["Sheep","Camels","Horses","Chickens"],"answer":"Sheep"},
    {"question":"Who climbed a tree to see Jesus?","choices":["Zacchaeus","Noah","Moses","Daniel"],"answer":"Zacchaeus"},
    {"question":"What did Jesus use to feed the five thousand?","choices":["Five loaves and two fish","One apple and three pears","Seven cakes and milk","Rice and beans"],"answer":"Five loaves and two fish"},
    {"question":"What did Jesus do during the storm on the lake?","choices":["Calmed the wind and waves","Built an ark","Climbed a tree","Dug a well"],"answer":"Calmed the wind and waves"},
    {"question":"Who walked on water toward Jesus?","choices":["Peter","Noah","Joseph","Solomon"],"answer":"Peter"},
    {"question":"Which animal spoke to Balaam?","choices":["A donkey","A lion","A sheep","A dove"],"answer":"A donkey"},
    {"question":"Who brought the shepherds news of Jesus' birth?","choices":["An angel","A king","A sailor","A soldier"],"answer":"An angel"},
    {"question":"Who followed a star to find Jesus?","choices":["Wise men","Roman soldiers","Fishermen","Farmers"],"answer":"Wise men"},
    {"question":"Where was baby Moses placed to keep him safe?","choices":["In a basket among the reeds","In a cave","On a mountain","In a chariot"],"answer":"In a basket among the reeds"},
    {"question":"Who heard God call his name as a boy serving with Eli?","choices":["Samuel","Goliath","Herod","Pharaoh"],"answer":"Samuel"},
    {"question":"How many days and nights did rain fall during Noah's flood?","choices":["Forty","Three","Seven","Twelve"],"answer":"Forty"},
    {"question":"In Jesus' story, what did the shepherd search for?","choices":["A lost sheep","A lost horse","A lost camel","A lost bird"],"answer":"A lost sheep"},
    {"question":"Who helped the injured traveler in Jesus' parable?","choices":["A Samaritan","A king","A fisherman","A Roman emperor"],"answer":"A Samaritan"},
    {"question":"What did Jesus ride into Jerusalem?","choices":["A donkey","A horse","A camel","An elephant"],"answer":"A donkey"},
    {"question":"Who baptized Jesus?","choices":["John the Baptist","King David","Moses","Noah"],"answer":"John the Baptist"},
    { question: "Who built the ark?", choices: ["Noah", "Moses", "David", "Peter"], answer: "Noah" },
    { question: "Where was Jesus born?", choices: ["Bethlehem", "Jericho", "Nazareth", "Rome"], answer: "Bethlehem" },
    { question: "What did David use against Goliath?", choices: ["A sling and stone", "A net", "A trumpet", "A staff"], answer: "A sling and stone" },
    { question: "Who was swallowed by a great fish?", choices: ["Jonah", "Joseph", "Daniel", "Samuel"], answer: "Jonah" },
    { question: "Who was protected in the lions’ den?", choices: ["Daniel", "Noah", "Peter", "Isaac"], answer: "Daniel" },
    { question: "Who led God’s people through the Red Sea?", choices: ["Moses", "David", "Paul", "Abraham"], answer: "Moses" },
    { question: "What is the first book of the Bible?", choices: ["Genesis", "Matthew", "Psalms", "Exodus"], answer: "Genesis" },
    { question: "How many disciples did Jesus choose?", choices: ["12", "7", "10", "20"], answer: "12" },
    { question: "What was the name of Jesus’ mother?", choices: ["Mary", "Ruth", "Esther", "Martha"], answer: "Mary" },
    { question: "What did Jesus turn water into?", choices: ["Wine", "Milk", "Oil", "Juice"], answer: "Wine" },
  ],
  Adventurer: [
    {"question":"Who was Abraham's wife?","choices":["Sarah","Rebekah","Rachel","Miriam"],"answer":"Sarah"},
    {"question":"Who was Isaac's wife?","choices":["Rebekah","Ruth","Esther","Deborah"],"answer":"Rebekah"},
    {"question":"Who was Jacob's twin brother?","choices":["Esau","Joseph","Benjamin","Aaron"],"answer":"Esau"},
    {"question":"Which brother stayed home when Joseph's other brothers first went to Egypt for grain?","choices":["Benjamin","Judah","Reuben","Simeon"],"answer":"Benjamin"},
    {"question":"Who found baby Moses in the basket?","choices":["Pharaoh's daughter","A shepherd","Joshua","A merchant"],"answer":"Pharaoh's daughter"},
    {"question":"Who was Moses' brother and spokesman?","choices":["Aaron","Caleb","Gideon","Saul"],"answer":"Aaron"},
    {"question":"What unusual sight did Moses see when God called him?","choices":["A bush burning without being consumed","A golden chariot","A tower reaching the clouds","A flying scroll"],"answer":"A bush burning without being consumed"},
    {"question":"What food did the Israelites gather in the wilderness?","choices":["Manna","Grapes","Lentils","Figs"],"answer":"Manna"},
    {"question":"Who led the Israelites after Moses died?","choices":["Joshua","Samuel","Solomon","Elisha"],"answer":"Joshua"},
    {"question":"Who hid the Israelite spies in Jericho?","choices":["Rahab","Delilah","Hannah","Jezebel"],"answer":"Rahab"},
    {"question":"Which woman was a judge and prophet in Israel?","choices":["Deborah","Ruth","Sarah","Martha"],"answer":"Deborah"},
    {"question":"Who was David's close friend and King Saul's son?","choices":["Jonathan","Absalom","Jesse","Nathan"],"answer":"Jonathan"},
    {"question":"Which prophet confronted David with a story about a poor man's lamb?","choices":["Nathan","Jonah","Haggai","Zechariah"],"answer":"Nathan"},
    {"question":"Which prophet challenged the prophets of Baal on Mount Carmel?","choices":["Elijah","Daniel","Jeremiah","Ezekiel"],"answer":"Elijah"},
    {"question":"Who succeeded Elijah as a prophet?","choices":["Elisha","Isaiah","Amos","Hosea"],"answer":"Elisha"},
    {"question":"Who was thrown into the fiery furnace with Shadrach and Meshach?","choices":["Abednego","Daniel","Ezra","Nehemiah"],"answer":"Abednego"},
    {"question":"Who was the brother of Mary and Martha whom Jesus raised from the dead?","choices":["Lazarus","Andrew","Philip","James"],"answer":"Lazarus"},
    {"question":"Which disciple wanted to see Jesus' wounds before believing he had risen?","choices":["Thomas","Matthew","John","Andrew"],"answer":"Thomas"},
    {"question":"How many times did Peter deny knowing Jesus?","choices":["Three","Two","Five","Seven"],"answer":"Three"},
    {"question":"What did the father do when the prodigal son returned home?","choices":["Welcomed him and celebrated","Sent him away","Made him wait outside","Refused to speak to him"],"answer":"Welcomed him and celebrated"},
    { question: "Which king was known for asking God for wisdom?", choices: ["Solomon", "Saul", "Ahab", "Herod"], answer: "Solomon" },
    { question: "Whose walls fell after Israel marched around them?", choices: ["Jericho", "Bethlehem", "Nineveh", "Damascus"], answer: "Jericho" },
    { question: "Who was Ruth’s mother-in-law?", choices: ["Naomi", "Hannah", "Miriam", "Deborah"], answer: "Naomi" },
    { question: "Who received a special coat from his father?", choices: ["Joseph", "Joshua", "Jacob", "Jonathan"], answer: "Joseph" },
    { question: "What was connected to Samson’s great strength?", choices: ["His uncut hair", "His sandals", "His shield", "His crown"], answer: "His uncut hair" },
    { question: "Which disciple had been a tax collector?", choices: ["Matthew", "Andrew", "John", "Thomas"], answer: "Matthew" },
    { question: "Where did Jesus teach the Beatitudes?", choices: ["On a mountainside", "In a palace", "On a ship", "In Rome"], answer: "On a mountainside" },
    { question: "Who interpreted Pharaoh’s dreams in Egypt?", choices: ["Joseph", "Aaron", "Samuel", "Elijah"], answer: "Joseph" },
    { question: "Which queen bravely spoke up for her people?", choices: ["Esther", "Jezebel", "Bathsheba", "Candace"], answer: "Esther" },
    { question: "What happened when Paul and Silas sang in prison?", choices: ["An earthquake opened the doors", "It began to rain", "The lights went out", "A ship arrived"], answer: "An earthquake opened the doors" },
  ],
  Scholar: [
    {"question":"Which prophet saw a valley of dry bones?","choices":["Ezekiel","Amos","Jonah","Haggai"],"answer":"Ezekiel"},
    {"question":"Which prophet said he was a shepherd and cared for sycamore-fig trees?","choices":["Amos","Isaiah","Zechariah","Malachi"],"answer":"Amos"},
    {"question":"Which prophet confronted King Ahab about Naboth's vineyard?","choices":["Elijah","Elisha","Samuel","Nathan"],"answer":"Elijah"},
    {"question":"During which king's reign was the Book of the Law found during temple repairs?","choices":["Josiah","Rehoboam","Ahab","Saul"],"answer":"Josiah"},
    {"question":"Who led the rebuilding of Jerusalem's walls after the exile?","choices":["Nehemiah","Gideon","Joshua","Jonathan"],"answer":"Nehemiah"},
    {"question":"Which priest and scribe taught the Law to the returned exiles?","choices":["Ezra","Eli","Zadok","Abiathar"],"answer":"Ezra"},
    {"question":"Who interpreted the writing on the wall at Belshazzar's feast?","choices":["Daniel","Joseph","Ezekiel","Jeremiah"],"answer":"Daniel"},
    {"question":"Which prophet married Gomer?","choices":["Hosea","Amos","Micah","Joel"],"answer":"Hosea"},
    {"question":"Which prophet named Bethlehem as the birthplace of a future ruler of Israel?","choices":["Micah","Nahum","Habakkuk","Obadiah"],"answer":"Micah"},
    {"question":"Which Gospel begins by describing Jesus as the Word?","choices":["John","Matthew","Mark","Luke"],"answer":"John"},
    {"question":"Who visited Jesus at night to talk about being born again?","choices":["Nicodemus","Zacchaeus","Jairus","Bartimaeus"],"answer":"Nicodemus"},
    {"question":"Who asked Pilate for Jesus' body?","choices":["Joseph of Arimathea","Simon of Cyrene","Nicodemus","Joseph of Nazareth"],"answer":"Joseph of Arimathea"},
    {"question":"Who was compelled to carry Jesus' cross?","choices":["Simon of Cyrene","Simon Peter","Barnabas","Andrew"],"answer":"Simon of Cyrene"},
    {"question":"Who was the Roman centurion visited by Peter in Acts 10?","choices":["Cornelius","Felix","Festus","Julius"],"answer":"Cornelius"},
    {"question":"Which couple explained the way of God more fully to Apollos?","choices":["Priscilla and Aquila","Ananias and Sapphira","Mary and Joseph","Zechariah and Elizabeth"],"answer":"Priscilla and Aquila"},
    {"question":"Which young man fell from a window while Paul was speaking?","choices":["Eutychus","Timothy","Titus","Silas"],"answer":"Eutychus"},
    {"question":"On which island was Paul shipwrecked in Acts 28?","choices":["Malta","Patmos","Crete","Cyprus"],"answer":"Malta"},
    {"question":"Which letter contains the passage about love in chapter 13?","choices":["1 Corinthians","Romans","Ephesians","1 Peter"],"answer":"1 Corinthians"},
    {"question":"Which letter says that faith without works is dead?","choices":["James","Jude","Philemon","2 John"],"answer":"James"},
    {"question":"Which church in Revelation is described as lukewarm?","choices":["Laodicea","Smyrna","Philadelphia","Ephesus"],"answer":"Laodicea"},
    { question: "On what road did Saul encounter Jesus?", choices: ["The road to Damascus", "The road to Jericho", "The Emmaus road", "The Appian Way"], answer: "The road to Damascus" },
    { question: "Which book lists the fruit of the Spirit?", choices: ["Galatians", "Genesis", "Hebrews", "Revelation"], answer: "Galatians" },
    { question: "Who was chosen to replace Judas among the twelve?", choices: ["Matthias", "Barnabas", "Silas", "Timothy"], answer: "Matthias" },
    { question: "On which island did John receive the Revelation?", choices: ["Patmos", "Crete", "Cyprus", "Malta"], answer: "Patmos" },
    { question: "Who is remembered as the first Christian martyr?", choices: ["Stephen", "James", "Philip", "Mark"], answer: "Stephen" },
    { question: "Lydia was a seller of what?", choices: ["Purple cloth", "Olive oil", "Spices", "Pottery"], answer: "Purple cloth" },
    { question: "Who was Priscilla’s husband?", choices: ["Aquila", "Apollos", "Festus", "Titus"], answer: "Aquila" },
    { question: "Which king ordered Daniel into the lions’ den?", choices: ["Darius", "Solomon", "Herod", "Josiah"], answer: "Darius" },
    { question: "In which letter is the armor of God described?", choices: ["Ephesians", "Romans", "Philippians", "Colossians"], answer: "Ephesians" },
    { question: "Who explained the Scriptures to the Ethiopian official?", choices: ["Philip", "Peter", "Luke", "Barnabas"], answer: "Philip" },
  ],
};

// Fisher–Yates shuffles copies, preserving the question bank across rounds.
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createTriviaRound(level: TriviaLevel, random: () => number = Math.random): TriviaQuestion[] {
  return shuffled(TRIVIA_BY_LEVEL[level], random).slice(0, 8).map(question => ({
    ...question,
    choices: shuffled(question.choices, random),
  }));
}

