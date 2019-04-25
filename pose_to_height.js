//* The idea is to use poseNet to get the closest person's head position
//* Then send the data to Arduino MKR
//* Arduino will light up a strip of neoPiexl light wihch is close to your personal height

//* set the video from web camera and poseNet
let video;
let poseNet;

//* set the closet nose and eye position
let c_noseX = 0;
let c_noseY = 0;
let c_eyelX = 0;
let c_eyelY = 0;
let c_head_pos_X = 0;
let c_head_pos_Y = 0;

//*set the original nose and eye position
let nose_X = [];
let nose_Y = [];
let eye_X = [];
let eye_Y = [];

//*set the distance from nose to eye
let distance = [];
let max_index;
let max_distance;

//*set the mkr board as a receiver
const serviceUuid = "5725fe87-a47a-4992-8b55-416347f9e9ca";
const characteristicsUUID_Recevier = {
  pixelHeight: "19b10014-e8f2-537e-4f6c-d104768a1214"
};
let pixelHeight_Characteristic;
let myBLE;

function setup() {
  //*create a new ble function
  myBLE = new p5ble(); // ! here comes the problem

  //*create a button for ble connection
  const connectButton_Receive = createButton("Connect");
  connectButton_Receive.mousePressed(connectToBle);

  //*init the ml5
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.hide();
  poseNet = ml5.poseNet(video, "multiple", modelReady);
  poseNet.on("pose", gotPoses);
}

//*call back function for poseNet
function modelReady() {
  console.log("model ready");
}

//*connect to BLE
function connectToBle() {
  myBLE.connect(serviceUuid, gotCharacteristics);
}

//*match the characteristics
function gotCharacteristics(error, characteristics) {
  if (error) console.log("error: ", error);
  // console.log("characteristics: ", characteristics);
  for (let i = 0; i < characteristics.length; i++) {
    if (characteristics[i].uuid == characteristicsUUID_Recevier.pixelHeight) {
      pixelHeight_Characteristic = characteristics[i];
    } else {
      console.log("nothing");
    }
  }
}

//*got the poses from muti people and find the nearest person to the camera
//*by caculate the dis,final get the head's positon in the camera canvas.

function gotPoses(poses) {
  //   console.log(poses);
  nose_X = [];
  nose_Y = [];
  eye_X = [];
  eye_Y = [];
  distance = [];

  if (poses.length > 0) {
    for (let i = 0; i < poses.length; i++) {
      nose_X[i] = poses[i].pose.keypoints[0].position.x;
      nose_Y[i] = poses[i].pose.keypoints[0].position.y;
      eye_X[i] = poses[i].pose.keypoints[1].position.x;
      eye_Y[i] = poses[i].pose.keypoints[1].position.y;
      for (let j = 0; j < nose_X.length; j++) {
        distance[j] = dist(nose_X[j], nose_Y[j], eye_X[j], eye_Y[j]);

        //* get the index of the closest one in the distance array
        max_index = distance.indexOf(Math.max.apply(Math, distance));
        max_distance = Math.max.apply(Math, distance);
        // console.log(max_distance);
        let head_dis = (max_distance / 2) * 1.732 * 4;

        let c_nose_score = poses[max_index].pose.keypoints[0].score;
        let c_eye_score = poses[max_index].pose.keypoints[1].score;

        if (c_nose_score > 0.9 && c_eye_score > 0.9) {
          let nX = poses[max_index].pose.keypoints[0].position.x;
          let nY = poses[max_index].pose.keypoints[0].position.y;
          // let eX = poses[max_index].pose.keypoints[1].position.x;
          // let eY = poses[max_index].pose.keypoints[1].position.y;
          let head_pos_Y = nY - head_dis;

          c_noseX = lerp(c_noseX, nX, 0.5);
          c_noseY = lerp(c_noseY, nY, 0.5);
          // c_eyelX = lerp(c_eyelX, eX, 0.5);
          // c_eyelY = lerp(c_eyelY, eY, 0.5);
          c_head_pos_Y = lerp(c_head_pos_Y, head_pos_Y, 0.5);

          //* send the height data to mkr
          console.log(c_head_pos_Y);
        } else {
          //* send 0 data to mkr
          console.log("data inaccuracy");
        }
      }
    }
  } else {
    //* send 0 data to mkr
    console.log("no person here");
  }
}

function writeToBle() {
  myBLE.write(pixelHeight_Characteristic, c_head_pos_Y);
}

function draw() {
  image(video, 0, 0);

  fill(255, 0, 0);
  ellipse(c_noseX, c_head_pos_Y, max_distance);
}
