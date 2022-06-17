# Ivy Cli Scripts
> Scripts for generating common application modules.

## Create resource
Script for creating new resource modules with all of it's required files.

```shell
create-resource.js [type] [name]

create new resource files

Positionals:
  type  the type of database library used in project
                                       [string] [choices: "typeorm", "mongoose"]
  name  the name of new resource in singular e.g. article               [string]

Options:
      --help            Show help                                      [boolean]
      --version         Show version number                            [boolean]
  -d, --outDir          output directory for generated resource files
                                           [string] [default: "./src/resources"]
  -m, --moduleFile      main module file where to add new resource as import
                                       [string] [default: "./src/app.module.ts"]
      --disableRest     disable REST API              [boolean] [default: false]
      --disableGraphql  disable GraphQL endpoint      [boolean] [default: false]
  -o, --overwrite       overwrite existing resource files
                                                      [boolean] [default: false]
```
