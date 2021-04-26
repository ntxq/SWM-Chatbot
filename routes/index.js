const express = require("express");
const router = express.Router();
const path = require("path");
const jwt = require("jsonwebtoken");
const libKakaoWork = require("../lib/kakaoWork");
const scheduleManager = require("../lib/scheduleQueue").scheduleManager;

const initialMemssage = require("../messages/initialMessage.json");
const resultMessage = require("../messages/resultMessage.json");

//todo NorangBerry 제대로 된 거 만들기
const DEBUG = 1;
if (DEBUG === 1) {
  router.all("*", (req, res, next) => {
    console.log(`URL\n${req.url}\n\n`);
    console.log(`HEADER\n${JSON.stringify(req.headers, null, 2)}\n\n`);
    console.log(`BODY\n${JSON.stringify(req.body, null, 2)}\n\n`);
    next();
  });
}

//타이머 시작
scheduleManager.startTimer();

//Production에서는 router.post("/chatbot", ...)로 변경
router.get("/", async (req, res) => {
  //const users = await libKakaoWork.getUserListAll();
  //곽병곤: 2603836
  //최준영: 2628054
  const users = [{ id: 2628054 }, { id: 2603836 }];

  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );

  const tokens = conversations.map((conversation, index) => {
    const token = jwt.sign(
      { conversation, userId: users[index].id },
      process.env.SECRET
    );
    const tokenURL = token
      .split(".")
      .map((val, i) => "tokenPart" + i + "=" + val)
      .join("&");

    return { tokenURL, conversation };
  });

  await Promise.all([
    tokens.map(({ tokenURL, conversation }) => {
      const message = libKakaoWork.formatMessage(initialMemssage, {
        RegisterURL: "https://" + req.headers.host + "/register?" + tokenURL,
        myScheduleURL:
          "https://" + req.headers.host + "/mySchedule?" + tokenURL,
      });

      libKakaoWork.sendMessage({
        conversationId: conversation.id,
        ...message,
      });
    }),
  ]);

  res.end();
});

router.get("/register", (req, res) => {
  const query = req.query;
  const token = [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(
    "."
  );

  res.cookie("token", token);

  res.sendFile(path.join(__dirname, "/../views/register.html"));
});

router.get("/mySchedule", (req, res) => {
  const query = req.query;
  const token = [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(
    "."
  );

  res.cookie("token", token);

  res.sendFile(path.join(__dirname, "/../views/mySchedule.html"));
});

router.get("/all_schedule", (req, res) => {
  //SQL쿼리
  //HTML 생성
  res.send("<div>여기에 일정 표시 해줘야함</div>");
});

//일정 삭제
router.get("/delete", (req, res) => res.send("일정 지울 수 있게 하기"));

module.exports = router;
