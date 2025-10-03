const dotenv = require("dotenv");
dotenv.config();
require("./monogconfig"); // check spelling

const express = require("express");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "2000mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    msg: "Hello World",
    status: 200,
  });
});

app.use("/api", require("./route/VendorRoute"));
app.use("/api", require("./route/OfferRoute"));
app.use("/api", require("./route/UserRoute"));
app.use("/api", require("./route/salesRoute"));
app.use("/api", require("./route/AdminRoute"));


const server = app.listen(PORT, () =>
  console.log("Server is running at port : " + PORT)
);
server.timeout = 360000;



// const serviceAccount = require('../otpdemo-dc63b-firebase-adminsdk-fbsvc-bc859b783f.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// app.post('/send-notification', async (req, res) => {
//   try {
//     const { token, title, body } = req.body;

//     const message = {
//       token,
//       notification: { title, body },
//       webpush: {
//         fcmOptions: {
//           link: 'http://localhost:3000'
//         }
//       }
//     };

//     const response = await admin.messaging().send(message);
//     res.send({ success: true, response });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ success: false, error: err.message });
//   }
// });

