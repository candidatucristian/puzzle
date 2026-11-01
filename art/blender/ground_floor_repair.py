"""Render the repaired rooms/lamps and their registered prop states.
One persistent Blender scene avoids reinitialising the GPU for each plate.
"""
import bpy,os,sys,json,runpy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import kit,room_common as rc,hall_common as hc
import gold_coffer_rooms as cg
ROOT=hc.ROOT; HERE=os.path.dirname(__file__)
BASE=os.path.join(ROOT,'.artifacts/ground-floor-repair'); os.makedirs(BASE,exist_ok=True)
WIDTH=int(kit.arg('--width','2560')); SAMPLES=int(kit.arg('--samples','256'))
JOBS=kit.arg('--jobs','Study,Room2,Room3,Overtime,Modem').split(',')
original_fresh=kit.fresh; original_render=kit.render; scene=None; current=''; saved=False

def fresh():
    global scene
    if scene is None: scene=original_fresh()
    else:
        for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
        scene.camera=None; scene.world=None; scene.use_nodes=False
        scene.render.use_border=False; scene.render.use_crop_to_border=False
        scene.render.film_transparent=False
        hc.ARCH.clear()
    scene.render.use_persistent_data=True
    return scene

def render(s,path,blend=''):
    global saved
    if not saved:
        bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,current,current+'.blend'))
        saved=True
    return original_render(s,path,blend)

kit.fresh=rc.fresh=fresh
kit.render=rc.render=hc.render=render
rc.Layout.write=lambda self:open(os.path.join(BASE,current,self.room+'.json'),'w',encoding='utf-8').write(json.dumps(self.data,indent=2))
BUILDERS={'Study':'room_study_v4.py','Room2':'room_library.py','Room3':'room_cabin.py','Overtime':'overtime_office.py','Modem':'modem_room.py'}
for job in JOBS:
    current=job; saved=False
    out=os.path.join(BASE,job); os.makedirs(out,exist_ok=True)
    args=['--out',out,'--width',str(2880 if job=='Modem' else WIDTH),'--samples',str(SAMPLES),'--only','plates,chest' if job in ('Room2','Room3') else 'plates']
    kit.ARGS[:]=args; sys.argv=[sys.argv[0],'--',*args]
    if job in ('Room2','Room3'):
        cg.ROOM=job; cg.WIDTH=6144; cg.SAMPLES=SAMPLES; cg.FILL=.1 if job=='Room2' else 1
        cg.OUT=os.path.join(out,'coffer'); os.makedirs(cg.OUT,exist_ok=True)
        with open(os.path.join(ROOT,'src/levels/house/rooms',job+'.json'),encoding='utf-8') as f: cg.ORIGINAL=json.load(f)
        rc.chest_sprites=cg.native_chest
        if 'room_furnish' in sys.modules: sys.modules['room_furnish'].chest_sprites=cg.native_chest
    print('REPAIR_START',job,flush=True)
    runpy.run_path(os.path.join(HERE,BUILDERS[job]),run_name='__main__')
    print('REPAIR_DONE',job,flush=True)
print('GROUND_FLOOR_REPAIR_DONE',flush=True)
