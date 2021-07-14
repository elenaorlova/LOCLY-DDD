import { HttpStatus, Injectable } from '@nestjs/common';
import { IOrderRepository } from '../../persistence/IOrderRepository';
import { ClientSession } from 'mongodb';
import {
  Transaction,
  TransactionUseCasePort,
} from '../../../common/application';
import {
  SubmitShipmentInfoPayload,
  ISubmitShipmentInfo,
} from './ISubmitShipmentInfo';
import { Order, OrderStatus } from '../../entity/Order';
import { throwCustomException } from '../../../common/error-handling';
import { Item } from '../../entity/Item';
import { UUID } from '../../../common/domain';

@Injectable()
export class SubmitShipmentInfo implements ISubmitShipmentInfo {
  constructor(private readonly orderRepository: IOrderRepository) {}

  @Transaction
  async execute({
    port: finalizeOrderRequest,
    mongoTransactionSession,
  }: TransactionUseCasePort<SubmitShipmentInfoPayload>): Promise<void> {
    await this.finalizeOrder(finalizeOrderRequest, mongoTransactionSession);
  }

  private async finalizeOrder(
    {
      orderId,
      hostId,
      totalWeight,
      shipmentCost: finalShipmentCost,
      calculatorResultUrl,
    }: SubmitShipmentInfoPayload,
    mongoTransactionSession: ClientSession,
  ): Promise<void> {
    const notFinalizedItems: Item[] = await this.getUnfinalizedItems(
      orderId,
      hostId,
    );

    const notFinalizedItemIds: UUID[] = notFinalizedItems.map(({ id }) => id);

    if (notFinalizedItems.length) {
      throwCustomException(
        "Can't finalize order until all items have uploaded photos and have been marked as 'received'",
        { orderId, notFinalizedItemIds },
        HttpStatus.FORBIDDEN,
      )();
    }

    await this.orderRepository.setProperties(
      // status and hostId are already checked in getUnfinalizedItems()
      { orderId },
      {
        totalWeight,
        finalShipmentCost,
        status: OrderStatus.Finalized,
        ...(calculatorResultUrl ? { calculatorResultUrl } : {}),
      },
      mongoTransactionSession,
    );
  }

  private async getUnfinalizedItems(
    orderId: UUID,
    hostId: UUID,
  ): Promise<Item[]> {
    const order: Order = await this.orderRepository.findOrder({
      orderId,
      status: OrderStatus.Confirmed,
      hostId,
    });

    const notFinalizedItems: Item[] = order.items.filter(
      ({ receivedDate, photos }) => !(receivedDate && photos.length),
    );

    return notFinalizedItems;
  }
}
