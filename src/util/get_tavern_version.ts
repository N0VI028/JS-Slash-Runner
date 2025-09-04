export async function get_tavern_version(): Promise<string> {
  try {
    const response = await fetch('/version');
    const data = await response.json();
    return data.pkgVersion;
  } catch (error) {
    console.error("Couldn't get client version", error);
    return 'UNKNOWN';
  }
}
