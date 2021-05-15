import { IHostRepository } from '../../../host/persistence/IHostRepository';

import { Injectable } from '@nestjs/common';
import { InjectClient } from 'nest-mongodb';
import { ClientSession, MongoClient } from 'mongodb';
import { withTransaction } from '../../../common/application';
import { GetHostRequest, IGetHost } from './IGetHost';
import { Host } from '../../entity/Host';

@Injectable()
export class GetHost implements IGetHost {
  constructor(
    private readonly hostRepository: IHostRepository,
    @InjectClient() private readonly mongoClient: MongoClient,
  ) {}

  async execute(
    getHostRequest: GetHostRequest,
    mongoTransactionSession?: ClientSession,
  ): Promise<Host> {
    const host: Host = await withTransaction(
      (sessionWithTransaction: ClientSession) =>
        this.hostRepository.findHost(getHostRequest, sessionWithTransaction),
      this.mongoClient,
      mongoTransactionSession,
    );

    return host;
  }
}
