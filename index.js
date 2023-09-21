'use strict';

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
require('dotenv').config();
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.json());
const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
});

const connection = mongoose.connection;

connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

// Create Schema
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String
});
const URL = mongoose.model("URL", urlSchema);

// Function to validate URLs
function isValidURL(url) {
  // Check if the URL follows the format http://www.example.com
  const urlRegex = /^http:\/\/www\.example\.com$/;
  return urlRegex.test(url) || stringIsAValidUrl(url);
}

// Function to validate URLs with a regex
function stringIsAValidUrl(url) {
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  return urlRegex.test(url);
}

app.post('/api/shorturl', async function (req, res) {
  const originalURL = req.body.url;

  // Check if the URL is valid using both regex and dns.lookup
  if (!stringIsAValidUrl(originalURL)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Use the dns.lookup function to verify the URL
  dns.lookup(originalURL, async (err, address) => {
    if (err) {
      return res.status(400).json({ error: 'DNS lookup failed' });
    }

    // Rest of your code for shortening URLs
    try {
      // Find the total count of documents in the database
      const count = await URL.countDocuments({});
      
      // Use the count as the short_url (sequential number)
      const urlCode = count + 1;
      
      // Check if it's already in the database
      let findOne = await URL.findOne({ original_url: originalURL });
      if (findOne) {
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        });
      } else {
        // If it's not exist yet then create a new one and respond with the result
        findOne = new URL({
          original_url: originalURL,
          short_url: urlCode.toString() // Convert the number to a string
        });
        await findOne.save();
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json('Server error...');
    }
  });
});

// The rest of your code...

app.get('/api/shorturl/:short_url', async function (req, res) {
  try {
    const urlParams = await URL.findOne({ short_url: req.params.short_url });
    if (urlParams) {
      return res.redirect(urlParams.original_url);
    } else {
      return res.status(404).json({ error: 'No URL found' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
