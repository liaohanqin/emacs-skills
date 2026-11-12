---
name: mermaid
description: 'This skill should be used when the user invokes "/mermaid" to create a diagram from the current context using Mermaid and output the resulting image path.'
tools: Bash
disable-model-invocation: true
---

# Create diagrams with Mermaid

Create a diagram from the most recent interaction context using Mermaid. Generate a PNG image with a transparent background and output it as a markdown image so it renders inline.

## How to create a diagram

1. Extract or derive diagrammable data from the current context.
2. If the Emacs foreground color and background mode are not already known from a previous diagram in this session, query them:
   ```sh
   emacsclient --eval '(face-foreground (quote default))'
   emacsclient --eval '(frame-parameter nil (quote background-mode))'
   ```
   The first returns a hex color like `"#eeffff"`. The second returns `dark` or `light`. Reuse both for all subsequent diagrams.
3. Write a Mermaid file to a temporary file.
4. Write a JSON config file that overrides theme variables with the queried foreground color. Set `"theme"` to `"dark"` or `"default"` based on the background mode.
5. Resolve the browser once per session (see "Resolving the browser" below) and keep the path in `CHROMIUM`.
6. Run `mmdc` with `-t dark` if background mode is `dark`, or `-t default` if `light`.
7. Output the result as a markdown image on its own line:
   ```
   ![description](/tmp/agent-diagram-XXXX.png)
   ```

```sh
# Use -t dark for dark, -t default for light.
# CHROMIUM is the path resolved in step 5.
PUPPETEER_EXECUTABLE_PATH="$CHROMIUM" mmdc \
  -i /tmp/agent-diagram-XXXX.mmd \
  -o /tmp/agent-diagram-XXXX.png \
  -t dark -b transparent --scale 2 \
  --configFile /tmp/agent-diagram-XXXX-config.json
```

## Resolving the browser

`mmdc` drives a headless browser through Puppeteer, which is not installed
with the CLI (its postinstall is often skipped). Point it at a Chromium the
machine already has instead of assuming a fixed path:

```sh
CHROMIUM=$(command -v chromium chromium-browser google-chrome google-chrome-stable 2>/dev/null | head -1)
if [ -z "$CHROMIUM" ]; then
  for p in /snap/bin/chromium /usr/bin/chromium /opt/homebrew/bin/chromium \
           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    [ -x "$p" ] && CHROMIUM="$p" && break
  done
fi
echo "CHROMIUM=${CHROMIUM:-NOT FOUND}"
```

Resolve it once per session and reuse it. If nothing is found, tell the user
which of `chromium`, `google-chrome`, or `chromium-browser` to install rather
than running `mmdc` and reporting its stack trace.

## Mermaid config template

Write this JSON config file to apply the Emacs foreground color. Replace `#eeffff` with the queried color. Set `"theme"` to `"dark"` or `"default"` based on the Emacs background mode.

```json
{
  "theme": "dark",
  "themeVariables": {
    "primaryTextColor": "#eeffff",
    "secondaryTextColor": "#eeffff",
    "tertiaryTextColor": "#eeffff",
    "primaryBorderColor": "#eeffff",
    "lineColor": "#eeffff",
    "textColor": "#eeffff",
    "actorTextColor": "#eeffff",
    "actorBorder": "#eeffff",
    "signalColor": "#eeffff",
    "signalTextColor": "#eeffff",
    "labelTextColor": "#eeffff",
    "loopTextColor": "#eeffff",
    "noteTextColor": "#eeffff",
    "noteBorderColor": "#eeffff",
    "sectionTextColor": "#eeffff",
    "titleColor": "#eeffff"
  }
}
```

## Mermaid diagram template

```mermaid
sequenceDiagram
    participant a as Alice
    participant b as Bob
    a->>b: Hello
    b-->>a: Hi back
```

## Rules

- Query the Emacs foreground color once per session and reuse it for all subsequent diagrams. Only query again if the color is not already known.
- Query the Emacs background mode once per session via `(frame-parameter nil 'background-mode)`. Use `-t dark` for `dark` or `-t default` for `light`. Always use `-b transparent --scale 2`.
- Resolve `CHROMIUM` once per session (see "Resolving the browser") and pass it as `PUPPETEER_EXECUTABLE_PATH` on every `mmdc` invocation. Never hard-code a single platform's path.
- Always write a JSON config file with `themeVariables` set to the queried foreground color and pass it via `--configFile`.
- Always use a timestamp in the filename (e.g., `/tmp/agent-diagram-$(date +%s).png`). Never use descriptive names.
- After mmdc runs successfully, output a markdown image (`![description](path)`) on its own line.
- Choose an appropriate diagram type for the data (sequence, flowchart, class, state, er, gantt, etc.).
- Include a title when it adds clarity.
- If no diagrammable data exists in the recent context, inform the user.
