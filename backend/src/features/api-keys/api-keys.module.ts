import { Module } from '@nestjs/common';
import { CreateApiKeyController } from './create-api-key/create-api-key';
import { ListApiKeysController } from './list-api-keys/list-api-keys';
import { RevokeApiKeyController } from './revoke-api-key/revoke-api-key';

/** Les clés de l'API publique, données et retirées par l'administration. */
@Module({
  controllers: [
    CreateApiKeyController,
    ListApiKeysController,
    RevokeApiKeyController,
  ],
})
export class ApiKeysModule {}
