const dotenv = require("dotenv");
dotenv.config();
require("./monogconfig");

const express = require("express");
const admin = require('firebase-admin');
const app = express();
const cors = require("cors");

const corsOptions = {
    origin: "*", // Allowed origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*', // Allow all headers
    credentials: true,
    optionsSuccessStatus: 200, // for legacy browsers
}

app.use(cors(corsOptions));

app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ extended: true }));

const serviceAccount = require('../otpdemo-dc63b-firebase-adminsdk-fbsvc-bc859b783f.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body } = req.body;

    const message = {
      token,
      notification: { title, body },
      webpush: {
        fcmOptions: {
          link: 'http://localhost:3000'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.send({ success: true, response });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: err.message });
  }
});

const PORT = process.env.REACT_APP_SERVER_DOMIN || 5000; 

app.get("/", (req, res) => {
    res.json({
        msg: 'Hello World',
        status: 200,
    });
});

app.use("/api/vendor", require("./route/VendorRoute"));
app.use("/api/offer", require("./route/OfferRoute"));
app.use("/api/user", require("./route/UserRoute"));



const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;