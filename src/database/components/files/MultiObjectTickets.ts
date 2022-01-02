import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IMultiObjectTicket extends Document {
  /** The ticket's id. */ 
  _id: string
  /** The IDs of the FileObjects attached to the ticket. */
  objects: [string]
  /** The name of the ZIP file. */
  name: string
}

const multiObjectTicketsSchema: Schema = new Schema({
  _id: String,
  objects: [String],
  name: String
});

multiObjectTicketsSchema.plugin(nanoIdPlugin, 16);

export default model<IMultiObjectTicket>('multiobjecttickets', multiObjectTicketsSchema);
