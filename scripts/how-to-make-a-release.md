The process is currently *insane*. This is because in the 11th hour I ran into a number of ridiculous issues with electron-builder.

## Check the deps installation

Run npm install. Make sure ./app/bg/dat/converter has its node_modules installed.

## Build

`npm run build`

## Apply the following patches manually to the scripts/node_modules

`app-builder-lib/out/util/AppFileWalker.js` this one stops electron-bunder from removing ./app/bg/dat/converter/node_modules

```
if (!nodeModulesFilter(file, fileStat)) {
  if (!file.includes('dat')) {
    return false;
  }
}

if (file.endsWith(nodeModulesSystemDependentSuffix)) {
  if (!file.includes('dat')) {
    return false;
  }
}
```

## Bundle

`npm run release`

On MacOS you'll need to supply two env vars:

```
appleId=pfrazee@gmail.com
appleIdPassword={be paul to have this}
```

## It's just that easy

Boy how about that.