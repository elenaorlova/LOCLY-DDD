import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSession } from 'mongodb';
import {
  Transaction,
  TransactionUseCasePort,
} from '../../../common/application';
import {
  RequestAuthPayload,
  RequestAuthResult,
  IRequestAuth,
} from './IRequestAuth';
import { IGetCustomerUpsert } from '../../../customer/application/GetCustomerUpsert/IGetCustomerUpsert';
import { UserType } from '../../entity/Token';
import { IGetHostUpsert } from '../../../host/application/GetHostUpsert/IGetHostUpsert';
import { tokenToString } from '../utils';
import { Email, UUID } from '../../../common/domain';
import { throwCustomException } from '../../../common/error-handling';
import { Country } from '../../../order/entity/Country';
import {
  INotificationService,
  NotificationType,
} from '../../../infrastructure/notification/INotificationService';
import { DOMAIN } from '../../../GlobalModule';

/**
 * Functionality for the first step in user auth – accepting user email, generating a verification token and sending it
 * to the said address.
 */
@Injectable()
export class RequestAuth implements IRequestAuth {
  constructor(
    private readonly getCustomerUpsert: IGetCustomerUpsert,
    private readonly getHostUpsert: IGetHostUpsert,
    private readonly configService: ConfigService,
    private readonly notificationService: INotificationService,
    @Inject(DOMAIN) private readonly domain: string,
  ) {}

  @Transaction
  async execute({
    port: requestAuthPayload,
    mongoTransactionSession,
  }: TransactionUseCasePort<RequestAuthPayload>): Promise<RequestAuthResult> {
    return this.requestAuth(requestAuthPayload, mongoTransactionSession);
  }

  private async requestAuth(
    { email, type: entityRequestType, country }: RequestAuthPayload,
    mongoTransactionSession: ClientSession,
  ): Promise<string> {
    const { id: entityId, type: userType } = await this.findOrCreateEntity(
      email,
      entityRequestType,
      country,
      mongoTransactionSession,
    );

    const key = this.configService.get('TOKEN_SIGNING_KEY');
    const expiresIn = this.configService.get('VERIFICATION_TOKEN_EXPIRES_IN');

    // Create and sign a verification token to be sent by email.
    const tokenString: string = tokenToString(
      { id: entityId, type: userType, isVerification: true },
      key,
      expiresIn,
    );

    await this.notificationService.notify(email, NotificationType.Auth, {
      domain: this.domain,
      token: tokenString,
    });

    return tokenString;
  }

  // For login, the GetCustomer/HostUpsert use cases are expected to always only GET.
  // For registration, the use cases are expected to always only UPSERT.
  private async findOrCreateEntity(
    email: Email,
    userType: UserType,
    // country is expected to be defined only during host registration. All other cases (login, customer registration),
    // country will be undefined.
    country?: Country,
    mongoTransactionSession?: ClientSession,
  ): Promise<{ id: UUID; type: UserType }> {
    if (userType === UserType.Customer) {
      const { customer } = await this.getCustomerUpsert.execute({
        port: { email },
        mongoTransactionSession,
      });

      return {
        id: customer.id,
        type: UserType.Customer,
      };
    }

    if (userType === UserType.Host) {
      const { host } = await this.getHostUpsert.execute({
        port: { email, ...(country ? { country } : {}) },
        mongoTransactionSession,
      });

      return {
        id: host.id,
        type: UserType.Host,
      };
    }

    throwCustomException('Incorrect entity type', { userType })();
  }
}
