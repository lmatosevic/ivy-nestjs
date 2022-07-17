# Mongoose ivy-nestjs

> Sample mongoose API using ivy-nestjs.

## Requirements

Project requirements:

* Node >= 14.2.0
* NPM >= 6.0.0
* MongoDB >= 5.0.0
* Redis >= 6.0.0

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

Swagger documentation is available on: `http://{APP_HOST}:{APP_PORT}/api-docs`

GraphQL playground is available on: `http://{APP_HOST}:{APP_PORT}/graphql`

## Docker

Start backend application and MongoDB database docker images: `docker-compose up -d`, or if you don't need database
then run `docker-compose up -d backend`.

Manually build docker image: `docker image build --rm -t ivy-mongoose-backend -f Dockerfile ../../`
