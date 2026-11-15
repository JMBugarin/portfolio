"""Draw the Grey Archive's original vector artwork. No image or icon packs."""
from __future__ import annotations

import heapq
import json
import math
from pathlib import Path
from html import escape

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = ROOT / "public/art/grey-archive"
W, H = 840, 1440
INK = "#282b2d"
BONE = "#e8dfcb"
PALE = "#f0e9da"
BRASS = "#9b8655"
FAINT = "#b7aa91"
RED = "#8e303a"
ARCH = "M92 1094V470C92 314 236 224 420 205C604 224 748 314 748 470V1094Z"


class Font:
    def __init__(self, name):
        self.font = TTFont(HERE / "fonts" / name)
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.units = self.font["head"].unitsPerEm
        self.widths = self.font["hmtx"].metrics
        self.prefix = name.split(".")[0]

    def width(self, text, size, spacing=0):
        return sum(self.widths[self.cmap[ord(c)]][0] for c in text) * size / self.units + max(0, len(text)-1)*spacing


DISPLAY = Font("basteleur-moonlight.ttf")
BOLD = Font("basteleur-bold.ttf")
LABEL = Font("sligoil-micro.ttf")


class Drawing:
    def __init__(self):
        self.defs = {}
        self.parts = []
        self.serial = 0

    def add(self, s):
        self.parts.append(s)

    def path(self, d, fill="none", stroke=INK, width=1.6, extra=""):
        self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" {extra}/>')

    def line(self, x1, y1, x2, y2, color=INK, width=1, extra=""):
        self.add(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="{width}" {extra}/>')

    def circle(self, x, y, r, fill="none", stroke=INK, width=1.3, extra=""):
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" {extra}/>')

    def rect(self, x, y, w, h, fill="none", stroke=INK, width=1.3, rx=0, extra=""):
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" {extra}/>')

    def group(self, transform="", extra=""):
        self.add(f'<g transform="{transform}" {extra}>')

    def end(self):
        self.add("</g>")

    def text(self, text, x, y, size, font=LABEL, fill=INK, spacing=0, max_width=None, anchor="middle"):
        if max_width and font.width(text, size, spacing) > max_width:
            size *= max_width/font.width(text, size, spacing)
        total = font.width(text, size, spacing)
        origin = x-total/2 if anchor == "middle" else x-total if anchor == "end" else x
        self.group(extra=f'aria-label="{escape(text, quote=True)}" role="img"')
        cursor = origin
        for char in text:
            name = font.cmap[ord(char)]
            key = f"{font.prefix}-{ord(char)}"
            if key not in self.defs:
                pen = SVGPathPen(font.glyphs)
                font.glyphs[name].draw(pen)
                self.defs[key] = f'<path id="{key}" d="{pen.getCommands()}"/>'
            scale = size/font.units
            self.add(f'<use href="#{key}" fill="{fill}" transform="translate({cursor:.3f} {y}) scale({scale:.7f} {-scale:.7f})"/>')
            cursor += font.widths[name][0]*scale+spacing
        self.end()

    def hatched(self, d, bounds, fill=BONE, stroke=INK, gap=6, direction=1, width=1.7, hatch_color=None):
        self.serial += 1
        key = f"hatch-{self.serial}"
        self.defs[key] = f'<clipPath id="{key}"><path d="{d}"/></clipPath>'
        self.path(d, fill, "none")
        x,y,w,h = bounds
        self.group(extra=f'clip-path="url(#{key})"')
        for t in range(-int(h)-int(w),int(w)+int(h),gap):
            xx=x+t
            self.line(xx,y+h,xx+direction*h,y,hatch_color or stroke,.67)
        self.end()
        self.path(d,"none",stroke,width)

    def svg(self, title, description, viewbox="0 0 840 1440", width=840, height=1440):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{viewbox}" '
            'role="img" aria-labelledby="art-title art-desc" stroke-linecap="round" stroke-linejoin="round">'
            f'<title id="art-title">{escape(title)}</title><desc id="art-desc">{escape(description)}</desc>'
            f'<defs>{"".join(self.defs.values())}</defs>{"".join(self.parts)}</svg>\n'
        )


def diamond(d, x, y, size=5, color=INK, fill="none"):
    d.path(f"M{x} {y-size}L{x+size} {y}L{x} {y+size}L{x-size} {y}Z",fill,color,.9)


def ticks(d, cx,cy,r, count=72, color=INK, major=6, inside=False):
    for i in range(count):
        a=2*math.pi*i/count-math.pi/2
        length=13 if i%major==0 else 5
        end=r-length if inside else r+length
        d.line(cx+math.cos(a)*r,cy+math.sin(a)*r,cx+math.cos(a)*end,cy+math.sin(a)*end,color,1.1 if i%major==0 else .65)


def corner(d,x,y,sx=1,sy=1,color=INK):
    d.group(f"translate({x} {y}) scale({sx} {sy})")
    d.path("M0 85V0H85M9 63V9H63",stroke=color,width=.95)
    d.path("M18 50C20 28 28 20 50 18C38 29 29 38 18 50ZM22 22C19 12 20 5 26 0C29 10 29 16 22 22Z",stroke=color,width=.8)
    d.line(21,45,45,21,color,.65)
    diamond(d,64,0,3,color,color)
    diamond(d,0,64,3,color,color)
    d.end()


def frame(d,dark=False,transparent=False,front_rules=True):
    fg=BONE if dark else INK
    if not transparent:
        d.rect(0,0,W,H,INK if dark else BONE,"none",rx=28)
        # A barely visible edge tint, rather than a blanket noise texture.
        d.rect(12,12,816,1416,"none",BRASS,.6,rx=22)
    d.rect(25,25,790,1390,"none",fg,1.7,rx=16)
    d.rect(34,34,772,1372,"none",fg,.65,rx=10)
    for x,y,sx,sy in [(49,49,1,1),(791,49,-1,1),(49,1391,1,-1),(791,1391,-1,-1)]:
        corner(d,x,y,sx,sy,fg)
    if front_rules:
        d.line(94,168,746,168,fg,.65)
        d.line(94,1144,370,1144,fg,.8)
        d.line(470,1144,746,1144,fg,.8)
        diamond(d,420,1144,13,fg)
        diamond(d,420,1144,5,RED,RED)
        for x in [388,452]:
            diamond(d,x,1144,3,fg,fg)


def card_labels(d,index,project,title,subtitle):
    d.circle(420,88,28,stroke=INK,width=1)
    d.circle(420,88,23,stroke=BRASS,width=.6)
    d.text(index,420,99,28,DISPLAY)
    d.text("THE GREY ARCHIVE",420,148,15,spacing=3.5)
    for flip in [False, True]:
        d.group("translate(840 0) scale(-1 1)" if flip else "")
        d.path("M100 106H330M100 111H220M292 106C305 93 318 93 331 106",stroke=INK,width=.9)
        diamond(d,266,106,4,RED)
        d.end()
    d.text(project.upper(),420,1203,25,spacing=3.5)
    d.text(title,420,1280,68,DISPLAY,max_width=654)
    d.text(subtitle,420,1332,13,spacing=1.4,max_width=650)
    d.text(f"ENGINEERING ARCANA  /  {index}",420,1380,10,spacing=1.7)


def scene_start(d):
    d.defs["scene-arch"]=f'<clipPath id="scene-arch"><path d="{ARCH}"/></clipPath>'
    d.path(ARCH,PALE,INK,1.45)
    d.group(extra='clip-path="url(#scene-arch)"')
    # Engraved architectural rays, deliberately leaving the center quiet.
    for x in range(106,750,13):
        y=264+abs(x-420)*.44
        d.line(x,y,x,1060,FAINT,.5)
    for y in range(1030,1098,10):
        d.path(f"M80 {y}C195 {y-14} 265 {y+10} 380 {y-1}S615 {y-10} 760 {y+4}",stroke=FAINT,width=.6)


def scene_end(d):
    d.end()
    d.path(ARCH,stroke=INK,width=1.4)
    d.path("M103 1094V470C103 324 242 235 420 216C598 235 737 324 737 470V1094",stroke=INK,width=.55)


def memory_tree(d,cx,cy):
    d.line(cx,cy,cx,cy+43,INK,2)
    d.path(f"M{cx-65} {cy+83}V{cy+43}H{cx+65}V{cy+83}",stroke=INK,width=2)
    for dx in [-65,65]:
        x=cx+dx
        d.path(f"M{x-30} {cy+129}V{cy+83}H{x+30}V{cy+129}",stroke=INK,width=1.6)
        d.rect(x-8,cy+74,16,18,INK,INK,.9,rx=1)
        for off in [-30,30]:
            d.rect(x+off-12,cy+129,24,35,BONE,INK,1.3,rx=2)
            for k in range(3):
                d.line(x+off-7,cy+139+k*7,x+off+7,cy+139+k*7,INK,.55)
    d.rect(cx-12,cy-12,24,25,RED,INK,1.2,rx=2)


def keeper(d):
    scene_start(d)
    # The keeper is a retention engine, part cabinet and part regulator clock.
    d.path("M134 988V446C134 318 258 249 420 235C582 249 706 318 706 446V988",stroke=BRASS,width=1)
    for x in [157,683]:
        d.hatched(f"M{x-18} 456H{x+18}V992H{x-18}Z",(x-18,456,36,536),gap=7)
        d.rect(x-25,448,50,15,PALE)
        d.rect(x-28,986,56,23,PALE)
        for xx in [x-7,x+5]:d.line(xx,475,xx,976,INK,.8)
    d.circle(420,568,251,PALE,INK,2)
    d.circle(420,568,241,stroke=INK,width=.6)
    ticks(d,420,568,227,96,major=8,inside=True)
    d.circle(420,568,213,stroke=INK,width=1.5)
    d.circle(420,568,153,stroke=INK,width=1.2)
    # Radial archive drawers: solid ones remain, empty ones have been released.
    for i in range(16):
        a=i*22.5
        d.group(f"translate(420 568) rotate({a})")
        retained=i in [0,1,3,6,7,10,12,14]
        d.hatched("M-22-211H22V-162H-22Z",(-22,-211,44,49),fill=INK if retained else BONE,stroke=INK,hatch_color=BRASS if retained else FAINT,gap=7,width=1)
        d.line(-13,-174,13,-174,BONE if retained else INK,.8)
        d.rect(-6,-188,12,5,BONE if retained else INK,"none",rx=1)
        d.end()
    # An arched central ledger contains a literal branching prefix structure.
    housing="M312 728V461C312 395 354 357 420 349C486 357 528 395 528 461V728Z"
    d.hatched(housing,(312,349,216,379),gap=8)
    window="M332 705V464C332 412 366 382 420 374C474 382 508 412 508 464V705Z"
    d.path(window,PALE,INK,1.7)
    memory_tree(d,420,459)
    d.line(345,663,495,663,INK,.8)
    for xx in range(347,498,12):d.line(xx,673,xx,690,FAINT,.8)
    d.rect(390,704,60,20,RED,INK,1,rx=2)
    # The mechanical gate and its two counterweights.
    d.hatched("M328 740H512L543 775H297Z",(297,740,246,35),gap=6)
    d.hatched("M342 775H498L480 817H360Z",(342,775,156,42),gap=5)
    d.line(374,818,374,926,INK,2)
    d.line(466,818,466,883,INK,2)
    d.hatched("M346 904Q374 892 402 904V954H346Z",(346,892,56,62),gap=5)
    d.hatched("M445 866Q466 854 487 866V914H445Z",(445,854,42,60),gap=5)
    for x,y in [(374,917),(466,880)]:
        d.circle(x,y,7,PALE,INK,.8)
        d.line(x-4,y+10,x+4,y+10,INK,.8)
    # One block leaves the archive; the other chambers stay latched.
    d.path("M637 654C679 727 632 773 614 822S635 920 659 955",stroke=BRASS,width=.85,extra='stroke-dasharray="2 7"')
    for x,y,a in [(633,769,13),(619,843,-11),(650,930,19)]:
        d.group(f"translate({x} {y}) rotate({a})")
        d.hatched("M-17-19H17V19H-17Z",(-17,-19,34,38),gap=5,width=1.2)
        d.line(-10,5,10,5,INK,.7)
        d.end()
    d.hatched("M245 970H595L623 997H217Z",(217,970,406,27),gap=5)
    d.rect(218,997,404,48,BONE,INK,1.6)
    d.rect(232,1007,376,24,PALE,INK,.7)
    d.text("KEEP WHAT WILL RETURN",420,1024,11,spacing=1.2)
    d.hatched("M218 1045H622L643 1066H197Z",(197,1045,446,21),gap=5)
    scene_end(d)


def lens(d):
    scene_start(d)
    cx,cy=420,479
    # Optical tube and a hand-ruled graticule, not an eye symbol.
    d.circle(cx,cy,216,PALE,INK,2)
    d.circle(cx,cy,207,stroke=INK,width=.7)
    ticks(d,cx,cy,198,96,major=8,inside=True)
    d.circle(cx,cy,180,stroke=INK,width=1.7)
    for rr in [172,169,163]:d.circle(cx,cy,rr,stroke=BRASS if rr==169 else INK,width=.6)
    d.defs["lens-glass"]='<clipPath id="lens-glass"><circle cx="420" cy="479" r="158"/></clipPath>'
    d.group(extra='clip-path="url(#lens-glass)"')
    for x in range(248,600,72):d.line(x,308,x,650,FAINT,.7)
    for y in range(309,660,72):d.line(247,y,593,y,FAINT,.7)
    # The partly resolved field is visibly letter-based.
    grid=[("R",0,0),("E",1,0),("A",2,0),("D",3,0),("P",0,1),("L",1,1),("A",2,1),("Y",3,1),("S",0,2),("E",1,2),("E",2,2),("?",3,2)]
    for letter,col,row in grid:
        x=271+col*72;y=354+row*72
        uncertain=letter=="?"
        d.rect(x,y,58,58,BONE,RED if uncertain else INK,1.3,rx=2)
        d.text(letter,x+29,y+41,37,font=LABEL,fill=RED if uncertain else INK)
    # Etched crescents are optical reflections, offset from the graticule.
    for i in range(7):
        d.path(f"M{305+i*5} {370-i*3}Q{332+i*5} {348-i*3} {365+i*5} {339-i*3}",stroke=INK,width=.65)
    d.end()
    for a in [0,90,180,270]:
        d.group(f"translate(420 479) rotate({a})")
        d.rect(-14,-226,28,17,BONE,INK,1.2,rx=2)
        d.circle(0,-218,3,RED,INK,.65)
        d.end()
    # Cast yoke and a single rigid stand establish a material instrument.
    d.hatched("M194 486H214C214 645 281 712 420 717C559 712 626 645 626 486H646C646 669 565 742 420 745C275 742 194 669 194 486Z",(194,486,452,259),gap=7)
    d.hatched("M398 745H442L455 793H385Z",(385,745,70,48),gap=5)
    d.circle(420,765,8,PALE,INK,.9)
    # Projection field links the optical reading to the board beneath it.
    d.path("M286 619L221 840M551 618L623 879",stroke=BRASS,width=.9,extra='stroke-dasharray="4 6"')
    # The lower board is a deliberately schematic seven-by-seven study.
    d.group("matrix(1 .12 -.32 .72 250 797)")
    d.hatched("M-12-12H390V390H-12Z",(-12,-12,402,402),fill=BONE,gap=7)
    d.rect(0,0,378,378,PALE,INK,1.4)
    for i in range(1,7):
        d.line(i*54,0,i*54,378,INK,.75)
        d.line(0,i*54,378,i*54,INK,.75)
    letters={(1,2):"R",(2,2):"E",(3,2):"A",(4,2):"D",(3,1):"L",(3,3):"Y",(4,4):"?",(5,4):"S"}
    for (col,row),char in letters.items():
        d.rect(col*54+4,row*54+4,46,46,BONE,RED if char=="?" else INK,.85,rx=1)
        d.text(char,col*54+27,row*54+38,30,fill=RED if char=="?" else INK)
    d.end()
    # A small, definite marker isolates uncertainty; no decorative data is claimed.
    diamond(d,638,858,10,RED)
    d.line(638,871,638,933,RED,1)
    d.text("UNRESOLVED",638,953,10,spacing=.9)
    d.path("M112 1058C155 1047 178 1049 210 1060M634 1051C675 1042 699 1049 732 1062",stroke=INK,width=.75)
    scene_end(d)


def campus_geometry():
    graph=json.loads((ROOT/"public/demos/classmap-map/data/graph.json").read_text())
    places=json.loads((ROOT/"public/demos/classmap-map/data/places.json").read_text())["places"]
    by_id={p["id"]:p for p in places}
    lats,lons=graph["lat"],graph["lon"]
    def closest(place):
        return min(range(len(lats)),key=lambda i:(lats[i]-place["lat"])**2+((lons[i]-place["lon"])*.799)**2)
    source=closest(by_id["mchenry-library"])
    target=closest(by_id["baskin-engineering"])
    adj=[[] for _ in lats]
    edges=graph["edges"]
    for i in range(0,len(edges),4):
        u,v,length,_kind=edges[i:i+4]
        adj[u].append((v,length))
    dist={source:0};prev={};queue=[(0,source)]
    while queue:
        cost,u=heapq.heappop(queue)
        if cost!=dist[u]:continue
        if u==target:break
        for v,weight in adj[u]:
            candidate=cost+weight
            if candidate<dist.get(v,math.inf):
                dist[v]=candidate;prev[v]=u;heapq.heappush(queue,(candidate,v))
    if target not in dist:raise RuntimeError("Campus source and destination are disconnected")
    route=[target]
    while route[-1]!=source:route.append(prev[route[-1]])
    route.reverse()
    # The drawing uses real geometry, uniformly scaled with longitude correction.
    west,east=-122.0665,-122.0525
    south,north=36.994,37.0025
    scale=min(470/((east-west)*.799),300/(north-south))
    def point(i):
        return 184+(lons[i]-west)*.799*scale,680+(north-lats[i])*scale
    visible=[];seen=set()
    for i in range(0,len(edges),4):
        u,v,_,_=edges[i:i+4]
        pair=tuple(sorted((u,v)))
        if pair in seen:continue
        seen.add(pair)
        if all(west<=lons[k]<=east and south<=lats[k]<=north for k in [u,v]):
            a,b=point(u),point(v)
            visible.append(f"M{a[0]:.2f} {a[1]:.2f}L{b[0]:.2f} {b[1]:.2f}")
    route_d="M"+"L".join(f"{point(i)[0]:.2f} {point(i)[1]:.2f}" for i in route)
    return "".join(visible),route_d,point(source),point(target),len(route)


def cartographer(d):
    scene_start(d)
    d.circle(420,478,227,PALE,INK,2)
    d.circle(420,478,218,stroke=BRASS,width=.65)
    ticks(d,420,478,205,120,major=10,inside=True)
    d.circle(420,478,185,stroke=INK,width=1.4)
    d.circle(420,478,174,stroke=INK,width=.6)
    # A turning paper dial, with slots instead of a stock compass rose.
    for angle in range(0,360,30):
        d.group(f"translate(420 478) rotate({angle})")
        d.hatched("M-13-169H13L8-143H-8Z",(-13,-169,26,26),gap=5,width=.8)
        d.end()
    for label,x,y in [("N",420,261),("E",657,482),("W",183,482)]:
        d.text(label,x,y,14)
    for yy in range(388,580,12):
        d.path(f"M320 {yy}Q420 {yy-47} 520 {yy}",stroke=FAINT,width=.6)
    d.line(420,304,420,626,BRASS,.65)
    d.line(260,478,580,478,BRASS,.65)
    d.hatched("M302 628H538L562 654H278Z",(278,628,284,26),gap=5)
    # The map is a real campus-path study, not a fantasy map asset.
    scroll="M154 658Q156 637 180 639H658Q685 641 686 667L667 984Q665 1006 643 1005H174Q151 1002 153 980Z"
    d.path(scroll,BONE,INK,1.6)
    d.path("M180 639Q196 665 174 684H660M154 979Q180 964 194 984Q203 1002 174 1005",stroke=INK,width=1.1)
    d.path("M174 650H660M167 987H646",stroke=BRASS,width=.65)
    d.defs["map-paper"]='<clipPath id="map-paper"><path d="M180 686H651V965H178Z"/></clipPath>'
    geometry,route,start,end,count=campus_geometry()
    d.group(extra='clip-path="url(#map-paper)"')
    d.path(geometry,stroke=BRASS,width=.75)
    d.path(route,stroke=BONE,width=7)
    d.path(route,stroke=RED,width=3.1)
    for x,y in [start,end]:
        d.circle(round(x,2),round(y,2),7,BONE,RED,1.9)
        d.circle(round(x,2),round(y,2),2.3,RED,"none")
    d.end()
    # Fine dividers bridge observation and destination.
    d.hatched("M404 431L425 438L283 898L268 914L269 889Z",(268,431,157,483),gap=6,width=1.5)
    d.hatched("M427 438L447 431L586 889L585 914L570 898Z",(427,431,160,483),gap=6,direction=-1,width=1.5)
    d.circle(425,429,33,BONE,INK,1.7)
    d.circle(425,429,23,stroke=INK,width=.8)
    d.circle(425,429,8,RED,INK,1)
    d.path("M425 396V353Q425 340 437 340H455",stroke=INK,width=2)
    d.rect(451,331,12,19,BONE,INK,1,rx=2)
    # Route endpoints are attached to the source geometry, without invented metrics.
    d.text("MCHENRY",200,1035,11,spacing=1,anchor="start")
    d.text("BASKIN",640,1035,11,spacing=1,anchor="end")
    d.line(200,1049,640,1049,BRASS,.7)
    diamond(d,420,1049,4,RED,RED)
    d.text("© OpenStreetMap contributors",420,1077,9.4,spacing=.1)
    scene_end(d)


def back(d):
    frame(d,dark=True,front_rules=False)
    # Two reversible fan vaults share a single optical/retention knot.
    for flipped in [False,True]:
        d.group("translate(840 1440) rotate(180)" if flipped else "")
        d.path("M119 588V410Q119 245 420 206Q721 245 721 410V588",stroke=BONE,width=1)
        d.path("M131 586V412Q131 262 420 219Q709 262 709 412V586",stroke=BONE,width=.5)
        for i in range(25):
            t=i/24
            x=144+t*552
            d.path(f"M{x:.2f} {440-130*math.sin(t*math.pi):.2f}Q420 {510-i*1.7:.2f} {230+t*380:.2f} 604",stroke=BRASS,width=.6)
        for i in range(9):
            x=188+i*58
            d.rect(x,366+abs(i-4)*16,25,48,"none",BONE,.7,rx=1)
            d.line(x+5,400+abs(i-4)*16,x+20,400+abs(i-4)*16,BONE,.5)
        d.path("M420 244V279M400 262H440M408 250L432 274M408 274L432 250",stroke=BONE,width=.8)
        diamond(d,420,244,5,RED,RED)
        for x in [115,725]:
            d.line(x,631,x,699,BONE,.7)
            diamond(d,x,720,7,BONE)
        d.end()
    for r in [222,214,195,183,148,138]:d.circle(420,720,r,stroke=BONE if r!=195 else BRASS,width=.6 if r in [214,138] else 1.1)
    ticks(d,420,720,204,96,BONE,8,inside=True)
    # Original guilloche: closed paths form a reversible aperture lattice.
    for offset in [0,math.pi/2]:
        for layer in range(6):
            pts=[]
            for step in range(481):
                t=step*2*math.pi/480
                r=117+layer*5+23*math.cos(4*t+offset)
                pts.append((420+r*math.cos(t),720+r*math.sin(t)))
            d.path("M"+"L".join(f"{x:.2f} {y:.2f}" for x,y in pts)+"Z",stroke=BRASS if layer%2 else BONE,width=.55)
    d.path("M420 606Q453 678 495 720Q453 762 420 834Q387 762 345 720Q387 678 420 606Z",INK,BONE,1)
    d.path("M420 636Q443 690 471 720Q443 750 420 804Q397 750 369 720Q397 690 420 636Z",stroke=BONE,width=.65)
    d.circle(420,720,28,INK,BONE,1.2)
    d.circle(420,720,19,stroke=BRASS,width=.65)
    d.circle(420,720,6,RED,"none")
    for x,y,sx,sy in [(70,70,1,1),(770,70,-1,1),(70,1370,1,-1),(770,1370,-1,-1)]:
        d.group(f"translate({x} {y}) scale({sx} {sy})")
        for i in range(6):d.path(f"M0 {100+i*12}Q{100+i*11} {95+i*5} {100+i*12} 0",stroke=BRASS,width=.55)
        d.end()


def seal(d,color=RED):
    d.circle(256,256,231,stroke=color,width=1.6)
    d.circle(256,256,221,stroke=color,width=.7)
    d.circle(256,256,174,stroke=color,width=1.1)
    for i in range(64):
        angle=i*2*math.pi/64
        if i%8:
            d.circle(round(256+198*math.cos(angle),2),round(256+198*math.sin(angle),2),1,color,"none")
        else:
            x=256+198*math.cos(angle);y=256+198*math.sin(angle)
            diamond(d,x,y,3.5,color,color)
    # Archive door, branching prefix, and a turning instrument in one monogram.
    d.path("M137 335V223C137 161 187 129 256 117C325 129 375 161 375 223V335",stroke=color,width=2)
    d.path("M148 333V223C148 172 192 140 256 128C320 140 364 172 364 223V333",stroke=color,width=.7)
    d.text("JB",256,298,132,BOLD,fill=color,max_width=210)
    d.line(174,322,338,322,color,1.1)
    d.path("M217 349V337H295V349M256 337V322",stroke=color,width=1)
    for x in [217,256,295]:diamond(d,x,352,4,color)
    d.text("JOSHUA BUGARIN",256,393,14,fill=color,spacing=1.7)
    d.text("THE GREY ARCHIVE",256,417,10,fill=color,spacing=1)
    diamond(d,256,85,7,color)


def save(name,d,title,description,**kwargs):
    path=OUT/name
    path.write_text(d.svg(title,description,**kwargs))
    return {"file":name,"title":title,"description":description}


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    records=[]
    cards=[
        ("pacer","I","Pacer","The Keeper","MEMORY / RETENTION / RETURN",keeper,
         "An engraved retention engine: latched archive drawers surround a branching memory structure, while released blocks fall beside its counterweights."),
        ("tilelens","II","TileLens","The Lens","OBSERVE / RESOLVE / SEARCH",lens,
         "An engraved optical instrument magnifies a letter lattice. An unresolved tile is marked in crimson above the schematic board."),
        ("classmap","III","Classmap","The Cartographer","SCHEDULE / PLACE / PATH",cartographer,
         "An engraved paper navigation instrument and dividers over UCSC paths. A crimson route connects graph nodes near McHenry Library and Baskin Engineering."),
    ]
    for slug,index,project,title,subtitle,artist,description in cards:
        d=Drawing()
        frame(d);artist(d);card_labels(d,index,project,title,subtitle)
        records.append(save(f"{slug}-card.svg",d,f"{project} — {title}",description))
        art=Drawing();artist(art)
        records.append(save(f"{slug}-illustration.svg",art,f"{project} — {title}, illustration",description,viewbox="80 195 680 910",width=680,height=910))
    d=Drawing();back(d)
    records.append(save("card-back.svg",d,"The Grey Archive — reversible card back","A two-way design of fan vaults, archive apertures and an original guilloche knot. No top or bottom."))
    d=Drawing();frame(d,transparent=True)
    # Match the front's picture aperture while leaving it transparent.
    d.path(ARCH,stroke=INK,width=1.3)
    records.append(save("card-frame.svg",d,"The Grey Archive — reusable frame","A transparent common frame with corner leaves, double rules, and one crimson registration diamond."))
    for name,color in [("archive-seal.svg",RED),("archive-seal-bone.svg",BONE)]:
        d=Drawing();seal(d,color)
        records.append(save(name,d,"Joshua Bugarin — archive seal","An original JB monogram in an arched archive door, with branching terminals and a circular registration ring.",viewbox="0 0 512 512",width=512,height=512))
    manifest={
        "collection":"The Grey Archive",
        "version":1,
        "dimensions":{"card":[W,H],"illustration":[680,910],"seal":[512,512]},
        "palette":{"ink":INK,"bone":BONE,"paper":PALE,"brass":BRASS,"crimson":RED},
        "assets":records,
        "technique":"Original authored SVG geometry and outlined typography; no stock icons, generated bitmap imagery, or runtime code.",
        "fonts":[
            {"name":"Basteleur","source":"https://gitlab.com/velvetyne/basteleur","license":"SIL Open Font License 1.1"},
            {"name":"Sligoil","source":"https://gitlab.com/velvetyne/sligoil","license":"SIL Open Font License 1.1"}
        ],
        "map_attribution":"Map data © OpenStreetMap contributors, ODbL. The Classmap artwork uses paths from the portfolio's bundled graph. The illustrated route is a shortest-distance graph study, not turn-by-turn guidance or a benchmark.",
        "map_sources":["https://www.openstreetmap.org/copyright","/public/demos/classmap-map/data/graph.json"],
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    labels=Drawing()
    labels.text("The Grey Archive",90,66,38,DISPLAY,fill=BONE,anchor="start")
    labels.text("JOSHUA BUGARIN / ORIGINAL ARTWORK",1788,63,13,fill=BONE,spacing=1.4,anchor="end")
    labels.text("PROJECT ARCANA / VECTOR MASTERS + RASTER EXPORTS",90,1132,13,fill=BONE,spacing=1.3,anchor="start")
    for title,x in [("REVERSIBLE BACK",362),("ARCHIVE SEAL",930),("SHARED FRAME",1498)]:
        labels.text(title,x,1826,16,fill=BONE,spacing=2)
    (HERE/"preview-labels.svg").write_text(labels.svg(
        "The Grey Archive — collection labels","Labels for the flat asset contact sheet.",
        viewbox="0 0 1860 1880",width=1860,height=1880))
    print(json.dumps({"written":len(records),"directory":str(OUT)},indent=2))


if __name__=="__main__":
    main()
