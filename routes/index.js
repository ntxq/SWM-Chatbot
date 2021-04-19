const express = require("express");
const router = express.Router();
const libKakaoWork = require("../lib/kakaoWork");

router.get("/", async (req, res, next) => {
  const users = await libKakaoWork.getUserList();

  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );

  const messages = await Promise.all([
    conversations.map((conversation) =>
      libKakaoWork.sendMessage({
        conversationId: conversation.id,
        text: "TEST",
      })
    ),
  ]);

  res.json(users, conversations, message);
});
