require('dotenv').config(); 
const mongoose = require("mongoose");

mongoose.connect(process.env.DB_URL, {
   useNewUrlParser: true,
   serverSelectionTimeoutMS: 15000,
   autoIndex: false,
   maxPoolSize: 10,
   socketTimeoutMS: 45000,
   family: 4

})
   .then(() => {
      console.log('MongoDB connected successfully');
   })
   .catch((err) => {
      console.error('MongoDB CONNECTION ERROR =>>: ', err);
   });