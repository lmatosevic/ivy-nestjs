# Ivy Cli Scripts
> Scripts for generating common application resources and modules.

## Create resource
Script for creating new resource modules adding it to the imports of main app module.

```shell
create-resource.js [name] [type]

create new resource files

Positionals:
  name  the name of new resource in singular e.g. article               [string]
  type  the type of database library used
                                       [string] [choices: "typeorm", "mongoose"]

Options:
      --help            Show help                                      [boolean]
      --version         Show version number                            [boolean]
  -d, --outDir          output directory for generated resource files
                                           [string] [default: "./src/resources"]
  -m, --moduleFile      main module file where to add new resource as import
                                       [string] [default: "./src/app.module.ts"]
  -r, --disableRest     disable REST API              [boolean] [default: false]
  -g, --disableGraphql  disable GraphQL endpoint      [boolean] [default: false]
  -o, --overwrite       overwrite existing resource files
                                                      [boolean] [default: false]
```
