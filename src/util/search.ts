export function includesOrTest(text: string, search_input: string | RegExp): boolean {
  if (search_input === '') {
    return true;
  }
  if (typeof search_input === 'string') {
    search_input = new RegExp(_.escapeRegExp(search_input), 'i');
  }
  return search_input.test(text);
}
