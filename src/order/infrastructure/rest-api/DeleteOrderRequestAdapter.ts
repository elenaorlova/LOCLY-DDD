import { IsUUID, UUID } from '../../../common/domain/UUID';
import { DeleteOrderRequest } from '../../domain/use-case/DeleteOrderUseCase';

export class DeleteOrderRequestAdapter implements DeleteOrderRequest {
  @IsUUID()
  readonly orderId: UUID;

  @IsUUID()
  readonly customerId: UUID;
}