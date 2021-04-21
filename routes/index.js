const express = require("express");
const router = express.Router();
const libKakaoWork = require("../lib/kakaoWork");
const initialMessage = require("../messages/initialMessage.json");
const searchModal = require("../messages/searchModal.json");

//Production에서는 router.post("/chatbot", ...)로 변경
router.get("/", async (req, res, next) => {
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
  const { value } = res.body;

  return res.json({ view: searchModal });
});

module.exports = router;
