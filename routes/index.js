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
  // const users = await libKakaoWork.getUserListAll();
  //곽병곤: 2603836
  const users = [{ id: 2603836 }];

  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );

  //언젠가는 리팩토링...
  const messages = await Promise.all([
    conversations.map((conversation) => {
      tokenLib.genToken(conversation.id, (err, token) => {
        if (err) console.log(err);

        const tokenURL = token
          .split(".")
          .map((val, i) => "id" + i + "=" + val)
          .join("&");

        //하드코딩해서 나중에 수정필요2 + initialMessage URL도 소마 워크스페이스 URL로 수정필요
        const tokenMessage = { ...initialMessage };
        tokenMessage.blocks[1].value = tokenMessage.blocks[1].value.concat(
          tokenURL
        );

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
  //Query string으로 받은 토큰을 쿠키에 저장
  const query = req.query;

  res.cookie("id0", query.id0);
  res.cookie("id1", query.id1);
  res.cookie("id2", query.id2);

  res.sendFile(path.join(__dirname + "/../views/register.html"));
});

router.post("/submit", (req, res) => {
	//토큰 추출 후 Conversation Id로 변환 => 메시지 전송
  const formToken = req.body.token;
  tokenLib.verifyToken(formToken, (err, {data}) => {
		
    libKakaoWork.sendMessage({
      conversationId: data,
      ...resultMessage,
    });
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

//일정 완료
router.get("/delete", (req, res) => res.send("일정 지울 수 있게 하기"));

module.exports = router;
