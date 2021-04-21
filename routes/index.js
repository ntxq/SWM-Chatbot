const express = require("express");
const path = require("path");
const router = express.Router();
const libKakaoWork = require("../lib/kakaoWork");
const initialMessage = require("../messages/initialMessage.json");
const searchModal = require("../messages/searchModal.json");
const resultMessage = require("../messages/resultMessage.json");

//Production에서는 router.post("/chatbot", ...)로 변경
router.get("/", async (req, res) => {
  // const users = await libKakaoWork.getUserListAll();
  const users = [{ id: 2603836 }];

  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );

  const messages = await Promise.all([
    conversations.map((conversation) =>
      libKakaoWork.sendMessage({
        conversationId: conversation.id,
        ...initialMessage,
      })
    ),
  ]);

  res.end();
});

router.get("/delete", (req, res) =>
  res.send("검색결과에서 자기 정보를 뺄 수 있도록 해주기.")
);

router.post("/request", (req, res) => {
  const { value } = req.body;

  res.json({ view: searchModal });
});

router.post("/callback", async (req, res) => {
  const { actions, message } = req.body;

  await libKakaoWork.sendMessage({
    conversationId: message.conversation_id,
    ...resultMessage,
  });

  res.end();
});

router.get("/result", (req, res) => {
  res.send("결과창");
});

module.exports = router;
