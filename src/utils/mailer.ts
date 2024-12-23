import { SafeString } from 'handlebars';
import moment from 'moment';
// import { AdminSettingsService } from '@services/adminSettings.service';
//import { EmailTemplateService } from "@services/emailTemplates.service";
import Container from 'typedi';
import { ADMIN_EMAIL, IMAGE_URL, FRONT_END_URL, S3_IMAGE_URL } from '@config';
import path from 'path';
// import { EmailTeplateController } from '@controllers/emailtemplates.controller';
const nodemailer = require('nodemailer');
// const setting = Container.get(AdminSettingsService);
//let emailTemplate = Container.get(EmailTemplateService);
const ejs = require('ejs');
const headerColor = '#ffe9e9';
const footerColor = '#b50000';
const domainName = 'Swipe Lounge';
const copyrightYear = new Date().getFullYear();

const sendEmail = async (toEmail, subject, templateName, additionalData, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      port: 587,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
      },
    });

    const defaultTemplateData = {
      domainName: domainName, 
      copyrightYear: new Date().getFullYear(),
    };

    const templateData = {
      ...defaultTemplateData,
      ...additionalData,
    };

    const templatePath = path.join(__dirname, 'templates', `${templateName}.ejs`);

    const html = await new Promise((resolve, reject) => {
      ejs.renderFile(templatePath, templateData, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject: subject,
      text: templateData.text || '', 
      html: html,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.log(error, "Email not sent");
  }
};

export const sendWelcomEmail = async (toEmail, name) => {
  const subject = `Welcome to ${domainName}`;
  const templateName = 'welcome';
  const additionalData = {
    name
  };
  await sendEmail(toEmail, subject, templateName, additionalData);
};

export const sendForgotPasswordEmail = async (toEmail, name, url) => {
  const subject = 'Request Reset Password';
  const templateName = 'forgotPassword';
  const additionalData = {
    name,
    subject,
    mainLink: url,
  };
  await sendEmail(toEmail, subject, templateName, additionalData);
};

// export const sendVerifyingUserEmail = async (toEmail, name, url) => {
//   const content = `Please verify your email`;
//   const subject = 'Request Verify Email';
//   const title = 'Verify Email';
//   const mainLink = url;

//   ejs.renderFile(
//     __dirname + '/templates/emailVerify.ejs',
//     { name, content, subject, title, mainLink, headerColor, footerColor, domainName, copyrightYear },
//     async (err, data) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: toEmail,
//           subject: subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//           ],
//           html: data,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };

// export const purchaseProduct = async details => {
//   ejs.renderFile(
//     __dirname + '/templates/purchaseProduct.ejs',
//     {
//       orderDate: moment(details.orderDate).format('Do MMM YYYY'),
//       customerName: details.customerName,
//       productName: details.productName,
//       price: details.price,
//       productImage: details.productImage,
//       transactionId: details.transactionId,
//       subject: details.subject,
//       orderId: details.orderId,
//       mailTitle: details.mailTitle,
//       email: details.email,
//       headerColor,
//       footerColor,
//       copyrightYear,
//       domainName,
//     },
//     async (err, data) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: details.email,
//           subject: details.subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//             {
//               filename: 'image.jpg',
//               path: `${S3_IMAGE_URL}${details.productImage}`,
//               cid: 'productImage', //same cid value as in the html img src
//             },
//           ],
//           html: data,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };

// export const purchaseProductToAdmin = async details => {
//   ejs.renderFile(
//     __dirname + '/templates/purchaseProductToAdmin.ejs',
//     {
//       orderDate: moment(details.orderDate).format('Do MMM YYYY'),
//       customerName: details.customerName,
//       productName: details.productName,
//       price: details.price,
//       productImage: details.productImage,
//       transactionId: details.transactionId,
//       subject: details.subject,
//       orderId: details.orderId,
//       mailTitle: details.mailTitle,
//       email: details.email,
//       headerColor,
//       footerColor,
//       copyrightYear,
//       domainName,
//     },
//     async (err, data) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: details.email,
//           subject: details.subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//             {
//               filename: 'image.jpg',
//               path: `${S3_IMAGE_URL}${details.productImage}`,
//               cid: 'productImage', //same cid value as in the html img src
//             },
//           ],
//           html: data,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };

// export const cancelSubscription = async details => {
//   ejs.renderFile(
//     __dirname + '/templates/cancel-Subscription.ejs',
//     {
//       expiryDate: moment(details.endDate).format('Do MMM YYYY'),
//       email: details.email,
//       userName: details.userName,
//       title: details.subject,
//       headerColor,
//       footerColor,
//       domainName,
//       copyrightYear,
//     },
//     async (err, data) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: details.email,
//           subject: details.subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//           ],
//           html: data,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };

// export const cancelSubscriptionToAdmin = async details => {
//   ejs.renderFile(
//     __dirname + '/templates/cancelSubscriptionToAdmin.ejs',
//     {
//       expiryDate: moment(details.endDate).format('Do MMM YYYY'),
//       email: details.email,
//       userName: details.userName,
//       userEmail: details.userEmail,
//       title: details.subject,
//       cDate: moment(details.cDate).format('Do MMM YYYY'),
//       headerColor,
//       footerColor,
//       domainName,
//       copyrightYear,
//     },
//     async (err, data) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: details.email,
//           subject: details.subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//           ],
//           html: data,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };

// export const upComingEventsNotifyEmail = async data => {
//   const subject = `Upcoming LIVE Event`;
//   const title = `Upcoming Event: ${data.title}`;
//   const content = `Dear User, An event from ${data.instrutorDetails.name} is upcoming. Dont miss the ${data.title}. See you there. `;

//   ejs.renderFile(
//     __dirname + '/templates/upcomingEvent.ejs',
//     { name: 'dd', content, subject, title, headerColor, domainName, footerColor, copyrightYear, data, moment },
//     async (err, data1) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           // to: data.notifyUsers.map((i)=>i.email),
//           to: data.notifyUsers.map(i => i.email),
//           subject: subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//           ],
//           html: data1,
//         };

//         if (mailOptions.to.length > 1) {
//           const emails = mailOptions.to;
//           delete mailOptions.to;
//           mailOptions.bcc = emails;
//         }
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };

// export const LearningEventNotifyEmail = async data => {
//   const subject = `Learning Tool Event`;
//   const title = `Learning Tool Event`;
//   const content = `Thank you for registering!`;
//   const link = `${FRONT_END_URL}/course-detail/${data.courseDetails._id}?tab=3`;
//   ejs.renderFile(
//     __dirname + '/templates/LearningEvent.ejs',
//     { name: 'dd', content, subject, title, headerColor, domainName, footerColor, copyrightYear, data, moment, link },
//     async (err, data1) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: data.userDetails.email,
//           subject: subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//           ],
//           html: data1,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };
// export const RecordedVideoUploadNotification = async (result, data) => {
//   const subject = `Live Stream Recording`;
//   const title = `Live Stream Recording`;
//   const content = `Thank you for recording live stream`;
//   const link = `${FRONT_END_URL}/go-live/history/${result[0]._id}`;
//   ejs.renderFile(
//     __dirname + '/templates/videoRecordingDownload.ejs',
//     { name: result[0].user[0].name, content, subject, title, headerColor, domainName, footerColor, copyrightYear, data, moment, link },
//     async (err, data1) => {
//       if (err) {
//         console.log(err);
//       } else {
//         const mailOptions = {
//           from: 'test@projectanddemoserver.com',
//           to: result[0].user[0].email,
//           subject: subject,
//           attachments: [
//             {
//               filename: 'image.jpg',
//               path: IMAGE_URL,
//               cid: 'logoImage',
//             },
//           ],
//           html: data1,
//         };
//         await sendEmail(mailOptions);
//       }
//     },
//   );
// };
