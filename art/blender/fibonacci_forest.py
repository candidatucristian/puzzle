"""Dense, physically modeled night woodland behind Room I's workbench.

Uses instances of the existing photographic tree scans. The window,
workbench, plant, apparatus, camera and foreground lights stay in place.
"""
import bpy,json,math,random,sys
from pathlib import Path
from mathutils import Vector,Matrix

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from kit import arg,link,box,lamp,cycles
from hall_common import scan

BACKGROUND={'backgroundFile':'forest-v6.webp','backgroundVersion':'forest-v6','woodland':True}

def light_forest(scene):
    # A broad, forest-facing moon fill reveals bark and low branches. It
    # points away from the workbench rather than raising the whole exposure.
    rim=next((o for o in scene.objects if o.name=='Forest | moonlight between the crowns'),None)
    if rim:rim.data.energy=260
    name='Forest | soft moonlight over the clearing'
    fill=next((o for o in scene.objects if o.name==name),None)
    if fill is None:
        fill=lamp(name,'AREA',(0,6.5,7),aim=(0,21,1.5),energy=220,colour=(.60,.71,.87),size=10,size_y=8)
    fill.data.energy=220
    fill.visible_camera=False;fill.visible_glossy=False;fill.visible_transmission=False
    scene['background_version']=6

def build_forest(scene):
    if scene.get('woodland'):
        light_forest(scene)
        return
    rng=random.Random(1874112358)
    # Reuse the actual high-resolution source meshes without copying them
    # per tree. Each unlinked collection becomes a normalized tree asset.
    sources={}
    roots=[o for o in scene.objects if o.name.startswith('Exterior | mature garden tree | ')]
    for root in roots:
        kind=root.name.split(' | ')[-1]
        objects=[root,*root.children_recursive]
        pts=[o.matrix_world@Vector(v) for o in objects if o.type=='MESH' for v in o.bound_box]
        lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)))
        hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
        center=(lo+hi)/2
        normalize=Matrix.Scale(1/(hi.z-lo.z),4)@Matrix.Translation((-center.x,-center.y,-lo.z))
        root.matrix_world=normalize@root.matrix_world
        asset=bpy.data.collections.new('Forest asset | '+kind)
        for ob in objects:
            for collection in list(ob.users_collection):collection.objects.unlink(ob)
            asset.objects.link(ob)
        root.name='Forest source | '+kind
        sources[kind]=asset
    assert len(sources)==3,'The three original scanned tree assets are required'
    bpy.context.view_layer.update()
    def tree(kind,x,y,height,rotation=None):
        ob=link(bpy.data.objects.new('Forest | '+kind,None))
        ob.instance_type='COLLECTION';ob.instance_collection=sources[kind]
        ob.location=(x,y,-.30)
        ob.scale=(height*rng.uniform(.88,1.09),height*rng.uniform(.90,1.08),height)
        ob.rotation_euler=(rng.uniform(-.018,.018),rng.uniform(-.018,.018),rng.random()*math.tau if rotation is None else rotation)
        return ob
    # Irregular spacing, mixed crowns and several distances avoid a row of
    # identical trunks. Larger, darker silhouettes stand near the clearing.
    for x,y,height,kind in [
        (-3.8,10.5,8.5,'tree_small_02'),(4.1,12,10.5,'island_tree_01'),
        (-2.6,15.8,7.3,'fir_tree_01'),(2.8,18.8,8.2,'fir_tree_01'),
        (-5.2,23.0,12,'island_tree_01'),(5.6,25.5,11.5,'tree_small_02')]:
        tree(kind,x,y,height)
    for row,(y0,count,spread) in enumerate([(21,9,9),(32,12,13),(47,15,20),(67,17,28)]):
        for i in range(count):
            x=-spread+2*spread*(i+rng.uniform(.10,.90))/count
            y=y0+rng.uniform(-2.5,4.5)
            kind=['fir_tree_01','tree_small_02','island_tree_01'][(i+row)%3]
            tree(kind,x,y,rng.uniform(7.5,14.5))
    # Small trees at the woodland edge, away from the puzzle, provide low
    # branching shapes instead of a lawn with isolated pole-like trunks.
    for x,y,h in [(-3.5,11,3.1),(3.2,12.6,3.7),(-2.1,16.1,3.0),
                   (2.0,18,3.3),(-5.6,17,4.0),(4.8,19,4.3),
                   (-.8,24,3.8),(1.2,27,4.1)]:
        tree('fir_tree_01' if x>0 else 'tree_small_02',x,y,h)
    # The garden boundary disappears into the trees. Damp fallen leaves
    # replace the smooth lawn; the old path narrows into a woodland track.
    for ob in list(scene.objects):
        if ob.name.startswith(('Exterior | distant boundary','Exterior | distant wall coping')):
            bpy.data.objects.remove(ob,do_unlink=True)
    floor=scan('Forest | damp fallen leaves','forest_leaves_02',size=2.4,tint=(.55,.57,.48),bright=.43,sat=.42,rough=(.68,.94),bump=.75)
    earth=next(o for o in scene.objects if o.name=='Exterior | garden earth')
    earth.data.materials.clear();earth.data.materials.append(floor)
    earth.name='Forest | leaf-covered woodland floor'
    path=next(o for o in scene.objects if o.name=='Exterior | gravel garden walk')
    for i in range(len(path.data.vertices)//2):
        a,b=path.data.vertices[2*i:2*i+2];mid=(a.co+b.co)/2
        width=.72 if mid.y<11 else .50
        a.co=mid+(a.co-mid)*width;b.co=mid+(b.co-mid)*width
    path.name='Forest | narrow track into the trees'
    # Localized, low-density haze separates the far silhouettes. It starts
    # beyond the terrace, keeping the warm foreground clear and readable.
    mist=bpy.data.materials.new('Forest | faint cool woodland haze');mist.use_nodes=True
    n,l=mist.node_tree.nodes,mist.node_tree.links;n.clear()
    volume=n.new('ShaderNodeVolumeScatter');volume.inputs['Color'].default_value=(.46,.55,.64,1)
    volume.inputs['Density'].default_value=.0045;volume.inputs['Anisotropy'].default_value=.18
    out=n.new('ShaderNodeOutputMaterial');l.new(volume.outputs['Volume'],out.inputs['Volume'])
    box('Forest | distant atmospheric depth',-35,35,10,100,-.28,24,mist)
    rim=lamp('Forest | moonlight between the crowns','AREA',(-6,27,9),aim=(2,20,2),energy=180,colour=(.40,.55,.76),size=7,size_y=10)
    rim.visible_camera=False;rim.visible_glossy=False;rim.visible_transmission=False
    scene['woodland']=True
    light_forest(scene)
    scene.name='Room I | dark woodland beyond the open window | Cycles'

def render_background(scene,out,width,samples):
    meta=json.loads(scene['game_landmarks']);meta.update(BACKGROUND)
    if meta['size']!=[width,round(width/1.6)]:
        factor=width/meta['size'][0]
        for key in ['bench','flame','bucketAnchor']:meta[key]=[v*factor for v in meta[key]]
        for leaf in meta['leafNodes']:leaf['anchor']=[v*factor for v in leaf['anchor']]
        meta['cm']*=factor;meta['size']=[width,round(width/1.6)]
    (out/'scene.json').write_text(json.dumps(meta,indent=2),encoding='utf8')
    for ob in scene.objects:
        if ob.name.startswith(('Plant |','Bucket |','Foreground window |')):ob.hide_render=True
    # The woodland falls slightly beyond focus, with its trunks still
    # readable through the window. Foreground camera and exposure are fixed.
    cycles(scene,samples,width,round(width/1.6),exposure=.35,glare=False)
    scene.cycles.device='GPU' if '--gpu' in sys.argv else 'CPU'
    scene.cycles.volume_bounces=1
    scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(out/'background.png')
    bpy.ops.render.render(write_still=True)
    print('FIBONACCI_FOREST_DONE',flush=True)

if __name__=='__main__':
    out=Path(arg('--out',str(HERE.parents[1]/'.artifacts/fibonacci-forest'))).resolve();out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(HERE/'fibonacci.blend'))
    scene=bpy.context.scene;build_forest(scene)
    meta=json.loads(scene['game_landmarks']);meta.update(BACKGROUND)
    scene['game_landmarks']=json.dumps(meta)
    if '--save' in sys.argv:
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'fibonacci.blend'),compress=True)
    render_background(scene,out,int(arg('--width','2560')),int(arg('--samples','384')))
