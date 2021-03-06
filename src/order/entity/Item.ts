import { EntityFilter } from '../../common/persistence';
import { UUID } from '../../common/domain';

export type Gram = number;

export type PhysicalItem = Readonly<{
  id: UUID;
  weight: Gram;
}>;

export type Item = PhysicalItem &
  Readonly<{
    title: string;
    url?: string;
    photoIds: UUID[];
    receivedDate: Date;
  }>;

export type DraftedItem = Pick<Item, 'id' | 'title' | 'url' | 'weight'>;
export type ReceivedItem = DraftedItem & Pick<Item, 'receivedDate'>;
export type FinalizedItem = ReceivedItem & Pick<Item, 'photoIds'>;

export type ItemFilter = EntityFilter<Item, { itemId: UUID }>;
