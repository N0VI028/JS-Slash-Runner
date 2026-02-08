<!-- markdownlint-disable MD041 -->
# Always export the latest worldbook when exporting character cards

When exporting character cards, vanilla SillyTavern may export stale worldbooks: If you modify the worldbook entry and immediately export the character card, the worldbook data in the exported character card file may be the one before the modification.

This optimization fixes this: When enabled, exporting a character card will always export the latest worldbook.
