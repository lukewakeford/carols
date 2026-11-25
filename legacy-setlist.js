const LEGACY_SONGS = [
      {
        id: 1,
        title: "Glory (Let There Be Peace)",
        subtitle: "Chris Stevens · Matt Maher · Rachel Popadic",
        key: "F",
        rigNote: "Clean/ambient electric · volume roll-off & light pad/swell",
        bpm: 77,
        meter: "4/4",
        status: "Service-Ready",
        notes:
          "Great dynamics & tone; refine cut/volume roll-off at Bridge 1 (2:12) and light pad/swell into outro.",
        cues: [
          "Cut / roll volume cleanly right at Bridge 1 (~2:12) so vocal & keys breathe.",
          "Add gentle ambient pad/swell into the final outro without overpowering 'Now and forever Emmanuel'."
        ],
        sections: [
          { name: "Intro", chords: "F | C | Dm7 | Bb" },
          { name: "Verse 1", chords: "F  C  Dm7  Bb  |  F  C  Dm7  Bb" },
          {
            name: "Chorus 1A",
            chords: "Bb  F  C  |  F  C  |  Bb  F  Dm  Bb  |  Bb  F  A  Dm  |  Bb  F  C  F",
            timingHint: "Hit Bb on 'We're singing Glory' · watch A -> Dm on 'Singing Glory' · land F on 'start in me'"
          },
          {
            name: "Bridge",
            chords: "F  |  Bb  C  |  Dm  |  F  C  F  |  F  Bb  |  F/A  Bb  C  A  A/C#  |  Dm  Bb  |  F/A  C  F  |  Bb  F  C  F",
            timingHint: "Starts quiet on 'Do not be afraid' · A -> A/C# walks up into 'Nothing stands in the way'"
          },
          { name: "Chorus 1B", chords: "Bb  F  C  |  F/A  Bb  F  |  Dm  C  |  F/A  Bb  F  A  A/C#  Dm" },
          { name: "Verse 2", chords: "F  C  Bb  |  F/A  Dm  Dm7  Bb" },
          { name: "Ending", chords: "F  C  |  C  Bb  F  C  F  |  Dm7  Bb" }
        ]
      },
      {
        id: 2,
        title: "The Joy / Joy To The World",
        subtitle: "Watts · Handel · Andrew Holt · Mitch Wong",
        key: "C",
        rigNote: "Driving electric + clean/light touch on 'He rules the world'",
        bpm: 132,
        meter: "4/4",
        status: "Service-Ready",
        notes:
          "Solid core; refine turnaround/vamp cue flexibility, lighter touch into 'He rules the world', clean stops.",
        cues: [
          "Stay nimble on the Intro/Turnaround vamp (C | Dm7(4) | F2 | F2) for flexible loop counts.",
          "Pull back touch/drive on Verse 3 ('He rules the world...') before driving hard into the outro/Joy of the Lord chorus."
        ],
        sections: [
          {
            name: "Intro / Turnaround",
            chords: "||: C | Dm7(4) | F2 | F2 :||",
            timingHint: "4-bar vamp ('Oh oh oh oh'); F2 holds 2 bars before loop/entry"
          },
          {
            name: "Verse 1",
            chords: "C  |  F2  G(4)  C  |  C  |  C  G(4)  |  C/E  F2  G(4)  C",
            timingHint: "'Joy to the world' on C · 'nature sing' walks C/E -> F2 -> G(4) -> C"
          }
        ]
      },
      {
        id: 3,
        title: "Hark the Herald Angels Sing (Traditional / Carol)",
        subtitle: "Charles Wesley · Mendelssohn · Full Carol Arrangement",
        key: "F",
        rigNote: "Clean bright electric · chimey chords & dynamic lift",
        bpm: 112,
        meter: "4/4",
        status: "Service-Ready",
        notes: "Clean, steady pocket and bright chord voicings across verses and refrains.",
        cues: [
          "Keep articulation crisp on verse chord changes and lift dynamics into the final refrain."
        ],
        sections: [
          { name: "Verse 1", chords: "F  |  Bb  F  C  |  F  Bb  C7  F  |  Dm  G7  C  |  F  Bb  C  F" },
          { name: "Refrain", chords: "F  Bb  F  C  |  F  Bb  C7  F  |  Bb  F  C  F" }
        ]
      },
      {
        id: 4,
        title: "O Come, All Ye Faithful",
        subtitle: "John Francis Wade · Anthem / Congregational Groove",
        key: "G",
        rigNote: "Warm overdrive on choruses · open ringing triads on verses",
        bpm: 108,
        meter: "4/4",
        status: "Shaping Up",
        notes: "Watch the chorus lift ('O come, let us adore Him') and lock the turnaround.",
        cues: [
          "Open up drive and sustain on 'O come, let us adore Him' while keeping verse dynamics controlled."
        ],
        sections: [
          { name: "Verse", chords: "G  D  G  |  G  C  D  G  |  Em  A7  D  |  G  C  D  G" },
          { name: "Chorus", chords: "G  D  Em  C  |  G  D  G  |  C  G  D7  G" }
        ]
      },
      {
        id: 5,
        title: "Silent Night",
        subtitle: "Franz Xaver Gruber · Joseph Mohr · Quiet Ballad",
        key: "Bb",
        rigNote: "Soft ambient clean · subtle volume swells, minimal clutter",
        bpm: 72,
        meter: "3/4",
        status: "Service-Ready",
        notes: "Leave plenty of space for vocals and piano; gentle swells only.",
        cues: [
          "Stay out of the vocal register in 3/4 time and use light swells on key phrases."
        ],
        sections: [
          { name: "Verse 1", chords: "Bb  |  Bb  |  F7  |  Bb  |  Eb  |  Bb  |  F7  |  Bb" },
          { name: "Verse 2", chords: "F  Dm  |  Bb  F  |  C7  |  F  |  Bb  Eb  Bb  |  F7  Bb" }
        ]
      },
      {
        id: 6,
        title: "Angels We Have Heard on High",
        subtitle: "Traditional French Carol · Gloria Refrain",
        key: "G",
        rigNote: "Bright rhythmic strumming / light crunch · crisp Gloria hits",
        bpm: 124,
        meter: "4/4",
        status: "Shaping Up",
        notes: "Keep the 'Glo-o-o-o-ria' cadence tight and predictable.",
        cues: [
          "Accent the downbeats on 'Gloria in excelsis Deo' without rushing the eighth-note feel."
        ],
        sections: [
          { name: "Verse", chords: "G  |  D7  G  |  C  G  D7  G  |  G  C  D7  G" },
          { name: "Gloria Refrain", chords: "G  C  G  D7  |  G  C  G  D7  |  G  D7  G" }
        ]
      },
      {
        id: 7,
        title: "O Little Town of Bethlehem",
        subtitle: "Phillips Brooks · Lewis Redner",
        key: "G",
        rigNote: "Warm clean / light chorus · gentle dynamic arc",
        bpm: 84,
        meter: "4/4",
        status: "Service-Ready",
        notes: "Smooth chord transitions and even dynamics across verses.",
        cues: [
          "Keep voicings warm and uncluttered so the melody and lyrics carry clearly."
        ],
        sections: [
          { name: "Verse 1", chords: "G  |  Em  A7  D7  |  G  C  G  D7  |  G  Em  Am  D7  |  G  C  D7  G" }
        ]
      },
      {
        id: 8,
        title: "O Holy Night",
        subtitle: "Based on Darlene Zschech & HopeUC · 6/8 Ballad",
        key: "D",
        rigNote: "Wide, restrained ballad tone · volume swells & space",
        bpm: 50,
        meter: "6/8",
        status: "Rough Edges",
        notes:
          "No recording yet; focus on restrained phrasing, dynamic swells, and leaving room for big vocal moments.",
        cues: [
          "At 50 BPM in 6/8, less is more—use gentle swells, subtle triads, and open D / G2 / Bm7 / F#m colors.",
          "Leave headroom for soaring vocal phrases and build gradually into 'Fall on your knees' and the final 'O night divine'."
        ],
        sections: [
          { name: "Intro", chords: "D  Dsus  |  D  |  Dsus  |  D", timingHint: "Slow 6/8 sway (2 dotted-quarter feels per bar)" },
          {
            name: "Verse 1",
            chords: "D  G2  D  |  D  A  D  |  Dsus  D  Dsus  |  D  G2  D  |  F#m/C#  C#  F#m  |  A  Dsus  D  |  A  D",
            timingHint: "'O holy night' -> 'A thrill of hope' -> 'Til He appeared' walks F#m/C# -> C# -> F#m"
          },
          { name: "Verse 2", chords: "D  G2  D  |  D  A  G2  D  |  F#m/C#  A  C#  |  D  Dsus  A  D  F#m" },
          {
            name: "Chorus 1A / 1B / 2",
            chords: "Bm7  F#m  Bm7  F#m  Em  Bm7  Em  |  D  A  Bm7  G2  Bm7  D  A/C#  D  A  |  D  A  Bm7  G2  D  A",
            timingHint: "Cue: 'Fall on your knees' starts on Bm7 -> F#m; 'O night divine' lifts on D -> A"
          },
          { name: "Turnaround & Ending", chords: "Turn: D  Dsus  D  Dsus  |  End: A  Bm7  G2  D  A  |  A  D/F#  Em7  D  A  D  |  D  Dsus  D  Dsus  D" }
        ]
      },
      {
        id: 9,
        title: "Hark the Herald Angels Sing",
        subtitle: "Based on Citizens · Key Eb → Last-Verse Key Change",
        key: "Eb",
        rigNote: "OUT on Verse 1 (bass lead) · tight stabs & Lydian turnaround",
        bpm: 121,
        meter: "4/4",
        status: "Shaping Up",
        notes:
          "Drop out on Verse 1 for bass-led start; tight rhythmic stabs & turnaround (2:49), map last-verse key change & Lydian outro turnaround on chart, vary dynamics.",
        cues: [
          "Drop out completely on Verse 1 so bass leads the opening, then enter cleanly with tight rhythmic stabs.",
          "Watch the straight-to-key-change ramp (Ab Bb C D Eb F Gb Ab) into Verse 3 (F) and practice the Lydian outro turnaround by ear + chart landmarks."
        ],
        sections: [
          { name: "Intro", chords: "Ab  Bb  C  D  Eb  F  Gb  Ab  |  Eb  Cm  Eb  Cm" },
          {
            name: "Verse 1 (Bass Lead — Guitar Out)",
            chords: "[Guitar Out]  Eb  Cm  Eb  Cm  |  Eb  Cm  Bb  |  Cm  Eb  Cm  Eb  |  Ab  Bb  Eb  |  Ab  Ab  Bb  Eb",
            timingHint: "Sit out while bass leads · chord timing differs slightly from traditional hymn phrasing"
          },
          {
            name: "Verse 2 & Ramp",
            chords: "Eb  Cm  Eb  Cm  |  Eb  Cm  Bb  |  Eb  Cm  Eb  Cm  |  Ab  Eb  |  Ab  Bb  Eb  |  Bb  Ab  Eb  |  Ab  Bb  C  D  Eb  F  Gb  Ab  (to key change)",
            timingHint: "Watch bar placement vs. hymn melody · ascending ramp launches Verse 3 in F"
          },
          {
            name: "Verse 3 (Key Change to F)",
            chords: "F  Dm  F  |  F  Dm  C  |  F  Dm  F  Dm  |  Bb  C  F  |  Bb  C  Bb  F",
            timingHint: "New key F · check where chords land on 'Prince of Peace' vs. standard hymn"
          },
          {
            name: "Outro / Lydian Turnaround",
            chords: "Map new-key tonic & raised #4 (#11) Lydian color; keep stabs crisp and dynamic.",
            timingHint: "Raised #4 shimmer after final phrase (~2:49 / outro)"
          }
        ]
      },
      {
        id: 10,
        title: "We Wish You A Merry Christmas (+ Go Tell It On The Mountain)",
        subtitle: "Anthony Evans Gospel Medley · Key E → F",
        key: "E",
        rigNote: "Gospel syncopation · compact 7th/9th/6th voicings & medley lift",
        bpm: 118,
        meter: "4/4",
        status: "Rough Edges",
        notes:
          "Anthony Evans medley arrangement; lock gospel pocket, smooth transition into Go Tell It on the Mountain, compact voicings & dynamic build.",
        cues: [
          "Use compact 7th/9th/6th voicings and muted gospel chops—let keys/organ and bass carry deep low harmony.",
          "Mark the medley seam into 'Go Tell It on the Mountain' and the key change to F (F Am Dm G/B C A A/C# Dm...)."
        ],
        sections: [
          {
            name: "Chorus (Key of E)",
            chords: "E  G#m  F#/A#  G#  C#m  B  G#/B#  C#m  |  E/B  B  E  D  A/C#  Am",
            timingHint: "'We wish you a merry Christmas' · walk-up G# -> G#/B# -> C#m; E D A/C# Am turnaround"
          },
          {
            name: "Verse (Key of E)",
            chords: "E  A/E  F#  B  |  G#  C#m  Am  |  E/B  B  E  D  A/C#",
            timingHint: "'Good tidings we bring to you and your kin' · Am sets up 'And a happy New Year'"
          },
          {
            name: "Chorus (Key Change to F)",
            chords: "F  Am  Dm  G/B  C  |  A  A/C#  Dm  F/C  C  |  F  Eb  Bb/D  Am  Bbm",
            timingHint: "Modulates up to F on 'We wish you a merry Christmas' · Bbm pulls toward the medley shift"
          },
          {
            name: "Medley Seam → Go Tell It On The Mountain",
            chords: "Transition smoothly into gospel 'Go Tell It on the Mountain' groove and build dynamically to finish.",
            timingHint: "Cue: 'Go tell it on the mountain, over the hills and everywhere'"
          }
        ]
      }
    ];

