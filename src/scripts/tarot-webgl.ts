import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import type { TarotProject } from '../lib/tarot'

export interface SceneHandle {
  hover(name: string | null): void
  travel(name: string): Promise<void>
  dispose(): void
}
interface Options {
  model: string; draco: string; signal: AbortSignal
  hover(project: TarotProject | null): void
  select(name: string): void
  bio(): void
  anchor(name: string, x: number, y: number, visible: boolean): void
  failure(): void
}

function glyphTexture(text: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#dce3d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = '#b9c8b9'; ctx.shadowBlur = 12; ctx.font = '132px Georgia, serif'
  ctx.fillText(text, 128, 139)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function mistMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), time: { value: 0 }, opacity: { value: .095 } },
    vertexShader: `varying vec2 uvCloud;
      #include <fog_pars_vertex>
      void main(){uvCloud=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 uvCloud;uniform float time;uniform float opacity;
      #include <fog_pars_fragment>
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 uv=uvCloud;vec2 p=uv*5.+vec2(time*.025,time*.009);float n=0.;float a=.55;
      for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+12.7;a*=.5;}
      float edge=smoothstep(0.,.17,uv.x)*smoothstep(0.,.17,uv.y)*smoothstep(0.,.17,1.-uv.x)*smoothstep(0.,.17,1.-uv.y);
      gl_FragColor=vec4(.49,.55,.51,smoothstep(.28,.8,n)*edge*opacity);
      #include <fog_fragment>
      }`,
  })
}

export async function createTarotScene(host: HTMLElement, projects: TarotProject[], options: Options): Promise<SceneHandle> {
  options.signal.throwIfAborted()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
  host.append(renderer.domElement)
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#111715')
  const fog = new THREE.FogExp2('#202b27', .045); scene.fog = fog
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 120)
  const base = new THREE.Vector3(10, 7.9, -16)
  const target = new THREE.Vector3(0, 2.3, 1.4)
  camera.position.copy(base); camera.lookAt(target)
  const environment = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(environment, .04)
  scene.environment = env.texture; scene.environmentIntensity = .6
  environment.dispose(); pmrem.dispose()
  const moon = new THREE.DirectionalLight('#dce3dc', 1.8); moon.position.set(-7, 13, -4); scene.add(moon)
  scene.add(new THREE.HemisphereLight('#b0c2b6', '#18201c', .75))
  const silver = new THREE.PointLight('#b9c8b9', 1.2, 14, 0); silver.position.set(0, 6.7, 7); scene.add(silver)
  const rim = new THREE.DirectionalLight('#a8bdb1', 1.6); rim.position.set(1, 2, 11); scene.add(rim)
  const fogMaterials: THREE.ShaderMaterial[] = []
  for (let i = 0; i < 4; i++) {
    const mat = mistMaterial(); fogMaterials.push(mat)
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(19 + i, 30), mat)
    plane.rotation.x = -Math.PI / 2; plane.rotation.z = i * .22
    plane.position.set(0, 1.75 + i * .16, 3 + i * 1.8); plane.renderOrder = 2 + i; scene.add(plane)
  }
  const decoder = new DRACOLoader().setDecoderPath(options.draco)
  decoder.setWorkerLimit(2)
  const loader = new GLTFLoader().setDRACOLoader(decoder)
  const abort = new AbortController(); const { signal } = abort
  let disposed = false, locked = false, frame = 0, lastTime = 0, inside = true
  let parsing = false
  let hovered: string | null = null
  let root: THREE.Group | undefined
  let resizeObserver: ResizeObserver | undefined, visibilityObserver: IntersectionObserver | undefined
  const timeline = new Set<gsap.core.Animation>()
  const pointer = new THREE.Vector2(0, 0), parallax = new THREE.Vector2(0, 0)
  const raycaster = new THREE.Raycaster(), projected = new THREE.Vector3(), world = new THREE.Vector3()
  const chairs: THREE.Object3D[] = []
  const crestMaterials = new Map<string, { field: THREE.MeshBasicMaterial; glyph: THREE.MeshBasicMaterial }>()
  const hoverDolly = { value: 0 }
  let hoverTarget = new THREE.Vector3()

  function releaseObjects(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
    object.traverse(o => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m)
      }
    })
    materials.forEach(m => {
      gsap.killTweensOf(m)
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value)
      m.dispose()
    })
    textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose())
  }
  function dispose() {
    if (disposed) return
    disposed = true; abort.abort(); cancelAnimationFrame(frame)
    resizeObserver?.disconnect(); visibilityObserver?.disconnect()
    timeline.forEach(t => t.kill()); timeline.clear()
    gsap.killTweensOf(hoverDolly); gsap.killTweensOf(camera.position); gsap.killTweensOf(fog)
    releaseObjects(scene)
    env.dispose()
    // In-flight decoder work settles before its worker pool is released.
    if (!parsing) decoder.dispose()
    scene.clear()
    renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    options.hover(null)
  }
  options.signal.addEventListener('abort', dispose, { once: true, signal })

  try {
    const response = await fetch(options.model, { signal: options.signal })
    if (!response.ok) throw new Error(`Model request failed (${response.status})`)
    const bytes = await response.arrayBuffer()
    options.signal.throwIfAborted()
    parsing = true
    const gltf = await loader.parseAsync(bytes, new URL('.', new URL(options.model, location.href)).href)
    parsing = false
    if (disposed) { releaseObjects(gltf.scene); decoder.dispose(); throw new DOMException('Scene disposed', 'AbortError') }
    root = gltf.scene; scene.add(root)
    // Regrade the embedded bronze atlas to aged silver without duplicating or
    // rewriting its texture. Normal, roughness, metalness and AO maps stay intact.
    const tonedMaterials = new Set<THREE.MeshStandardMaterial>()
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial) || tonedMaterials.has(material)) continue
        tonedMaterials.add(material)
        material.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
            #include <color_fragment>
            float silverLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            diffuseColor.rgb = mix(vec3(silverLuminance) * vec3(0.93, 1.0, 0.96), diffuseColor.rgb, 0.06);
          `)
        }
        material.customProgramCacheKey = () => 'gray-fog-aged-silver-v1'
        material.needsUpdate = true
      }
    })
    const required = ['Bronze_Table', 'Head_Throne', 'Pillars', ...projects.map(p => p.seatMeshName)]
    for (const name of required) if (!root.getObjectByName(name)) throw new Error(`Missing GLB node: ${name}`)
    scene.updateMatrixWorld(true)
    for (const project of projects) chairs.push(root.getObjectByName(project.seatMeshName)!)
    chairs.push(root.getObjectByName('Head_Throne')!)
    for (const [i, name] of ['Head_Throne', ...projects.map(p => p.seatMeshName)].entries()) {
      const anchor = root.getObjectByName(i === 0 ? 'Sigil_Head' : `Sigil_0${i}`)
      if (!anchor) throw new Error(`Missing crest anchor for ${name}`)
      const project = projects.find(p => p.seatMeshName === name)
      const size = (anchor.userData.panel_size_m as number[] | undefined) ?? [.60, .65]
      const field = new THREE.MeshBasicMaterial({ color: '#748e7d', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), field); plane.position.z = .008
      const glyph = new THREE.MeshBasicMaterial({ map: glyphTexture(i === 0 ? '◇' : project!.romanNumeral), transparent: true, depthWrite: false, toneMapped: false, opacity: project?.reserved ? .35 : 1 })
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(size[0] * .85, size[1] * .85), glyph); mark.position.z = .015
      anchor.add(plane, mark); crestMaterials.set(name, { field, glyph })
    }
  } catch (error) { parsing = false; dispose(); decoder.dispose(); throw error }

  function hover(name: string | null) {
    if (locked || disposed || hovered === name) return
    if (hovered) {
      const previous = crestMaterials.get(hovered)!
      gsap.to(previous.field, { opacity: 0, duration: .25, overwrite: true })
      previous.glyph.color.set('#ffffff')
    }
    hovered = name
    host.style.cursor = name ? 'pointer' : ''
    options.hover(projects.find(p => p.seatMeshName === name) ?? null)
    if (name) {
      const mat = crestMaterials.get(name)!
      gsap.to(mat.field, { opacity: .48, duration: .3, overwrite: true })
      mat.glyph.color.set('#e6ede2')
      root!.getObjectByName(name)!.getWorldPosition(hoverTarget)
    }
    gsap.to(hoverDolly, { value: name ? .03 : 0, duration: .45, ease: 'power2.out', overwrite: true })
  }
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight)
    renderer.setSize(w, h); camera.aspect = w / h
    // Keep a comfortable framing on smaller desktop windows without allowing free roam.
    camera.fov = camera.aspect < 1.4 ? 49 : 40
    camera.setViewOffset(w, h, -w * (camera.aspect > 1.4 ? .12 : .06), 0, w, h)
    camera.updateProjectionMatrix()
  }
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize()

  host.addEventListener('pointermove', event => {
    if (locked) return
    const bounds = host.getBoundingClientRect()
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
    parallax.copy(pointer)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(chairs, false)[0]
    hover(hit?.object.name ?? null)
  }, { signal, passive: true })
  host.addEventListener('pointerleave', () => { parallax.set(0, 0); hover(null) }, { signal })
  host.addEventListener('click', event => {
    if (locked || !hovered || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (hovered === 'Head_Throne') options.bio()
    else options.select(hovered)
  }, { signal })
  renderer.domElement.addEventListener('webglcontextlost', e => {
    if (!disposed) { e.preventDefault(); options.failure() }
  }, { signal })

  function positionAnchors() {
    for (const chair of chairs) {
      chair.getWorldPosition(world); world.y += .16
      projected.copy(world).project(camera)
      options.anchor(chair.name, (projected.x * .5 + .5) * host.clientWidth, (-projected.y * .5 + .5) * host.clientHeight,
        projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .96 && Math.abs(projected.y) < .94)
    }
  }
  let slowFrames = 0, frameCount = 0
  let elapsed = 0
  function tick(now: number) {
    if (disposed || document.hidden || !inside) { frame = 0; return }
    frame = requestAnimationFrame(tick)
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .1) : 1 / 60; lastTime = now
    if (!locked) {
      const position = base.clone().lerp(hoverTarget, hoverDolly.value)
      position.x += parallax.x * .6; position.y += parallax.y * .25
      camera.position.lerp(position, 1 - Math.exp(-delta * 5))
      camera.lookAt(target)
    }
    elapsed += delta
    for (const mat of fogMaterials) mat.uniforms.time.value = elapsed
    renderer.render(scene, camera); positionAnchors()
    // Adapt only after sustained slow frames; reset when visibility changes.
    if (delta > .022) slowFrames++
    if (++frameCount === 150) {
      if (slowFrames > 70 && renderer.getPixelRatio() > 1) renderer.setPixelRatio(1)
      slowFrames = 0; frameCount = 0
    }
  }
  function run() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0
    if (!disposed && !document.hidden && inside) frame = requestAnimationFrame(tick)
  }
  visibilityObserver = new IntersectionObserver(([entry]) => { inside = entry.isIntersecting; run() }, { rootMargin: '80px' })
  visibilityObserver.observe(host)
  document.addEventListener('visibilitychange', run, { signal }); run()

  return {
    hover,
    travel(name) {
      if (locked || disposed) return Promise.resolve()
      locked = true; options.hover(null); host.style.cursor = ''
      const destination = root!.getObjectByName(name)!.getWorldPosition(new THREE.Vector3())
      const approach = camera.position.clone().lerp(destination, .82)
      return new Promise<void>(resolve => {
        const t = gsap.timeline({ onComplete: () => { timeline.delete(t); resolve() }, onInterrupt: resolve })
        t.addLabel('enter', 0)
          .to(camera.position, { x: approach.x, y: approach.y, z: approach.z, duration: .85, ease: 'power2.inOut' }, 'enter')
          .to(fog, { density: .38, duration: .85, ease: 'power2.in' }, 'enter')
        timeline.add(t)
      })
    },
    dispose,
  }
}
