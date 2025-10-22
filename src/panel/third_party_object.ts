import * as Vue_object from 'vue';
import * as VueRouter_object from 'vue-router';
import YAML_object from 'yaml';
import * as z_object from 'zod';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
  let YAML: typeof YAML_object;
  let z: typeof z_object;
  let Vue: typeof Vue_object;
  let VueRouter: typeof VueRouter_object;
}

export function initThirdPartyObject() {
  globalThis.YAML = YAML_object;
  globalThis.z = z_object;
  globalThis.Vue = Vue_object;
  globalThis.VueRouter = VueRouter_object;
}
