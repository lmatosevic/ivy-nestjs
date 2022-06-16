import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductsTable1655328138647 implements MigrationInterface {
    name = 'ProductsTable1655328138647'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product" ("id" SERIAL NOT NULL, "name" character varying(512) NOT NULL, "description" character varying(4096), "price" integer NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_pictures__file" ("productId" integer NOT NULL, "FileData" character varying NOT NULL, CONSTRAINT "PK_0012679482dce62a862780199e8" PRIMARY KEY ("productId", "FileData"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba0ca126283bebf045913e05ef" ON "product_pictures__file" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7c64c04913973831318377628" ON "product_pictures__file" ("FileData") `);
        await queryRunner.query(`ALTER TABLE "product_pictures__file" ADD CONSTRAINT "FK_ba0ca126283bebf045913e05ef5" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "product_pictures__file" ADD CONSTRAINT "FK_d7c64c049139738313183776280" FOREIGN KEY ("FileData") REFERENCES "_file"("data") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_pictures__file" DROP CONSTRAINT "FK_d7c64c049139738313183776280"`);
        await queryRunner.query(`ALTER TABLE "product_pictures__file" DROP CONSTRAINT "FK_ba0ca126283bebf045913e05ef5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7c64c04913973831318377628"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba0ca126283bebf045913e05ef"`);
        await queryRunner.query(`DROP TABLE "product_pictures__file"`);
        await queryRunner.query(`DROP TABLE "product"`);
    }

}
