import type { TrackId } from "@/game/music-tunes";

/**
 * The Suno prompt behind each take in `public/music/`, as Suno shows it: the
 * style, the exclude list and, when it had one, the song's title in Suno.
 * Each file was then stretched onto the stage's beat grid (95.076 BPM; the
 * Encore onto its own, 4:3 against it) and cut into its intro and loop
 * (`src/lib/music.ts`). `sure: false` marks a prompt pieced together from the
 * conversation that wrote it, not copied from Suno.
 */
export interface SunoPrompt {
  title?: string;
  style: string;
  exclude: string;
  /** Lyrics-box tags (Instrumental off), when the take used them. */
  lyrics?: string;
  note?: string;
  sure: boolean;
}

export const SUNO_PROMPTS: Partial<Record<TrackId, SunoPrompt>> = {
  stage: {
    style:
      "Retro 16-bit video game menu groove meets 1970s game show lounge, unhurried steady 96 BPM, instrumental, FM synth bass holds a repetitive two-chord vamp beneath soft Rhodes comping and muted rhythm guitar, warm synth pad, low chiptune arpeggio texture, brushed drum-machine pattern and light shaker; sparse, spacious, mellow mix with flat energy and loop-friendly pad-and-bass intro and outro",
    exclude:
      "vocals, lead melody, melodic solo, instrumental solo, piano solo, guitar solo, synth lead, featured instrument, improvisation, virtuoso fills, saxophone, trumpet, harsh square wave lead, drum fills, crescendo, EDM",
    sure: true,
  },
  booth: {
    style:
      "Hauntology, haunted horror underscore; a calm, sparse 96 BPM lounge vamp with dusty electric piano chords, wobbly organ pad, and a warped Mellotron flute lead in short, fixed phrases, Degraded VHS mono, detuned tape saturation, heavy wow and flutter, distant AM television muffling, hiss, crackle, brief dropouts, empty-room reverb; instrumental",
    exclude:
      "vocals, lead melody, melodic solo, synth, instrumental solo, synth lead, featured instrument, improvisation, horror stingers, jump scare, drum fills, crisp hi-fi",
    sure: true,
  },
  impostor: {
    style:
      "1960s spy-thriller suspense, instrumental; creeping upright bass ostinato beneath muted wah guitar chops, dark Rhodes, staccato pizzicato strings and a low sustained drone, with muted piano stabs, soft brushed snare and finger snaps; sparse, hushed, loop-friendly background bed with flat energy and unresolved minor-key tension; steady 96 BPM, sneaking and watchful",
    exclude:
      "vibraphone, mallets, marimba, tremolo guitar, twangy guitar, surf guitar, western, slap bass, disco, bossa, upbeat, playful, vocals, choir, trumpet lead, saxophone solo, brass section, horn stabs, drum fills, big crescendo, orchestral hits, horror stingers, EDM",
    sure: true,
  },
  bidding: {
    title: "Bidding War",
    style:
      "1970s game show bidding music with auction-house tension, ticking woodblock clock, honky-tonk ragtime piano comping, walking upright bass, brushed snare shuffle, muted brass stabs, pizzicato, and glockenspiel accents; loop-friendly studio mix, steady 96 BPM shuffle groove with building anticipation, instrumental",
    exclude:
      "vocals, auctioneer voice, chanting, crowd noise, gavel hits, bells, solo, lead melody, trumpet solo, saxophone solo, drum fills, big crescendo, epic orchestral, EDM, horror stingers",
    sure: true,
  },
  matchday: {
    title: "Matchday Groove",
    style:
      "Retro sports library music: punchy synth bass under brass stabs and synth-brass pads, funky clean wah-guitar chops, electric piano comping, tambourine, and gated-snare drum-machine groove; instrumental, steady 96 BPM; loop-friendly arrangement with bass-and-pad bookends and a light arpeggio texture",
    exclude:
      "vocals, chanting, crowd noise, stadium cheering, referee whistle, commentary, solo, lead melody, guitar solo, saxophone solo, drum fills, big crescendo, epic orchestral, EDM drop, heavy rock",
    sure: true,
  },
  recess: {
    style:
      "1970s library music with a light game-show bounce; sparse, loop-friendly background underscore with flat, steady energy, 96 BPM; bouncy tuba bass, ticking woodblock, pizzicato strings, light ragtime piano, glockenspiel and melodica over brushed snare and soft handclaps; instrumental",
    exclude:
      "vocals, choir, auctioneer voice, crowd noise, gavel hits, whistle, marching snare, brass section, trumpet, fanfare, loud drums, drum fills, solo, crescendo, epic, EDM, rock guitar, ambient, sleepy, lullaby",
    note: "Was Build the Team's take (as “lineup”) before bidding and matchday; kept for later.",
    sure: true,
  },
  encore: {
    title: "Samba de Noche",
    style:
      "instrumental, upbeat Latin funk fusion, JRPG soundtrack, Japanese jazz fusion, samba-funk groove, 128 BPM, minor key, kick on 1 and 3, backbeat snare with ghost notes, offbeat hi-hats, busy Latin percussion, cabasa shaker sixteenths, bongos, agogo bells, driving eighth-note picked electric bass, syncopated acoustic piano montuno, sustained rock organ chords, rhythmic string stabs, staccato brass section riff, tenor saxophone lead melody, stylish, confident, celebratory, feel-good, loop-friendly",
    exclude:
      "vocals, rap, choir, four-on-the-floor, disco, rock, distorted guitar, guitar solo, heavy metal, swing, smooth jazz, Rhodes, synth pads, synthwave, slow, sad, lo-fi, orchestral, EDM drop, dubstep, chiptune, 8-bit",
    lyrics:
      "[Instrumental]\n\n[Intro: brass section riff, piano, organ, Latin percussion]\n\n[Verse: tenor saxophone melody, strings, bass]\n\n[Verse: tenor saxophone melody, brass stabs]\n\n[Chorus: full band, brass and tenor saxophone]\n\n[Break: piano montuno, organ, strings, bass, percussion]\n\n[Chorus: brass riff and tenor saxophone]",
    note: "The last victory prompt written for it (from the Specialist MIDI); Suno made it at 132 BPM.",
    sure: false,
  },
};
