// The allowPackages escape hatch.
//
// Its own module, deliberately, and it must stay free of imports.
//
// This lived in signals.js, which loads denylist.json and the top 5000 package
// names. Importing one four line function from there dragged 110KB of package
// names into the post-write bundle, where nothing needs them. Anything that
// only needs to answer "did the project allow this one" imports from here.

/** True when the config explicitly permits this package, or this exact version. */
export function allows(allowPackages, name, version) {
  if (!Array.isArray(allowPackages)) return false;
  return allowPackages.some(
    (entry) => entry === name || (version != null && entry === `${name}@${version}`),
  );
}
