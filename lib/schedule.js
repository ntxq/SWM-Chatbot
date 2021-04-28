const libKakaoWork = require("../lib/kakaoWork");
const progressAlarmMessage = require("../messages/progressAlarmMessage.json");
const interimCheckMessage = require("../messages/interimCheckMessage.json");
const groupNoticeMessage = require("../messages/groupNoticeMessage.json");
//parent class
class Schedule {
  // deadline:Date;
  // conversationId:number;
  // alarmPeriod:number; //in ms
  // content:string;
  // periodNum:number;
  // nextAlarmTime:Date;
  // isTimeout:Boolean
  constructor(_deadline, _conversationId, _content, _alarmPeriod = Infinity) {
    //todo backend & DB DB의 데이터에 맞게 ID 수정 필요
    this.ID = 0;
    this.deadline = _deadline;
    this.conversationId = _conversationId;
    this.alarmPeriod = _alarmPeriod;
    this.content = _content;
    this.periodNum = 1;
    this.nextAlarmTime = new Date(_deadline);
    this.isTimeout = false;
    this.timeout = new Date(_deadline.getTime() + 10 * 60 * 1000);
  }

  async sendProgressMessage() {}

  setNextPeriod() {
    //주기적 알람
    if (this.getRemainTime() > 0) {
      this.nextAlarmTime.setTime(
        this.nextAlarmTime.getTime() + this.alarmPeriod
      );
      //deadline 이후에 메세지를 보내는 일은 없다
      if (this.nextAlarmTime > this.deadline) {
        this.nextAlarmTime = this.deadline;
      }
      return true;
    }
    return false;
  }

  getRemainTime() {
    return Math.round((this.deadline.getTime() - new Date().getTime()) / 60000);
  }

  async setPeriodAchieve(isAchieve, _) {}

  isPeriodicAnswerComplete() {}

  setTimeout() {
    //미응답 체크
    this.timeout = new Date(new Date().getTime() + 10 * 60 * 1000);
  }

  processAfterPeriodicAnswer() {}
}

exports.PersonalSchedule = class PersonalSchedule extends Schedule {
  constructor(_deadline, _conversationId, _content, _alarmPeriod = Infinity) {
    super(_deadline, _conversationId, _content, _alarmPeriod);

    const now = new Date();

    const timeDiff = this.deadline.getTime() - now.getTime();
    this.periodNum = Math.ceil(timeDiff / this.alarmPeriod);
    this.nextAlarmTime.setTime(
      this.deadline.getTime() - this.periodNum * this.alarmPeriod
    );
    if (this.nextAlarmTime < now) {
      this.nextAlarmTime.setTime(
        this.nextAlarmTime.getTime() + this.alarmPeriod
      );
    }
    this.periodicAnswerComplete = false;
  }

  async sendProgressMessage() {
    const formattedMessage = libKakaoWork.formatMessage(progressAlarmMessage, {
      REMAIN: this.getRemainTime(),
      CONTENT: this.content,
      ID: this.ID,
    });

    this.periodicAnswerComplete = false;
    //남은 시간 메세지 전송
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
  }

  async setPeriodAchieve(isAchieve, _) {
    if (this.periodicAnswerComplete) return;
    const achieveStr = isAchieve === true ? "성공" : "실패";
    const formattedMessage = libKakaoWork.formatMessage(interimCheckMessage, {
      REMAIN: this.getRemainTime(),
      IS_ACHIEVE: achieveStr,
    });
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
    this.periodicAnswerComplete = true;
  }

  isPeriodicAnswerComplete() {
    return this.periodicAnswerComplete;
  }

  setNextPeriod() {
    super.setNextPeriod();
  }

  processAfterPeriodicAnswer() {}
};

exports.GroupSchedule = class GroupSchedule extends Schedule {
  constructor(
    _deadline,
    _conversationId,
    _memberConversationId,
    _content,
    _alarmPeriod = Infinity
  ) {
    super(_deadline, _conversationId, _content, _alarmPeriod);
    const now = new Date();
    const timeDiff = this.deadline.getTime() - now.getTime();
    this.periodNum = Math.ceil(timeDiff / this.alarmPeriod);

    this.nextAlarmTime.setTime(
      this.deadline.getTime() - this.periodNum * this.alarmPeriod
    );
    if (this.nextAlarmTime < now) {
      this.nextAlarmTime.setTime(
        this.nextAlarmTime.getTime() + this.alarmPeriod
      );
    }

    this.memberConversationId = _memberConversationId;
    this.memberAchieveMap = new Map();
    _memberConversationId.foreach((conversationId) => {
      this.memberAchieveMap.set(conversationId, -1);
    });
  }

  async sendProgressMessage() {
    const formattedMessage = libKakaoWork.formatMessage(progressAlarmMessage, {
      REMAIN: this.getRemainTime(),
      CONTENT: this.content,
      ID: this.ID,
    });
    this.memberConversationId.foreach((conversationId) => {
      this.memberAchieveMap.set(conversationId, -1);
    });
    //남은 시간 메세지 전송
    await Promise.all(
      this.memberConversationId.map((conversationId) =>
        libKakaoWork.sendMessage({
          conversationId: conversationId,
          ...formattedMessage,
        })
      )
    );
  }

  async setPeriodAchieve(isAchieve, conversationId, is_all) {
    if (is_all === true) {
      this.memberAchieveMap.forEach(async (key, value) => {
        await this.setPeriodAchieve(isAchieve, key);
      });
      return;
    }

    if (this.memberAchieveMap.get(conversationId) !== -1) return;

    const achieveStr = isAchieve === true ? "성공" : "실패";
    const formattedMessage = libKakaoWork.formatMessage(interimCheckMessage, {
      REMAIN: this.getRemainTime(),
      IS_ACHIEVE: achieveStr,
    });
    await libKakaoWork.sendMessage({
      conversationId: conversationId,
      ...formattedMessage,
    });

    if (this.memberAchieveMap.has(conversationId)) {
      const result = isAchieve ? 1 : 0;
      this.memberAchieveMap.set(conversationId, result);
    }
  }

  isPeriodicAnswerComplete() {
    this.memberAchieveMap.foreach((value, key) => {
      if (value === -1) return false;
    });
    return true;
  }

  setNextPeriod() {
    super.setNextPeriod();
  }

  async processAfterPeriodicAnswer() {
    const formattedMessage = libKakaoWork.formatMessage(
      interimCheckGroupMessage,
      {
        TOTAL: this.memberAchieveMap.size,
        COUNT: this.memberAchieveMap.values().filter((x) => x == 1).length,
        REMAIN: this.getRemainTime(),
        IS_ACHIEVE: achieveStr,
      }
    );

    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
  }
};
