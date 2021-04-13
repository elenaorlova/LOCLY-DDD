import Stripe from 'stripe';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectStripeClient } from '@golevelup/nestjs-stripe';

import {
  ConfirmOrderRequest,
  StripeCheckoutSession,
  ConfirmOrderUseCase,
} from '../../domain/use-case/ConfirmOrderUseCase';
import { HostMatcher } from '../port/HostMatcher';
import { OrderRepository } from '../port/OrderRepository';
import { Host } from '../../domain/entity/Host';
import { MatchCache } from '../port/MatchCache';
import { UUID } from '../../../common/domain/UUID';
import { InjectClient } from 'nest-mongodb';
import { ClientSession, MongoClient } from 'mongodb';
import { withTransaction } from '../../../common/utils';
import { DraftedOrder } from '../../domain/entity/DraftedOrder';

export type MatchReference = Stripe.Checkout.Session['client_reference_id'];

@Injectable()
export class ConfirmOrder implements ConfirmOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly hostMatcher: HostMatcher,
    // TODO: More general EventEmitter class, wrapper around eventEmitter
    private readonly eventEmitter: EventEmitter2,
    @InjectStripeClient() private readonly stripe: Stripe,
    private readonly matchRecorder: MatchCache,
    @InjectClient() private readonly mongoClient: MongoClient,
  ) {}

  async execute({
    orderId,
  }: ConfirmOrderRequest): Promise<StripeCheckoutSession> {
    const session = this.mongoClient.startSession();

    // TODO: Helper function instead of assigning a let variable in try block: https://jira.mongodb.org/browse/NODE-2014
    const checkoutSession: Stripe.Checkout.Session = await withTransaction(
      () => this.matchOrderAndCheckout(orderId, session),
      session,
    );

    // TODO: Wrapper around eventEmitter
    // TODO(?): Event emitting decorator
    this.eventEmitter.emit('order.awaiting_payment');

    return {
      checkoutId: checkoutSession.id,
    };
  }

  private async matchOrderAndCheckout(
    orderId: UUID,
    session: ClientSession,
  ): Promise<Stripe.Checkout.Session> {
    const draftedOrder = (await this.orderRepository.findOrder(
      orderId,
      session,
    )) as DraftedOrder;

    const matchId: UUID = await this.matchOrderToHost(
      draftedOrder,
      session,
    ).catch(error => {
      // TODO: Wrapper around eventEmitter
      // TODO(?): Event emitting decorator and put it on error handling
      // TODO(?): Move event emitting in execute()
      this.eventEmitter.emit('order.rejected.host_availability');
      throw error;
    });

    /**
     * Scenarios:
     *
     * I. Match Order with Host, store hostId on Order BEFORE Payment:
     *
     * 1. Host matched to Order -> Customer didn't finalize Payment -> Customer requests Order info,
     *    sees Order.Host(Id), requests Host info -> gets Host address without Paying.
     * 2. CURRENT:  Host matched to Order -> while Customer finalizes Payment, Host decides to set their status to
     *    "unavailable" -> Customer payed, but Order couldn't be matched to/executed by Host
     *    TODO: Potential solution: prohibit Host from setting status as "unavailable" while the Host has unfinalized
     *    Orders. I.e. "book" the host while the payment is being processed.
     *
     * II. Payment BEFORE matching Host:
     *
     * 1. Customer pays Order -> Order tries to match with a Host -> no Host available
     */
    // TODO: Error handling
    const checkoutSession: Stripe.Checkout.Session = await this.stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              // TODO(NOW): Make the service fee a method
              // TODO(NOW): Currency type alias
              currency: 'usd',
              unit_amount: 10000, // cents
              product_data: {
                name: 'Locly and Host Service Fee',
              },
            },
            quantity: 1,
          },
        ],
        // ! IMPORTANT !
        // TODO: Idk?
        client_reference_id: matchId,
        mode: 'payment',
        success_url: 'https://news.ycombinator.com',
        cancel_url: 'https://reddit.com',
      },
    );

    return checkoutSession;
  }

  // TODO(?): attach match schema to order, but deserialize it when needed
  private async matchOrderToHost(
    { id: orderId, originCountry }: DraftedOrder,
    session: ClientSession,
  ): Promise<UUID> {
    const { id: matchedHostId }: Host = await this.hostMatcher.matchHost(
      originCountry,
      session,
    );

    const matchId = UUID();

    await this.matchRecorder.recordMatch(
      {
        id: matchId,
        orderId,
        hostId: matchedHostId,
      },
      session,
    );

    return matchId;
  }
}
