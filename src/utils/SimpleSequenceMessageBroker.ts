import {Player} from '../models/Player';

export interface ModelUpdateMessage {
  id: Player['id'];
  movementState: Player['movementState'];
  x: Player['x'];
  y: Player['x'];
  isAlive: Player['isAlive'];
}

export interface SimpleSequenceMessageBroker {
  publish: (message: ModelUpdateMessage) => void;
  subscribe: (callback: (message: ModelUpdateMessage) => void) => void;
}

// We'll not even implement a way to choose your subscriptions b/c
// the Venn diagram between the types of messages different subscribers
// are interested in is pretty much like ( )( ) – zero intersection.
export default function getSSMB(): SimpleSequenceMessageBroker {
  const subscriptions: ((message: ModelUpdateMessage) => void)[] = [];

  const subscribe = (callback: (message: ModelUpdateMessage) => void) => {
    subscriptions.push(callback);
  };

  const publish = (message: ModelUpdateMessage) => {
    subscriptions.forEach(sub => sub(message));
  };

  return {publish, subscribe};
}
