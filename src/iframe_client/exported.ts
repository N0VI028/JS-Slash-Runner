const SillyTavern = (
  window.parent as unknown as {
    SillyTavern: { getContext: () => Record<string, any> };
  }
).SillyTavern.getContext();

const TavernHelper = (window.parent as unknown as { TavernHelper: Record<string, any> }).TavernHelper;

for (const key in TavernHelper) {
  (window as any)[key] = TavernHelper[key];
}

const toastr = (window.parent as unknown as { toastr: any }).toastr;

const EjsTemplate = (window.parent as unknown as { EjsTemplate: Record<string, any> }).EjsTemplate;
