interface Character {
  name: string;
  first_messages: string[];
  description: string;

  extensions: Record<string, any>;

  version: string;
  creator: string;
  creator_notes: string;
}
