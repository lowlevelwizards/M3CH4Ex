# M3CH4Ex — Universal Construction Laboratory

Independent, experimental modular-mech construction workspace. The original M3CH4 game and its saves are unaffected.

## Open on your phone

GitHub Pages publishes the experimental `main` branch independently from the live game. Open:

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
- **Stage 07**: dependency-aware detachment (remove a shin with its supported ankle and foot, or disassemble the supported components first), persistent detached assemblies
- **Stage 08**: inspectable hip/knee/ankle hinges with independent one-axis pose controls for each leg
- **Stage 08**: two-ended, telescoping knee hydraulics driven by actual thigh/shin anchors; both original and Rook S2 shins supported
- **Stage 08**: neutral, crouch, left/right step, and asymmetric poses; resettable two-knee motion sweep; stroke diagnostics and conservative clearance hints
- **Stage 08**: validated v4 JSON blueprint includes all six joint angles; v1–v3 imports migrate to neutral pose
- Isolate / explode previews, JSON blueprint export and import
- Assembly and blueprint unit tests

**Not implemented yet:** cross-family leg mixing, arbitrary attachment placement, multi-axial joint solvers, force/torque-driven walking, full collision sweep resolution, balance physics, individual paint, damage propagation, new full manufacturers, or combat. Kestrel and Hauler remain paired mobility packages. Stage 08 only drives controlled single-axis poses; it does not simulate actuator forces, true swept mesh interference, or walking.

## Why some source files are here

`IMPORTED_COMPONENTS.md` lists the **minimal transitive ES-module dependency set** needed by the experimental construction page. Visual builders share small geometry and material utilities, so some imported helpers are not called directly by `constructionLab.js`.

The one-time `.github/workflows/bootstrap-lab.yml` workflow imported these files from the public M3CH4 branch `experiment/universal-construction`; this repo is now independently editable. It will not continually overwrite your edits unless explicitly invoked again. The permanent `lab-checks.yml` workflow runs JavaScript syntax checks and `npm test` on updates.

## Development

Use a local HTTP server to preview ES modules, or GitHub Pages. There is no bundler or package installation needed to run the studio: Three.js is loaded from the pinned CDN import map. The Node test suite runs with `npm test`.

## Stage 07 — try it

1. Open the lab and choose **MOBILITY**. The Stage 07 workbench exposes both legs and the one-click **Rook S2** shin swap.
2. Open **ASSEMBLY** and tap a named shin node (or tap its mesh in the 3D scene). In **INSPECT**, replace the shin or detach it **with supported assemblies**.
3. The detached original shin (and, where appropriate, its ankle and foot) remains in **OWNED / PARKED ASSEMBLIES**. Reinstall it later using its original serial.
4. Use **EXPORT JSON** and **IMPORT JSON** to verify asymmetrical configurations. Version 1–3 blueprints remain importable; new exports use version 4.

**Scope:** Stage 07 is a static assembly/geometry proof, not a mechanical gait solver. The alternate shin uses the same authored knee and ankle locations, and its 20 kg mass reduction is represented in the lab's derived assembly mass.

## Stage 08 — Try the mechanical joint laboratory

1. Open the lab and select **POSE**. Use six independent sliders to bend the left and right hips, knees, and ankles. Each slider shows its authored degree limits.
2. Try **CROUCH**, **STEP L**, **STEP R**, and **ASYMMETRIC**; **NEUTRAL** resets all hinges.
3. Select **TEST BOTH KNEES THROUGH STROKE** to observe the two cylinders following their moving anchors through a motion sweep. The pose is restored when the test ends.
4. Select an actual **hip**, **knee**, or **ankle** in **ASSEMBLY**, then open **INSPECT** to move the corresponding bearing.
5. Change the left shin to **Rook S2** in **MOBILITY**, and repeat the knee sweep. It should still articulate using the same physical interfaces.
6. Export a v4 blueprint while crouched, reset, then import: the pose and shin configuration should return.

**Important:** This is controlled, one-axis kinematics with physical joint pivots and a visually telescoping hydraulic. The clearance indicator is a coarse AABB warning, not an exact per-triangle or full swept-volume collision detector. Joint articulation does not yet drive locomotion, load, torque, or balance. 
