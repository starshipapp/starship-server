import nodemailer from "nodemailer";
import yn from "yn";
import { readFileSync } from "fs";
import { v4 } from "uuid";
import Users, { IUser } from "../database/Users";
import Loggers from "../Loggers";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE == "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // generated ethereal user
    pass: process.env.SMTP_PASSWORD, // generated ethereal password
  },
});

let verifyTemplateHTML = "";
let verifyTemplateText = "";
let forgotTemplateHTML = "";
let forgotTemplateText = "";

if(!yn(process.env.DEVELOPMENT)) {
  verifyTemplateHTML = readFileSync("dist/templates/verify-email/html.html", "utf8");
  verifyTemplateText = readFileSync("dist/templates/verify-email/text.txt", "utf8");
  forgotTemplateHTML = readFileSync("dist/templates/forgot-password/html.html", "utf8");
  forgotTemplateText = readFileSync("dist/templates/forgot-password/text.txt", "utf8");
} else {
  verifyTemplateHTML = readFileSync("src/templates/verify-email/html.html", "utf8");
  verifyTemplateText = readFileSync("src/templates/verify-email/text.txt", "utf8");
  forgotTemplateHTML = readFileSync("src/templates/forgot-password/html.html", "utf8");
  forgotTemplateText = readFileSync("src/templates/forgot-password/text.txt", "utf8");
}

/**
 * Sends a verification email to a user.
 * 
 * @param document The user document.
 * 
 * @returns A promise that resolves to true if the email was sent successfully.
 */
export async function sendVerificationEmail(document: IUser): Promise<boolean> {
  const verificationToken = v4();
  const siteUrl = process.env.SITE_URL + "/verify/" + document._id + ":token:" + verificationToken;
  const updatedDocument = await Users.findOneAndUpdate({_id: document._id, emails: {$elemMatch: {verified: false}}}, {$set: {"emails.$.verificationToken": verificationToken}}, {new: true});
  const unverifiedEmails = updatedDocument.emails.filter((value) => {return value.verified == false;});
  const updatedTemplateText = verifyTemplateText.replace("$username", updatedDocument.username).replace("$url", siteUrl);
  const updatedTemplateHTML = verifyTemplateHTML.replace("$username", updatedDocument.username).replace("$url", siteUrl);
  // i guess @types/nodemailer doesn't have types for these?
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  if(yn(process.env.DEVELOPMENT)) {
    Loggers.debugLogger.debug("verification email requested:");
    Loggers.debugLogger.debug(`uid: ${document._id ?? ""}`);
    Loggers.debugLogger.debug(`token:  ${verificationToken}`);
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: unverifiedEmails[0].address,
    subject: "Verify your email",
    text: updatedTemplateText,
    html: updatedTemplateHTML,
  });
  return true;
}

/**
 * Sends a password reset email to a user.
 * 
 * @param document The user document.
 * 
 * @returns A promise that resolves to true if the email was sent successfully.
 */
export async function sendForgotPasswordEmail(document: IUser): Promise<boolean> {
  const verificationToken = v4();
  const resetUrl = process.env.SITE_URL + "/forgot/" + document._id + ":token:" + verificationToken;
  const expiryDate = new Date(new Date().getTime() + 86400000);
  const updatedDocument = await Users.findOneAndUpdate({_id: document._id}, {$set: {services: {password: {bcrypt: document.services.password.bcrypt, resetToken: verificationToken, resetExpiry: expiryDate}}}});
  const updatedTemplateText = forgotTemplateText.replace("$username", updatedDocument.username).replace("$url", resetUrl);
  const updatedTemplateHTML = forgotTemplateHTML.replace("$username", updatedDocument.username).replace("$url", resetUrl);
  // i guess @types/nodemailer doesn't have types for these?
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  if(yn(process.env.DEVELOPMENT)) {
    Loggers.debugLogger.debug("password reset requested:");
    Loggers.debugLogger.debug(`uid: ${document._id}`);
    Loggers.debugLogger.debug(`token: ${verificationToken}`);
    Loggers.debugLogger.debug(`url: ${resetUrl}`);
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: updatedDocument.emails[0].address,
    subject: "Reset your password",
    text: updatedTemplateText,
    html: updatedTemplateHTML,
  });
  return true;
}