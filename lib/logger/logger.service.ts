import { Inject, Injectable, LoggerService as NestLoggerService, Logger } from '@nestjs/common';
import { LogLevel } from '@nestjs/common/services/logger.service';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerModuleOptions } from './logger.module';
import { LOGGER_MODULE_OPTIONS } from './logger.constants';

@Injectable()
export class LoggerService implements NestLoggerService {
  private static logger: winston.Logger;

  constructor(
    @Inject(LOGGER_MODULE_OPTIONS) private loggerModuleOptions: LoggerModuleOptions,
    private configService: ConfigService
  ) {
    if (LoggerService.logger !== undefined) {
      return;
    }

    const logLevel = loggerModuleOptions.level || configService.get('log.level') || 'info';

    if (!Logger['logLevels']) {
      Logger['logLevels'] = [];
      for (const level of ['error', 'warn', 'log', 'info', 'verbose', 'debug']) {
        Logger['logLevels'].push(level as LogLevel);
        if (level === logLevel.toLowerCase()) {
          break;
        }
      }
      Logger['isLevelEnabled'] = (level: LogLevel & 'info') => {
        return Logger['logLevels']?.includes(level);
      };
    }

    const logPath = loggerModuleOptions.path || configService.get('log.path');
    const appName = loggerModuleOptions.appName || configService.get('app.name');
    const rotate = loggerModuleOptions.rotate || configService.get('log.rotate');

    const logFileName = appName.replace(' ', '-').toLowerCase() + '.log';

    let fileTransport;
    if (logPath && rotate && rotate.enabled) {
      fileTransport = new DailyRotateFile({
        filename: logFileName.replace('.log', '_%DATE%.log'),
        dirname: logPath,
        datePattern: rotate.pattern,
        maxSize: rotate.maxSize,
        maxFiles: rotate.maxFiles,
        zippedArchive: rotate.zipArchive,
        silent: logLevel === 'silent'
      });
    } else if (logPath) {
      fileTransport = new winston.transports.File({
        filename: logFileName,
        dirname: logPath,
        silent: logLevel === 'silent'
      });
    }

    let colorize =
      loggerModuleOptions.colorize === undefined
        ? configService.get('log.colorize')
        : loggerModuleOptions.colorize;
    colorize = colorize === undefined ? true : configService.get('log.colorize');

    LoggerService.logger = winston.createLogger({
      level: logLevel,
      silent: logLevel === 'silent',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: appName, label: 'default' },
      exitOnError: false,
      handleExceptions: true,
      transports: [
        // File logger
        ...(logPath ? [fileTransport] : []),

        // Console logger
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format((info) => {
              info.level = info.level.toUpperCase();
              return info;
            })(),
            ...(colorize
              ? [
                  winston.format.colorize({
                    all: true
                  })
                ]
              : []),
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.printf((info) =>
              colorize
                ? `\x1b[36m[${info.service}]\x1b[0m ${info.timestamp}  ${info.level} \x1b[33m[${info.label}]\x1b[0m ${info.message}`
                : `[${info.service}] ${info.timestamp}  ${info.level} [${info.label}] ${info.message}`
            )
          ),
          silent: logLevel === 'silent'
        })
      ]
    });
  }

  verbose(message: any, ...optionalParams: any[]): any {
    LoggerService.logger.verbose(message, ...this.prepareParams(optionalParams));
  }

  debug(message: any, ...optionalParams: any[]): any {
    LoggerService.logger.debug(message, ...this.prepareParams(optionalParams));
  }

  info(message: any, ...optionalParams: any[]): any {
    LoggerService.logger.info(message, ...this.prepareParams(optionalParams));
  }

  log(message: any, ...optionalParams: any[]): any {
    LoggerService.logger.info(message, ...this.prepareParams(optionalParams));
  }

  warn(message: any, ...optionalParams: any[]): any {
    LoggerService.logger.warn(message, ...this.prepareParams(optionalParams));
  }

  error(message: any, ...optionalParams: any[]): any {
    LoggerService.logger.error(message, ...this.prepareParams(optionalParams));
  }

  private prepareParams(optionalParams: any[]): any {
    let label = 'default';
    if (optionalParams.length > 0) {
      const idx = optionalParams.length - 1;
      label = optionalParams[idx];
      optionalParams.splice(idx, 1);
    }
    return [...optionalParams, { label }];
  }
}
