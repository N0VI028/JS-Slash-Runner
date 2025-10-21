<!-- markdownlint-disable MD041 MD036 -->
Prompt Viewer <u>**always shows the latest prompts**</u>:

### When opening Prompt Viewer

When opening Prompt Viewer, it will send a fake generation request, which is equivalent to clicking the send button <i class="fa-solid fa-paper-plane"></i> right now. Then, Prompt Viewer will wait for SillyTavern processing the prompts to send, intercept prompts (in order not to really sent them to AI), and thus obtain the latest prompts.

### When clicking the refresh button <i class="fa-solid fa-rotate-right"></i>

Each time the refresh button is clicked, the viewer will also send a fake generation request.

### When a generation request is actually sent

Regardless of whether you:

- Click the send button <i class="fa-solid fa-paper-plane"></i>
- Use the `generate`、`generateRaw` function of Tavern Helper
- Any other ways to send prompts through SillyTavern

Prompt Viewer will listen to the generation request and obtain the latest prompts.
