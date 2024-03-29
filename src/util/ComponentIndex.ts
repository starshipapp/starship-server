import Channels from "../database/components/chat/Channels";
import Chats, { IChat } from "../database/components/chat/Chats";
import Messages from "../database/components/chat/Messages";
import Files, { IFiles } from "../database/components/files/Files";
import ForumPosts from "../database/components/forum/ForumPosts";
import ForumReplies from "../database/components/forum/ForumReplies";
import Forums, { IForum } from "../database/components/forum/Forums";
import { IComponent } from "../database/components/IComponent";
import Pages, { IPage } from "../database/components/Pages";
import WikiPages from "../database/components/wiki/WikiPages";
import Wikis, { IWiki } from "../database/components/wiki/Wikis";
import deleteFileComponent from "./deleteFileComponent";

/**
 * Class providing the index of all components, as well as the ability to delete and create them.
 */
export default class ComponentIndex {
  public static availableComponents = ["page", "wiki", "files", "forum", "chat"];

  // Object of functions for creating components
  private static creationFunctions = {
    page: async (planetId: string, userId: string): Promise<IPage> => {
      const page = new Pages({
        createdAt: new Date(),
        owner: userId,
        planet: planetId,
        updatedAt: new Date(),
        content: "This is a Page. Click the Edit icon in the top right corner to get started."
      });

      const result = await page.save().catch((e) => {console.error(e);}) as unknown as IPage;
      return result;
    },
    wiki: async (planetId: string, userId: string): Promise<IWiki> => {
      const wiki = new Wikis({
        createdAt: new Date(),
        owner: userId,
        planet: planetId,
        updatedAt: new Date(),
      });

      const result = await wiki.save().catch((e) => {console.error(e);}) as unknown as IWiki;
      return result;
    },
    files: async (planetId: string, userId: string): Promise<IFiles> => {
      const files = new Files({
        createdAt: new Date(),
        owner: userId,
        planet: planetId,
        updatedAt: new Date(),
      });

      const result = await files.save().catch((e) => {console.error(e);}) as unknown as IFiles;
      return result;
    },
    forum: async (planetId: string, userId: string): Promise<IForum> => {
      const forum = new Forums({
        createdAt: new Date(),
        owner: userId,
        planet: planetId,
        updatedAt: new Date(),
      });

      const result = await forum.save().catch((e) => {console.error(e);}) as unknown as IForum;
      return result;
    },
    chat: async (planetId: string, userId: string): Promise<IChat> => {
      const chat = new Chats({
        createdAt: new Date(),
        owner: userId,
        planet: planetId,
        updatedAt: new Date(),
      });

      const result = await chat.save().catch((e) => {console.error(e);}) as unknown as IChat;
      return result;
    },
  }

  // Object of functions for deleting components
  private static deletionFunctions = {
    wiki: async (componentId: string) => {
      await Wikis.deleteOne({_id: componentId});
      await WikiPages.deleteMany({wikiId: componentId});
    },
    files: async (componentId: string) => {
      // This is more complex, so the logic for this is
      // in the deleteFileComponent function in another file.
      await deleteFileComponent(componentId);
    },
    page: async (componentId: string) => {
      await Pages.deleteOne({_id: componentId});
    },
    forum: async (componentId: string) => {
      await Forums.deleteOne({_id: componentId});
      await ForumPosts.deleteMany({componentId});
      await ForumReplies.deleteMany({componentId});
    },
    chat: async(componentId: string) => {
      await Chats.deleteOne({_id: componentId});
      const channels = await Channels.find({componentId});
      const channelIds = channels.map((value) => value._id);
      await Messages.deleteMany({channel: {$in: channelIds}});
      await Channels.deleteMany({componentId});
    }
  }

  /**
   * Creates a new component and returns it.
   * 
   * @param type - The type of component to create.
   * @param planetId - The id of the planet to create the component on.
   * @param userId - The id of the user creating the component.
   *
   * @returns A promise that resolves to the created component.
   */
  public static createComponent(type: string, planetId: string, userId: string): Promise<IComponent> {
    if(this.availableComponents.includes(type)) {
      // we know what the type is even though compiler doesn't, disable no-unsafe-call
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return this.creationFunctions[type](planetId, userId) as Promise<IComponent>;
    } else {
      throw new Error("Type does not exist.");
    }
  }

  /**
   * Deletes a component.
   * 
   * @param type - The type of component to delete.
   * @param componentId - The id of the component to delete.
   * 
   * @returns A promise that resolves when the component has been deleted.
   */
  public static deleteComponent(type: string, componentId: string): Promise<void> {
    if(this.availableComponents.includes(type)) {
      // we know what the type is even though compiler doesn't, disable no-unsafe-call
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return this.deletionFunctions[type](componentId) as Promise<void>;
    }
  }
}