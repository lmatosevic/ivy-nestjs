# Ivy NestJS

![npm](https://img.shields.io/npm/v/ivy-nestjs)
![NPM License](https://img.shields.io/npm/l/ivy-nestjs)
![npm](https://img.shields.io/npm/dw/ivy-nestjs)
![npm](https://img.shields.io/badge/build-passing-brightgreen)
![npm](https://img.shields.io/badge/coverage-0%25-red)

> A library of useful building components for NestJS web application.

**! In active development !**

## Installation

```bash
$ npm install ivy-nestjs
```

## Usage

In _./sample_ directory of ivy-nestjs package you can find two examples of applications built using this library.

Import modules and classes to build your [NestJs](https://nestjs.com) TypeScript application.

```ts
import { ConfigModule } from 'ivy-nestjs/config';
```

## Modules

### Auth

User authentication and authorization logic.

### Config

Application global configuration values.

### Context

Application request perisistence.

### Enums

Enumerable values used accross other modules.

### Filters

Exception handling logic.

### GraphQL

Bootstraping logic for GraphQL usage.

### Health

Health monitoring logic and endpoints.

### Logger

Application logging implementation.

### Mongoose

Bootstraping logic for Mongoose library usage with MongoDB.

### Resource

The main logic for resource management, model definition, and endpoints creation.

### Storage

File persistence and access logic.

### Typeorm

Bootstraping logic for Typeorm library usage any SQL relational database.

### Utils

Common utility functions and classes used accross other modules.

## Command-line interface

### Create resource

Script for creating new resource modules with all of it's required files. There are two types of this command:

- **typeorm** - generates models using typeorm entity
- **mongoose** - generates models using mongoose schema

```shell
create-resource.js [type] [name]

create new resource files

Positionals:
  type  the type of database library used in project
                                       [string] [choices: "typeorm", "mongoose"]
  name  the name of new resource in singular e.g. e.g. blog-post        [string]

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

## License

Nest is [MIT licensed](LICENSE).
