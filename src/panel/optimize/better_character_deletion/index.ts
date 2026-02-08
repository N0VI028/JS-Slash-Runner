import { deleteWorldbook } from '@/function/worldbook';
import { event_types, eventSource } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';

export function useBetterCharacterDeletion(enabled: Readonly<Ref<boolean>>) {
  eventSource.on(event_types.CHARACTER_DELETED, async ({ character }: { character: v1CharData }) => {
    if (enabled.value) {
      $('#character_world').val('');
      if (character.data?.character_book?.name) {
        await deleteWorldbook(character.data.character_book.name);
      }
    }
  });
}
