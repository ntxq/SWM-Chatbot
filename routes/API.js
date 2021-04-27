const express = require("express");
const API = express.Router();
const jwt = require("jsonwebtoken");
const libKakaoWork = require("../lib/kakaoWork");
const scheduleManager = require("../lib/scheduleQueue");
const path = require("path");

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
        stDate,
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
        stDate,
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

API.get("/api/mySchedule", async (req, res) => {
  const formToken = req.cookies.token;

  await jwt.verify(formToken, process.env.SECRET, async (err, decoded) => {
    if (err)
      return res.status(401).send({ success: false, error: "Bad token" });

    //SQL쿼리
    const placeholderData = {
      name: "Kwak",
      TODO: [
        {
          td_id: 1,
          state: "progress",
          public: false,
          subject: "Temporary",
          st_date: "2021-04-27",
          st_time: "00:24",
          ed_date: "2021-04-31",
          ed_time: "15:30",
          ntType: "day",
          ntTerm: 1,
          usr_cnt: 1,
          prgs: [
            {
              prg_type: "individual",
              cur_amt: 2,
              cum_amt: 2,
              tot_amt: 5,
              prg_per: 0.4,
            },
          ],
        },
      ],
    };

    res.json(placeholderData);
  });
});

module.exports = API;
