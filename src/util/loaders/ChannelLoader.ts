import Channels, { IChannel } from "../../database/components/chat/Channels";

export default async function channelLoader(ids: string[]) : Promise<IChannel[]> {
  const objects = await Channels.find({_id: {$in: ids}});
  
  return ids.map((id) => objects.find((object) => object._id === id));
}