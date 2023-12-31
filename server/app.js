const express = require("express");
const fs = require('fs');
const path = require("path");
const app = express();
const port = 3000;
const RecordManager = require("./recordManager");
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/record', express.static(__dirname + '/public/output/recording'));

const tk = "4c3539527a6e53444164356c7035534f433478696a334a426b567754547754";
const _adapt = (from, to) => str => Buffer.from(str, from).toString(to);
const utf8ToHex = _adapt('utf8', 'hex');

app.get('/', (req, res) => {
  res.send('API Rec');
});
app.post("/recorder/v1/start", (req, res, next) => {
  let { body } = req;
  let { appId, channelName, channelKey } = body;
  if (!appId) {
    throw new Error("appid is mandatory");
  }
  if (!channelName) {
    throw new Error("channel is mandatory");
  }

  RecordManager.start(channelKey, appId, channelName)
    .then((recorder) => {
      //start recorder success
      res.status(200).json({
        success: true,
        sid: recorder.sid,
      });
    })
    .catch((e) => {
      //start recorder failed
      res.status(402).json({success: false, message: e.message});
    });
});

app.post("/recorder/v1/stop", (req, res, next) => {
  let { body } = req;
  let { sid } = body;
  if (!sid) {
    throw new Error("sid is mandatory");
  }
  try {
    RecordManager.stop(sid);
    res.status(200).json({
      success: true,
    });
  } catch(e) {
    res.status(402).json({success: false});
  }

});

app.get("/recorder/v1/file/:path", async (req, res, next) => {
  const { path } = req.params;
  try {
    if (!path) throw new Error('Undefined param');
    const file = await RecordManager.onGetFile(path.trim());
    if (!file) throw new Error("File not found");
    return res.status(200).json({
      success: true,
      path: file,
      streamURL: `/stream/${path}/v.mp4`
    });
  } catch (er) {
    return res.json({
      success: false,
      message: er.message,
      path: null
    });
  }

});

app.delete("/recorder/v1/file/:channel", async (req, res, next) => {
  const { channel } = req.params;
  try {
    const { token } = req.query;
    if (!token || tk !== utf8ToHex(token.trim())) throw new Error('Not found or Invalid cridential');
    if (!channel) throw new Error('Undefined param');
    await RecordManager.onRemoveChannel(channel.trim());
    return res.status(200).json({
      success: true,
      channel: channel
    });
  } catch (er) {
    console.log(`Error on remove channel: ${channel}`);
    return res.json({
      success: false,
      message: er.message
    });
  }
});

app.get('/recorder/channels', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token || tk !== utf8ToHex(token.trim())) throw new Error('Not found or Invalid cridential');
    const channels = await RecordManager.getAllChannel();
    return res.status(200).json({
      success: true,
      lists: channels ?? []
    });
  } catch (er) {
    return res.json({
      success: false,
      message: er.message
    });
  }
});

app.get('/stream/:channelName/v.mp4', async (req, res) => {
  try {
    const { channelName } = req.params;
    const recordingPath = "public/output/recording";
    const storagePath = path.resolve(__dirname, `${recordingPath}/${channelName}`);
    const folderExists = fs.existsSync(storagePath);
    if (!folderExists) throw new Error('Le channel n\'exist pas');
    const files = fs.readdirSync(storagePath);
    let videoFileName = "";
    for (const file of files) {
      if (path.extname(file) == ".mp4") {
        videoFileName = file;
        break;
      }
    }
    if (!videoFileName) throw new Error('Fichier videos n\'exist pas');

    const filepath = `${storagePath}/${videoFileName}`;
    const { size } = fs.statSync(filepath);
    const readStreamfile = fs.createReadStream(filepath, {
      hightWaterMark: 60
    });
    readStreamfile.pipe(res);
  } catch(er) {
    res.json({
      success: false,
      message: er.message
    });
  }

});

app.use((err, req, res, next) => {port
  console.error(err.stack);
  res.status(500).json({
    success: false,
    err: err.message || "generic error",
  });
});

app.listen(port);
