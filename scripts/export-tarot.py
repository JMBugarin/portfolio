"""Blender 4.5: load the authored sanctum .blend, then run this script.

blender -b /path/to/Gray_Fog_Sanctum.blend -P scripts/export-tarot.py
The original master remains unchanged. This exports the portfolio runtime asset.
"""
import bpy, os, json
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT,'public/models'),exist_ok=True)
meshes=list(bpy.data.collections['01 • WEBGL ASSETS'].objects)
anchors=list(bpy.data.collections['03 • SIGIL ANCHORS'].objects)
worlds={a.name:a.matrix_world.copy() for a in anchors}
material=bpy.data.materials['Sanctum • baked WebGL PBR']
for o in meshes:
    o.data.materials.clear(); o.data.materials.append(material)
    for p in o.data.polygons:p.material_index=0
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if o.name=='Head_Throne' or o.name.startswith('Seat_'):
        a=next(a for a in anchors if a.parent==o)
        crest=worlds[a.name].translation.copy()
        top=max((o.matrix_world @ v.co).z for v in o.data.vertices)
        # Exact central crest axis, at the uppermost back/crown height.
        bpy.context.scene.cursor.location=(crest.x,crest.y,top)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        o['origin_convention']='Centre top of chair back; tooltip anchor; applied rotation and scale'
    o.data.name=o.name
bpy.context.view_layer.update()
for a in anchors:a.matrix_world=worlds[a.name]
# The GLB has already baked, embedded PBR atlases. Reduce the color atlas to 2K.
for im in bpy.data.images:
    if im.name.startswith('Sanctum_'):
        if max(im.size)>2048:im.scale(2048,2048)
        im.pack()
bpy.ops.object.select_all(action='DESELECT')
for o in meshes+anchors:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/tarot-table.glb'),export_format='GLB',
    use_selection=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
    export_draco_position_quantization=16,export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=14,export_extras=True,export_yup=True,
    export_cameras=False,export_lights=False,export_animations=False,export_apply=True,
    export_normals=True,export_tangents=True,export_image_format='AUTO',export_image_quality=88)
report={o.name:{'triangles':len(o.data.polygons),'origin_blender':list(o.location),'scale':list(o.scale),'rotation':list(o.rotation_euler)} for o in meshes}
with open(os.path.join(ROOT,'design/tarot-asset.json'),'w') as f:json.dump(report,f,indent=2)
print('PORTFOLIO_GLB_EXPORTED',os.path.getsize(os.path.join(ROOT,'public/models/tarot-table.glb')),flush=True)
