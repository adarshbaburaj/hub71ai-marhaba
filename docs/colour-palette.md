# Marhaba colour palette

Current design reference, updated 2 October 2026. The interface uses **warm white and bold black**, with neutral supporting shades. The geographic map retains separate category colours.

## Main design tokens

Inter is the sans-serif typeface; question headings, choice labels and the wordmark use strong weights. Tokens are defined in [globals.css](../src/app/globals.css).

| Token or role | Hex | Use |
| --- | --- | --- |
| `--bg` | `#F7F6F2` | Warm white page background |
| `--surface` | `#FDFCF9` | Soft white surfaces and button text |
| `--ink` / `--accent` | `#171717` | Black text, primary actions and focus |
| `--muted` | `#74716B` | Secondary text |
| `--line` | `#DDDAD4` | Dividers, underlines and borders |
| `--accent-soft` | `#ECE9E3` | Neutral selected surfaces |
| Selected choice fill / border | `#ECE9E3` / `#DDDAD4` | Confirmable answer selections |
| Hover fill | `#EEECE7` | Quiet interaction feedback |
| General supporting text | `#444340` | Captions and notices |
| Placeholder text | `#A7A39B` | Empty inline answers |

## Branch timeline and Nori

The branch timeline is defined in [move-tree.tsx](../src/components/move-tree.tsx) and its [scoped stylesheet](../src/components/move-tree.module.css). A bold horizontal black stem connects five major stages. The stages alternate above and below the stem, with compact editable child branches and an active question attached to its stage. Phones use a vertical outline and a compact question in normal flow. Current, answered and undecided states have written labels.

| Tree role | Hex |
| --- | --- |
| Timeline stem, branches, labels and focus | `#191919` |
| Summary text | `#706D69` |
| Supporting text and counts | `#797672` |
| Supporting status labels | `#797672` |
| Current note surface | `#FFFEFA` |
| Note hover fill / border | `#EFEEEB` / `#D8D5D0` |
| Mobile outline borders | `#DFDCD7` |

Nori is the small liquid character in [nori-blob.tsx](../src/components/nori-blob.tsx). Its body and pupils use `#191919`; the eyes and smile use `#FAF9F6`. A `#191919` shadow is rendered at 10% opacity. Floating, blinking and a brief squash-and-bounce accompany the questions; reduced motion keeps the character still.

## Geographic map colours

Category colours come from [map-data.ts](../src/lib/map-data.ts). Text symbols and category names accompany the colours.

| Category | Symbol | Hex |
| --- | --- | --- |
| Home | H | `#34495E` |
| Work | W | `#3674D9` |
| School | S | `#C98B19` |
| Healthcare | + | `#CF5C79` |
| Groceries | G | `#3B9268` |
| Public bus | B | `#8467C4` |
| Hobbies | L | `#28938F` |
| Fallback map background | — | `#EDF3F4` |
| Fallback map grid | — | `#D9E4E6` |
| Fallback map caption | — | `#56656B` |

## Financial chart colours

The chart in [marhaba-app.tsx](../src/components/marhaba-app.tsx) uses black `#171717` for the balance line, `#DDDAD4` for the grid, `#A7A39B` for the reserve line and `#74716B` for labels.

## Complete unique hex inventory

There are **49 unique normalized hex literals** across local `.css` and `.tsx` UI files, including component stylesheets, plus map category data. The inventory below lists every source literal by file. Shorthand is expanded and letters are uppercase. Eight-digit values use `#RRGGBBAA`, with the last two digits representing alpha.

### src/app/globals.css (31 colours)

[Open source](../src/app/globals.css)

```text
#171717  #17171703  #17171712  #17171714  #17171720  #17171722
#17171730  #17171742  #343434  #444340  #44434020  #5E5B55
#6D5540  #74716B  #846344  #A7A39B  #B9B6AF  #DAD7CF
#DDD1C2  #DDDAD4  #ECE9E3  #EDEAE4  #EDEAE490  #EEECE7
#F0EAE2  #F0EEEA  #F7F6F2  #F7F6F250  #F7F6F2ED  #FDFCF9
#FDFCF9EB
```

### src/components/marhaba-app.tsx (5 colours)

[Open source](../src/components/marhaba-app.tsx)

```text
#171717  #74716B  #A7A39B  #DDDAD4  #ECE9E3
```

### src/components/move-tree.module.css (9 colours)

[Open source](../src/components/move-tree.module.css)

```text
#191919  #706D69  #797672  #D8D5D0  #DFDCD7  #EFEEEB
#F7F6F2  #FDFCF9  #FFFEFA
```

### src/components/nori-blob.module.css (1 colours)

[Open source](../src/components/nori-blob.module.css)

```text
#191919
```

### src/components/nori-blob.tsx (2 colours)

[Open source](../src/components/nori-blob.tsx)

```text
#191919  #FAF9F6
```

### src/components/proximity-map.tsx (3 colours)

[Open source](../src/components/proximity-map.tsx)

```text
#56656B  #D9E4E6  #EDF3F4
```

### src/components/start-cursor.module.css (1 colours)

[Open source](../src/components/start-cursor.module.css)

```text
#171717
```

### src/lib/map-data.ts (7 colours)

[Open source](../src/lib/map-data.ts)

```text
#28938F  #34495E  #3674D9  #3B9268  #8467C4  #C98B19
#CF5C79
```

### Other colour notation

- Named `white` resolves to `#FFFFFF`; named `black` resolves to `#000000`. These are additional to the literal inventory when they do not appear as hex.
- `transparent` leaves a fill transparent. SVG `none` removes a fill or stroke.
- `currentColor`, `inherit` and `var(...)` take their colours from surrounding styles or the tokens above.
- Element opacity and alpha values control the blend with the background. The question's scoped stylesheet also uses `rgb(23 23 23 / 4%)` for a black shadow at 4% opacity.

The inventory covers local UI source. Geographic tile imagery and imported Leaflet/Tailwind defaults are supplied separately.
