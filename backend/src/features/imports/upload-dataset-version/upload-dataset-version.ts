import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  CurrentUser,
  type TeamMember,
} from '../../../auth/current-user.decorator';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { formatOf } from '../../../domain/source-format';
import {
  SOURCE_DATASET_IMPORTERS,
  type RawTable,
  type SourceDatasetImporter,
} from '../../../ports/source-dataset-importer';
import { PrismaService } from '../../../prisma/prisma.service';
import { RawFileStore } from '../../../storage/raw-file-store';

export class UploadDatasetVersionDto {
  /** Le millésime annoncé par le producteur : « 2024 », « rentrée 2025 ». */
  @IsString() @IsNotEmpty() vintage!: string;
  /** L'adresse exacte du fichier chez le producteur. */
  @IsUrl({ protocols: ['https'], require_protocol: true }) fileUrl!: string;
  /** Le jour où le fichier a été téléchargé. */
  @Type(() => Date) @IsDate() collectedAt!: Date;
  /** L'onglet à lire, pour un classeur ; le premier sinon. */
  @IsOptional() @IsString() sheet?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ROWS_PER_INSERT = 1000;

/**
 * L'équipe dépose le fichier d'un producteur. Une nouvelle version du jeu
 * naît, en brouillon ; les précédentes restent intactes.
 *
 * Le fichier brut est gardé sous son empreinte, et chaque ligne est
 * enregistrée telle qu'elle a été lue. Rien n'est encore interprété : la
 * description des colonnes vient ensuite.
 */
@Controller('admin/datasets')
@UseGuards(SessionGuard)
@Requires('edit')
export class UploadDatasetVersionController {
  constructor(
    private prisma: PrismaService,
    private store: RawFileStore,
    @Inject(SOURCE_DATASET_IMPORTERS)
    private importers: SourceDatasetImporter[],
  ) {}

  @Post(':datasetId/versions')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  async upload(
    @CurrentUser() user: TeamMember,
    @Param('datasetId', ParseUUIDPipe) datasetId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDatasetVersionDto,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier déposé.');
    // Multer lit le nom en Latin-1 : « Écoles.xlsx » arriverait en « Ã‰coles.xlsx ».
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const dataset = await this.prisma.sourceDataset.findUnique({
      where: { id: datasetId },
    });
    if (!dataset) throw new NotFoundException('Jeu de données inconnu');

    const format = formatOf(fileName);
    const importer = this.importers.find((i) => i.format === format);
    if (!importer) {
      throw new BadRequestException(
        `« ${fileName} » : seuls les fichiers CSV et XLSX se lisent pour l'instant.`,
      );
    }

    const fileHash = this.store.fingerprint(file.buffer);
    const already = await this.prisma.datasetVersion.findUnique({
      where: { datasetId_fileHash: { datasetId, fileHash } },
    });
    if (already) {
      throw new ConflictException(
        `Ce fichier est déjà déposé pour ce jeu : version « ${already.vintage} » du ${already.createdAt.toLocaleDateString('fr-FR')}.`,
      );
    }

    let table: RawTable;
    try {
      table = await importer.read(file.buffer, dto.sheet);
    } catch (err) {
      throw new BadRequestException(
        `« ${fileName} » ne se lit pas : ${(err as Error).message}`,
      );
    }
    if (table.rows.length === 0) {
      throw new BadRequestException(
        `« ${fileName} » ne contient aucune ligne.`,
      );
    }

    await this.store.keep(file.buffer);

    return this.prisma.$transaction(
      async (tx) => {
        const version = await tx.datasetVersion.create({
          data: {
            datasetId,
            vintage: dto.vintage.trim(),
            fileUrl: dto.fileUrl,
            collectedAt: dto.collectedAt,
            fileName,
            fileHash,
            fileSize: file.size,
            createdById: user.id,
          },
        });
        const job = await tx.importJob.create({
          data: {
            versionId: version.id,
            format: importer.format,
            sheetNames: table.sheetNames,
            sheet: table.sheet,
            rowCount: table.rows.length,
          },
        });
        for (
          let start = 0;
          start < table.rows.length;
          start += ROWS_PER_INSERT
        ) {
          await tx.rawRow.createMany({
            data: table.rows
              .slice(start, start + ROWS_PER_INSERT)
              .map((cells, i) => ({
                jobId: job.id,
                rowNumber: start + i + 1,
                cells,
              })),
          });
        }
        return { version, job };
      },
      { timeout: 120_000 },
    );
  }
}
