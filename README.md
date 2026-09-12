# My home renovation

Interactive house review with existing/proposed 3D views, room dimensions,
electrical equipment placement, ceiling and wall views, material choices,
and estimated circuit, conductor and conduit quantities.

Open `index.html` through a web server for the review, or `studio.html` for
the editable design studio. GitHub Pages serves this repository from
`main` at the repository root. `.nojekyll` keeps the static files unchanged.

All runtime libraries and app assets are included. No application backend
is required. Edits are saved in the current browser, separately for each
site address. Export project JSON from your old address and import it
here to transfer your saved design. BOM estimates can be exported as CSV.

## Design limits

This is a concept and coordination tool, not a construction-approved BIM
model or an electrical installation design. Wall geometry and routes are
approximate. The confirmed room labels and 3 m floor height inform the
model, but openings, clear heights and structural clashes need site checks.
Circuit protection, conductor sizing, voltage drop, conduit fill, earthing,
inverter capacity and plumbing pipe design need professional verification.

## Maintenance

Keep future work local unless publication is explicitly requested. Publish
only through GitHub Pages. Pushes to main update this public website, so
ordinary local edits must not be pushed automatically. Never upload chat
transcripts, local server logs, credentials, or unrelated project files.

Three.js and OrbitControls are bundled under their MIT license; see
`vendor/THREE-LICENSE.txt`.
