<!-- markdownlint-disable MD041 -->
# `# Msg. to Load` → `# Msg. to Render`

Optimize the function of `👤 on the top bar - # Msg. to Load`: Originally, it only limited the number of messages displayed when loading chat, but now it also limits the maximum number of messages displayed during the whole gameplay.

For example, if you set `# Msg. to Load` to 5, the page will display at most 5 messages.

- When a new message or new reply is sent, the old messages will be automatically canceled rendering: the displayed messages change from `4,5,6,7,8` to `5,6,7,8,9`
- When a message is deleted, the old messages will be automatically completed: the displayed messages change from `5,6,7,8,9` to `4,5,6,7,8`

This way, the tavern will always only render a few floors during gameplay, making the gameplay more流畅.

---

Additionally, originally SillyTavern only allowed `# Msg. to Load` to be set to a multiple of 5, but now you can set it to any non-negative number, such as 1 to only display the most recent 1 message.
