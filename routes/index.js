const express = require("express");
const router = express.Router();
const path = require("path");
const jwt = require("jsonwebtoken");
const libKakaoWork = require("../lib/kakaoWork");
const scheduleManager = require("../lib/scheduleQueue").scheduleManager;

const initialMemssage = require("../messages/initialMessage.json");
const resultMessage = require("../messages/resultMessage.json");

//todo NorangBerry 제대로 된 거 만들기
const DEBUG = 0;
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
router.post("/chatbot", async (req, res) => {
  const users = await libKakaoWork.getUserListAll();
  //곽병곤: 2610813
  //최준영: 2628054
  //const users = [{ id: 2610813 }];

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
          "https://" + req.headers.host + "/schedule/my?" + tokenURL,
        allScheduleURL:
          "https://" + req.headers.host + "/schedule/public?" + tokenURL,
      });

      libKakaoWork.sendMessage({
        conversationId: conversation.id,
        ...message,
      });
    }),
  ]);

  res.end();
});

//일정 등록용 페이지
router.get("/register", (req, res) => {
  const query = req.query;
  const token = [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(
    "."
  );

  res.cookie("token", token);

  res.sendFile(path.join(__dirname, "/../views/index.html"));
});

//나의 일정 조회용 페이지
router.get("/schedule/my", (req, res) => {
  const query = req.query;
  const token = [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(
    "."
  );

  res.cookie("token", token);

  res.sendFile(path.join(__dirname, "/../views/index.html"));
});

//공개된 일정 조회용 페이지
router.get("/schedule/public", (req, res) => {
  const query = req.query;
  const token = [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(
    "."
  );

  res.cookie("token", token);

  res.sendFile(path.join(__dirname, "/../views/index.html"));
});

router.post("/callback", (req, res) => {
  const { action_name, message, value, react_user_id } = req.body;
  switch (action_name) {
    case "progress_check":
      const arr = value.split("/");
      scheduleManager.setPeriodAchieve(
        react_user_id,
        message.conversation_id,
        Number(arr[1]),
        arr[0] === "success"
      );
      break;
    default:
      break;
  }

  res.end();
});

//일정 삭제
router.get("/delete", (req, res) => res.send("일정 지울 수 있게 하기"));

module.exports = router;
