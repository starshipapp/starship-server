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

Loggers.awsLogger.info("Connecting to AWS");
const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_ACCESS_SECRET,
  s3ForcePathStyle: yn(process.env.BUCKET_FORCE_PATH_STYLE)
});
Loggers.awsLogger.info("Connected to AWS");

interface IDownloadFileObjectArgs {
  fileId: string
}

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

interface IDownloadFolderObjectArgs {
  folderId: string
}

async function downloadFolderObject(root: undefined, args: IDownloadFolderObjectArgs, context: Context): Promise<string[]> {
  const file = await FileObjects.findOne({_id: args.folderId});
  if(file && file.type == "folder") {
    if(await permissions.checkReadPermission(context.user?.id ?? null, file.planet)) {
      const urls: string[] = [];
      const files = await FileObjects.find({parent: args.folderId});
      files.map((value) => {
        urls.push(s3.getSignedUrl("getObject", {
          Bucket: process.env.BUCKET_NAME,
          Key: value.key,
          Expires: 3600,
          ResponseContentDisposition: "attachment; filename=\"" + value.name + "\""
        }));
      });
      return urls;
    } else {
      throw new Error("Not found.");
    }
  } else { 
    throw new Error("Not found.");
  }
}

interface IGetObjectPreviewArgs {
  fileId: string
}

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

interface IUploadFileObjectArgs {
  folderId: string,
  type: string,
  name: string,
  filesId: string
}

interface IUploadFileData {
  documentId: string,
  uploadUrl: string
}

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

interface IDeleteFileObjectArgs {
  objectId: string
}

// mongoose doesn't like it when it's promises are voided, so we need to wrap it
// we can't *actually* await these in deleteFileObject because it'd stall the function
async function workaroundVoidNoopBug(value: IFileObject) {
  await Users.updateOne({_id: value.owner}, {$inc: {usedBytes: -1 * value.size}}, {new: true});
}

async function deleteFileObject(root: undefined, args: IDeleteFileObjectArgs, context: Context): Promise<boolean> {
  const file = await FileObjects.findOne({_id: args.objectId});
  if(file) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, file.planet)) {
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
      await FileObjects.findOneAndDelete({_id: file._id});
      return true;
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IImageUploadArgs {
  type: string
  size: number
}

interface IUploadMarkdownImageData {
  finalUrl: string
  uploadUrl: string
}

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

interface ICompleteUploadArgs {
  objectId: string
}

async function completeUpload(root: undefined, args: ICompleteUploadArgs, context: Context): Promise<IFileObject> {
  if(context.user) {
    const fileObject = await FileObjects.findOne({_id: args.objectId});
    if(fileObject && fileObject.owner == context.user.id) {
      const head = await s3.headObject({Key: fileObject.key, Bucket: process.env.BUCKET_NAME}).promise();
      await Users.findOneAndUpdate({_id: context.user.id}, {$inc: {usedBytes: head.ContentLength}});
      return FileObjects.findOneAndUpdate({_id: args.objectId}, {$set: {finishedUploading: true, size: head.ContentLength}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

export default {completeUpload, uploadProfilePicture, uploadMarkdownImage, downloadFileObject, downloadFolderObject, getObjectPreview, uploadFileObject, deleteFileObject};