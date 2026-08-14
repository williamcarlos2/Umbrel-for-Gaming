export type Quote = { text: string; author: string; role?: string };

export const QUOTES: Quote[] = [
  // Shigeru Miyamoto
  { text: "A delayed game is eventually good, but a rushed game is forever bad.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },
  { text: "What if everything you see is more than what you see — the person next to you is a warrior and the space that appears empty is a secret door to another world?", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },
  { text: "Video games are bad for you? That's what they said about rock and roll.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },
  { text: "I think the big mistake in schools is trying to teach children anything, and by using fear as the basic motivation.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },
  { text: "Above all, video games are meant to be fun.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },
  { text: "The obvious objective of video games is to entertain people by surprising them with new experiences.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },

  // Hideo Kojima
  { text: "I make games that I want to play. My goal is to make something that surprises me.", author: "Hideo Kojima", role: "Creator of Metal Gear & Death Stranding" },
  { text: "A game is a dream that you never want to wake up from.", author: "Hideo Kojima", role: "Creator of Metal Gear & Death Stranding" },
  { text: "I want to create games that adults can enjoy and be moved by.", author: "Hideo Kojima", role: "Creator of Metal Gear & Death Stranding" },
  { text: "Books, movies, games — they all strive to bring something to the world. My games are just a small part of that.", author: "Hideo Kojima", role: "Creator of Metal Gear & Death Stranding" },
  { text: "The difference between a movie director and a game director is that a game director cannot control the audience.", author: "Hideo Kojima", role: "Creator of Metal Gear & Death Stranding" },

  // Satoru Iwata
  { text: "On my business card, I am a corporate president. In my mind, I am a game developer. But in my heart, I am a gamer.", author: "Satoru Iwata", role: "Nintendo CEO" },
  { text: "We have to show people experiences they've never had before and want to have again.", author: "Satoru Iwata", role: "Nintendo CEO" },
  { text: "If we do not continue to challenge ourselves, we will not grow.", author: "Satoru Iwata", role: "Nintendo CEO" },
  { text: "Failure is not something to be ashamed of. What is shameful is to not try anything out of fear of failure.", author: "Satoru Iwata", role: "Nintendo CEO" },
  { text: "A smile on the face of people who play our games is the most important metric for us.", author: "Satoru Iwata", role: "Nintendo CEO" },

  // Sid Meier
  { text: "A game is a series of interesting choices.", author: "Sid Meier", role: "Creator of Civilization" },
  { text: "The golden rule is that there are no golden rules in game design.", author: "Sid Meier", role: "Creator of Civilization" },
  { text: "Games are not about the destination, they are about the journey.", author: "Sid Meier", role: "Creator of Civilization" },

  // Will Wright
  { text: "Games are one of the few mediums that allow you to experience failure in a safe, constructive way.", author: "Will Wright", role: "Creator of The Sims & SimCity" },
  { text: "The player is actually authoring something unique, and that's what makes games special.", author: "Will Wright", role: "Creator of The Sims & SimCity" },
  { text: "A game is a problem-solving activity, approached with a playful attitude.", author: "Will Wright", role: "Creator of The Sims & SimCity" },

  // Gabe Newell
  { text: "The best way to do something is to be embarrassed by how bad the first version is.", author: "Gabe Newell", role: "Co-founder of Valve" },
  { text: "Piracy is almost always a service problem and not a pricing problem.", author: "Gabe Newell", role: "Co-founder of Valve" },
  { text: "The Internet is the best thing that ever happened to gaming.", author: "Gabe Newell", role: "Co-founder of Valve" },

  // John Carmack
  { text: "The best programs are the ones written when the programmer is supposed to be working on something else.", author: "John Carmack", role: "id Software Co-founder" },
  { text: "Programming is not about typing — it's about thinking.", author: "John Carmack", role: "id Software Co-founder" },
  { text: "I have a great advantage in that I love programming. All the problems are fascinating, even the mundane ones.", author: "John Carmack", role: "id Software Co-founder" },
  { text: "In the information age, the barriers just aren't there. The barriers are self-imposed.", author: "John Carmack", role: "id Software Co-founder" },

  // Miyamoto Extras
  { text: "We don't just make games for gamers. We make games for everyone.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },

  // Nolan Bushnell
  { text: "The ultimate game isn't about winning. It's about joy.", author: "Nolan Bushnell", role: "Founder of Atari" },
  { text: "Everyone who's ever taken a shower has had an idea. It's the person who gets out of the shower, dries off, and does something about it who makes a difference.", author: "Nolan Bushnell", role: "Founder of Atari" },
  { text: "A lot of successful people are risk-takers. Unless you're willing to do that... you'll never be the best.", author: "Nolan Bushnell", role: "Founder of Atari" },

  // Yu Suzuki
  { text: "I want to create something that can move people emotionally. That's my goal.", author: "Yu Suzuki", role: "Creator of Shenmue & OutRun" },
  { text: "The experience of playing is like a story that you create yourself.", author: "Yu Suzuki", role: "Creator of Shenmue & OutRun" },

  // Peter Molyneux
  { text: "I've always tried to make games that I would want to play myself.", author: "Peter Molyneux", role: "Creator of Fable & Black & White" },
  { text: "The moment you stop dreaming, you start dying — in games and in life.", author: "Peter Molyneux", role: "Creator of Fable & Black & White" },

  // Ken Levine
  { text: "Games can make you feel things that no other medium can.", author: "Ken Levine", role: "Creator of BioShock" },
  { text: "I want players to feel something real inside a completely unreal world.", author: "Ken Levine", role: "Creator of BioShock" },

  // Gunpei Yokoi
  { text: "Lateral thinking with withered technology — use existing tech in unexpected ways.", author: "Gunpei Yokoi", role: "Creator of Game Boy & Metroid" },
  { text: "The job of a toy maker is to make a child's imagination run wild.", author: "Gunpei Yokoi", role: "Creator of Game Boy & Metroid" },

  // Warren Spector
  { text: "The goal should be to create a world so rich that it could exist without you.", author: "Warren Spector", role: "Creator of Deus Ex" },
  { text: "Games are the only medium that allows you to make choices that matter.", author: "Warren Spector", role: "Creator of Deus Ex" },

  // Cliff Bleszinski
  { text: "Stop talking about making a game. Just make the game.", author: "Cliff Bleszinski", role: "Creator of Gears of War" },
  { text: "The best feedback you can get is from a player who's completely lost in your world.", author: "Cliff Bleszinski", role: "Creator of Gears of War" },

  // Amy Hennig
  { text: "The best stories are the ones that make you forget you're playing a game.", author: "Amy Hennig", role: "Creator of Uncharted" },
  { text: "Characters don't have to be likable — they have to be relatable.", author: "Amy Hennig", role: "Creator of Uncharted" },

  // Eiji Aonuma
  { text: "Zelda is a game about freedom. Everything else is secondary.", author: "Eiji Aonuma", role: "Zelda Series Producer" },
  { text: "I want players to feel like explorers who discover the world themselves.", author: "Eiji Aonuma", role: "Zelda Series Producer" },

  // Masahiro Sakurai
  { text: "Game development is a process of constant sacrifice and compromise — but it's worth every moment.", author: "Masahiro Sakurai", role: "Creator of Kirby & Smash Bros" },
  { text: "Fun is not something you add at the end. It has to be built from the very foundation.", author: "Masahiro Sakurai", role: "Creator of Kirby & Smash Bros" },
  { text: "I make games because I want players to be happy. That's the only reason.", author: "Masahiro Sakurai", role: "Creator of Kirby & Smash Bros" },

  // Yoshinori Ono
  { text: "Every character has a story. Every fight has meaning.", author: "Yoshinori Ono", role: "Street Fighter Producer" },

  // Hidetaka Miyazaki
  { text: "I want players to feel a sense of accomplishment for overcoming a really difficult situation.", author: "Hidetaka Miyazaki", role: "Creator of Dark Souls & Elden Ring" },
  { text: "Difficulty isn't an obstacle — it's the vehicle through which the experience is delivered.", author: "Hidetaka Miyazaki", role: "Creator of Dark Souls & Elden Ring" },
  { text: "Overcoming difficulty is what makes a game feel real.", author: "Hidetaka Miyazaki", role: "Creator of Dark Souls & Elden Ring" },

  // Retro Gaming Culture
  { text: "Retro gaming isn't about nostalgia. It's about quality that stands the test of time.", author: "Gaming Community Wisdom", role: "" },
  { text: "The best games ever made fit in a cartridge the size of your hand.", author: "Gaming Community Wisdom", role: "" },
  { text: "16 bits was enough to change the world.", author: "Gaming Community Wisdom", role: "" },
  { text: "Pixels don't lie. Good gameplay is good gameplay.", author: "Gaming Community Wisdom", role: "" },
  { text: "Blowing in the cartridge is a sacred ritual.", author: "Gaming Community Wisdom", role: "" },
  { text: "The save file was the original cloud backup.", author: "Gaming Community Wisdom", role: "" },
  { text: "Press Start to begin your adventure.", author: "Gaming Community Wisdom", role: "" },
  { text: "The game over screen isn't the end. It's a lesson.", author: "Gaming Community Wisdom", role: "" },
  { text: "Some of the best games ever made never left Japan.", author: "Gaming Community Wisdom", role: "" },
  { text: "Cartridge collecting is archaeology for the digital age.", author: "Gaming Community Wisdom", role: "" },
  { text: "The value of a game isn't in its price tag — it's in its hours.", author: "Gaming Community Wisdom", role: "" },
  { text: "Every thrift store is a treasure hunt waiting to happen.", author: "Gaming Community Wisdom", role: "" },
  { text: "One man's garage sale discard is another man's grail.", author: "Gaming Community Wisdom", role: "" },
  { text: "Know the market, trust your gut, check the label.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The hunt is half the fun. The find is the other half.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Never buy what you can't sell. Always sell what you don't love.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The rarest games hide in the most unexpected places.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Buy the game, not the hype.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Condition is everything. Unless it's a grail. Then it's negotiable.", author: "Retro Hunting Wisdom", role: "" },
  { text: "CIB always beats loose. Always.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The best deals are found before the doors open.", author: "Retro Hunting Wisdom", role: "" },
  { text: "A fair price is where the buyer smiles and the seller doesn't cry.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Your collection is a time machine built from plastic and silicon.", author: "Retro Hunting Wisdom", role: "" },

  // Game Critics & YouTubers
  { text: "Great games don't age. Bad games age instantly.", author: "AVGN (James Rolfe)", role: "Angry Video Game Nerd" },
  { text: "This game is so bad it's almost impressive.", author: "AVGN (James Rolfe)", role: "Angry Video Game Nerd" },
  { text: "The secret to good game criticism is playing enough bad games to appreciate the good ones.", author: "Gaming Culture", role: "" },

  // Roger Ebert (controversial, but relevant)
  { text: "I was wrong about video games. I admit it now.", author: "Roger Ebert", role: "Film Critic" },

  // Reggie Fils-Aimé
  { text: "My body is ready.", author: "Reggie Fils-Aimé", role: "Former Nintendo of America President" },
  { text: "If it's not fun, why bother?", author: "Reggie Fils-Aimé", role: "Former Nintendo of America President" },
  { text: "We want every player to feel welcome at Nintendo's table.", author: "Reggie Fils-Aimé", role: "Former Nintendo of America President" },

  // Yuji Naka
  { text: "Speed is freedom. That was the whole idea behind Sonic.", author: "Yuji Naka", role: "Creator of Sonic the Hedgehog" },
  { text: "Sonic was our answer to a question nobody was asking yet — what if games moved at the speed of cool?", author: "Yuji Naka", role: "Creator of Sonic the Hedgehog" },

  // Tom Kalinske
  { text: "We knew we had to be the underdog that bit back. And we did.", author: "Tom Kalinske", role: "Former Sega of America CEO" },
  { text: "Sega vs Nintendo wasn't just a console war. It was a culture war.", author: "Tom Kalinske", role: "Former Sega of America CEO" },

  // Howard Lincoln / Minoru Arakawa
  { text: "Nintendo's job is to put smiles on faces around the world.", author: "Minoru Arakawa", role: "Nintendo of America Co-founder" },

  // Tim Schafer
  { text: "If a game isn't fun, it isn't a game — it's homework.", author: "Tim Schafer", role: "Creator of Monkey Island & Psychonauts" },
  { text: "Adventure games taught me that every problem has a weird solution.", author: "Tim Schafer", role: "Creator of Monkey Island & Psychonauts" },
  { text: "The best thing about games is that anyone can be the hero.", author: "Tim Schafer", role: "Creator of Monkey Island & Psychonauts" },

  // Ron Gilbert
  { text: "A game should make you feel clever, not stupid.", author: "Ron Gilbert", role: "Creator of Monkey Island" },
  { text: "The best puzzles are the ones where you feel dumb right up until the moment you don't.", author: "Ron Gilbert", role: "Creator of Monkey Island" },

  // David Jaffe
  { text: "Games should provoke emotion. Comfortable games are forgotten games.", author: "David Jaffe", role: "Creator of God of War & Twisted Metal" },

  // Tetsuya Nomura
  { text: "Every detail matters. The buckles, the zippers — they all tell a story.", author: "Tetsuya Nomura", role: "Final Fantasy & Kingdom Hearts Designer" },

  // Hironobu Sakaguchi
  { text: "Final Fantasy was named that because we thought it would be our last game. Good thing we were wrong.", author: "Hironobu Sakaguchi", role: "Creator of Final Fantasy" },
  { text: "RPGs give players the gift of a second life.", author: "Hironobu Sakaguchi", role: "Creator of Final Fantasy" },

  // Richard Garfield
  { text: "The best game designs leave room for the player to be creative.", author: "Richard Garfield", role: "Creator of Magic: The Gathering" },

  // Roberta Williams
  { text: "I wanted to create worlds women could be heroes in — that was radical at the time.", author: "Roberta Williams", role: "Co-founder of Sierra On-Line" },
  { text: "Adventure games were the first form of interactive storytelling.", author: "Roberta Williams", role: "Co-founder of Sierra On-Line" },

  // Ken Williams
  { text: "We were making it up as we went. That was the beauty of early game development.", author: "Ken Williams", role: "Co-founder of Sierra On-Line" },

  // Phil Spencer
  { text: "Gaming is the most inclusive entertainment medium we have.", author: "Phil Spencer", role: "Head of Xbox" },
  { text: "I want gaming to be for everyone. Not just hardcore players.", author: "Phil Spencer", role: "Head of Xbox" },

  // Trip Hawkins
  { text: "I wanted EA to be the Hollywood of video games. I think we got there.", author: "Trip Hawkins", role: "Founder of EA" },

  // Sandy Petersen
  { text: "Horror games work because the unknown is always scarier than what's shown.", author: "Sandy Petersen", role: "Quake & Doom Designer" },

  // American McGee
  { text: "Dark stories resonate because they reflect something true about the human experience.", author: "American McGee", role: "Creator of Alice" },

  // Hideki Kamiya
  { text: "I want to make action games that make you feel cool just for playing them.", author: "Hideki Kamiya", role: "Creator of Devil May Cry & Bayonetta" },
  { text: "The player is the star. The designer just sets the stage.", author: "Hideki Kamiya", role: "Creator of Devil May Cry & Bayonetta" },

  // Shinji Mikami
  { text: "Fear and fun are not opposites. In the right game, they're the same thing.", author: "Shinji Mikami", role: "Creator of Resident Evil" },
  { text: "Survival horror works because it makes you feel vulnerable. And vulnerability is honest.", author: "Shinji Mikami", role: "Creator of Resident Evil" },

  // Keiji Inafune
  { text: "Mega Man wasn't just a character. He was an idea — that good always perseveres.", author: "Keiji Inafune", role: "Creator of Mega Man" },
  { text: "Japanese game development had a golden era. We should honor it by doing better.", author: "Keiji Inafune", role: "Creator of Mega Man" },

  // Fumito Ueda
  { text: "I want to make games that feel like they couldn't exist in any other medium.", author: "Fumito Ueda", role: "Creator of Shadow of the Colossus & ICO" },
  { text: "Minimalism in game design is not laziness — it's respect for the player's imagination.", author: "Fumito Ueda", role: "Creator of Shadow of the Colossus & ICO" },

  // Randy Pitchford
  { text: "The best co-op games are the ones where helping each other is more fun than playing alone.", author: "Randy Pitchford", role: "Co-founder of Gearbox" },

  // Brenda Romero
  { text: "Games are the most powerful communication tool humans have invented.", author: "Brenda Romero", role: "Game Designer & Educator" },
  { text: "We have barely scratched the surface of what games can express.", author: "Brenda Romero", role: "Game Designer & Educator" },

  // Jane McGonigal
  { text: "Games are the art form of the 21st century.", author: "Jane McGonigal", role: "Game Designer & Author" },
  { text: "Reality is broken. Games can fix it.", author: "Jane McGonigal", role: "Game Designer & Author" },
  { text: "Gamers are the most creative, collaborative, and resilient problem-solvers on the planet.", author: "Jane McGonigal", role: "Game Designer & Author" },

  // Extra industry gems
  { text: "Making games is about making people feel something they can't feel anywhere else.", author: "Industry Wisdom", role: "" },
  { text: "The controller is the paintbrush. The player is the artist.", author: "Industry Wisdom", role: "" },
  { text: "Every great game starts with a question: what would be fun?", author: "Industry Wisdom", role: "" },
  { text: "Games are the only art form where the audience participates in the creation.", author: "Industry Wisdom", role: "" },
  { text: "Design is not decoration. Design is function.", author: "Industry Wisdom", role: "" },
  { text: "The best game mechanic is one you understand before you read the tutorial.", author: "Industry Wisdom", role: "" },
  { text: "A great level is a lesson disguised as a playground.", author: "Industry Wisdom", role: "" },
  { text: "The pause menu is a second chance. Don't waste it.", author: "Industry Wisdom", role: "" },
  { text: "A loading screen is a broken promise. Make it shorter.", author: "Industry Wisdom", role: "" },
  { text: "Every frame counts. Every pixel matters.", author: "Industry Wisdom", role: "" },
  { text: "Great games don't teach you to play them. They let you discover how.", author: "Industry Wisdom", role: "" },
  { text: "Sound design is half the experience. Most players never notice it — and that's the point.", author: "Industry Wisdom", role: "" },
  { text: "The best boss fight is the one that teaches you to beat it.", author: "Industry Wisdom", role: "" },
  { text: "A sequel should evolve, not just expand.", author: "Industry Wisdom", role: "" },
  { text: "Nostalgia is powerful, but it shouldn't be your only design tool.", author: "Industry Wisdom", role: "" },

  // Hunting/collecting specific
  { text: "The holy grail is different for every hunter. That's what makes it holy.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Don't just collect games. Play them.", author: "Retro Hunting Wisdom", role: "" },
  { text: "A game on the shelf unseen is a story untold.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The best time to find a deal was yesterday. The second best time is now.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Know your prices before you walk in. Always.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Every cartridge has been in someone else's hands before yours. Honor that.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The flea market at 6am is worth every minute of lost sleep.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Quality beats quantity. But quantity is pretty great too.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Garage sales smell like opportunity.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Never lowball someone's childhood memories. But never overpay either.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The game box is not the game. But it sure is nice.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Always check the manual. Always.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Patience is a collector's most valuable skill.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The right price is the one you both walk away happy from.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Flipping games isn't just business. It's keeping the history alive.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Every collection tells the story of the collector.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The game you almost bought will haunt you longer than the one you overpaid for.", author: "Retro Hunting Wisdom", role: "" },
  { text: "An untested game is a mystery box. Price accordingly.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Your first grail find will ruin garage sales forever — in the best possible way.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Buy what you love. Sell what you don't. Keep what matters.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Loose games tell stories. CIB games tell dynasties.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Convention exclusives are hotel-room deals. Bring cash.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The person who knows the most wins the negotiation.", author: "Retro Hunting Wisdom", role: "" },
  { text: "Dust is not damage. Dirt is not destiny.", author: "Retro Hunting Wisdom", role: "" },
  { text: "The chip inside doesn't care about the label. Test first, grade later.", author: "Retro Hunting Wisdom", role: "" },
  { text: "eBay sold listings are the truth. Asking price is just a dream.", author: "Retro Hunting Wisdom", role: "" },

  // Miyamoto again (bonus)
  { text: "A game developer who doesn't play games is like a chef who doesn't eat.", author: "Shigeru Miyamoto", role: "Creator of Mario & Zelda" },

  // More legends
  { text: "The most powerful tool in game design is restraint.", author: "Industry Wisdom", role: "" },
  { text: "Players remember feelings, not features.", author: "Industry Wisdom", role: "" },
  { text: "Friction is not always bad design. Sometimes friction IS the design.", author: "Industry Wisdom", role: "" },
  { text: "Accessibility is not dumbing down. It's opening up.", author: "Industry Wisdom", role: "" },
  { text: "Never underestimate what a child can figure out on their own.", author: "Industry Wisdom", role: "" },
  { text: "The best tutorial is a good first level.", author: "Industry Wisdom", role: "" },
  { text: "Save often. In games and in life.", author: "Gaming Culture", role: "" },
  { text: "New game plus is life's greatest metaphor.", author: "Gaming Culture", role: "" },
  { text: "There is no final boss. There is only the next one.", author: "Gaming Culture", role: "" },
  { text: "Lives are finite. Continues are precious. Time is the real currency.", author: "Gaming Culture", role: "" },
  { text: "Achievement unlocked: you woke up today.", author: "Gaming Culture", role: "" },
  { text: "The respawn point is optimism made mechanical.", author: "Gaming Culture", role: "" },
  { text: "Every 100% completion run is an act of love.", author: "Gaming Culture", role: "" },
  { text: "The B-button is the most important button ever made.", author: "Gaming Culture", role: "" },
  { text: "The D-pad was democracy. Every direction had equal weight.", author: "Gaming Culture", role: "" },
  { text: "Insert coin. Insert yourself.", author: "Gaming Culture", role: "" },
  { text: "The arcade was the internet before the internet.", author: "Gaming Culture", role: "" },
  { text: "High scores are humanity's first social network.", author: "Gaming Culture", role: "" },
  { text: "Cheat codes were the first open-source software.", author: "Gaming Culture", role: "" },
  { text: "The instruction manual was the original walkthrough.", author: "Gaming Culture", role: "" },
  { text: "Nintendo Power was a magazine. It was also a religion.", author: "Gaming Culture", role: "" },
  { text: "You cannot put a price on a memory. But you can put one on the cartridge.", author: "Gaming Culture", role: "" },
  { text: "The most immersive game is the one you forget is a game.", author: "Gaming Culture", role: "" },
  { text: "Music from a game you love will always bring you home.", author: "Gaming Culture", role: "" },
  { text: "16-bit soundtracks still slap. No argument.", author: "Gaming Culture", role: "" },
  { text: "The Konami code is older than some nations and more reliable than most.", author: "Gaming Culture", role: "" },
];

export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function getDailyQuote(): Quote {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}
