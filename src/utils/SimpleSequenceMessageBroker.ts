import {Character} from '../models/Character';

interface Subscription {
  subscriptionId: Character['id'],
  callback: (message: Character, ssmb: SimpleSequenceMessageBroker) => void
}

export interface SimpleSequenceMessageBroker {
  publish: (message: Character) => void;
  addSubscriber: (sub: Subscription) => SimpleSequenceMessageBroker;
  removeSubscriber: (subscriptionId: Character['id']) => SimpleSequenceMessageBroker;
}

// We'll not even implement a way to choose your subscriptions b/c
// the Venn diagram between the types of messages different subscribers
// are interested in is pretty much like ( )( ) – zero intersection.
export default function getSSMB(): SimpleSequenceMessageBroker {
  const subscriptions: Subscription[] = [];

  const addSubscriber: SimpleSequenceMessageBroker['addSubscriber'] = (sub): SimpleSequenceMessageBroker => {
    subscriptions.push(sub);

    return _this;
  };

  const removeSubscriber = (subscriptionId: Character['id']): SimpleSequenceMessageBroker => {
    const subIndex = subscriptions.findIndex(sub => sub.subscriptionId === subscriptionId);

    if (subIndex > -1) {
      subscriptions.splice(subIndex, 1);
    }

    return _this;
  };

  const publish = (message: Character) => {
    subscriptions.forEach(sub => sub.callback(message, _this));
  };

  const _this = {publish, addSubscriber, removeSubscriber};

  return _this;
}
