# Furniture, imported models and live quantities

Open the [design studio](https://ailagari.github.io/my-home-renovation/studio.html).
This release includes furniture placement and orientation, local model imports,
compound controls and live quantities. Imported files and design edits remain
in your browser unless you export and share them yourself.

## Move and orient furniture

1. Select a room, then use **Move furniture** or the **Select furniture** list.
2. Drag a bed, sofa, table, chair, wardrobe, desk, console, shelf or planter
   across the floor. All parts of that item move together.
3. The inspector provides centre offsets, any rotation angle, **Rotate 90°**,
   a destination room and **Reset this item**. Use **Top** for placement.
4. **Undo** restores the previous edit. The proposed whole-house review reads
   the same saved furniture layout.

Built-in furniture is kept inside the selected room's rectangular footprint.
Furniture-to-furniture clashes, door swings, stairs and circulation still need
visual checking. Fixed wall panels, kitchen installations and sanitary fittings
remain attached to their rooms. Electrical points do not follow furniture moves.

## Import your own 3D files

Expand **Import a 3D model** in the equipment library. Select one GLB, glTF,
FBX, STL or OBJ model. For glTF, include its BIN file and textures in the same
selection; include referenced local textures for FBX. Give it a name, choose
its equipment type, and enter a placed width in metres. File units and Y/Z-up
controls handle common modelling conventions.

Choose **Imported furniture / decor** for a non-electrical item. For a light,
fan, AC unit, socket, appliance or another electrical item, choose that type
and enter the actual connected watts. The app cannot infer an electrical
rating from a mesh. Importing a mesh does not certify product dimensions or
its electrical specification.

Click **Import & place**, click a position in the room, then **Finish placing**.
Imported furniture appears in the furniture list. Its inspector provides
room, mounting surface, offsets, width and rotation; **Drag fixtures** moves
imported hardware on its mounting surface. Duplicate creates another instance
sharing the same local model file. Rename the point to update its BOM name.

GLB is the simplest format for keeping geometry and materials together.
STL and OBJ import geometry; OBJ material-library files are not applied.
Models use a static pose. Draco/meshopt-compressed geometry, compressed texture
extensions and some FBX material features may need export to a simpler GLB.
Limit each model with its resources to 30 MB and 1.5 million vertices.
No remote resource URLs are fetched from imported files; missing referenced
resources must be supplied locally.

The loaders are the official Three.js r180 modules, bundled locally with their
license. No runtime CDN, model hosting service or upload endpoint is used.

## Saving and portable backups

Positions, rotations, furniture layouts, equipment settings and compound
dimensions automatically save in this browser when an edit is committed or
a drag is released. Model files are also stored locally in the browser.
Watch the save-status text: unavailable or full storage requires an export.

**Export project** includes the design and the original imported model files.
**Import** restores both. Model bundles are limited to 120 MB before encoding;
project imports accept up to 180 MB. Clearing browser/site data can remove
saved work, so keep exported backups. Localhost, GitHub Pages, other browsers
and other devices have separate storage; they do not sync automatically.

## Live load, drawings and BOM

The persistent load strip updates after every edit. It shows total connected
load, inverter-selected load and loads physically placed on each floor.
These are sums of entered ratings before diversity. PoE loads are counted
once; circuit routing assigns their supply through the selected network rack.
The connected total includes loads whose DB route is missing, while incomplete
routes are flagged and excluded from wire/conduit estimates.

Electrical equipment types drive the existing routing, switch-link, circuit
and drawing calculations. Furniture/decor contributes an item to the BOM
and does not generate an electrical circuit. Built-in furniture entries list
their current room, centre position, dimensions and orientation.

Downloaded drawings, CSVs and engineer packs are snapshots. Download them
again after changes. Cable sizes, protection, control terminals, conduit fill,
earthing and installation suitability still require the engineering review
described in VISUAL_EDITOR.md.

## Compound wall and gate

Expand **Compound wall & sliding gate**. Set wall height/colour, side and front
setbacks, gate width and sliding side; **View compound** opens a full-ground-floor
overview. Defaults retain the owner's 2 m wall, 1 m side setbacks and 5 m front
setback. The 3.6 m gate remains provisional.

Three boundary sides are shown; the rear boundary has not been measured.
The BOM lists net wall length, finish area on two faces and gate face area.
These are concept allowances, excluding foundations, piers, coping and waste.
Gate runback and actual plot dimensions need site verification. Changing the
wall does not move previously placed outdoor service points.

## Verification

Run `node verify-studio.mjs`, `node verify-electrical-overview.mjs` and
`node verify-layout-tools.mjs`. The layout test reads generated cube fixtures
under `test-fixtures`. These are generated generic cubes, not user models.
Browser checks covered real file-chooser GLB/glTF imports, local
reload, model-file backup and restoration, exact wattage changes, furniture
dragging and rotation, Undo, and compound-wall BOM updates.
