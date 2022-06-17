import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialDatabase1655455914355 implements MigrationInterface {
    name = 'InitialDatabase1655455914355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "_file_meta" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "resource" character varying NOT NULL, "resourceId" integer, "field" character varying NOT NULL, "mimeType" character varying NOT NULL, "size" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f09d360075a3f0a8eba5129231f" UNIQUE ("name"), CONSTRAINT "PK_d6b2b81c1c537d95a12cd6f8cd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "_file" ("data" character varying NOT NULL, "originalName" character varying, "title" character varying, "description" character varying, "metaId" integer, CONSTRAINT "REL_8ac1a4c5f9adca9d81675af915" UNIQUE ("metaId"), CONSTRAINT "PK_4ee511b5972a9bbe9571900f351" PRIMARY KEY ("data"))`);
        await queryRunner.query(`CREATE TABLE "product" ("id" SERIAL NOT NULL, "name" character varying(512) NOT NULL, "description" character varying(4096), "price" integer NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('User', 'Admin')`);
        await queryRunner.query(`CREATE TYPE "public"."user_authsource_enum" AS ENUM('Local', 'Google', 'Facebook')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'User', "authSource" "public"."user_authsource_enum" NOT NULL DEFAULT 'Local', "passwordHash" character varying, "enabled" boolean NOT NULL DEFAULT true, "consent" boolean NOT NULL DEFAULT false, "verified" boolean NOT NULL DEFAULT false, "loginAt" TIMESTAMP WITH TIME ZONE, "logoutAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "avatarData" character varying, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "REL_26bb01134e38a7d66fc04d995f" UNIQUE ("avatarData"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_pictures__file" ("productId" integer NOT NULL, "FileData" character varying NOT NULL, CONSTRAINT "PK_0012679482dce62a862780199e8" PRIMARY KEY ("productId", "FileData"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba0ca126283bebf045913e05ef" ON "product_pictures__file" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7c64c04913973831318377628" ON "product_pictures__file" ("FileData") `);
        await queryRunner.query(`ALTER TABLE "_file" ADD CONSTRAINT "FK_8ac1a4c5f9adca9d81675af9154" FOREIGN KEY ("metaId") REFERENCES "_file_meta"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_26bb01134e38a7d66fc04d995f9" FOREIGN KEY ("avatarData") REFERENCES "_file"("data") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_pictures__file" ADD CONSTRAINT "FK_ba0ca126283bebf045913e05ef5" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "product_pictures__file" ADD CONSTRAINT "FK_d7c64c049139738313183776280" FOREIGN KEY ("FileData") REFERENCES "_file"("data") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_pictures__file" DROP CONSTRAINT "FK_d7c64c049139738313183776280"`);
        await queryRunner.query(`ALTER TABLE "product_pictures__file" DROP CONSTRAINT "FK_ba0ca126283bebf045913e05ef5"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_26bb01134e38a7d66fc04d995f9"`);
        await queryRunner.query(`ALTER TABLE "_file" DROP CONSTRAINT "FK_8ac1a4c5f9adca9d81675af9154"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7c64c04913973831318377628"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba0ca126283bebf045913e05ef"`);
        await queryRunner.query(`DROP TABLE "product_pictures__file"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_authsource_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "product"`);
        await queryRunner.query(`DROP TABLE "_file"`);
        await queryRunner.query(`DROP TABLE "_file_meta"`);
    }

}
