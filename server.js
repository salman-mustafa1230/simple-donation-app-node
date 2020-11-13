require("dotenv").config({ path: require("find-config")(".env") });
const request = require("request");
const express = require("express");

const app = new express();

const nodemailer = require("nodemailer");

let smtpTransport = require("nodemailer-smtp-transport");
const path = require("express");
const http = require("http");
const paypal = require("paypal-rest-sdk");
const { messageId } = require("nodemailer");
const { sendMail } = require("nodemailer");

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false }));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.use(express.static("views"));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views/index.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views/about.html"));
});
app.get("/contact", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views/contact.html"));
});

app.get("/training", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views/training.html"));
});
app.get("/video", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views/video.html"));
});
app.listen(3030, () => {
  console.log("App listening on port 3030");
});

// Chunk 1
// body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // this is to handle URL encoded data
// end parser middleware

// custom middleware to log data access
const log = function (request, response, next) {
  console.log(
    `${new Date()}: ${request.protocol}://${request.get("host")}${
      request.originalUrl
    }`
  );
  console.log(request.body); // make sure JSON middleware is loaded first
  next();
};
app.use(log);
// end custom middleware

// enable static files pointing to the folder "views"
// this can be used to serve the index.html file

// HTTP POST

app.post("/sendmail", function (request, response) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport(
    smtpTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      service: "gmail",
      auth: {
        type: "OAUTH2",
        user: process.env.GMAIL_USERNAME, //set these in your .env file
        pass: process.env.GMAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken: process.env.OAUTH_ACCESS_TOKEN,
        expires: 3599,
      },
    })
  );

  const text = `FROM: ${request.body.name}\nEMAIL: ${request.body.email}\nMESSAGE: ${request.body.message}`;
  const html = `<h2>Contact Form</h2><p>from: ${request.body.name} <a href="mailto:${request.body.email}">${request.body.email}</a></p><p>${request.body.message}</p>`;
  let mail = {
    from: `"${request.body.name}" <${request.body.email}>`, // sender address
    to: "asociacioncorazondiverso@gmail.com", // list of receivers (THIS COULD BE A DIFFERENT ADDRESS or ADDRESSES SEPARATED BY COMMAS)
    subject: "Contact Form", // Subject line
    text: text,
    html: html,
  };

  // send mail with defined transport object
  transporter.sendMail(mail, function (err, info) {
    if (err) {
      console.log(err);
      response.json({
        message:
          "message not sent: an error occurred; check the server's console log",
      });
    } else {
      response.json({ message: "message sent: ${messageId}" });
    }
  });

  // Add your credentials:
  // Add your client ID and secret
  paypal.configure({
    mode: "live",
    client_id: "AT30P5Vyi-tKTeG71nhAPzwGFeKTBfrLrZKQdQ20ZP4lHss",
    client_secret: "EO5reAmueLcE2uEY_CIWCjZNsGcmJJosfsf",
  });
});
app.get("/donate", (req, res) => res.sendFile(__dirname + "/donate.html"));
app.post("/", (req, res) => {
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: "https://asociacioncorazondiverso.org/donate.html",
      cancel_url: "https://asociacioncorazondiverso.org/donate.html",
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: "Donación",
              sku: "001",
              price: "10.00",
              currency: "USD",
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: "USD",
          total: "10.00",
        },
        description: "Donación",
      },
    ],
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === "approval_url") {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

app.get("/success", (req, res) => {
  const payerId = req.query.payerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: "5.00",
        },
      },
    ],
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (
    error,
    payment
  ) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log(JSON.stringify(payment));
      res.send("Success");
    }
  });
});
