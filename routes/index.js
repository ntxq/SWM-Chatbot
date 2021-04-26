const express = require("express");
const router = express.Router();
const path = require("path");
const jwt = require("jsonwebtoken");
const libKakaoWork = require("../lib/kakaoWork");
const scheduleManager = require("../lib/scheduleQueue").scheduleManager;

const initialMemssage = require("../messages/initialMessage.json");
const resultMessage = require("../messages/resultMessage.json");
const registerModal = require("../messages/registerModal.json");

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
      });

      libKakaoWork.sendMessage({
        conversationId: conversation.id,
        ...message,
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
  const { action_name, message, value, react_user_id } = req.body;
  var responseMessage = {};
  switch (action_name) {
    case "progress_check":
      const arr = value.split("/");
      scheduleManager.setPeriodAchieve(arr[1], arr[0] === "success", actions);
      break;
    default:
      break;
  }

  res.json(responseMessage);
});

router.get("/register", (req, res) => {
  const query = req.query;
  const token = [query.tokenPart0, query.tokenPart1, query.tokenPart2].join(
    "."
  );

  res.cookie("token", token);

  res.sendFile(path.join(__dirname, "/../views/register.html"));
});

router.post("/submit", async (req, res) => {
  const formToken = req.cookies.token;

  await jwt.verify(formToken, process.env.SECRET, async (err, decoded) => {
    if (err) return res.end();

    const ntType = req.body.ntType;

    let alarmPeriod;
    if (ntType === "day") {
      alarmPeriod = req.body.ntTerm * 86400000;
    } else if (ntType === "days") {
      alarmPeriod = 604800000;
    } else if (ntType === "time") {
      alarmPeriod = req.body.ntTerm * 3600000;
    } else if (ntType === "once") {
      alarmPeriod = Infinity;
    }

    if (req.body.share) {
      const groupConversation = await libKakaoWork.openGroupConversations({
        user_ids: [decoded.userId],
      });

      const newGroupSchedule = {
        time: new Date(req.body.exp + " " + req.body.time),
        conversationId: [Number(decoded.conversation.id)],
        groupConversationId: groupConversation.id,
        content: req.body.subject,
        alarmPeriod,
      };

      scheduleManager.pushGroupSchedule(newGroupSchedule);

      await libKakaoWork.sendMessage({
        conversationId: groupConversation.id,
        ...resultMessage,
      });
    } else {
      const newSchedule = {
        time: new Date(req.body.exp + " " + req.body.time),
        conversationId: Number(decoded.conversation.id),
        content: req.body.subject,
        alarmPeriod,
      };

      scheduleManager.pushPersonalSchedule(newSchedule);

      await libKakaoWork.sendMessage({
        conversationId: decoded.conversation.id,
        ...resultMessage,
      });
    }

    res.end();
  });
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

module.exports = router;
