import Messages, { IMessage } from "../../database/components/chat/Messages";

export default async function channelLoader(ids: string[]) : Promise<IMessage[]> {
  const objects = await Messages.find({_id: {$in: ids}});
  
  return ids.map((id) => objects.find((object) => object._id === id));
}