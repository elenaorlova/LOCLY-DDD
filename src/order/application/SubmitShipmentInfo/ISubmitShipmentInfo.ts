import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsPositive,
  IsUrl,
  IsDefined,
  IsNotEmptyObject,
  ValidateNested,
  IsCurrency,
  IsNumber,
  IsIn,
} from 'class-validator';
import { UseCase } from '../../../common/application';
import { IsUUID, UUID } from '../../../common/domain';
import { Gram } from '../../entity/Item';
import { Cost as ICost } from '../../entity/Order';
import { UnidHostRequest } from '../../../host/entity/Host';
import {
  FileUpload,
  FileUploadResult,
} from '../../persistence/OrderMongoMapper';
import { Currency } from '../../entity/Currency';

export type URL = string;

export interface SubmitShipmentInfoPayload
  extends Readonly<{
    orderId: UUID;
    hostId: UUID;
    totalWeight: Gram;
    shipmentCost: Cost;
    calculatorResultUrl?: URL;
    deliveryEstimateDays?: number;
    proofOfPayment: FileUpload;
  }> {}

class Cost implements ICost {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(Currency)
  currency: Currency;
}

export class SubmitShipmentInfoRequest
  implements
    Omit<UnidHostRequest<SubmitShipmentInfoPayload>, 'proofOfPayment'> {
  @IsUUID()
  readonly orderId: UUID;

  @IsInt()
  @IsPositive()
  readonly totalWeight: Gram;

  @ValidateNested()
  @IsNotEmptyObject()
  @IsDefined()
  @Type(() => Cost)
  readonly shipmentCost: Cost;

  @IsOptional()
  @IsUrl()
  readonly calculatorResultUrl?: URL;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly deliveryEstimateDays?: number;
}

export type SubmitShipmentInfoResult = FileUploadResult;

export abstract class ISubmitShipmentInfo extends UseCase<
  SubmitShipmentInfoPayload,
  SubmitShipmentInfoResult
> {}
