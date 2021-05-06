import { OrderRepository } from '../port/OrderRepository';
import { CustomerRepository } from '../port/CustomerRepository';

import {
  DraftOrderRequest,
  DraftOrderUseCase,
} from '../../domain/use-case/DraftOrderUseCase';

import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectClient } from 'nest-mongodb';
import { ClientSession, MongoClient } from 'mongodb';
import { withTransaction } from '../../../common/application';
import {
  getShipmentCostQuote,
  ShipmentCostQuote,
  ShipmentCostQuoteFn,
} from './ShipmentCostCalculator/getShipmentCostQuote';
import { Item } from '../../domain/entity/Item';
import { UUID } from '../../../common/domain';
import { Country } from '../../domain/data/Country';
import {
  Address,
  DraftOrder,
  DraftedOrderStatus,
  ShipmentCost,
} from '../../domain/entity/Order';

@Injectable()
export class DraftOrderService implements DraftOrderUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly orderRepository: OrderRepository,
    @InjectClient() private readonly mongoClient: MongoClient,
  ) {}

  async execute(
    draftOrderRequest: DraftOrderRequest,
    session?: ClientSession,
  ): Promise<DraftOrder> {
    const draftOrder: DraftOrder = await withTransaction(
      (sessionWithTransaction: ClientSession) =>
        this.draftOrder(draftOrderRequest, sessionWithTransaction),
      this.mongoClient,
      session,
    );

    return draftOrder;
  }

  private async draftOrder(
    {
      customerId,
      originCountry,
      items: itemsWithoutId,
      destination,
    }: DraftOrderRequest,
    session: ClientSession,
  ): Promise<DraftOrder> {
    const items: Item[] = itemsWithoutId.map(itemWithoutId =>
      Object.assign(itemWithoutId, { id: UUID() }),
    );

    const shipmentCost = this.approximateShipmentCost(
      originCountry,
      destination,
      items,
      getShipmentCostQuote,
    );

    const draftOrder: DraftOrder = {
      id: UUID(),
      status: DraftedOrderStatus,
      customerId,
      items,
      originCountry,
      destination,
      shipmentCost,
    };

    // TODO(IMPORANT): Document MongoDb concurrent transaction limitations.
    // https://jira.mongodb.org/browse/SERVER-36428?focusedCommentId=2136170&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-2136170
    // (GLOBAL) DON'T parallelize this. Promise.all()'ing these, together with transactions, will lead to random
    // TransientTransactionError errors.
    await this.orderRepository.addOrder(draftOrder, session);
    await this.customerRepository.addOrderToCustomer(
      draftOrder.customerId,
      draftOrder.id,
      session,
    );

    return draftOrder;
  }

  private approximateShipmentCost(
    originCountry: Country,
    { country: destinationCountry }: Address,
    items: Item[],
    getShipmentCostQuote: ShipmentCostQuoteFn,
  ): ShipmentCost {
    const { currency, services }: ShipmentCostQuote = getShipmentCostQuote(
      originCountry,
      destinationCountry,
      items.map(item => ({ weight: item.weight })),
    );

    // TODO: Service choice logic
    const { price: amount } = services[0];

    return { amount, currency };
  }
}
