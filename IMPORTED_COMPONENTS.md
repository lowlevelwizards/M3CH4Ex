# Construction lab dependency manifest

This independent project was bootstrapped from the M3CH4 \`experiment/universal-construction\` branch.

It copies only the local ES modules transitively imported from \`constructionLab.js\`, \`constructionLabCore.js\`, and the matching lab test file, plus the page and stylesheet. Some visual kits import more than one renderer at module load time, so their dependencies are intentionally included even when no specific model is currently displayed.

## Imported source files

- \`arcCutterVisual.js\`
- \`assemblyGraph.js\`
- \`breakerDriverVisual.js\`
- \`bruiserFrameVisual.js\`
- \`chassisConceptBuilder.js\`
- \`chassisFitFixtures.js\`
- \`chassisFitVisuals.js\`
- \`commandVisualKit.js\`
- \`components.js\`
- \`constructionLab.js\`
- \`constructionLabCore.js\`
- \`cyclopsVisual.js\`
- \`equipment.js\`
- \`factoryPaint.js\`
- \`forgePowerVisual.js\`
- \`frameVisualKit.js\`
- \`haulerVisual.js\`
- \`hearthVisual.js\`
- \`kestrelVisual.js\`
- \`mobilityDefinitions.js\`
- \`mobilityVisualKit.js\`
- \`needleCannonVisual.js\`
- \`partFinish.js\`
- \`partMaterialPalette.js\`
- \`partVisuals.js\`
- \`reloadMechanism.js\`
- \`rivetRepeaterVisual.js\`
- \`scattergunVisual.js\`
- \`scrapRocketVisual.js\`
- \`skeletonFrameVisual.js\`
- \`stumpCannonVisual.js\`
- \`tests/constructionLab.test.mjs\`
- \`trainingCannonVisual.js\`
- \`vistaVisual.js\`
- \`weaponVisualKit.js\`
- \`wedgeFrameVisual.js\`
- \`yardwalkerVisual.js\`
