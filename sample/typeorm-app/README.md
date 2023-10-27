# Typeorm ivy-nestjs

> Sample typeorm API using ivy-nestjs.

## Requirements

Project requirements:

* Node >= 16.0.0
* NPM >= 6.0.0
* PostgreSQL >= 10.21.0
* Redis >= 3.0.0

## Development setup

Create _.env_ file in project root directory and add variables for database connection `DB_*`, jwt
authorization `AUTH_JWT_SECRET=...` and other used features. Example values are available in _.env.example_.

It is recommended to add default admin user with `AUTH_ADMIN_CREATE=true`. If you don't specify `AUTH_ADMIN_PASSWORD`
it will be generated on the first application run and logged into console.

Create a new database with name and credentials matching those specified in _.env_ file.

Start the server by running following commands in order:

```bash
# Install node packages (also in the root of this project)
$ npm install

# Start development server
$ npm run start:dev
```

Database migrations will be performed automatically on application bootstrap.

Swagger documentation is available on: `http://{APP_HOST}:{APP_PORT}/api-docs`

GraphQL playground is available on: `http://{APP_HOST}:{APP_PORT}/graphql`

## Database management

Before running any of the following commands, make sure you have provided database credentials in _.env_ file.

All migration files are stored in directory: _./src/migrations/_.

Generate new migration from entity changes:

```
npm run migration:generate src/migrations/NewMigrationName
```

Manually run the migrations:

```
npm run migration:run
```

Create new migration and write it manually:

```
npm run migration:create src/migrations/NewMigrationName
```

Revert last executed migration:

```
npm run migration:revert
```

## Docker

Start backend application and PostgresSQL database docker images: `docker-compose up -d`, or if you don't need database
then run `docker-compose up -d backend`.

Manually build docker image: `docker image build --rm -t ivy-typeorm-backend -f Dockerfile ../../`
