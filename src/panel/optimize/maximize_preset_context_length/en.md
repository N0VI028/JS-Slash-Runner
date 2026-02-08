# Maximize preset context length

When enabled, the `Context Size (tokens)` in preset panel will be locked to the maximum (200w), which avoids SillyTavern incorrectly truncating the prompt that could be sent to the AI completely.

`Context Size (tokens)` is only a limit set by SillyTavern on the prompt: Before sending the prompt to the AI, SillyTavern will check if the prompt length exceeds this limit; if it exceeds, it will only send the part of the prompt that does not exceed the limit to the AI.

But SillyTavern cannot accurately calculate the token count of the prompt, and some SillyTavern extensions will additionally process the prompt (such as Tavern helper macros will be replaced, ST-Prompt-Template will only send prompts whose `if` is `true`, etc.), so the token count calculated by SillyTavern is often much higher than the actual token count.

Therefore, a too low `Context Size (tokens)` will cause SillyTavern to incorrectly truncate the prompt that can be sent to the AI, and locking it to the maximum value can fix this issue without any negative impact on the game.
