import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlan1655647166419 implements MigrationInterface {
    name = 'AddPlan1655647166419'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plan" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_54a2b686aed3b637654bf7ddbb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "project" ADD "planId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "UQ_0e4667e99e3d673ae542835708d" UNIQUE ("planId")`);
        await queryRunner.query(`ALTER TABLE "application" DROP CONSTRAINT "FK_e69389177ac594d36dea539f276"`);
        await queryRunner.query(`ALTER TABLE "application" ALTER COLUMN "projectId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_9884b2ee80eb70b7db4f12e8aed"`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "ownerId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "application" ADD CONSTRAINT "FK_e69389177ac594d36dea539f276" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_9884b2ee80eb70b7db4f12e8aed" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_0e4667e99e3d673ae542835708d" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_0e4667e99e3d673ae542835708d"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_9884b2ee80eb70b7db4f12e8aed"`);
        await queryRunner.query(`ALTER TABLE "application" DROP CONSTRAINT "FK_e69389177ac594d36dea539f276"`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "ownerId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_9884b2ee80eb70b7db4f12e8aed" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "application" ALTER COLUMN "projectId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "application" ADD CONSTRAINT "FK_e69389177ac594d36dea539f276" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "UQ_0e4667e99e3d673ae542835708d"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "planId"`);
        await queryRunner.query(`DROP TABLE "plan"`);
    }

}
