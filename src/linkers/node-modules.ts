import { Project, Package, structUtils } from '@yarnpkg/core'
import { parseSyml } from '@yarnpkg/parsers'
import { xfs, ppath, PortablePath, Filename } from '@yarnpkg/fslib'

/**
 * Get package path with `node-modules` linker for a given Yarn project and package
 *
 * @param {Project} project - Yarn project
 * @param {Package} pkg - Yarn package
 * @returns {Promise<PortablePath | null>} Package path
 */
export const getPackagePath = async (project: Project, pkg: Package): Promise<PortablePath | null> => {
  await makeYarnState(project)

  const locator = structUtils.convertPackageToLocator(pkg)
  let entry = yarnState[structUtils.stringifyLocator(locator)]
  if (!entry) {
    console.log('getPackagePath entry lookup failed...');
    console.log('looking for:', structUtils.stringifyLocator(locator));
    const nameWithScope = locator.scope ? `@${locator.scope}/${locator.name}`: locator.name;
    const version = locator.reference.slice(locator.reference.lastIndexOf(':'));
    const keysInState = Object.keys(yarnState).filter(key => key.startsWith(nameWithScope) && key.endsWith(version));
    console.log('found these in the yarnState:', keysInState);
    const key = Object.keys(yarnState).find(key => key.startsWith(nameWithScope) && key.endsWith(version));
    console.log('using this one instead:', key);
    if (!key) {
      console.log('nothing found');
      return null;
    }
    entry = yarnState[key];
  }

  const location = entry.locations[0]
  return location ? ppath.join(project.cwd, location) : project.cwd
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let yarnState: any

/**
 * Cache Yarn state from `yarn-state.yml`, if it has not already been cached
 *
 * @param {Project} project - Yarn project
 * @returns {Promise<void>}
 */
const makeYarnState = async (project: Project): Promise<void> => {
  if (!yarnState) {
    const portablePath = ppath.join(
      project.configuration.projectCwd as PortablePath,
      Filename.nodeModules,
      '.yarn-state.yml' as Filename
    )
    yarnState = parseSyml(await xfs.readFilePromise(portablePath, 'utf8'))
  }
}

/**
 * Expose the virtual file system for reading package files
 */
export const fs = xfs
