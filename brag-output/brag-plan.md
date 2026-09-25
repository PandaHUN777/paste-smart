# Smart Paste — brag plan

**What it is:** A Windows tray app. `Ctrl+Shift+V` looks at the window you're in and pastes the clipboard entry that belongs there. No UI when it's sure.
**For:** Anyone who copies three things and then has to dig for the right one.
**Sets it apart:** Context-aware, silent on the confident path, and it _declines to guess_ (opens a picker) when nothing fits.
**Most impressive claim:** Same clipboard, opposite answers, in about half a second (README: "around half a second"; notes: ~450–550 ms end to end).
**Visual hook:** Plain Ctrl+V dumping a cat link into an email field.
**Share caption:** see share-copy.txt.

**Tone:** default (punchy, clean). **Format:** 1920×1080, 30fps, 22s.
**Identity:** The app's own palette from `src/App.css` (`--bg #16181d`, `--surface #1f232b`, `--accent #6c8cff`, `--danger #ff7a7a`), Segoe UI, the real `.entry` / `.overlay` markup and stylesheet, the real tray icon.

## Storyboard (120 BPM, cuts on the beat)

| #           | Time      | Scene                                                                                                                                                                            |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Hook      | 0–3.5s    | Sign-in page. `Ctrl`+`V` → a cat link lands in the email field, shakes red. "Ctrl+V pastes whatever you copied **last.**"                                                        |
| 2 Reveal    | 3.5–6.5s  | Icon + "Smart Paste". "`Ctrl+Shift+V` pastes what this window needs."                                                                                                            |
| 3 Highlight | 6.5–10.5s | Clipboard history (real entries) left, sign-in page right. Keys → email entry gets the Jev badge → pasted. Toast: "Pasted · no window · ~0.5 s". "Sign-in page? **Your email.**" |
| 4 Highlight | 10.5–14s  | Same history, terminal on the right. Git command picked and pasted. "Terminal? **The git command.**" / "Same clipboard. Opposite answer."                                        |
| 5 Highlight | 14–17.5s  | Paint. Nothing fits → the real picker overlay opens instead. "Nothing fits? **It asks instead of guessing.**"                                                                    |
| 6 Outro     | 17.5–22s  | Icon, wordmark, big `Ctrl`+`Shift`+`V` keys press once. "Open source · Windows · github.com/theprinceraj/paste-smart"                                                            |

Poster / frame 0: scene 4 settled (~13.4s).
