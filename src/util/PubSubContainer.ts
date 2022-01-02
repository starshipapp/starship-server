import { RedisPubSub } from "graphql-redis-subscriptions";
import { PubSub } from "graphql-subscriptions";

/**
 * Container class used for storing the PubSub instances so that it is publicly accessable.
 */
export default class PubSubContainer {
  static pubSub: PubSub | RedisPubSub;
}