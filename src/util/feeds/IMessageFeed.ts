import { IMessage } from "../../database/components/chat/Messages";

/* eslint-disable semi */
export default interface IMessageFeed {
  cursor: string,
  messages: IMessage[];
}