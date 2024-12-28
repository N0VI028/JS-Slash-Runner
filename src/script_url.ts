import { extract, get_or_set } from "./util/helper.js";

function createObjectURLFromScript(code: string): string {
  return URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
}

class ScriptUrl {
  private map: Map<string, string> = new Map();

  public get(code: string): string | undefined {
    return this.map.get(code);
  }
  public set(code: string): void {
    this.map.set(code, createObjectURLFromScript(code));
  }
  public get_or_set(code: string): string {
    return get_or_set(this.map, code, () => createObjectURLFromScript(code));
  }
  public delete(code: string): string | undefined {
    const url = extract(this.map, code);
    if (!url) {
      return url;
    }
    URL.revokeObjectURL(url);
    return url;
  }
};

export let script_url = new ScriptUrl();
