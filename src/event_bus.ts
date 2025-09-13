import { Events } from '@/type/events';
import Emittery from 'emittery';

export const event_bus = new Emittery<Events>();
