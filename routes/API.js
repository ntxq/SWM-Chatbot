const express = require("express");
const API = express.Router();
const jwt = require("jsonwebtoken");
const libKakaoWork = require("../lib/kakaoWork");
const { scheduleManager } = require("../lib/scheduleQueue");
const { dbConnection } = require("../lib/mysqlConnection");
const path = require("path");

const resultMessage = require("../messages/resultMessage.json");
const inviteMessage = require("../messages/inviteMessage.json");

API.post("/submit", async (req, res) => {
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

    //n요일마다 알림일경우, 가장 최근의 n요일을 시작일로 설정.
    const stDate = new Date();
    if (ntType === "days") {
      const dayDiff = req.body.ntTerm - stDate.getDay();

      if (dayDiff > 0) {
        stDate.setDate(stDate.getDate() + dayDiff - 7);
      } else if (dayDiff < 0) {
        stDate.setDate(stDate.getDate() + dayDiff);
      }
    }

    if (req.body.share) {
      const groupConversation = await libKakaoWork.openGroupConversations({
        user_ids: [decoded.userId],
      });

      const newGroupSchedule = {
        time: new Date(req.body.exp + " " + req.body.time),
        conversationId: groupConversation.id,
        memberConversationId: [Number(decoded.conversation.id)],
        content: req.body.subject,
        alarmPeriod,
      };

      scheduleManager.pushGroupSchedule({
        ...newGroupSchedule,

        //For sql
        userId: decoded.userId,
        name: decoded.conversation.name,
        stDate,
        ntType,
      });

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

      scheduleManager.pushPersonalSchedule({
        ...newSchedule,

        //For sql
        userId: decoded.userId,
        name: decoded.conversation.name,
        stDate,
        ntType,
      });

      await libKakaoWork.sendMessage({
        conversationId: decoded.conversation.id,
        ...resultMessage,
      });
    }

    res.end();
  });
});

API.get("/api/mySchedule", async (req, res) => {
  const token = req.cookies.token;

  await jwt.verify(token, process.env.SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ success: false });

    dbConnection.query(
      "pr_usr_todo_prg",
      [decoded.userId, "@result"],
      (error, results) => {
        if (error) res.status(500).json({ success: false });

        const TODO = results[1].map((data) => ({
          td_id: data.tdo_id,
          state: data.prg_state,
          public: data.public,
          subject: data.subject,
          st_date: data.st_date,
          ed_date: data.ed_date,
          ntType: data.nt_type,

          //DB수정 예정
          //ntTerm: data.ntTerm
          //미구현
          //usr_cnt: data.usr_cnt
        }));

        res.json({
          success: true,
          name: decoded.conversation.name,
          TODO,
        });
      }
    );
  });
});

API.get("/api/sharedSchedule", async (req, res) => {
  dbConnection.query(
    "pr_existing_public_todo",
    ["@result"],
    (error, results) => {
      if (error) res.status(500).json({ success: false });

      const TODO = results[1].map((data) => ({
        td_id: data.tdo_id,
        state: "progress",
        public: true,
        subject: data.subject,
        st_date: data.st_date,
        ed_date: data.ed_date,
        ntType: data.nt_type,

        //DB수정 예정
        //ntTerm: data.ntTerm
        //미구현
        //usr_cnt: data.usr_cnt
      }));

      res.json({
        success: true,
        TODO,
      });
    }
  );
});

API.post("/api/joinShared", async (req, res) => {
  const token = req.cookies.token;

  await jwt.verify(token, process.env.SECRET, async (err, decoded) => {
    if (err) return res.status(401).send({ success: false });

    await scheduleManager.groupMemberInsert(
      req.body.td_id,
      decoded.conversationId,
      decoded.userId,
      decoded.conversation.name
    );

    res.json({ success: true });
  });
});

module.exports = API;
