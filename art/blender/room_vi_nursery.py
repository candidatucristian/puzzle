"""Modeled antique nursery joinery, miniature hotel and sewn mobile."""
import math
import bpy


def detail_nursery(scene, erase, box, cylinder, path_curve, plain, timber, brass):
    def lathe(name,x,y,z,profile,material):
        verts=[]
        faces=[]
        segments=32
        for h,r in profile:
            verts.extend((x+r*math.cos(a*math.tau/segments),y+r*math.sin(a*math.tau/segments),z+h) for a in range(segments))
        for j in range(len(profile)-1):
            for i in range(segments):
                a=j*segments+i
                b=j*segments+(i+1)%segments
                faces.append((a,b,b+segments,a+segments))
        faces.append(tuple(reversed(range(segments))))
        faces.append(tuple((len(profile)-1)*segments+i for i in range(segments)))
        mesh=bpy.data.meshes.new(name)
        mesh.from_pydata(verts,[],faces)
        mesh.update()
        obj=bpy.data.objects.new(name,mesh)
        scene.collection.objects.link(obj)
        obj.data.materials.append(material)
        for face in mesh.polygons:
            face.use_smooth=len(face.vertices)==4
        return obj

    erase(["cot_post","cot_knob","cot_spindle"])
    post=[(0,.034),(.045,.034),(.06,.026),(.25,.026),(.29,.037),(.32,.037),(.35,.027),
          (.89,.027),(.94,.039),(.985,.039),(1.01,.027),(1.035,.025),(1.06,.037),
          (1.08,.044),(1.105,.038),(1.125,.019),(1.13,.008)]
    for x in [-.12,1.3]:
        for y in [6.78,7.42]:
            lathe("VI cot | turned mahogany corner",x,y,0,post,timber)
    spindle=[(0,.012),(.05,.012),(.07,.016),(.085,.016),(.105,.0095),(.19,.0095),
             (.23,.014),(.27,.015),(.3,.012),(.33,.01),(.49,.0095),(.52,.016),(.54,.016),(.56,.012),(.6,.012)]
    for y in [6.78,7.42]:
        for i in range(15):
            lathe("VI cot | turned spindle",-.03+i*.09,y,.35,spindle,timber)
        for z in [.925,1.01,.29]:
            box("VI cot | slender molding",(-.12,1.3,y-.031,y+.031,z,z+.012),timber,.004)

    cream=plain("VI | aged ivory toy enamel",(.48,.39,.25),.46)
    roof=plain("VI | miniature hotel oxblood roof",(.105,.028,.018),.4)
    window=plain("VI | miniature hotel dark glazing",(.018,.029,.034),.24)
    blue=plain("VI | old painted toy train",(.035,.115,.14),.45)
    # The puzzle's miniature is a hotel, with three storeys and a sign.
    hx,hy,hz=.12,7.22,.54
    box("VI toy hotel | building",(hx-.15,hx+.15,hy-.075,hy+.075,hz,hz+.255),cream,.006)
    box("VI toy hotel | plinth",(hx-.165,hx+.165,hy-.085,hy+.085,hz-.01,hz+.015),timber,.004)
    box("VI toy hotel | roof",(hx-.17,hx+.17,hy-.09,hy+.09,hz+.25,hz+.28),roof,.006)
    for row in range(3):
        for col in range(4):
            x=hx-.112+col*.075
            z=hz+.055+row*.065
            box("VI toy hotel | recessed window",(x-.017,x+.017,hy-.078,hy-.075,z,z+.035),window,.002)
            box("VI toy hotel | sill",(x-.021,x+.021,hy-.083,hy-.075,z-.004,z),cream,.001)
    data=bpy.data.curves.new("Miniature HOTEL sign","FONT")
    data.body="HOTEL"
    data.size=.027
    data.align_x="CENTER"
    data.extrude=.0005
    sign=bpy.data.objects.new("VI toy hotel | HOTEL lettering",data)
    scene.collection.objects.link(sign)
    sign.location=(hx,hy-.079,hz+.223)
    sign.rotation_euler=(math.pi/2,0,0)
    sign.data.materials.append(roof)
    # Small wooden engine and carriage resting on the bedding.
    box("VI toy train | engine",(.39,.56,6.91,7.0,.55,.59),roof,.006)
    cylinder("VI toy train | boiler",(.41,6.954,.62),(.51,6.954,.62),.035,blue)
    box("VI toy train | cab",(.51,.56,6.92,6.99,.59,.68),blue,.004)
    for x in [.42,.53]:
        for y in [6.908,7.002]:
            cylinder("VI toy train | wooden wheel",(x,y-.006,.57),(x,y+.006,.57),.028,timber)

    # A real embroidery hoop supports suspended cloth objects; each thread
    # terminates at the hoop and its sewn toy, with no floating pieces.
    erase(["mobile_arm","mobile_string","mobile_star"])
    cotton=plain("VI | mobile natural cotton",(.43,.36,.23),.94)
    cloud=plain("VI | mobile ivory felt",(.58,.53,.42),.93)
    star=plain("VI | mobile ochre felt",(.39,.24,.065),.9)
    for mat in [cotton,cloud,star]:
        nodes,links=mat.node_tree.nodes,mat.node_tree.links
        p=nodes.get("Principled BSDF")
        p.inputs["Sheen Weight"].default_value=.32
        n=nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value=220
        b=nodes.new("ShaderNodeBump")
        b.inputs["Distance"].default_value=.0004
        b.inputs["Strength"].default_value=.35
        links.new(n.outputs["Fac"],b.inputs["Height"])
        links.new(b.outputs["Normal"],p.inputs["Normal"])
    points=[(-.10,7.4,1.68),(-.10,7.4,1.86),(.0,7.34,1.93),(.25,7.18,1.93),(.43,7.05,1.9)]
    path_curve("VI mobile | curved mahogany arm",points,.009,timber)
    ring=[(.43+.23*math.cos(i*math.tau/96),7.05+.23*math.sin(i*math.tau/96),1.73) for i in range(97)]
    path_curve("VI mobile | embroidery hoop",ring,.007,timber)
    for a in [0,math.tau/3,math.tau*2/3]:
        cylinder("VI mobile | suspension",(.43,7.05,1.9),(.43+.23*math.cos(a),7.05+.23*math.sin(a),1.73),.0012,cotton,8)
    def felt_shape(name,outline,y,mat):
        mesh=bpy.data.meshes.new(name)
        mesh.from_pydata([(x,y,z) for x,z in outline],[],[tuple(range(len(outline)))])
        mesh.update()
        obj=bpy.data.objects.new(name,mesh)
        scene.collection.objects.link(obj)
        obj.data.materials.append(mat)
        s=obj.modifiers.new("Padded felt thickness","SOLIDIFY")
        s.thickness=.016
        b=obj.modifiers.new("Soft stitched outline","BEVEL")
        b.width=.006
        b.segments=3
    for index,(dx,dy,z) in enumerate([(-.19,.13,1.43),(.02,-.229,1.53),(.23,0,1.44)]):
        x,y=.43+dx,7.05+dy
        cylinder("VI mobile | cotton drop",(x,y,1.73),(x,y,z+.05),.0012,cotton,8)
        if index==0:
            outline=[]
            # A scalloped, padded cloud rather than intersecting spheres.
            for j in range(96):
                t=j*math.tau/96
                r=1+.12*math.cos(5*t)
                outline.append((x+math.cos(t)*.084*r,z+math.sin(t)*.043*r))
            felt_shape("VI mobile | sewn cloud",outline,y,cloud)
        else:
            outline=[(x+math.cos(math.pi/2+j*math.pi/5)*(.054 if j%2==0 else .025),z+math.sin(math.pi/2+j*math.pi/5)*(.054 if j%2==0 else .025)) for j in range(10)]
            felt_shape("VI mobile | sewn star",outline,y,star)
