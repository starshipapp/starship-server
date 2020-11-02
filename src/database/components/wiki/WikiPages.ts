import mongoose, {model, Schema, Document} from "mongoose";
import customId from "mongoose-hook-custom-id";
import nanoIdPlugin from "mongoose-nanoid";

export interface IWikiPage extends Document {
  _id: string,
  wikiId: string,
  content: string,
  planet: string,
  createdAt: Date
}

const wikiPageSchema: Schema = new Schema({
  _id: String,
  wikiId: String,
  content: String,
  planet: String,
  createdAt: Date,
});

wikiPageSchema.plugin(nanoIdPlugin);

export default model<IWikiPage>('wikipages', wikiPageSchema);