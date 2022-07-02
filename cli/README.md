# Ivy Cli Scripts
> Scripts for generating common application modules.

## Create resource

```shell
create-resource.js [type] [name]

create new resource files

Positionals:
  type  the type of database library used in project
                                       [string] [choices: "typeorm", "mongoose"]
  name  the name of new resource in singular e.g. blog-post             [string]

Options:
      --help        Show help                                          [boolean]
      --version     Show version number                                [boolean]
  -d, --outDir      output directory for generated resource files
                                           [string] [default: "./src/resources"]
  -m, --moduleFile  main module file where to add new resource as import
                                       [string] [default: "./src/app.module.ts"]
  -n, --noEndpoint  do not generate REST controller and/or GraphQL resolver
                    classes                           [boolean] [default: false]
  -r, --rest        generate only REST types, models, and a controller class
                                                                       [boolean]
  -g, --graphql     generate only GraphQL types, models, and a resolver class
                                                                       [boolean]
  -o, --overwrite   overwrite existing resource files [boolean] [default: false]
```
