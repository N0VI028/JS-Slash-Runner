import { extract, get_or_set } from "./util/helper.js";
function createObjectURLFromScript(code) {
    return URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
}
class ScriptUrl {
    map = new Map();
    get(code) {
        return this.map.get(code);
    }
    set(code) {
        this.map.set(code, createObjectURLFromScript(code));
    }
    get_or_set(code) {
        return get_or_set(this.map, code, () => createObjectURLFromScript(code));
    }
    delete(code) {
        const url = extract(this.map, code);
        if (!url) {
            return url;
        }
        URL.revokeObjectURL(url);
        return url;
    }
}
;
export let script_url = new ScriptUrl();
//# sourceMappingURL=script_url.js.map