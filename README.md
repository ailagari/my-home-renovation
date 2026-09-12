# My home renovation

Interactive house review with existing/proposed 3D views, room dimensions,
electrical equipment placement, ceiling and wall views, material choices,
and estimated circuit, conductor and conduit quantities.

The visual editor now displays sample hardware, supports placement on walls,
ceilings and floors, and lets you drag fixtures or enter exact offsets. Place
lights, fans, AC, 13A/16A sockets and appliances, RJ45 outlets, network racks,
single-phase/three-phase DBs and switches from the equipment library.

Power routes follow each floor's selected DB; data routes follow the selected
network rack. Assign compatible loads to switches, including multiple control
locations. Drawings, schedules and material estimates update with the design.
Download SVG drawings, CSV schedules or the printable HTML engineer pack.
See [VISUAL_EDITOR.md](VISUAL_EDITOR.md) for placement and export instructions.

View all ground-floor, first-floor or whole-house electrical points together.
Use **Move furniture** to drag built-in furniture, enter exact positions, rotate
items or transfer them between rooms. Import named GLB/glTF, FBX, STL and OBJ
models as furniture or electrical equipment, with editable size and orientation.

The live load strip shows total connected watts, inverter-selected watts and
floor totals. Compound-wall height, setbacks and sliding-gate settings update
the model and material allowances. Furniture, model placement and equipment
changes save in this browser; project exports include imported model files.
See [LAYOUT_AND_MODELS.md](LAYOUT_AND_MODELS.md) for controls and format limits.

Place equipment on exterior house walls and both faces of compound walls.
Use **06 · Inverter & switches** to choose emergency equipment and assign
compatible loads to switches through searchable checklists. **07 · Projects &
house model** saves separate projects and imports whole-house models with
editable floor levels and placement on actual mesh faces. Model details such
as lintels remain visible when they exist in the supplied file. Two electrical
floors are supported. See [OUTDOOR_PROJECTS.md](OUTDOOR_PROJECTS.md) for the
workflow, portable backups and model limits.

Open the [live design studio](https://ailagari.github.io/my-home-renovation/studio.html).

Open `index.html` through a web server for the review, or `studio.html` for
the editable design studio. GitHub Pages serves this repository from
`main` at the repository root. `.nojekyll` keeps the static files unchanged.

All runtime libraries and app assets are included. No application backend
is required. Edits are saved in the current browser, separately for each
site address. Export project JSON from your old address and import it
here to transfer your saved design. BOM estimates can be exported as CSV.

Existing saved designs migrate when the editor opens, retaining a browser-local
backup. Previous implicit switch associations need explicit assignment. Export
project JSON to keep a portable backup of your work.

## Design limits

This is a concept and coordination tool, not a construction-approved BIM
model or an electrical installation design. Wall geometry and routes are
approximate. The confirmed room labels and 3 m floor height inform the
model, but openings, clear heights and structural clashes need site checks.
Circuit protection, conductor sizing, voltage drop, conduit fill, earthing,
inverter capacity and plumbing pipe design need professional verification.
Switch links specify control intent, not terminal connections. Control-wire
quantities remain excluded until a conductor allowance is assigned. Missing
sources and incompatible supply arrangements are flagged in the outputs.

## Verification

Run `node verify-studio.mjs`, `node verify-electrical-overview.mjs`,
`node verify-layout-tools.mjs` and `node verify-outdoor-projects.mjs`
to check source routing, phase assignment,
network runs, switch links, estimates, migration, generated schedules,
floor-overview coverage, furniture transforms, compound quantities and model
parsing, exterior mounting, emergency control groups, custom floor levels and
independent project storage. Generated cube models for these checks are
included in `test-fixtures`.

## Maintenance

Keep future work local unless publication is explicitly requested. Publish
only through GitHub Pages. Pushes to main update this public website, so
ordinary local edits must not be pushed automatically. Never upload chat
transcripts, local server logs, credentials, or unrelated project files.

Three.js, OrbitControls and the model loaders are bundled locally; see
`vendor/THREE-LICENSE.txt` and `vendor/MODEL-LOADERS.md` for licenses and provenance.
