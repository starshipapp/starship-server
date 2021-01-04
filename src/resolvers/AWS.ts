// AWS demands casing
/* eslint-disable @typescript-eslint/naming-convention */
import AWS from "aws-sdk";
import yn from "yn";
import FileObjects from "../database/components/files/FileObjects";
import Files from "../database/components/files/Files";
import Loggers from "../Loggers";
import Context from "../util/Context";
import permissions from "../util/permissions";

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
    if(await permissions.checkReadPermission(context.user.id, file.planet)) {
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
    if(await permissions.checkReadPermission(context.user.id, file.planet)) {
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
    if(await permissions.checkReadPermission(context.user.id, file.planet)) {
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

async function deleteFileObject(root: undefined, args: IDeleteFileObjectArgs, context: Context): Promise<boolean> {
  const file = await FileObjects.findOne({_id: args.objectId});
  if(file) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, file.planet)) {
      if(file.key) {
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
        });
        keys.map((value) => {
          s3.deleteObjects({Bucket: process.env.BUCKET_NAME, Delete: {Objects: value}}, function(err) {
            if (err) console.log(err, err.stack);  // error
          });
        });
        await FileObjects.remove({path: file._id});
      }
      await FileObjects.findOneAndRemove({_id: file._id});
      return true;
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {downloadFileObject, downloadFolderObject, getObjectPreview, uploadFileObject, deleteFileObject};