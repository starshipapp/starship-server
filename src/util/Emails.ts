import nodemailer from "nodemailer";
import yn from "yn";
import { readFileSync } from "fs";
import { v4 } from "uuid";
import Users, { IUser } from "../database/Users";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: yn(process.env.SMTP_SECURE), // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // generated ethereal user
    pass: process.env.SMTP_PASSWORD, // generated ethereal password
  },
});

const verifyTemplateHTML = readFileSync("dist/templates/verify-email/html.html", "utf8");
const verifyTemplateText = readFileSync("dist/templates/verify-email/text.txt", "utf8");
const forgotTemplateHTML = readFileSync("dist/templates/forgot-password/html.html", "utf8");
const forgotTemplateText = readFileSync("dist/templates/forgot-password/text.txt", "utf8");

export async function sendVerificationEmail(document: IUser): Promise<boolean> {
  const verificationToken = v4();
  const siteUrl = process.env.SITE_URL + "/verify/" + document._id + ":token:" + verificationToken;
  const updatedDocument = await Users.findOneAndUpdate({_id: document._id, emails: {$elemMatch: {verified: false}}}, {$set: {"emails.$.verificationToken": verificationToken}}, {new: true});
  const unverifiedEmails = updatedDocument.emails.filter((value) => {return value.verified == false;});
  const updatedTemplateText = verifyTemplateText.replace("$username", updatedDocument.username).replace("$url", siteUrl);
  const updatedTemplateHTML = verifyTemplateHTML.replace("$username", updatedDocument.username).replace("$url", siteUrl);
  // i guess @types/nodemailer doesn't have types for these?
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: unverifiedEmails[0].address,
    subject: "Verify your email",
    text: updatedTemplateText,
    html: updatedTemplateHTML,
  });
  return true;
}

export async function sendForgotPasswordEmail(document: IUser): Promise<boolean> {
  const verificationToken = v4();
  const resetUrl = process.env.SITE_URL + "/forgot/" + document._id + ":token:" + verificationToken;
  const expiryDate = new Date(new Date().getTime() + 86400000);
  const updatedDocument = await Users.findOneAndUpdate({_id: document._id}, {$set: {password: {resetToken: verificationToken, resetExpiry: expiryDate}}});
  const updatedTemplateText = forgotTemplateText.replace("$username", updatedDocument.username).replace("$url", resetUrl);
  const updatedTemplateHTML = forgotTemplateHTML.replace("$username", updatedDocument.username).replace("$url", resetUrl);
  // i guess @types/nodemailer doesn't have types for these?
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: updatedDocument.emails[0].address,
    subject: "Reset your password",
    text: updatedTemplateText,
    html: updatedTemplateHTML,
  });
  return true;
}