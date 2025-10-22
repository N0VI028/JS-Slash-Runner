import YAML_object from 'yaml';
import * as z_object from 'zod';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
  let YAML: typeof YAML_object;
  let z: typeof z_object;
}

export function initThirdPartyObject() {
  globalThis.YAML = YAML_object;
  globalThis.z = z_object;
}
