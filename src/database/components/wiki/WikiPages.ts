import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IWikiPage extends Document {
  /** The page's ID. */
  _id: string,
  /** The ID of the wiki this page belongs to. */
  wikiId: string,
  /** The page's content. */
  content: string,
  /** The ID of the planet this page belongs to. */
  planet: string,
  /** The creation date of the page. */
  createdAt: Date,
  /** The page's title. */
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

wikiPageSchema.plugin(nanoIdPlugin, 16);

export default model<IWikiPage>('wikipages', wikiPageSchema);