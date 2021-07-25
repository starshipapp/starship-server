/* eslint-disable @typescript-eslint/naming-convention */
import yn from "yn";
import AWS from "aws-sdk";
import FileObjects, { IFileObject } from "../database/components/files/FileObjects";
import Users from "../database/Users";
import Files from "../database/components/files/Files";

const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_ACCESS_SECRET,
  s3ForcePathStyle: yn(process.env.BUCKET_FORCE_PATH_STYLE)
});

// mongoose doesn't like it when it's promises are voided, so we need to wrap it
// we can't *actually* await these in deleteFileObject because it'd stall the function
async function workaroundVoidNoopBug(value: IFileObject) {
  await Users.updateOne({_id: value.owner}, {$inc: {usedBytes: -1 * value.size}}, {new: true});
}

/**
 * Function for deleting a file component. Removes all files from AWS and MongoDB.
 * 
 * @param componentId The id of the component to delete.
 * 
 * @returns A promise that resolves when the component is fully deleted.
 */
async function deleteFileComponent(componentId: string): Promise<void> {
  // delete everything from s3
  const filesToCheck = await FileObjects.find({componentId});
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
  await FileObjects.deleteMany({componentId});
  await Files.deleteOne({_id: componentId});
}

export default deleteFileComponent;