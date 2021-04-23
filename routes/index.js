const express = require("express");
const router = express.Router();
const path = require("path");
const libKakaoWork = require("../lib/kakaoWork");
const tokenLib = require("../lib/tokenLib");
const initialMessage = require("../messages/initialMessage.json");
const resultMessage = require("../messages/resultMessage.json");
const registerModal = require("../messages/registerModal.json");
const scheduleManager = require("../lib/scheduleQueue").scheduleManager;

//Production에서는 router.post("/chatbot", ...)로 변경
router.get("/", async (req, res) => {
  //타이머 시작
  scheduleManager.startTimer();

  // const users = await libKakaoWork.getUserListAll();
  //곽병곤: 2603836
  //최준영: 2628054
  const users = [{ id: 2603836 }];

  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );

  const messages = await Promise.all([
    conversations.map((conversation) => {
      tokenLib.genToken(conversation, (err, token) => {
        if (err) console.log(err);

        const tokenURL = token
          .split(".")
          .map((val, i) => "tokenPart" + i + "=" + val)
          .join("&");

        const tokenMessage = { ...initialMessage };
        libKakaoWork.formatMessage(tokenMessage, {
          RegisterURL: "https://" + req.headers.host + "/register?" + tokenURL,
        });

        libKakaoWork.sendMessage({
          conversationId: conversation.id,
          ...tokenMessage,
        });
      });
    }),
  ]);

  res.end();
});

router.post("/request", async (req, res) => {
  const { actions, message, value } = req.body;
  const modal = { view: "" };
  switch (value) {
    case "new_schedule":
      modal.view = registerModal;
      break;
    case "new_group_schedule":
      modal.view = registerGroupModal;
      break;
    default:
      break;
  }
  res.json(modal);
});

router.post("/callback", async (req, res) => {
  const { actions, message, value, react_user_id } = req.body;
  const coversationId = message.conversation_id;
  var responseMessage = {};
  switch (value) {
    case "register":
      callback.RegisterNewSchedule(actions);
      break;
    default:
      break;
  }

  res.json(responseMessage);
});

router.get("/register", (req, res) => {
  const query = req.query;

  res.cookie(
    "token",
    [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(".")
  );

  res.sendFile(path.join(__dirname, "/../views/register.html"));
});

router.post("/submit", (req, res) => {
  //토큰 추출 후 Conversation Id로 변환 => 메시지 전송
  const formToken = req.body.token;
  tokenLib.verifyToken(formToken, (err, { data }) => {
    //추가된 데이터 큐에 등록
    const newSchedule = {
      time: new Date(req.body.exp + " " + req.body.time),
      conversationId: Number(data.id),
      content: req.body.body,
      alarmPeriod: Number(req.body.period),
    };

    scheduleManager.pushSchedule(newSchedule);

    libKakaoWork.sendMessage({
      conversationId: data.id,
      ...resultMessage,
    });
  });

  res.end();
});

router.get("/my_schedule", (req, res) => {
  //SQL쿼리
  //HTML 생성
  res.send("<div>여기에 일정 표시 해줘야함</div>");
});

router.get("/all_schedule", (req, res) => {
  //SQL쿼리
  //HTML 생성
  res.send("<div>여기에 일정 표시 해줘야함</div>");
});

//일정 삭제
router.get("/delete", (req, res) => res.send("일정 지울 수 있게 하기"));

//일정 완료
router.get("/delete", (req, res) => res.send("일정 지울 수 있게 하기"));

module.exports = router;
