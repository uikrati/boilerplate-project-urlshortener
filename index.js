const express = require('express');
require('dotenv').config();
const dns = require('dns');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(`${__dirname}/public`));
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true
});

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: {
    type: Number,
    required: true,
    default: 0
  }
});
const Url = mongoose.model('Url', urlSchema);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`);
});

app.post('/api/shorturl', (req, res) => {
  const urlRequest = req.body.url;
  const hostname = urlRequest
    .replace(/http[s]?\:\/\//, '')
    .replace(/\/(.+)?/, '');
  dns.lookup(hostname, async (lookupErr, addresses) => {
    if (!addresses) {
      res.json({ error: 'invalid URL' });
    } else {
      try {
        let urlFound = await Url.findOne({ original_url: urlRequest });
        if (!urlFound) {
          const count = await Url.estimatedDocumentCount();
          urlFound = new Url({
            original_url: urlRequest,
            short_url: count + 1
          });
          await urlFound.save();
        }
        res.json({
          original_url: urlFound.original_url,
          short_url: urlFound.short_url
        });
      } catch (error) {
        res.status(500).json({ error: 'server error' });
      }
    }
  });
});

app.get('/api/shorturl/:shorturl', async (req, res) => {
  const { shorturl } = req.params;
  try {
    const urlFound = await Url.findOne({ short_url: shorturl });
    if (!urlFound) {
      res.json({ error: 'no matching URL' });
    } else {
      res.redirect(urlFound.original_url);
    }
  } catch (error) {
    res.status(500).json({ error: 'server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
