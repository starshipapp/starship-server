// AWS demands casing
/* eslint-disable @typescript-eslint/naming-convention */
import AWS from "aws-sdk";
import yn from "yn";
import FileObjects, { IFileObject } from "../database/components/files/FileObjects";
import Files from "../database/components/files/Files";
import Loggers from "../Loggers";
import Context from "../util/Context";
import permissions from "../util/permissions";
import {v4} from "uuid";
import mimeTypes from "../util/mimeTypes";
import Users from "../database/Users";
import canUpload from "../util/canUpload";
import createNotification from "../util/createNotification";
import CustomEmojis from "../database/CustomEmojis";

Loggers.awsLogger.info("Connecting to AWS");
const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_ACCESS_SECRET,
  s3ForcePathStyle: yn(process.env.BUCKET_FORCE_PATH_STYLE)
});
Loggers.awsLogger.info("Connected to AWS");

/**
 * Arguments for {@link downloadFileObject}.
 */
interface IDownloadFileObjectArgs {
  /** The ID of the file to download. */
  fileId: string
}

/**
 * Creates a signed url to download a file object.
 * 
 * @param root Unused.
 * @param args The arguments to be used to download a file object. See {@link IDownloadFileObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the url.
 * 
 * @throws Throws an error if the file object does not exist.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function downloadFileObject(root: undefined, args: IDownloadFileObjectArgs, context: Context): Promise<string> {
  const file = await FileObjects.findOne({_id: args.fileId});
  if(file && file.type == "file") {
    if(await permissions.checkReadPermission(context.user?.id ?? null, file.planet)) {
      const url = s3.getSignedUrl("getObject", {
        Bucket: process.env.BUCKET_NAME,
        Key: file.key,
        Expires: 3600,
        ResponseContentDisposition: "attachment; filename=\"" + file.name + "\""
      });
      return url;
    } else {
      throw new Error("Not found.");
    }
  } else { 
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link downloadFolderObject}.
 */
interface IDownloadFolderObjectArgs {
  /** The ID of the folder to download. */
  folderId: string
}

/**
 * Creates an array of signed urls to download an entire folder.
 * 
 * @param root Unused.
 * @param args The arguments to be used to download a folder. See {@link IDownloadFolderObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to an array of signed urls.
 * 
 * @throws Throws an error if the folder does not exist.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function downloadFolderObject(root: undefined, args: IDownloadFolderObjectArgs, context: Context): Promise<string[]> {
  const file = await FileObjects.findOne({_id: args.folderId});
  if(file && file.type == "folder") {
    if(await permissions.checkReadPermission(context.user?.id ?? null, file.planet)) {
      const urls: string[] = [];
      const files = await FileObjects.find({parent: args.folderId});
      files.map((value) => {
        if(value.type == "file") {
          urls.push(s3.getSignedUrl("getObject", {
            Bucket: process.env.BUCKET_NAME,
            Key: value.key,
            Expires: 3600,
            ResponseContentDisposition: "attachment; filename=\"" + value.name + "\""
          }));
        }
      });
      return urls;
    } else {
      throw new Error("Not found.");
    }
  } else { 
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link getObjectPreview}.
 */
interface IGetObjectPreviewArgs {
  /** The ID of the file to get the preview of. */
  fileId: string
}

/**
 * Gets a signed URL to be used to preview a file object.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the preview of a file object. See {@link IGetObjectPreviewArgs}.
 * @param context The current user context for the request.
 * 
 * @throws Throws an error if the file object does not exist.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function getObjectPreview(root: undefined, args: IGetObjectPreviewArgs, context: Context): Promise<string> {
  const file = await FileObjects.findOne({_id: args.fileId});
  if(file && file.type == "file") {
    if(await permissions.checkReadPermission(context.user?.id ?? null, file.planet)) {
      const url = s3.getSignedUrl("getObject", {
        Bucket: process.env.BUCKET_NAME,
        Key: file.key,
        Expires: 86400
      });
      return url;
    } else {
      throw new Error("Not found.");
    }
  } else { 
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link uploadFileObject}.
 */
interface IUploadFileObjectArgs {
  /** The ID of the folder to upload the file to. */
  folderId: string,
  /** The MIME type of the file. */
  type: string,
  /** The name of the file to upload. */
  name: string,
  /** The ID of the file component, to be used if the file is in the root folder. */
  filesId: string
}

/**
 * Return data for uploading a file object. See {@link uploadFileObject}.
 */
interface IUploadFileData {
  /** The ID of the file object. */
  documentId: string,
  /** The signed URL to upload the file to. */
  uploadUrl: string
}

/**
 * Creates a new file object and it's associated signed upload url.
 * 
 * @param root Unused.
 * @param args The arguments to be used to upload a file object. See {@link IUploadFileObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the data for uploading the file object. See {@link IUploadFileData}.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the user cannot upload a file.
 */
async function uploadFileObject(root: undefined, args: IUploadFileObjectArgs, context: Context): Promise<IUploadFileData> {
  const folder = await FileObjects.findOne({_id: args.folderId});
  if(folder && folder.type == "folder" || args.folderId == "root") {
    const filesId = args.folderId == "root" ? args.filesId : folder.componentId;
    const fileComponent = await Files.findOne({_id: filesId});
    if(fileComponent) {
      if(context.user && await permissions.checkFullWritePermission(context.user.id, fileComponent.planet)) {
        const user = await Users.findOne({_id: context.user.id});
        if(user && canUpload(user)) {
          const filename = args.name.replace(/[/\\?%*:|"<>]/g, "-");
          let path = ["root"];
          if(folder) {
            path = [...folder.path];
            path.push(folder._id);
          }
          const document = new FileObjects({
            path,
            parent: path[path.length -1],
            name: filename,
            planet: fileComponent.planet,
            componentId: fileComponent._id,
            owner: context.user.id,
            createdAt: new Date(),
            type: "file",
            fileType: args.type,
            finishedUploading: false
          });
          await document.save();
          const key = fileComponent._id + "/" + args.folderId + "/" + document._id + "/" + args.name;
          const url = s3.getSignedUrl("putObject", {
            Bucket: process.env.BUCKET_NAME,
            Key: key,
            Expires: 120,
            ContentType: args.type
          });
          await FileObjects.findOneAndUpdate({_id: document._id}, {$set: {key}});
          return {
            documentId: document._id,
            uploadUrl: url
          };
        } else {
          throw new Error("You have reached your file upload cap. To upload this file, delete other files.");
        }
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link deleteFileObject}.
 */
interface IDeleteFileObjectArgs {
  /** The IDs of the file object to delete. */
  objectIds: string[]
}

// mongoose doesn't like it when it's promises are voided, so we need to wrap it
// we can't *actually* await these in deleteFileObject because it'd stall the function
async function workaroundVoidNoopBug(value: IFileObject) {
  await Users.updateOne({_id: value.owner}, {$inc: {usedBytes: -1 * value.size}}, {new: true});
}

/**
 * Deletes all file objects in the given array and removse them from the database.
 * 
 * @param root Unused.
 * @param args The arguments to be used to delete the file objects. See {@link IDeleteFileObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the file objects were successfully deleted.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the file objects are not all in the same component.
 */
async function deleteFileObject(root: undefined, args: IDeleteFileObjectArgs, context: Context): Promise<boolean> {
  const files = await FileObjects.find({_id: {$in: args.objectIds}});
  if(files && files[0] && files.length == args.objectIds.length) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, files[0].planet)) {
      if(files.filter((file) => file.componentId == files[0].componentId).length == files.length) {
        for(const file of files) {
          if(file.key) {
            if(file.size) {
              await Users.findOneAndUpdate({_id: file.owner}, {$inc: {usedBytes: -1 * file.size}}, {new: true});
            }
            s3.deleteObject({Bucket: process.env.BUCKET_NAME, Key: file.key}, function(err) {
              if (err) console.log(err, err.stack);  // error
            });
          } else if(file.type === "folder") {
            // delete everything from s3
            const filesToCheck = await FileObjects.find({path: file._id});
            const keys: {Key: string}[][] = [[]];
            filesToCheck.map((value) => {
              if(value.key) {
                if(keys[keys.length - 1].length === 1000) {
                  keys.push([]);
                }
                keys[keys.length - 1].push({Key: value.key});
              }
              if(value.size) {
                void workaroundVoidNoopBug(value);
              }
            });
            keys.map((value) => {
              s3.deleteObjects({Bucket: process.env.BUCKET_NAME, Delete: {Objects: value}}, function(err) {
                if (err) console.log(err, err.stack);  // error
              });
            });
            await FileObjects.deleteMany({path: file._id});
          }
        }
        await FileObjects.deleteMany({_id: {$in: args.objectIds}});
        return true;
      } else {
        throw new Error("All files must be from the same component.");
      }
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link uploadMarkdownImage}, {@link uploadProfileBanner} and {@link uploadProfilePicture}.
 */
interface IImageUploadArgs {
  /** The MIME type of the image. */
  type: string
  /** The size of the image to upload. */
  size: number
}

/**
 * Return data for an markdown image upload. See {@link uploadMarkdownImage}.
 */
interface IUploadMarkdownImageData {
  /** The URL of the image. */
  finalUrl: string
  /** The signed URL to upload the image to. */
  uploadUrl: string
}

/**
 * Creates an signed URL for an image upload, to be used in the markdown editor.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the image. See {@link IImageUploadArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the data for the image upload.
 * 
 * @throws Throws an error if image is too large.
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the file type is invalid. See {@link mimeTypes.imageTypes}.
 */
function uploadMarkdownImage(root: undefined, args: IImageUploadArgs, context: Context): IUploadMarkdownImageData {
  if(args.size > 8000000) {
    throw new Error("Image too big.");
  }

  if(!context.user) {
    throw new Error("Not logged in.");
  }

  if(!mimeTypes.imageTypes.includes(args.type)) {
    throw new Error("Invalid file type.");
  }

  const uuid = v4();
  const url = s3.getSignedUrl("putObject", {
    Bucket: process.env.BUCKET_NAME,
    Key: "mdattachments/" + uuid,
    Expires: 120,
    ContentType: args.type,
    ACL: "public-read"
  });
  
  return {
    finalUrl: process.env.BUCKET_ENDPOINT + "/" + process.env.BUCKET_NAME + "/mdattachments/" + uuid,
    uploadUrl: url
  };
}

/**
 * Creates a signed URL for an image upload, to be used in the profile editor's profile picture field.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the image. See {@link IImageUploadArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the data for the image upload.
 * 
 * @throws Throws an error if image is too large.
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the file type is invalid. See {@link mimeTypes.imageTypes}.
 */
async function uploadProfilePicture(root: undefined, args: IImageUploadArgs, context: Context): Promise<string> {
  if(args.size > 8000000) {
    throw new Error("Image too big.");
  }

  if(!context.user) {
    throw new Error("Not logged in.");
  }

  if(!mimeTypes.imageTypes.includes(args.type)) {
    throw new Error("Invalid file type.");
  }

  const url = s3.getSignedUrl("putObject", {
    Bucket: process.env.BUCKET_NAME,
    Key: "profilepictures/" + context.user.id,
    Expires: 120,
    ContentType: args.type,
    ACL: "public-read"
  });
  
  await Users.findOneAndUpdate({_id: context.user.id}, {$set: {profilePicture: process.env.BUCKET_ENDPOINT + "/" + process.env.BUCKET_NAME + "/profilepictures/" + context.user.id}});

  return url;
}

/**
 * Creates a signed URL for an image upload, to be used in the profile editor's profile banner field.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the image. See {@link IImageUploadArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the data for the image upload.
 * 
 * @throws Throws an error if image is too large.
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the file type is invalid. See {@link mimeTypes.imageTypes}.
 */
async function uploadProfileBanner(root: undefined, args: IImageUploadArgs, context: Context): Promise<string> {
  if(args.size > 8000000) {
    throw new Error("Image too big.");
  }

  if(!context.user) {
    throw new Error("Not logged in.");
  }

  if(!mimeTypes.imageTypes.includes(args.type)) {
    throw new Error("Invalid file type.");
  }

  const url = s3.getSignedUrl("putObject", {
    Bucket: process.env.BUCKET_NAME,
    Key: "profilebanners/" + context.user.id,
    Expires: 120,
    ContentType: args.type,
    ACL: "public-read"
  });
  
  await Users.findOneAndUpdate({_id: context.user.id}, {$set: {profileBanner: process.env.BUCKET_ENDPOINT + "/" + process.env.BUCKET_NAME + "/profilebanners/" + context.user.id}});

  return url;
}

/**
 * Arguments for {@link completeUpload}.
 */
interface ICompleteUploadArgs {
  /** The ID of the file object to mark as uploaded. */
  objectId: string
}

/**
 * Marks a file object as uploaded and sets it's size.
 * 
 * @param root Unused.
 * @param args The arguments to be used to mark the file object as uploaded. See {@link ICompleteUploadArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated file object.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the file object does not exist.
 */
async function completeUpload(root: undefined, args: ICompleteUploadArgs, context: Context): Promise<IFileObject> {
  if(context.user) {
    const fileObject = await FileObjects.findOne({_id: args.objectId});
    if(fileObject && fileObject.owner == context.user.id) {
      const head = await s3.headObject({Key: fileObject.key, Bucket: process.env.BUCKET_NAME}).promise();
      const user = await Users.findOneAndUpdate({_id: context.user.id}, {$inc: {usedBytes: head.ContentLength}}, {new: true});
      if(user && !canUpload(user)) {
        void createNotification("You have reached your file upload cap. In order to upload more files, you will need to delete old ones.", "warning-sign", user._id);
      }
      return FileObjects.findOneAndUpdate({_id: args.objectId}, {$set: {finishedUploading: true, size: head.ContentLength}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

/**
 * Arguments for {@link copyFile}.
 */
interface ICopyFileArgs {
  /** The IDs of the file objects to copy. */
  objectIds: string[],
  /** The ID of the file object to copy to. */
  parent: string,
}

/**
 * Copies an array of file objects to a new parent.
 * 
 * @param root Unused.
 * @param args The arguments to be used to copy the file objects. See {@link ICopyFileArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the new file objects.
 * 
 * @throws Throws an error if any of the file objects do not exist.
 * @throws Throws an error if the user does not have write permissions to the target planet.
 * @throws Throws an error if trying to copy across components.
 * @throws Throws an error if trying to copy into a file.
 */
async function copyFile(root: undefined, args: ICopyFileArgs, context: Context): Promise<IFileObject[]> {
  const objects = await FileObjects.find({_id: {$in: args.objectIds}});
  const newParent = await FileObjects.findOne({_id: args.parent});
  if(objects && objects[0] && objects.length == objects.length)  {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, objects[0].planet)) {
      if((newParent && newParent.type == "folder") || args.parent == "root") {
        if(objects[0].componentId == newParent?.componentId || args.parent == "root" && objects.filter((file) => file.componentId == objects[0].componentId).length == objects.length) {
          const updatedObjects: IFileObject[] = [];
          for(const object of objects) {
            if(object.type == "file" && object.finishedUploading == true) {
              const newPath = newParent ? newParent.path.concat([newParent._id]) : ["root"];
              const newObjectParent = newParent ? newParent._id : "root";
              const document = new FileObjects({
                path: newPath,
                parent: newObjectParent,
                name: object.name,
                planet: object.parent,
                componentId: object.componentId,
                owner: context.user.id,
                createdAt: new Date(),
                type: "file",
                fileType: object.fileType,
                finishedUploading: true,
                size: object.size
              });
              await document.save();
              if(object.size) {
                await Users.findOneAndUpdate({_id: context.user.id}, {$inc: {usedBytes: object.size}});
              }
              const key = object.componentId + "/" + newObjectParent + "/" + document._id + "/" + object.name;
              await s3.copyObject({CopySource: `${process.env.BUCKET_NAME}/${object.key}`, Bucket: process.env.BUCKET_NAME, Key: key}).promise();
              updatedObjects.push(await FileObjects.findOneAndUpdate({_id: document._id}, {$set: {key}}, {new: true}));
            }
          }
          return updatedObjects;
        } else {
          throw new Error ("Cannot copy across components.");
        }
      } else {
        throw new Error ("Invalid destination.");
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link uploadCustomEmoji}.
 */
interface IUploadCustomEmojiArgs {
  /** The name of the custom emoji. */
  name: string
  /** The MIME type of the file. */
  type: string
  /** The file size. */
  size: number
  /** The ID of the planet to add the custom emoji to. Do not include if creating an emoji for the current user. */
  planetId?: string
}

/**
 * Creates a new custom emoji and a signed URL to upload the emoji to.
 * 
 * @param root Unused.
 * @param args The arguments to be used to upload the custom emoji. See {@link IUploadCustomEmojiArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the signed URL.
 * 
 * @throws Throws an error if the image is too large.
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the file is not a valid image.
 * @throws Throws an error if the name is invalid.
 * @throws Throws an error if the user does not have write permissions to the target planet.
 * @throws Throws an error if the maximum number of custom emojis has been reached.
 * @throws Throws an error if the name is already in use.
 */
async function uploadCustomEmoji(root: undefined, args: IUploadCustomEmojiArgs, context: Context): Promise<string> {
  if(args.size > 8000000) {
    throw new Error("Image too big.");
  }

  if(!context.user) {
    throw new Error("Not logged in.");
  }

  if(!mimeTypes.imageTypes.includes(args.type)) {
    throw new Error("Invalid file type.");
  }

  if(!/^\w+$/.test(args.name)) {
    throw new Error("Invalid emoji name.");
  }  

  if(args.planetId && !(await permissions.checkFullWritePermission(context.user.id, args.planetId))) {
    throw new Error("Planet not found.");
  }

  if(args.planetId && await CustomEmojis.countDocuments({planet: args.planetId}) > 50) {
    throw new Error("You have reached the maximum amount of emojis.");
  } else if(!args.planetId && await CustomEmojis.countDocuments({user: context.user.id}) > 50) {
    throw new Error("You have reached the maximum amount of emojis.");
  }

  if(args.planetId && await CustomEmojis.findOne({planet: args.planetId, name: args.name})) {
    throw new Error("That emoji already exists.");
  } else if(!args.planetId && await CustomEmojis.findOne({user: context.user.id, name: args.name})) {
    throw new Error("That emoji already exists.");
  }

  const emoji = new CustomEmojis({
    name: args.name,
    owner: context.user.id,
    planet: args.planetId ? args.planetId : null,
    user: args.planetId ? null : context.user.id
  });

  await emoji.save();

  const url = s3.getSignedUrl("putObject", {
    Bucket: process.env.BUCKET_NAME,
    Key: "customemojis/" + emoji._id,
    Expires: 120,
    ContentType: args.type,
    ACL: "public-read"
  });
  
  await CustomEmojis.findOneAndUpdate({_id: emoji._id}, {$set: {url: process.env.BUCKET_ENDPOINT + "/" + process.env.BUCKET_NAME + "/customemojis/" + emoji._id}});

  return url;
}


export default {uploadCustomEmoji, uploadProfileBanner, copyFile, completeUpload, uploadProfilePicture, uploadMarkdownImage, downloadFileObject, downloadFolderObject, getObjectPreview, uploadFileObject, deleteFileObject};