#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const pluralize = require('pluralize');
const yargs = require('yargs');
const helper = require('yargs/helpers');

yargs(helper.hideBin(process.argv))
  .command(
    '* [type] [name]',
    'create new resource files',
    (yargs) => {
      yargs
        .positional('type', {
          type: 'string',
          demandOption: true,
          describe: 'the type of database library used in project',
          choices: ['typeorm', 'mongoose']
        })
        .positional('name', {
          type: 'string',
          demandOption: true,
          describe: 'the name of new resource in singular e.g. blog-post'
        });
    },
    (argv) => {
      if (!argv.type) {
        console.log('Type is required. For usage info run with --help argument');
        process.exit(1);
      }
      if (!argv.name) {
        console.log('Name is required. For usage info run with --help argument');
        process.exit(1);
      }
      createResource(
        argv.name,
        argv.type,
        argv.outDir,
        argv.moduleFile,
        argv.noEndpoint,
        argv.rest,
        argv.graphql,
        argv.uuid,
        argv.overwrite
      );
    }
  )
  .option('outDir', {
    describe: 'output directory for generated resource files',
    alias: 'd',
    default: './src/resources',
    type: 'string'
  })
  .option('moduleFile', {
    describe: 'main module file where to add new resource as import',
    alias: 'm',
    default: './src/app.module.ts',
    type: 'string'
  })
  .option('noEndpoint', {
    describe: 'do not generate REST controller and/or GraphQL resolver classes',
    alias: 'n',
    default: false,
    type: 'boolean'
  })
  .option('rest', {
    describe: 'generate only REST types, models, and a controller class',
    alias: 'r',
    default: undefined,
    type: 'boolean'
  })
  .option('graphql', {
    describe: 'generate only GraphQL types, models, and a resolver class',
    alias: 'g',
    default: undefined,
    type: 'boolean'
  })
  .option('uuid', {
    describe: 'use UUID v4 as a primary key (typeorm resource only)',
    alias: 'u',
    default: false,
    type: 'boolean'
  })
  .option('overwrite', {
    describe: 'overwrite existing resource files',
    alias: 'o',
    default: false,
    type: 'boolean'
  })
  .showHelpOnFail(true)
  .demandCommand(2)
  .parse();

function createResource(name, type, outDir, moduleFile, noEndpoint, rest, graphql, uuid, overwrite) {
  let modelName = name.replace(/-[a-z]/g, (match) => match.replace('-', '').toUpperCase());
  modelName = `${modelName.charAt(0).toUpperCase()}${modelName.substring(1)}`;
  const namePlural = pluralize(name);
  const modelNamePlural = pluralize(modelName);
  const variables = {
    resourceName: `${modelName.charAt(0).toLowerCase()}${modelName.substring(1)}`,
    resourceFileName: name.toLowerCase(),
    resourceFileNamePlural: namePlural.toLowerCase(),
    resourceNamePlural: modelNamePlural,
    resourceModelName: modelName,
    createDtoName: `Create${modelName}Dto`,
    updateDtoName: `Update${modelName}Dto`,
    persistDtoName: `Persist${modelName}Dto`,
    resourceSchemaName: `${modelName}Schema`,
    resourceAbilityName: `${modelName}Ability`,
    resourceServiceName: `${modelNamePlural}Service`,
    resourcePolicyName: `${modelNamePlural}Policy`,
    resourceControllerName: `${modelNamePlural}Controller`,
    resourceResolverName: `${modelNamePlural}Resolver`,
    resourceModuleName: `${modelNamePlural}Module`
  };

  const skipRest = !graphql && !rest ? false : !rest;
  const skipGraphql = !graphql && !rest ? false : !graphql;

  const templates = getAllFiles(`${__dirname}/templates/${type}/resources`);

  let count = 0;
  templates.forEach((template) => {
    let templateFileName = path.basename(template.path);
    let filePath = templateFileName
      .replace('resources', variables['resourceFileNamePlural'])
      .replace('resource', variables['resourceFileName'])
      .replace('.tpl', '');
    let dir = `${outDir}/${variables['resourceFileNamePlural']}/${template.dirTree}`;

    let outFilePath = `${dir}${filePath}`;

    if (fs.existsSync(outFilePath) && !overwrite) {
      console.warn("Resource file already exists. To rewrite it's content run with flag --overwrite");
      return;
    }

    if ((noEndpoint || skipRest) && templateFileName === 'resources.controller.ts.tpl') {
      console.log('SKIP REST controller file');
      return;
    }

    if ((noEndpoint || skipGraphql) && templateFileName === 'resources.resolver.ts.tpl') {
      console.log('SKIP GraphQL resolver file');
      return;
    }

    let templateContent = fs.readFileSync(template.path, 'utf-8');

    if ((noEndpoint || skipRest) && templateFileName === 'resources.module.ts.tpl') {
      templateContent = templateContent
        .replace(
          "import { {{resourceControllerName}} } from './{{resourceFileNamePlural}}.controller';" + os.EOL,
          ''
        )
        .replace('{{resourceControllerName}}', '');
    }

    if ((noEndpoint || skipGraphql) && templateFileName === 'resources.module.ts.tpl') {
      templateContent = templateContent
        .replace(
          "import { {{resourceResolverName}} } from './{{resourceFileNamePlural}}.resolver';" + os.EOL,
          ''
        )
        .replace(' {{resourceResolverName}},', '');
    }

    if (skipGraphql) {
      templateContent = templateContent
        .replace(/import {(.*)} from '@nestjs\/graphql';(\n|\r\n|\r)/g, '')
        .replace(/@ObjectType\((.*)\)(\n|\r\n|\r)/g, '')
        .replace(/@InputType\((.*)\)(\n|\r\n|\r)/g, '')
        .replace(/^(\s)*@Field\((.*)\)(\n|\r\n|\r)/gm, '')
        .replace(/^(\s)*@HideField\(\)(\n|\r\n|\r)/gm, '');
    }

    if (skipRest) {
      templateContent = templateContent
        .replace(/import {(.*)} from '@nestjs\/swagger';(\n|\r\n|\r)/g, '')
        .replace(/^(\s)*@ApiProperty\((.*)\)(\n|\r\n|\r)/gm, '')
        .replace(/^(\s)*@ApiHideProperty\(\)(\n|\r\n|\r)/gm, '');
    }

    if (uuid && type === 'typeorm') {
      if (templateFileName === 'resource.entity.ts.tpl') {
        templateContent = templateContent
          .replace('@PrimaryGeneratedColumn()', "@PrimaryGeneratedColumn('uuid')")
          .replace('id: number;', 'id: string;');
      } else if (templateFileName === 'persist-resource.dto.ts.tpl') {
        templateContent = templateContent.replace('readonly id?: number;', 'readonly id?: string;');
      }
    }

    Object.keys(variables).forEach((variable) => {
      let v = `{{${variable}}}`;
      templateContent = templateContent.replace(new RegExp(v, 'g'), variables[variable]);
    });

    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outFilePath, templateContent, { flag: 'w' });
    console.log('CREATE ' + outFilePath);
    count++;
  });

  if (!fs.existsSync(moduleFile)) {
    console.warn(
      `Module file ${moduleFile} does not exist.`,
      'Created resource is not imported in application!'
    );
    process.exit(0);
  }
  let moduleContent = fs.readFileSync(moduleFile, 'utf-8');
  let syncModule = false;

  // Add new resource module import from created resource module
  let matchesImport = moduleContent.matchAll(/((.|\r|\n)*?)@Module\({/g);
  let matchImport = matchesImport.next();
  if (!matchImport || matchImport.value.length < 2 || !matchImport.value[1]) {
    console.warn('Module file has invalid format');
    process.exit(0);
  }

  let importStatement = `import { ${variables['resourceModuleName']} } from '@resources/${variables['resourceFileNamePlural']}';`;
  if (!moduleContent.includes(importStatement)) {
    moduleContent = moduleContent.replace(
      matchImport.value[1],
      matchImport.value[1].trim() + os.EOL + importStatement + os.EOL + os.EOL
    );
    syncModule = true;
  }

  // Insert new resource module import in imports array
  let matchesModule = moduleContent.matchAll(/imports: \[((.|\r|\n)*)\s{2}]/g);
  let matchModule = matchesModule.next();
  if (!matchModule || matchModule.value.length < 2 || !matchModule.value[1]) {
    console.warn('Module file has invalid format');
    process.exit(0);
  }
  if (!matchModule.value[1].split(',').find((v) => v.trim() === variables['resourceModuleName'])) {
    moduleContent = moduleContent.replace(
      matchModule.value[1],
      os.EOL +
        '    ' +
        matchModule.value[1].trim() +
        (matchModule.value[1].trim().slice(-1) === ',' ? '' : ',') +
        os.EOL +
        '    ' +
        variables['resourceModuleName'] +
        os.EOL
    );
    syncModule = true;
  }

  if (syncModule) {
    fs.writeFileSync(moduleFile, moduleContent, { flag: 'w' });
    console.log('UPDATE ' + moduleFile);
  }
}

function getAllFiles(dirPath, arrayOfFiles = [], dirTree = '') {
  let files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles, dirTree + file + '/');
    } else {
      arrayOfFiles.push({
        path: path.join(dirPath, '/', file),
        dirTree: dirTree
      });
    }
  });

  return arrayOfFiles;
}
