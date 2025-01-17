/**
 * Load redis lua scripts.
 * The name of the script must have the following format:
 *
 * cmdName-numKeys.lua
 *
 * cmdName must be in camel case format.
 *
 * For example:
 * moveToFinish-3.lua
 *
 */
'use strict';

const fsAsync = require('fs').promises;
const path = require('path');

const utils = require('../utils');

module.exports = (function() {
  let scripts;

  return async function(client) {
    await utils.isRedisReady(client);
    scripts = await (scripts || loadScripts(__dirname));

    return scripts.map(({ name, options }) =>
      client.defineCommand(name, options)
    );
  };
})();

async function loadScripts(dir) {
  const scriptsDir = await fsAsync.readdir(dir);
  const luaFiles = scriptsDir.filter(file => path.extname(file) === '.lua');
  if (luaFiles.length === 0) {
    /**
     * To prevent unclarified runtime error "updateDelayset is not a function
     * @see https://github.com/OptimalBits/bull/issues/920
     */
    throw new Error('No .lua files found!');
  }
  return Promise.all(
    luaFiles.map(async file => {
      const lua = await fsAsync.readFile(path.join(dir, file));
      const longName = path.basename(file, '.lua');

      return {
        name: longName.split('-')[0],
        options: {
          numberOfKeys: parseInt(longName.split('-')[1]),
          lua: lua.toString()
        }
      };
    })
  );
}
