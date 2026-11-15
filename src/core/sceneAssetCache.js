// Only original scene-owned images are budgeted; live canvases keep scene ownership.
const stores = new WeakMap();
const OWNED = /^(?:(?:Study|Room[2-9])_render_|coffer_|hall_(?:ground|chem)|bookshelf_cycles_|chem_bench_|ry_r_|room6_(?:live_|blender_)|pp_blender_|cot_native_|cx_native_|md_native_|ot_(?:office|colons)_|compass_bottle_|mo_notebook_desk_|ms_(?:sink_plate|flask)_)/;
// estimated CPU image + GPU texture storage. 384 MB since 2026-11-13: at 192
// the Rotor's eight candle photographs alone overran it, and the hall and the
// rooms were decoded again on every return (a second or so on a slower PC)
const BUDGET = 384 * 1024 * 1024;

function store(scene) {
  let value = stores.get(scene.game);
  if (!value) stores.set(scene.game, value = { clock: 0, groups: new Map() });
  const name = scene.sys.settings.key;
  let group = value.groups.get(name);
  if (!group) value.groups.set(name, group = { keys: new Set(), active: false, used: 0 });
  return { value, group };
}
export function beginAssetGroup(scene) {
  const {value,group}=store(scene); group.active=true; group.used=++value.clock;
}
export function registerSceneImage(scene,key) { if(OWNED.test(key))store(scene).group.keys.add(key); }
export function retireAssetGroup(scene) { store(scene).group.active=false; }
export function trimSceneImages(scene) {
  const {value}=store(scene), textures=scene.textures;
  const bytes = key => {
    if(!textures.exists(key))return 0;
    const image=textures.get(key).getSourceImage();
    return (image?.width ?? 0)*(image?.height ?? 0)*8;
  };
  const keys=new Set([...value.groups.values()].flatMap(group=>[...group.keys]));
  let used=[...keys].reduce((total,key)=>total+bytes(key),0);
  const protectedKeys=new Set([...value.groups.values()].filter(group=>group.active).flatMap(group=>[...group.keys]));
  const retired=[...value.groups.values()].filter(group=>!group.active).sort((a,b)=>a.used-b.used);
  for(const group of retired) {
    if(used<=BUDGET)break;
    for(const key of group.keys) {
      // A large room need not lose every image just because one image must go.
      if(used<=BUDGET)break;
      if(protectedKeys.has(key)||!textures.exists(key))continue;
      const size=bytes(key); textures.remove(key); used-=size;
    }
  }
}

