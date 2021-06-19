import Chats, { IChat } from "../../database/components/chat/Chats";

export default async function channelLoader(ids: string[]) : Promise<IChat[]> {
  const objects = await Chats.find({_id: {$in: ids}});
  
  return ids.map((id) => objects.find((object) => object._id === id));
}