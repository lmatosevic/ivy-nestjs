import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppUtil } from 'ivy-nestjs/utils';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const { port, host, address } = await AppUtil.initialize(app);
  await app.listen(port, host);
  logger.log(`Listening on: ${address}`);
}

bootstrap().catch((err) => {
  logger.error(err);
  process.exit(1);
});
