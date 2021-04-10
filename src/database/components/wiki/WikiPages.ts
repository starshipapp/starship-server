import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IWikiPage extends Document {
  _id: string,
  wikiId: string,
  content: string,
  planet: string,
  createdAt: Date,
  name: string
}

const wikiPageSchema: Schema = new Schema({
  _id: String,
  wikiId: String,
  content: String,
  planet: String,
  createdAt: Date,
  name: String
});

wikiPageSchema.plugin(nanoIdPlugin);

export default model<IWikiPage>('wikipages', wikiPageSchema);