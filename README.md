# Ivy NestJS

![npm](https://img.shields.io/npm/v/ivy-nestjs)
![NPM License](https://img.shields.io/npm/l/ivy-nestjs)
![npm](https://img.shields.io/npm/dw/ivy-nestjs)
![npm](https://img.shields.io/badge/build-passing-brightgreen)
![npm](https://img.shields.io/badge/coverage-0%25-red)

> A library of useful building components for NestJS web application.

**! In active development. !**

**Backward compatibility is not guaranteed until v1.0.0**

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

### Cache

Caching HTTP interceptor and cache management functionality.

### Config

Application global configuration values.

### Context

Application request perisistence.

### Enums

Enumerable values used accross other modules.

### Filters

Exception handling logic.

### GraphQL

Bootstraping functionality for GraphQL usage.

### Health

Health monitoring functionality and endpoints.

### Logger

Application logging implementation.

### Mail

Send emails using SMTP or other 3rd party APIs.

### Mongoose

Bootstraping logic for Mongoose library usage with MongoDB.

### Queue

The queue connection for asynchronous task processing and job execution, also used by Mail module.

### Redis

Access and management functionality for the Redis storage, also used in Queue, Mail and Cache modules.

### Resource

The main logic for resource management, model definition, and endpoints creation.

### Storage

File persistence and access endpoints through various adapter implementations.

### Template

The template compilation using multiple templating adapters, also used by Mail module.

### Typeorm

Bootstraping logic for Typeorm library usage any SQL relational database.

### Utils

Common utility functions and classes used accross other modules.

## Environment variables

| Variable name | Description                                   | Default value |
|---------------|-----------------------------------------------|---------------|
| NODE_ENV      | Environment (development, test or production) | production    |

## Command-line interface

### Create resource

Script for creating new resource modules with all of it's required files. There are two types of generated resource
based on database library used in project:

- **typeorm** - generates models using TypeORM entity
- **mongoose** - generates models using Mongoose schema

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
  -u, --uuid        use UUID v4 as a primary key (typeorm resource only)
                                                      [boolean] [default: false]
  -o, --overwrite   overwrite existing resource files [boolean] [default: false]
```

## Documentation

Swagger documentation is available on: **http://{APP_HOST}:{APP_PORT}/swagger** (if enabled)

GraphQL documentation is available on: **http://{APP_HOST}:{APP_PORT}/graphql** (if enabled)

## License

Ivy-NestJS is [MIT licensed](LICENSE).
