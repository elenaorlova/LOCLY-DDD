import { Email, UUID } from '../../common/domain';
import { EntityFilter } from '../../common/persistence';

import { Address } from '../../order/entity/Order';

export type Customer = Readonly<{
  id: UUID;
  email: Email;
  selectedAddress?: Address;
  orderIds: UUID[];
}>;

export type CustomerFilter = EntityFilter<Customer, { customerId: UUID }>;