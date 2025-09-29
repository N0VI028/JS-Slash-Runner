export function includesOrTest(text: string, search_input: string | RegExp): boolean {
  if (search_input === '') {
    return true;
  }
  if (typeof search_input === 'string') {
    return text.includes(search_input);
  }
  return search_input.test(text);
}
