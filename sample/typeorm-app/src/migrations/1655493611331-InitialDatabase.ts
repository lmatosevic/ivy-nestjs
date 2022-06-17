import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialDatabase1655493611331 implements MigrationInterface {
    name = 'InitialDatabase1655493611331'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "_file_meta" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "resource" character varying NOT NULL, "resourceId" integer, "field" character varying NOT NULL, "mimeType" character varying NOT NULL, "size" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f09d360075a3f0a8eba5129231f" UNIQUE ("name"), CONSTRAINT "PK_d6b2b81c1c537d95a12cd6f8cd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "_file" ("data" character varying NOT NULL, "originalName" character varying, "title" character varying, "description" character varying, "metaId" integer, CONSTRAINT "REL_8ac1a4c5f9adca9d81675af915" UNIQUE ("metaId"), CONSTRAINT "PK_4ee511b5972a9bbe9571900f351" PRIMARY KEY ("data"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('User', 'Admin')`);
        await queryRunner.query(`CREATE TYPE "public"."user_authsource_enum" AS ENUM('Local', 'Google', 'Facebook')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'User', "authSource" "public"."user_authsource_enum" NOT NULL DEFAULT 'Local', "passwordHash" character varying, "enabled" boolean NOT NULL DEFAULT true, "verified" boolean NOT NULL DEFAULT false, "consent" boolean NOT NULL DEFAULT false, "loginAt" TIMESTAMP WITH TIME ZONE, "logoutAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "avatarData" character varying, "createdById" integer, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "REL_26bb01134e38a7d66fc04d995f" UNIQUE ("avatarData"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "ownerId" integer, "createdById" integer, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "application" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "scheduledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "projectId" integer, "createdById" integer, CONSTRAINT "PK_569e0c3e863ebdf5f2408ee1670" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_reviewed_apps_application" ("userId" integer NOT NULL, "applicationId" integer NOT NULL, CONSTRAINT "PK_be7090d9bdc5bf6b6e87613a976" PRIMARY KEY ("userId", "applicationId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8873214cd99f4c575b48f870f2" ON "user_reviewed_apps_application" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_25a3eeb9cc615421eb83e41fea" ON "user_reviewed_apps_application" ("applicationId") `);
        await queryRunner.query(`CREATE TABLE "project_documents__file" ("projectId" integer NOT NULL, "FileData" character varying NOT NULL, CONSTRAINT "PK_5a118cee1e1c4d1b75fb85e561a" PRIMARY KEY ("projectId", "FileData"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bef574b32086ecd81b6c2fad58" ON "project_documents__file" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3a1b9f0953bf360a507ccc187b" ON "project_documents__file" ("FileData") `);
        await queryRunner.query(`ALTER TABLE "_file" ADD CONSTRAINT "FK_8ac1a4c5f9adca9d81675af9154" FOREIGN KEY ("metaId") REFERENCES "_file_meta"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_26bb01134e38a7d66fc04d995f9" FOREIGN KEY ("avatarData") REFERENCES "_file"("data") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_45c0d39d1f9ceeb56942db93cc5" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_9884b2ee80eb70b7db4f12e8aed" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_678acfe7017fe8a25fe7cae5f18" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "application" ADD CONSTRAINT "FK_e69389177ac594d36dea539f276" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "application" ADD CONSTRAINT "FK_d7021375eb0ef5d648641b78886" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_reviewed_apps_application" ADD CONSTRAINT "FK_8873214cd99f4c575b48f870f2f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_reviewed_apps_application" ADD CONSTRAINT "FK_25a3eeb9cc615421eb83e41fea6" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_documents__file" ADD CONSTRAINT "FK_bef574b32086ecd81b6c2fad589" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_documents__file" ADD CONSTRAINT "FK_3a1b9f0953bf360a507ccc187bc" FOREIGN KEY ("FileData") REFERENCES "_file"("data") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_documents__file" DROP CONSTRAINT "FK_3a1b9f0953bf360a507ccc187bc"`);
        await queryRunner.query(`ALTER TABLE "project_documents__file" DROP CONSTRAINT "FK_bef574b32086ecd81b6c2fad589"`);
        await queryRunner.query(`ALTER TABLE "user_reviewed_apps_application" DROP CONSTRAINT "FK_25a3eeb9cc615421eb83e41fea6"`);
        await queryRunner.query(`ALTER TABLE "user_reviewed_apps_application" DROP CONSTRAINT "FK_8873214cd99f4c575b48f870f2f"`);
        await queryRunner.query(`ALTER TABLE "application" DROP CONSTRAINT "FK_d7021375eb0ef5d648641b78886"`);
        await queryRunner.query(`ALTER TABLE "application" DROP CONSTRAINT "FK_e69389177ac594d36dea539f276"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_678acfe7017fe8a25fe7cae5f18"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_9884b2ee80eb70b7db4f12e8aed"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_45c0d39d1f9ceeb56942db93cc5"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_26bb01134e38a7d66fc04d995f9"`);
        await queryRunner.query(`ALTER TABLE "_file" DROP CONSTRAINT "FK_8ac1a4c5f9adca9d81675af9154"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a1b9f0953bf360a507ccc187b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bef574b32086ecd81b6c2fad58"`);
        await queryRunner.query(`DROP TABLE "project_documents__file"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25a3eeb9cc615421eb83e41fea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8873214cd99f4c575b48f870f2"`);
        await queryRunner.query(`DROP TABLE "user_reviewed_apps_application"`);
        await queryRunner.query(`DROP TABLE "application"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_authsource_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "_file"`);
        await queryRunner.query(`DROP TABLE "_file_meta"`);
    }

}
