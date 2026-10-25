# M3CH4Ex — Universal Construction Laboratory

Independent, experimental modular-mech construction workspace. The original M3CH4 game and its saves are unaffected.

## Open on your phone

After enabling GitHub Pages for this repository (**Settings → Pages → Build and deployment → Deploy from a branch → main → /(root)**), open:

https://lowlevelwizards.github.io/M3CH4Ex/

The root `index.html` is the white construction studio; it is not the combat game.

## Current experimental scope

- White sterile 3D workspace with orbit, pinch-zoom, two-finger pan and camera presets
- Existing M3CH4 catalogue modules and production-authored visuals where available
- A few explicitly labeled envelope proxies for unmigrated individual part visuals
- Existing five-station assembly swaps, graph-based structural inspection, visible sockets, H2/U1 adapter and generator outrigger
- **Stage 06**: independently owned left/right Yardwalker legs with real authored hip connections
- **Stage 07**: six serviceable sections per leg (hip, thigh, knee, shin, ankle, foot); the original mesh is split without changing the assembled silhouette
- **Stage 07**: swap the original shin for the Rook S2 narrow-spar shin on either side, retaining the existing ankle and foot
- **Stage 07**: dependency-aware detachment (remove a shin with its supported ankle and foot, or disassemble the supported components first), persistent detached assemblies, and validated v3 blueprint export/import
- Isolate / explode previews, JSON blueprint export and import
- Assembly and blueprint unit tests

**Not implemented yet:** cross-family leg mixing, arbitrary attachment placement, new multi-axial joint solvers, dynamic locomotion for mixed components, individual paint, damage propagation, new full manufacturers, combat, or full physics. The existing Kestrel and Hauler remain indivisible mobility packages; Yardwalker is the serviceability test case. The original paired Kestrel and Hauler assemblies remain intact.

## Why some source files are here

`IMPORTED_COMPONENTS.md` lists the **minimal transitive ES-module dependency set** needed by the experimental construction page. Visual builders share small geometry and material utilities, so some imported helpers are not called directly by `constructionLab.js`.

The one-time `.github/workflows/bootstrap-lab.yml` workflow imported these files from the public M3CH4 branch `experiment/universal-construction`; this repo is now independently editable. It will not continually overwrite your edits unless explicitly invoked again. The permanent `lab-checks.yml` workflow runs JavaScript syntax checks and `npm test` on updates.

## Development

Use a local HTTP server to preview ES modules, or GitHub Pages. There is no bundler or package installation needed to run the studio: Three.js is loaded from the pinned CDN import map. The Node test suite runs with `npm test`.

## Stage 07 — try it

1. Open the lab and choose **MOBILITY**. The Stage 07 workbench exposes both legs and the one-click **Rook S2** shin swap.
2. Open **ASSEMBLY** and tap a named shin node (or tap its mesh in the 3D scene). In **INSPECT**, replace the shin or detach it **with supported assemblies**.
3. The detached original shin (and, where appropriate, its ankle and foot) remains in **OWNED / PARKED ASSEMBLIES**. Reinstall it later using its original serial.
4. Use **EXPORT JSON** and **IMPORT JSON** to verify asymmetrical configurations. Version 1 and 2 lab blueprints are still supported; new exports use version 3.

**Scope:** Stage 07 is a static assembly/geometry proof, not a mechanical gait solver. The alternate shin uses the same authored knee and ankle locations, and its 20 kg mass reduction is represented in the lab's derived assembly mass.
