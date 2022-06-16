# Typeorm ivy-nestjs

> Sample typeorm API using ivy-nestjs.

## Requirements

Project requirements:

* Node >= 14.0.0
* NPM >= 6.0.0
* PostgreSQL >= 10.21.0

## Development setup

Create _.env_ file in project root directory and add variables for database connection `DB_*` and jwt
authorization `AUTH_JWT_SECRET=...`. Examples are available in _.env.example_.

It is recommended to add default admin user with `AUTH_ADMIN_CREATE=true` and `AUTH_ADMIN_USERNAME=admin@ivy`.
If you don't specify `AUTH_ADMIN_PASSWORD` it will be generated on the first application run and logged into console.

Create a new database with name and credentials matching those specified in _.env_ file.

Start the server by running following commands in order:

```bash
# Install node packages
$ npm install

# Start development server
$ npm run start:dev
```

Database migrations will be performed automatically on application bootstrap.

Swager documentation link is displayed in console: `http://{APP_HOST}:{APP_PORT}/api-docs`

## Docker

