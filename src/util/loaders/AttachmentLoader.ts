import Attachments, { IAttachment } from "../../database/Attachments";

export default async function channelLoader(ids: string[]) : Promise<IAttachment[]> {
  const objects = await Attachments.find({_id: {$in: ids}});
  
  return ids.map((id) => objects.find((object) => object._id === id));
}