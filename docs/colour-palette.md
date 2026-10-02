# Marhaba colour palette

Current design reference, updated 2 October 2026. The interface uses warm white surfaces and bold black Inter type, with sage Nori artwork and distinct map connection colours.

## Main design tokens

Tokens are defined in [globals.css](../src/app/globals.css).

| Token or role | Hex | Use |
| --- | --- | --- |
| `--bg` | `#F7F6F2` | Warm white page background |
| `--surface` | `#FDFCF9` | Soft white surfaces and button text |
| `--ink` / `--accent` | `#171717` | Text, primary actions and focus |
| `--muted` | `#74716B` | Secondary text |
| `--line` | `#DDDAD4` | Dividers and borders |
| `--accent-soft` | `#ECE9E3` | Selected surfaces |
| Hover fill | `#EEECE7` | Interaction feedback |
| Supporting text | `#444340` | Captions and notices |
| Placeholder text | `#A7A39B` | Empty inline answers |

## Timeline and Nori

The [move timeline](../src/components/move-tree.tsx) is vertical on the left, with five editable stages and a compact question on the right. On phones, the timeline and question follow normal document flow. Its [stylesheet](../src/components/move-tree.module.css) uses the shared ink, muted, surface and border tokens; hover fill is `#EFEEEB`. Literal `#191919` and `#797672` values are token fallbacks.

[Nori](../src/components/nori-blob.tsx) is a code-native SVG character. A brief hop marks each question, with waving, blinking and a local thinking animation; reduced motion disables these animations.

| Nori role | Hex |
| --- | --- |
| Sage body gradient | `#C9CFB2` → `#8F9C7D` |
| Cream face gradient | `#FFF9E9` → `#E8E1CA` |
| Horn gradient | `#818C68` → `#596348` |
| Eyes / highlights | `#38372F` / `#FFFCF2` |
| Shadow | `#3A422D` at 12% opacity |
| Interactive focus | `#4F6044` |

## Map colours

The [location sketch](../src/components/area-explorer.module.css) and [connected results](../src/components/hub-results.module.css) share these connection colours. Written labels, a legend and distance text accompany them. Animated light points use `#FFF1D7` in the sketch and `#FFF0DC` in results; reduced motion freezes them.

| Connection | Hex |
| --- | --- |
| Work | Red `#B64037` |
| School | Green `#2C7552` |
| Shopping | Blue `#2C66A6` |
| Hobbies / outdoors / care | Neutral `#6F655C` |

The geographic map's category data comes from [map-data.ts](../src/lib/map-data.ts). The groceries category uses the same blue as the sketch's Shopping label.

| Category | Symbol | Hex |
| --- | --- | --- |
| Home | H | `#34495E` |
| Work | W | `#B64037` |
| School | S | `#2C7552` |
| Healthcare | + | `#CF5C79` |
| Groceries | G | `#2C66A6` |
| Public bus | B | `#8467C4` |
| Hobbies | L | `#28938F` |

The [fallback geographic map](../src/components/proximity-map.tsx) uses `#EDF3F4` for its background, `#D9E4E6` for its grid and `#56656B` for captions.

## Charts and conversation

The balance chart in [marhaba-app.tsx](../src/components/marhaba-app.tsx) uses `#171717` for the balance line, `#DDDAD4` for its grid, `#A7A39B` for the reserve line and `#74716B` for labels. The [money flow](../src/components/money-flow.module.css) uses a red `#C95443` accent. The [Nori at work conversation](../src/components/nori-at-work.module.css) uses blue `#086EEB` outgoing bubbles and gray `#E9E9EB` incoming bubbles.

## Complete literal hex inventory

There are **121 unique normalized hex literals** in 15 files containing hex colours. Scope: every `src/**/*.css` and `src/**/*.tsx` file, plus `src/lib/map-data.ts`. Shorthand is expanded and letters are uppercase; eight-digit values use `#RRGGBBAA`. Token fallbacks are included.

| Source | Count | Literals |
| --- | ---: | --- |
| [src/app/globals.css](../src/app/globals.css) | 31 | `#171717` `#17171703` `#17171712` `#17171714` `#17171720` `#17171722` `#17171730` `#17171742` `#343434` `#444340` `#44434020` `#5E5B55` `#6D5540` `#74716B` `#846344` `#A7A39B` `#B9B6AF` `#DAD7CF` `#DDD1C2` `#DDDAD4` `#ECE9E3` `#EDEAE4` `#EDEAE490` `#EEECE7` `#F0EAE2` `#F0EEEA` `#F7F6F2` `#F7F6F250` `#F7F6F2ED` `#FDFCF9` `#FDFCF9EB` |
| [src/components/area-explorer.module.css](../src/components/area-explorer.module.css) | 27 | `#171717` `#2C66A6` `#2C7552` `#42352E` `#6F655C` `#77736C` `#7B746A` `#80786E` `#81776F` `#8A7160` `#8A8178` `#8F8074` `#8F847B` `#B64037` `#C8897E` `#CA493B` `#CC5848` `#D46A5B` `#D6CCC0` `#D8D2C9` `#DCD8D1` `#DED8D1` `#DEDAD3` `#FAFAF7` `#FFF1D7` `#FFF4EE` `#FFFFFC` |
| [src/components/area-explorer.tsx](../src/components/area-explorer.tsx) | 1 | `#EEEAE4` |
| [src/components/hub-results.module.css](../src/components/hub-results.module.css) | 14 | `#171717` `#2C66A6` `#2C7552` `#34322F` `#56534D` `#625F58` `#6F655C` `#A7A39B` `#B64037` `#DDDAD4` `#ECE9E3` `#F7F6F2` `#FDFCF9` `#FFF0DC` |
| [src/components/marhaba-app.tsx](../src/components/marhaba-app.tsx) | 5 | `#171717` `#74716B` `#A7A39B` `#DDDAD4` `#ECE9E3` |
| [src/components/money-flow.module.css](../src/components/money-flow.module.css) | 15 | `#171717` `#17171712` `#27221E` `#47433D` `#72685F` `#73685F` `#7C7167` `#A34738` `#C95443` `#CF705B` `#DDD8D0` `#E1DBD2` `#F4E6DF` `#FAF9F5` `#FFFFFF` |
| [src/components/money-flow.tsx](../src/components/money-flow.tsx) | 2 | `#C95443` `#E5E1DA` |
| [src/components/move-tree.module.css](../src/components/move-tree.module.css) | 6 | `#191919` `#797672` `#DDDAD4` `#EFEEEB` `#F7F6F2` `#FDFCF9` |
| [src/components/nori-at-work.module.css](../src/components/nori-at-work.module.css) | 19 | `#086EEB` `#17171726` `#222222` `#42659A` `#586572` `#6A6A70` `#717178` `#74747B` `#7A7A82` `#818188` `#86868D` `#DCE5F4` `#DFDFE5` `#E5E5E9` `#E9E9EB` `#EAEAEE` `#EEEEF1` `#F7F7F9` `#FFFFFF` |
| [src/components/nori-blob.module.css](../src/components/nori-blob.module.css) | 2 | `#191919` `#4F6044` |
| [src/components/nori-blob.tsx](../src/components/nori-blob.tsx) | 15 | `#38372F` `#3A422D` `#4D543E` `#4D583E` `#566147` `#596348` `#65704E` `#818C68` `#859172` `#8F9C7D` `#C9CFB2` `#D5BCA5` `#E8E1CA` `#FFF9E9` `#FFFCF2` |
| [src/components/onboarding.module.css](../src/components/onboarding.module.css) | 1 | `#F1F0EA` |
| [src/components/proximity-map.tsx](../src/components/proximity-map.tsx) | 3 | `#56656B` `#D9E4E6` `#EDF3F4` |
| [src/components/start-cursor.module.css](../src/components/start-cursor.module.css) | 1 | `#171717` |
| [src/lib/map-data.ts](../src/lib/map-data.ts) | 7 | `#28938F` `#2C66A6` `#2C7552` `#34495E` `#8467C4` `#B64037` `#CF5C79` |

Named colours, `rgb(...)`, `transparent`, SVG `none`, `currentColor`, inherited colours, token references and opacity are separate from this literal inventory. Geographic tiles and imported Leaflet/Tailwind defaults are outside its scope.
