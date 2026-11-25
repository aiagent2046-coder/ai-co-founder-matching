/** dependency-cruiser config for syndi-ai-web.
 * Level-1 architectural lint (deslop-please methodology: deep modules,
 * narrow interfaces). Rules: no import cycles, strict layering.
 *
 * Layers (top -> bottom):
 *   app        — Next.js routes/API (may use components + lib)
 *   components — UI (may use lib)
 *   lib        — foundation (may use neither)
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment:
        "deslop `module-cycle`: modules that use each other in a circle leave no order to read them in. Fix from first principles: which module belongs at which layer? Do not do mechanical moves just to hide the cycle.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "lib-is-foundation",
      comment:
        "lib is the bottom layer: it must not know about app or components.",
      severity: "error",
      from: { path: "^lib" },
      to: { path: "^(app|components)/" },
    },
    {
      name: "components-below-app",
      comment: "components serve the UI layer; they must not reach up into app.",
      severity: "error",
      from: { path: "^components" },
      to: { path: "^app/" },
    },
    {
      name: "no-unresolved",
      comment:
        "An unresolved import hides edges from this analysis (and from the build). Keep the alias map in sync with tsconfig paths.",
      severity: "warn",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "node_modules|__tests__|\\.test\\.|\\.spec\\.",
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
