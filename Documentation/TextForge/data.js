/* ============================================================
   TextForge Studio — sample data
   "The Salt Coast" — original fantasy
   ============================================================ */

window.SALT_COAST = (function () {

  // ---- prose helpers ----
  const splitParas = (s) => s.trim().split(/\n\n+/).map((p) => p.trim());

  // ---- scenes ----
  const scenes = {
    "sc-tide-at-dawn": {
      id: "sc-tide-at-dawn",
      title: "Tide at Dawn",
      status: "revised",
      pov: ["miren"],
      characters: ["miren", "old-edda"],
      location: "Tideholm — the salt pans",
      summary:
        "Before the village wakes, Miren walks the pans. A coin in the shallows is not where coins should be.",
      content: splitParas(`The tide had gone out before Miren did, and she did not trust that. A tide so far so early was not a tide at all but a held breath — the sea making room for something it meant to give back.

She walked the pans barefoot. The white crust crackled under her heels and the cold of it ran up to her knees in a way the cold of water never could. Salt had a way of feeling like memory. Edda had told her that once, sitting on the porch the year Miren's mother stopped speaking, and Miren had not understood then, and did not, exactly, understand now. But the cold ran up and she remembered it anyway.

Out where the pans bled into the wracks, the sea had left a pool the size of a soup bowl, ringed in foam the color of old wool. Miren crouched. In the pool sat a coin. The coin was wrong. It was the wrong color and it was the wrong size and it had a face on it she had never seen in any market in Tideholm, not in Brackhollow either, where her father went to sell the year his back was still good.

She fished it out and the salt bit her fingers where the lines had cracked and the coin was warm. Coins out of the sea are not warm. Coins out of the sea are colder than the sea, because the sea wants them. This one had been put there for finding.

"Edda," she said aloud, because she was alone, and naming the old woman was as good as a prayer. She pocketed the coin. She walked back through the pans the way she had come, careful to step in her own prints, because that was the kind of morning it was — the kind where you did not want to leave more of yourself on the ground than you had to.`),
    },

    "sc-strangers-coin": {
      id: "sc-strangers-coin",
      title: "The Stranger's Coin",
      status: "draft",
      pov: ["miren"],
      characters: ["miren", "old-edda", "stranger"],
      location: "Edda's cottage",
      summary: "Edda recognizes the coin. She does not say from where.",
      content: splitParas(`Edda's cottage was the southernmost in Tideholm and the closest to the sea, so that her voice in winter sounded always a little wet, as though words came up through her throat the way water comes up through a salt pan: filtered, half-given, half-kept.

Miren put the coin on the table between the bread and the lamp. Edda looked at it the way one looks at a letter delivered to the wrong house.

"Where," Edda said.

"In the third pan. The deep one. Below the wrack line, in a pool no bigger than your fist."

"And the tide?"

"Gone. Out further than yesterday. Further than I have seen."

Edda did not touch the coin. She set down the cup she was holding and folded her hands in her lap and looked at the coin without touching it for the length of time it took the kettle to begin its small complaining. Then she got up to lift the kettle off the iron, and she did this with her back to Miren, and her back was very still.

"Tell no one," she said. "Not your father. Not the priest. Not the boy who likes you, who you do not like back. Especially him."

"Why?"

"Because the coin is older than telling. And telling will wake it."

She came back to the table then and she sat down and she looked Miren full in the face for the first time that morning. Her eyes were the color of weak tea and they did not blink.

"Pocket it again," Edda said. "Walk back through your own prints. Do not throw it into the sea. The sea has refused it once. It will refuse it twice and the third time it will keep you in trade."`),
    },

    "sc-crooked-promise": {
      id: "sc-crooked-promise",
      title: "A Crooked Promise",
      status: "draft",
      pov: ["miren"],
      characters: ["miren", "father"],
      location: "The saltwright's house",
      summary: "Miren lies to her father for the first time she can remember.",
      content: splitParas(`Her father was at the long bench when she came in, mending a yoke that had broken once already and would break again, because the wood was old and he was older than the wood now in the ways that mattered.

"You were out early," he said, without looking up.

"The pans," she said.

"And?"

She had meant to say nothing. She had not meant to lie. There is a country between those two and Miren stepped into it and did not come back out for a long time after.

"And nothing," she said.`),
    },

    "sc-leaving-tideholm": {
      id: "sc-leaving-tideholm",
      title: "Leaving Tideholm",
      status: "draft",
      pov: ["miren"],
      characters: ["miren", "father", "old-edda"],
      location: "The coast road north",
      summary: "She leaves with the coin and a loaf and the name of an inn she has never been to.",
      content: splitParas(`The coast road north was not a road so much as a series of arguments between the cliff and the sea. In some places the cliff won and the road ran high and dry and you could see Brackhollow's smoke before midday. In other places the sea won and the road dipped to ankle-deep brack, and you walked through it with your skirts hitched and your boots in your hand, and you sang because singing kept the cold off.

Miren did not sing. She did not have the kind of voice for it, and the coin in her pocket was heavy in a way coins are not heavy, and singing felt like calling something to her shoulder that was already on her shoulder.`),
    },

    "sc-heron-inn": {
      id: "sc-heron-inn",
      title: "The Heron Inn",
      status: "draft",
      pov: ["miren"],
      characters: ["miren", "innkeeper", "stranger"],
      location: "The Heron Inn, Brackhollow",
      summary: "An innkeeper who asks no questions. A stranger who asks all of them.",
      content: splitParas(`The Heron was warm in the way roadside inns are warm: the heat all gathered in the upper third of the room, so that your face cooked and your feet stayed wet. Miren sat near the hearth anyway, because the wet was hers and the heat was free.`),
    },

    "sc-beneath-pilings": {
      id: "sc-beneath-pilings",
      title: "Beneath the Pilings",
      status: "draft",
      pov: ["miren"],
      characters: ["miren", "stranger"],
      location: "Brackhollow harbor",
      summary: "A door under the docks that should not exist, with a lock the coin fits.",
      content: splitParas(`Where the pilings met the mud there was a door. The door had not been a door for a long time. The wood had taken on the color of the mud and the mud had taken on the smell of the wood, and the two of them had agreed, mostly, to be one thing now.

But the lock on the door was iron and the iron remembered what it was for.`),
    },

    "sc-salt-and-bone": {
      id: "sc-salt-and-bone",
      title: "Salt and Bone",
      status: "final",
      pov: ["miren", "old-edda"],
      characters: ["miren", "old-edda", "sea-wife"],
      location: "Beneath the harbor",
      summary: "The Sea-Wife's garden. A bargain in a language Miren almost knows.",
      content: splitParas(`Beneath the harbor, below the lock the coin had opened and the stair the lock had hidden, the air was warmer than it had any right to be, and it smelled of nothing — not of sea, not of stone, not of the green wet that should have been everywhere down here. The garden smelled of nothing at all, and that was the first thing wrong with it.

The second thing wrong with it was that it was a garden.

Rows of pale stalks rose from sand that had never seen a sun. Each stalk bore at its crown a small white knob of bone — a knuckle, Miren thought first, and then thought no, and then thought yes, and the knowing of it settled in her like a stone settling in deep water. The garden was tended. The rows were straight. Somebody had knelt here, with patience, and pushed each one into place.

A woman stood at the far end of the garden with her back to Miren. She wore the color of nothing. Her hair was the color of nothing. When she turned, her face was a face Miren had seen, and had not seen, and had carried in her pocket for two and a half days across the cliff road and the brack and the warm hearth at the Heron Inn.

"You walked back through your own prints," the woman said. Her voice was very kind. "That was wise. But you did bring me the coin."`),
    },

    "sc-prologue": {
      id: "sc-prologue",
      title: "Prologue — The Selling of the Coin",
      status: "final",
      pov: ["narrator"],
      characters: ["sea-wife"],
      location: "Tideholm, three hundred years prior",
      summary: "How the coin came to be, and why the sea has refused it ever since.",
      content: splitParas(`Three hundred years before Miren walked the pans at dawn, a woman in Tideholm sold her name to the sea for a daughter, and the sea — being honest in its own way — gave her a coin in return.

The coin was the woman's name struck flat. She kept it on a string around her neck and she lived an ordinary length of years, and when she died her daughter buried her and put the coin in the third pan, the deep one, because the daughter had been told to.

The sea, when next it came, refused the coin. It had taken the name fairly and would not take it twice.

It has been refusing it ever since.`),
    },
  };

  // ---- book structure ----
  const book = {
    id: "book-salt-coast",
    title: "The Salt Coast",
    subtitle: "A Novel",
    author: "Marin Voss",
    chapters: [
      {
        id: "ch-prologue",
        title: "Prologue",
        scenes: ["sc-prologue"],
      },
      {
        id: "ch-1",
        title: "Chapter 1 — The Saltwright's Apprentice",
        scenes: ["sc-tide-at-dawn", "sc-strangers-coin", "sc-crooked-promise"],
      },
      {
        id: "ch-2",
        title: "Chapter 2 — Brackish Roads",
        scenes: ["sc-leaving-tideholm", "sc-heron-inn"],
      },
      {
        id: "ch-3",
        title: "Chapter 3 — The Sea-Wife's Garden",
        scenes: ["sc-beneath-pilings", "sc-salt-and-bone"],
      },
    ],
  };

  // ---- characters ----
  const characters = [
    {
      id: "miren",
      name: "Miren Caul",
      role: "Protagonist",
      avatarColor: "oklch(0.74 0.13 55)",
      initials: "MC",
      desc: "Saltwright's daughter, seventeen. Quiet. Stubborn. Walks back through her own prints.",
      appearsIn: ["sc-tide-at-dawn", "sc-strangers-coin", "sc-crooked-promise", "sc-leaving-tideholm", "sc-heron-inn", "sc-beneath-pilings", "sc-salt-and-bone"],
    },
    {
      id: "old-edda",
      name: "Edda Marrow",
      role: "Mentor",
      avatarColor: "oklch(0.72 0.13 220)",
      initials: "EM",
      desc: "The southernmost cottage. Tea the color of weak tea. Knows the name of the coin.",
      appearsIn: ["sc-tide-at-dawn", "sc-strangers-coin", "sc-leaving-tideholm", "sc-salt-and-bone"],
    },
    {
      id: "father",
      name: "Aron Caul",
      role: "Family",
      avatarColor: "oklch(0.72 0.13 145)",
      initials: "AC",
      desc: "The saltwright. A back that was old before it got old.",
      appearsIn: ["sc-crooked-promise", "sc-leaving-tideholm"],
    },
    {
      id: "stranger",
      name: "The Stranger",
      role: "Antagonist",
      avatarColor: "oklch(0.65 0.16 25)",
      initials: "??",
      desc: "Wears the color of nothing. Has Miren's face, and does not.",
      appearsIn: ["sc-strangers-coin", "sc-heron-inn", "sc-beneath-pilings"],
    },
    {
      id: "sea-wife",
      name: "The Sea-Wife",
      role: "Power",
      avatarColor: "oklch(0.75 0.05 280)",
      initials: "SW",
      desc: "Tends a garden under the harbor. Refuses the coin. Has refused it for three hundred years.",
      appearsIn: ["sc-prologue", "sc-salt-and-bone"],
    },
    {
      id: "innkeeper",
      name: "Hesper of the Heron",
      role: "Supporting",
      avatarColor: "oklch(0.78 0.12 80)",
      initials: "HH",
      desc: "Asks no questions. Charges for the answers.",
      appearsIn: ["sc-heron-inn"],
    },
    {
      id: "narrator",
      name: "Narrator",
      role: "POV",
      avatarColor: "oklch(0.7 0.02 250)",
      initials: "—",
      desc: "Voice of the prologue.",
      appearsIn: ["sc-prologue"],
    },
  ];

  // ---- inline notes (margin comments inside prose) ----
  const inlineNotes = {
    "sc-tide-at-dawn": [
      {
        afterPara: 1,
        author: "Marin",
        date: "May 12",
        text: 'Consider cutting "the kind of memory salt has" — the sentence after it carries the same weight. Or keep both and trim the third.',
      },
    ],
    "sc-strangers-coin": [
      {
        afterPara: 5,
        author: "Editor",
        date: "May 14",
        text: 'Edda\'s warning about "trade" — make sure this gets paid off in Ch. 3. (See: Salt and Bone, final exchange.)',
      },
    ],
  };

  // ---- version history (plain English commits) ----
  const commits = [
    { id: "v0014", msg: "Tightened Edda's warning; cut three lines of throat-clearing in the cottage scene.", author: "Marin", time: "16 min ago", branch: "main", scenes: ["sc-strangers-coin"] },
    { id: "v0013", msg: "Cut the second tide description in Tide at Dawn (was repeating itself).", author: "Marin", time: "2 hours ago", branch: "main", scenes: ["sc-tide-at-dawn"] },
    { id: "v0012", msg: "Drafted Salt and Bone end to end — placeholder for the bargain dialogue.", author: "Marin", time: "yesterday", branch: "main", scenes: ["sc-salt-and-bone"] },
    { id: "v0011", msg: "Snapshot before rewriting the prologue.", author: "Marin", time: "yesterday", branch: "main", scenes: ["sc-prologue"] },
    { id: "v0010", msg: "Prologue rewritten — third pass. The 'sold her name' framing finally lands.", author: "Marin", time: "2 days ago", branch: "main", scenes: ["sc-prologue"] },
    { id: "branch-alt", msg: "branch · alternate-ending", branch: "alternate-ending", branchMarker: true },
    { id: "v0009", msg: "Tried an alternate Ch. 3 where Miren keeps the coin. Keeping the branch around.", author: "Marin", time: "3 days ago", branch: "alternate-ending", scenes: ["sc-salt-and-bone"] },
    { id: "v0008", msg: "Renamed Chapter 2; added Heron Inn scaffolding.", author: "Marin", time: "4 days ago", branch: "main" },
    { id: "v0007", msg: "Outline pass on Chapters 1–3. Locked the inciting beat.", author: "Marin", time: "5 days ago", branch: "main" },
    { id: "v0006", msg: "Initial manuscript draft from outline.", author: "Marin", time: "1 week ago", branch: "main" },
  ];

  // ---- todo/notes board (bottom panel) ----
  const todos = [
    { id: "t1", done: false, text: "Decide whether the coin is silver or something the village has no name for yet.", where: "Ch. 1 / Tide at Dawn" },
    { id: "t2", done: false, text: 'Pay off Edda\'s "trade" warning in the Sea-Wife scene.', where: "Ch. 3 / Salt and Bone" },
    { id: "t3", done: true, text: "Cut the second tide description.", where: "Ch. 1 / Tide at Dawn" },
    { id: "t4", done: false, text: "The Heron Inn scene needs an actual scene — currently one paragraph of warm-air description.", where: "Ch. 2 / The Heron Inn" },
    { id: "t5", done: false, text: "Check: does Miren's father appear again after Ch. 2? If not, give him one line at the door.", where: "Ch. 2 / Leaving Tideholm" },
    { id: "t6", done: false, text: "Decide if the Sea-Wife knows Miren's name already or learns it in the garden.", where: "Ch. 3 / Salt and Bone" },
  ];

  // ---- output log ----
  const output = [
    { ts: "09:41", lvl: "info", parts: [["Loaded "], ["accent", "book.tfbook"], [" — 7 scenes across 4 chapters."]] },
    { ts: "09:41", lvl: "ok", parts: [["Manifest validated. Last save 14 minutes ago."]] },
    { ts: "09:42", lvl: "info", parts: [["Indexed "], ["accent", "3,847 words"], [" across the manuscript."]] },
    { ts: "10:02", lvl: "warn", parts: [["Scene "], ["accent", "A Crooked Promise"], [" has been edited but not saved."]] },
    { ts: "10:14", lvl: "ok", parts: [["Snapshot "], ["accent", "v0014"], [" committed to "], ["accent", "main"], ["."]] },
  ];

  // ---- count words helper ----
  function countWords(text) {
    return (text.trim().match(/\S+/g) || []).length;
  }
  function readingMinutes(words) {
    // ~230 wpm for prose
    return Math.max(1, Math.round(words / 230));
  }
  // attach word counts
  Object.values(scenes).forEach((s) => {
    s.wordCount = s.content.reduce((sum, p) => sum + countWords(p), 0);
    s.readingMin = readingMinutes(s.wordCount);
  });

  return { scenes, book, characters, inlineNotes, commits, todos, output, countWords, readingMinutes };
})();
