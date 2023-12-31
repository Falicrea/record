const AgoraRecordingSDK = require("../record/AgoraRecordSdk");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const recordingPath = "public/output/recording";
const canvasWidth = 720;
const canvasHeight = 1280;

class RecordManager {
  constructor() {
    this.recorders = {};
    //initialize output folder
    const output = path.resolve(__dirname, recordingPath);
    if (!fs.existsSync(output)) {
      fs.mkdirSync(output);
    }
  }

  //find existing recorder
  find(sid) {
    return this.recorders[sid];
  }

  initStorage(channel) {
    return new Promise((resolve, reject) => {
      const storagePath = path.resolve(
        __dirname,
        `${recordingPath}/${channel}`
      );
      fs.mkdir(storagePath, { recursive: true }, (err) => {
        if (err) {
          throw err;
        }
        resolve(storagePath);
      });
    });
  }

  start(key, appid, channel) {
    return new Promise((resolve, reject) => {
      const sid = uuidv4();
      this.initStorage(channel).then((storagePath) => {
        let sdk = new AgoraRecordingSDK();

        let layout = {
          canvasWidth: canvasWidth,
          canvasHeight: canvasHeight,
          backgroundColor: "#000000",
          regions: [],
        };
        let recorder = {
          appid: appid,
          channel: channel,
          sdk: sdk,
          sid: sid,
          layout: layout,
        };
        sdk.setMixLayout(layout);

        this.subscribeEvents(recorder);
        sdk
          .joinChannel(key || null, channel, 0, appid, storagePath)
          .then(() => {
            this.recorders[sid] = recorder;
            console.log(`recorder started ${appid} ${channel} ${sid}`);
            resolve(recorder);
          })
          .catch((e) => {
            reject(e);
          });
      });
    });
  }

  subscribeEvents(recorder) {
    let { sdk, sid, appid, channel } = recorder;
    sdk.on("error", (err, stat) => {
      console.error(`sdk stopped due to err code: ${err} stat: ${stat}`);
      console.log(`stop recorder ${channel}`);
      //clear recorder if error received
      this.onCleanup(sid);
    });
    sdk.on("userleave", (uid) => {
      console.log(`user leave ${uid}`);
      //rearrange layout when user leaves

      let recorder = this.find(sid);

      if (!recorder) {
        console.error("no recorder found");
        return;
      }
      let { layout } = recorder;
      layout.regions = layout.regions.filter((region) => {
        return region.uid !== uid;
      });
      sdk.setMixLayout(layout);
    });
    sdk.on("userjoin", (uid) => {
      //rearrange layout when new user joins
      console.log(`user join ${uid}`);
      const aspectRatio = canvasHeight / canvasWidth;
      const width = canvasHeight * aspectRatio;
      const x = (canvasWidth - width) / 2;
      let region = {
        x: x,
        y: 0,
        width: width,
        height: canvasHeight,
        uid: uid,
        alpha: 1,
        renderMode: 1,
      };
      let recorder = this.find(sid);

      if (!recorder) {
        console.error("no recorder found");
        return;
      }

      let { layout } = recorder;
      layout.regions.push(region);
      sdk.setMixLayout(layout);
    });
  }

  stop(sid) {
    let recorder = this.recorders[sid];
    if (recorder) {
      let { appid, channel } = recorder;
      console.log(`stop recorder ${appid} ${channel} ${sid}`);
      this.onCleanup(sid);
    } else {
      throw new Error("recorder not exists");
    }
  }

  onCleanup(sid) {
    let recorder = this.recorders[sid];
    if (recorder) {
      let { sdk } = recorder;
      console.log(`releasing ${sid}`);
      sdk.leaveChannel();
      sdk.release();
      delete this.recorders[`${sid}`];
    } else {
      throw new Error("recorder not exists");
    }
  }

  async onGetFile(channelName) {
    try {
      const storagePath = path.resolve(__dirname, `${recordingPath}/${channelName}`);
      const folderExists = fs.existsSync(storagePath);
      if (!folderExists) throw new Error('Le channel n\'exist pas');
      const files = fs.readdirSync(storagePath);
      for (const file of files) {
        if (path.extname(file) == ".mp4") {
          return `/record/${channelName}/${file}`;
        }
      }
    } catch(er) {
      console.log(er.message);
      return null;
    }
  }

  async onRemoveChannel(channelName) {
    const storagePath = path.resolve(__dirname, `${recordingPath}/${channelName}`);
    console.log(`Delete channel ${channelName}`);
    fs.rmdirSync(storagePath, {recursive: true, force: true});
    return true;
  }

  async getAllChannel() {
    const isFolder = fileName => {
      return !fs.lstatSync(fileName).isFile();
    };
    const storagePath = path.resolve(__dirname, recordingPath);
    return fs.readdirSync(storagePath)
      .map(fileName => {
        return path.join(storagePath, fileName);

      })
      .filter(isFolder)
      .map((pathDir) => {
        const splitPath = pathDir.split('/');
        return splitPath[splitPath.length - 1];
      });
  }
}

module.exports = new RecordManager();
