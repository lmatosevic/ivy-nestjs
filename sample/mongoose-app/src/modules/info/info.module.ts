import { Module } from '@nestjs/common';
import { InfoController } from './info.controller';
import { InfoResolver } from './info.resolver';

@Module({
  imports: [],
  providers: [InfoResolver],
  controllers: [InfoController]
})
export class InfoModule {}
