import { RedisPubSub } from "graphql-redis-subscriptions";
import { PubSub } from "graphql-subscriptions";

export default class PubSubContainer {
  static pubSub: PubSub | RedisPubSub;
}