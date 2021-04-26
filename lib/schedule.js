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

  async sendProgressMessage() {
    const formattedMessage = libKakaoWork.formatMessage(progressAlarmMessage, {
      REMAIN: this.getRemainTime(),
      CONTENT: this.content,
      ID: this.ID,
    });

    //남은 시간 메세지 전송
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
  }

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

  async setPeriodAchieve(isAchieve) {
    const achieveStr = isAchieve === true ? "성공" : "실패";
    const formattedMessage = libKakaoWork.formatMessage(interimCheckMessage, {
      REMAIN: this.getRemainTime(),
      IS_ACHIEVE: achieveStr,
    });
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
  }

  setTimeout() {
    //미응답 체크
    this.timeout = new Date(new Date().getTime() + 10 * 60 * 1000);
  }
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
  }

  async sendProgressMessage() {
    super.sendProgressMessage();
  }

  setNextPeriod() {
    super.setNextPeriod();
  }
};

exports.GroupSchedule = class GroupSchedule extends Schedule {
  constructor(
    _deadline,
    _conversationId,
    _groupConversationId,
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

    this.groupConversationId = _groupConversationId;
  }

  async sendProgressMessage() {
    super.sendProgressMessage();
  }

  setNextPeriod() {
    super.setNextPeriod();
  }
};
