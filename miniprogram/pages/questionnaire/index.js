Page({
  data: {
    type: '',
    phase: 1,
    phaseText: '第1周',
    questionnaireTitle: '基线评估问卷',
    showUsageRecord: true,
    showFeedback: false,
    questions: [],
    answers: [],
    usageData: {
      entertainment: { frequency: '', hours: '' },
      learning: { frequency: '', hours: '' },
      social: { frequency: '', hours: '' }
    },
    feedback: '',
    isSubmitting: false
  },

  onLoad: function(options) {
    const type = options.type || 'baseline';
    const app = getApp();
    const phase = app.globalData.phase || 1;

    let config = this.getQuestionnaireConfig(type, phase);

    this.setData({
      type: type,
      phase: phase,
      ...config
    });

    wx.setNavigationBarTitle({
      title: config.questionnaireTitle
    });
  },

  getQuestionnaireConfig(type, phase) {
    const baseQuestions = [
      '明知长时间刷短视频不好但又放不下，这令我很烦躁。',
      '我很难控制刷短视频的时长，有种"越刷越不够"的感觉。',
      '倘若不能碰手机（比如手机没电、被老师统一管理时），我会觉得心里发慌、难受或想发脾气。',
      '长时间刷短视频后，我会觉得空虚疲累。',
      '长时间刷短视频后，我会因逝去的时光而自责自疚。',
      '长时间刷短视频，明显地干扰了我的学习和生活。'
    ];

    const interventionQuestions = [
      '长时间的刷短视频后，我会觉得空虚疲累。',
      '长时间的刷短视频后，我会因逝去的时光而自责自疚。',
      '长时间刷短视频，明显地干扰了我的学习和生活。',
      '倘若不能碰手机（比如手机没电、被老师统一管理时），我会觉得心里发慌、难受或想发脾气。',
      '明知长时间刷短视频不好但又放不下，这令我很烦躁。',
      '我很难控制刷短视频的时长，有种"越刷越不够"的感觉。',
      '我认为本周实施的短视频使用干预方案对我是有效的。'
    ];

    let phaseText = '';
    let questionnaireTitle = '';
    let questions = [];
    let showUsageRecord = true;
    let showFeedback = false;

    switch (type) {
      case 'baseline':
        phaseText = '第1周（基线期）';
        questionnaireTitle = '基线评估问卷';
        questions = baseQuestions;
        showUsageRecord = true;
        break;
      case 'intervention1':
        phaseText = '第2周（干预期）';
        questionnaireTitle = '第2周问卷';
        questions = interventionQuestions;
        showUsageRecord = true;
        break;
      case 'intervention2':
        phaseText = '第3周（干预期）';
        questionnaireTitle = '第3周问卷 & 干预结束';
        questions = [...interventionQuestions, '恭喜您完成了为期三周的短视频依赖干预任务！非常感谢您的全程参与！'];
        showUsageRecord = true;
        showFeedback = true;
        break;
    }

    const answers = new Array(questions.length).fill(0);

    return {
      phaseText,
      questionnaireTitle,
      questions,
      answers,
      showUsageRecord,
      showFeedback
    };
  },

  onUsageChange(e) {
    const type = e.currentTarget.dataset.type;
    const field = e.currentTarget.dataset.field;
    const usageData = { ...this.data.usageData };
    usageData[type][field] = e.detail.value;
    this.setData({ usageData });
  },

  onSelectOption(e) {
    const index = e.currentTarget.dataset.index;
    const value = parseInt(e.currentTarget.dataset.value);
    const answers = [...this.data.answers];
    answers[index] = value;
    this.setData({ answers });
  },

  onFeedbackChange(e) {
    this.setData({ feedback: e.detail.value });
  },

  onSubmit() {
    if (this.data.isSubmitting) return;

    const hasEmptyAnswer = this.data.answers.some(a => a === 0);
    if (hasEmptyAnswer) {
      wx.showToast({
        title: '请完成所有题目',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSubmitting: true });

    const app = getApp();
    const { type, phase, answers, usageData, feedback } = this.data;

    const questionnaires = wx.getStorageSync('questionnaires') || [];
    questionnaires.push({
      type: type,
      phase: phase,
      answers: answers,
      usageData: usageData,
      feedback: feedback || '',
      score: answers.reduce((sum, val) => sum + val, 0),
      createTime: new Date().toISOString()
    });
    wx.setStorageSync('questionnaires', questionnaires);

    setTimeout(() => {
      this.setData({ isSubmitting: false });
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      if (type === 'baseline') {
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/result/index'
          });
        }, 1500);
      } else if (type === 'intervention1') {
        app.globalData.phase = 2;
        wx.setStorageSync('phase', 2);
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/usage-form/index?day=1'
          });
        }, 1500);
      } else if (type === 'intervention2') {
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/welcome/index'
          });
        }, 1500);
      }
    }, 500);
  }
});