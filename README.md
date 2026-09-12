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

Run `node verify-visual-electrical.mjs` to check source routing, phase assignment,
network runs, switch links, estimates, migration and generated schedules.

## Maintenance

Keep future work local unless publication is explicitly requested. Publish
only through GitHub Pages. Pushes to main update this public website, so
ordinary local edits must not be pushed automatically. Never upload chat
transcripts, local server logs, credentials, or unrelated project files.

Three.js and OrbitControls are bundled under their MIT license; see
`vendor/THREE-LICENSE.txt`.
