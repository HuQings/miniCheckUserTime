Page({
  data: {
    group: '',
    groupName: '',
    groupClass: '',
    groupDescription: '',
    showIntervention: false,
    showConsent: false,
    hasConsent: false,
    canProceed: false,
    showDecline: false,
    showFeedback: false,
    showContinueOption: false,
    feedback: '',
    interventionText: ''
  },

  onLoad: function() {
    this.calculateGroupResult();
  },

  calculateGroupResult() {
    const dailyRecords = wx.getStorageSync('dailyRecords') || [];
    const questionnaires = wx.getStorageSync('questionnaires') || [];

    const baselineRecords = dailyRecords.filter(r => r.phase === 1);
    const baselineQuestionnaire = questionnaires.find(q => q.type === 'baseline');

    let totalUnnecessaryHours = 0;
    baselineRecords.forEach(record => {
      const data = record.usageData;
      const entertainmentHours = parseFloat(data.entertainment.hours) || 0;
      const socialHours = parseFloat(data.social.hours) || 0;
      totalUnnecessaryHours += entertainmentHours + socialHours;
    });

    const avgDailyUnnecessaryHours = baselineRecords.length > 0 ? totalUnnecessaryHours / baselineRecords.length : 0;
    const questionnaireScore = baselineQuestionnaire ? baselineQuestionnaire.score : 0;

    let group = 'low';
    if (avgDailyUnnecessaryHours >= 8) {
      group = 'high';
    } else if (avgDailyUnnecessaryHours >= 4) {
      group = 'medium';
    } else {
      group = 'low';
    }

    wx.setStorageSync('group', group);
    this.setGroupInfo(group, questionnaireScore, avgDailyUnnecessaryHours.toFixed(1));
  },

  setGroupInfo(group, questionnaireScore, avgDailyUnnecessaryHours) {
    let groupName = '';
    let groupClass = '';
    let groupDescription = '';
    let showIntervention = false;
    let showConsent = false;
    let showDecline = false;
    let showFeedback = false;
    let showContinueOption = false;
    let interventionText = '';

    if (group === 'low') {
      groupName = '低依赖组';
      groupClass = 'low';
      groupDescription = `恭喜您！与本轮受试者相比而言，您的短视频依赖水平为低度。\n\n（日均非必要使用 ${avgDailyUnnecessaryHours} 小时，问卷得分 ${questionnaireScore}/30）`;
      showContinueOption = true;
      showConsent = true;
      showDecline = true;
      interventionText = '如果您想继续参加本项目第二阶段的干预活动，我们将为您推送适当的干预方案。';
    } else if (group === 'medium') {
      groupName = '中度依赖组';
      groupClass = 'medium';
      groupDescription = `基于基线期数据评估分析，您在短视频使用方面亟需做出调整。\n\n（日均非必要使用 ${avgDailyUnnecessaryHours} 小时，问卷得分 ${questionnaireScore}/30）`;
      showIntervention = true;
      showConsent = true;
      showDecline = true;
      interventionText = '我们诚挚邀请您继续参与本项目第二阶段的研究性活动，届时将为您推送干预方案。';
    } else if (group === 'high') {
      groupName = '高依赖组';
      groupClass = 'high';
      groupDescription = `基于基线期数据评估分析，您在短视频使用方面亟需做出调整。\n\n（日均非必要使用 ${avgDailyUnnecessaryHours} 小时，问卷得分 ${questionnaireScore}/30）`;
      showIntervention = true;
      showConsent = true;
      showDecline = false;
      interventionText = '我们诚挚邀请您继续参与本项目第二阶段的研究性活动，届时将为您推送干预方案。';
    }

    this.setData({
      group,
      groupName,
      groupClass,
      groupDescription,
      showIntervention,
      showConsent,
      showDecline,
      showFeedback,
      showContinueOption,
      interventionText
    });
  },

  onConsentChange(e) {
    this.setData({
      hasConsent: e.detail.value.includes('agreed'),
      canProceed: e.detail.value.includes('agreed')
    });
  },

  onFeedbackChange(e) {
    this.setData({ feedback: e.detail.value });
  },

  onAccept() {
    if (!this.data.canProceed) {
      wx.showToast({
        title: '请先同意参与',
        icon: 'none'
      });
      return;
    }

    const app = getApp();
    app.globalData.phase = 2;
    wx.setStorageSync('phase', 2);

    wx.showToast({
      title: '即将进入干预期',
      icon: 'success'
    });

    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/usage-form/index?day=1'
      });
    }, 1500);
  },

  onDecline() {
    this.setData({
      showIntervention: false,
      showContinueOption: false,
      showFeedback: true
    });
  },

  onSubmitFeedback() {
    const feedbacks = wx.getStorageSync('feedbacks') || [];
    feedbacks.push({
      feedback: this.data.feedback,
      group: this.data.group,
      createTime: new Date().toISOString()
    });
    wx.setStorageSync('feedbacks', feedbacks);

    wx.showToast({
      title: '感谢您的反馈',
      icon: 'success'
    });

    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/welcome/index'
      });
    }, 1500);
  }
});