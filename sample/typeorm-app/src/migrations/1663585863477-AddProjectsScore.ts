import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectsScore1663585863477 implements MigrationInterface {
    name = 'AddProjectsScore1663585863477'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" ADD "score" integer NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "score"`);
    }

}
