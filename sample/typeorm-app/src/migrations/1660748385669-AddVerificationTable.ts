import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerificationTable1660748385669 implements MigrationInterface {
    name = 'AddVerificationTable1660748385669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."_verification_token_type_enum" AS ENUM('Email', 'Password', 'Other')`);
        await queryRunner.query(`CREATE TABLE "_verification_token" ("id" SERIAL NOT NULL, "token" character varying NOT NULL, "type" "public"."_verification_token_type_enum" NOT NULL DEFAULT 'Other', "accountId" integer NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e1922bd18c707f3697867d0458e" UNIQUE ("token"), CONSTRAINT "PK_fcd29c93d173cc50e9589259f36" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "_verification_token"`);
        await queryRunner.query(`DROP TYPE "public"."_verification_token_type_enum"`);
    }

}
