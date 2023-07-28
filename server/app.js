const express = require("express");
const app = express();
const port = 3000;
const RecordManager = require("./recordManager");
const bodyParser = require("body-parser");

app.use(bodyParser.json());

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
      next(e);
    });
});

app.post("/recorder/v1/stop", (req, res, next) => {
  let { body } = req;
  let { sid } = body;
  if (!sid) {
    throw new Error("sid is mandatory");
  }

  RecordManager.stop(sid);
  res.status(200).json({
    success: true,
  });
});

app.get("/recorder/v1/file/:path", (req, res, next) => {
  const { path } = req.params;
  RecordManager.onGetFile(path)
    .then((file) => {
      res.status(200).json({
        success: true,
        path: file,
      });
    })
    .catch((e) => {
      next(e);
    });
});

app.use((err, req, res, next) => {port
  console.error(err.stack);
  res.status(500).json({
    success: false,
    err: err.message || "generic error",
  });
});

app.listen(port);
