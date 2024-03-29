import { Router, Request, Response } from "express";
import IUserToken from "../util/IUserToken";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";
import yn from "yn";
import Users from "../database/Users";
import FileObjects from "../database/components/files/FileObjects";
import permissions from "../util/permissions";
import archiver from "archiver";
import MultiObjectTickets from "../database/components/files/MultiObjectTickets";

const download = Router();

const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_ACCESS_SECRET,
  s3ForcePathStyle: yn(process.env.BUCKET_FORCE_PATH_STYLE)
});


async function downloadFolder(req: Request, res: Response) {
  if(!req.params.ticket) {
    res.status(400).json({
      error: "400 Bad Request",
      reason: "No ticked specified"
    });
  }

  const ticket = await MultiObjectTickets.findOneAndDelete({_id: req.params.ticket}); 
 
  if(!ticket) {
    res.status(404).json({
      error: "404 Not Found",
      reason: "Invalid ticket"
    });
  }

  const files = await FileObjects.find({_id: {$in: ticket.objects}});

  if(!files[0]) {
    res.status(404).json({
      error: "404 Not Found",
      reason: "No files to download"
    });
    return;
  }

  // actually download the files
  const archive = archiver("zip", {store: true});
  
  archive.on('error', function() {
    res.status(500).send("500 Internal Server Error");
    return;
  }); 
  
  res.type("application/zip");
  res.attachment(ticket.name ? ticket.name + ".zip" : "download.zip");

  archive.pipe(res);

  const file = files.pop();

  if(file && file.key) {
    const stream = s3.getObject({Bucket: process.env.BUCKET_NAME, Key: file.key}).createReadStream();
    archive.append(stream, {name: file.name});
  }

  archive.on('entry', function() {
    const file = files.pop();

    if(file && file.key) {
      const stream = s3.getObject({Bucket: process.env.BUCKET_NAME, Key: file.key}).createReadStream();
      archive.append(stream, {name: file.name});
    } else {
      archive.finalize();
    }
  })

}

download.get("/download/:ticket", (req, res) => {
  downloadFolder(req, res).catch((e) => {
    console.log(e);
  });
});

download.get("/", (_, res) => {
  res.status(200).json({
    routes: ["/files/download/:ticket"]
  });
});

export default download;
