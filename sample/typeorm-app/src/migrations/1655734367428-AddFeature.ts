import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeature1655734367428 implements MigrationInterface {
    name = 'AddFeature1655734367428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "feature" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "planId" integer, CONSTRAINT "PK_03930932f909ca4be8e33d16a2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "feature" ADD CONSTRAINT "FK_c03677509c2d977cc22bf47f74e" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "feature" DROP CONSTRAINT "FK_c03677509c2d977cc22bf47f74e"`);
        await queryRunner.query(`DROP TABLE "feature"`);
    }

}
