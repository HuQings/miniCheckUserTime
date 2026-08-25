const likertOptions = [
  { value: '1', label: 'A.完全不符合' },
  { value: '2', label: 'B.不太符合' },
  { value: '3', label: 'C.不置可否' },
  { value: '4', label: 'D.比较符合' },
  { value: '5', label: 'E.完全符合' }
];

const dependencyQuestions = [
  { field: 'fatigue', text: '长时间的刷短视频后，我会觉得空虚或疲累。' },
  { field: 'guilt', text: '长时间的刷短视频后，我会因逝去的时光而自责或自疚。' },
  { field: 'interference', text: '长时间刷短视频，明显地干扰了我的学习或生活。' },
  { field: 'withdrawal', text: '倘若不能碰手机（比如手机没电、被统一管理时），我会觉得心里发慌、难受或想发脾气。' },
  { field: 'annoyance', text: '明知长时间刷短视频不好但又放不下，这令我很烦躁。' },
  { field: 'control', text: '我很难控制刷短视频的时长，有种“越刷越不够”的感觉。' }
];

const usageFields = [
  { title: '休闲娱乐类', countField: 'leisureCount', hoursField: 'leisureHours' },
  { title: '学习工作类', countField: 'studyCount', hoursField: 'studyHours' },
  { title: '社交类', countField: 'socialCount', hoursField: 'socialHours' }
];

const padTimePart = value => String(value).padStart(2, '0');

const formatCompletionTime = value => {
  const source = value && value.$date ? value.$date : value;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
};

const defaultSurveyConfig = {
  surveyVersion: 'short-video-v4',
  projectName: '国家级大创项目实验平台',
  projectNumber: '202514390020',
  period: 24,
  usageFields,
  likertOptions,
  groupOptions: [
    { value: '1', label: '1组' },
    { value: '2', label: '2组' }
  ],
  genderOptions: ['男', '女'],
  gradeOptions: ['大一', '大二', '大三', '大四', '研究生及以上'],
  primaryUsageOptions: ['休闲娱乐类', '学习工作类', '社交类'],
  dependencyQuestions,
  readinessOptions: [
    { value: 'precontemplation', label: 'A. 前意向期：我目前没有觉得这是问题，也不打算改变。' },
    { value: 'contemplation', label: 'B. 意向期：我意识到有负面影响，但最近（1个月内）没有行动打算。' },
    { value: 'preparation', label: 'C. 准备期：我打算在接下来一个月内开始减少使用。' },
    { value: 'action', label: 'D. 行动期：我已经开始减少使用，但维持时间不足6个月。' },
    { value: 'maintenance', label: 'E. 维持期：我已经成功减少使用超过6个月。' }
  ],
  consentText: '我同意参加该项目为期24天的实验活动，我承诺会全程参与。',
  interventionConsentText: '我同意参加该项目第二阶段为期三周的干预活动，我承诺会全程参与。',
  controlConsentText: '我同意参加该项目第二阶段为期三周的问卷追踪活动，我承诺会全程参与。',
  interventionQuestion: {
    field: 'interventionEffective',
    text: '我认为本周实施的短视频使用干预方案，总体上是有效的。'
  },
  feedbackQuestion: '请您给我们设计的短视频使用干预方案提出改进的建议：',
  closingThanks: '非常感谢您的全程参与！祝您生活愉快！'
};

function getDayMeta(day) {
  const isBaseline = day <= 3;
  const interventionDay = Math.max(1, day - 3);
  const week = isBaseline ? 1 : Math.ceil(interventionDay / 7) + 1;
  const weekDay = isBaseline ? day : ((interventionDay - 1) % 7) + 1;
  return {
    week,
    weekDay,
    phase: isBaseline ? '基线期' : '干预期',
    title: `第${week}周第${weekDay}天`
  };
}

function getScaleQuestions(day, config = defaultSurveyConfig, group = '') {
  const meta = getDayMeta(day);
  const questionsSource = config.dependencyQuestions || dependencyQuestions;
  if (day === 1) {
    return questionsSource.map((item, index) => ({ ...item, no: index + 7 }));
  }
  if (day === 3 || day > 3) {
    const questions = questionsSource.map((item, index) => ({ ...item, no: index + 4 }));
    if (day > 3 && meta.weekDay === 7 && group === '1' && config.interventionQuestion) {
      questions.push({ ...config.interventionQuestion, no: 10 });
    }
    return questions;
  }
  return [];
}

Page({
  data: {
    currentDay: 1,
    period: 24,
    dayMeta: getDayMeta(1),
    usageFields,
    likertOptions,
    scaleQuestions: getScaleQuestions(1),
    groupOptions: defaultSurveyConfig.groupOptions,
    genderOptions: defaultSurveyConfig.genderOptions,
    gradeOptions: defaultSurveyConfig.gradeOptions,
    primaryUsageOptions: defaultSurveyConfig.primaryUsageOptions,
    readinessOptions: defaultSurveyConfig.readinessOptions,
    consentText: defaultSurveyConfig.consentText,
    feedbackQuestion: defaultSurveyConfig.feedbackQuestion,
    closingThanks: defaultSurveyConfig.closingThanks,
    surveyConfig: defaultSurveyConfig,
    participantGroup: '',
    isInterventionGroup: false,
    interventionVideos: [],
    watchedVideoCount: 0,
    interventionVideo: null,
    selectedVideoIndex: 0,
    previousIntervention: null,
    isVideoLoading: false,
    videoStarted: false,
    videoCompleted: false,
    formData: {
      group: '',
      gender: '',
      grade: '',
      primaryUsage: '',
      leisureCount: '',
      leisureHours: '',
      studyCount: '',
      studyHours: '',
      socialCount: '',
      socialHours: '',
      scale: {},
      readiness: '',
      consent: '',
      feedback: ''
    },
    isSubmitting: false,
    isReflectionSubmitting: false,
    showModal: false,
    adviceData: null
  },

  onLoad: function(options) {
    const period = getApp().globalData.period || 24;
    const day = parseInt(options.day) || 1;
    const dayMeta = getDayMeta(day);
    this.setData({
      currentDay: day,
      period: period,
      dayMeta: dayMeta,
      scaleQuestions: getScaleQuestions(day)
    });
    
    wx.setNavigationBarTitle({
      title: `${dayMeta.title} - 短视频调查`
    });

    this.loadSurveyConfig(day);
    if (day > 1) {
      this.loadParticipantContext(day);
    }
  },

  loadParticipantContext(day) {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getCheckinProgress',
        period: this.data.period
      }
    }).then(res => {
      const progressData = res.result && res.result.success ? res.result.data : null;
      const group = progressData ? progressData.group : '';
      if (!group) {
        return;
      }
      const isInterventionGroup = group === '1';
      const previousRecord = day >= 5 && progressData.records
        ? progressData.records.find(record => record.day === day - 1)
        : null;
      const previousIntervention = previousRecord && previousRecord.interventionVideoTitle
        ? {
            day: previousRecord.day,
            title: previousRecord.interventionVideoTitle,
            completed: previousRecord.videoCompleted === true,
            completedTime: formatCompletionTime(previousRecord.videoCompletedTime)
          }
        : null;
      const config = this.data.surveyConfig;
      this.setData({
        participantGroup: group,
        isInterventionGroup,
        previousIntervention,
        consentText: day === 3
          ? (isInterventionGroup ? config.interventionConsentText : config.controlConsentText)
          : config.consentText,
        scaleQuestions: getScaleQuestions(day, config, group)
      });
      if (day > 3 && isInterventionGroup) {
        this.loadInterventionVideos(day);
      }
    }).catch(err => {
      console.error('获取参与者分组失败:', err);
    });
  },

  loadInterventionVideos(day, videoIndex = 0) {
    this.setData({ isVideoLoading: true });
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getInterventionVideos',
        day,
        videoIndex
      }
    }).then(res => {
      if (res.result && res.result.success && res.result.data) {
        const resultData = res.result.data;
        const update = {
          interventionVideos: resultData.videos || this.data.interventionVideos,
          watchedVideoCount: resultData.watchedCount || 0,
          isVideoLoading: false
        };
        if (resultData.video) {
          update.interventionVideo = resultData.video;
          update.selectedVideoIndex = resultData.video.index;
          update.videoStarted = false;
          update.videoCompleted = false;
        }
        this.setData(update);
        return;
      }
      throw new Error((res.result && res.result.errMsg) || '视频加载失败');
    }).catch(err => {
      console.error('获取干预视频失败:', err);
      this.setData({ isVideoLoading: false });
      wx.showToast({ title: err.message || '视频加载失败，请重试', icon: 'none' });
    });
  },

  onVideoSelect(e) {
    const videoIndex = Number(e.currentTarget.dataset.index);
    const video = this.data.interventionVideos.find(item => item.index === videoIndex);
    if (!video || video.watched) {
      wx.showToast({ title: '该视频已观看', icon: 'none' });
      return;
    }
    if (this.data.videoStarted || this.data.videoCompleted) {
      wx.showToast({ title: '视频已开始播放，不能更换', icon: 'none' });
      return;
    }
    if (videoIndex === this.data.selectedVideoIndex) {
      return;
    }
    this.loadInterventionVideos(this.data.currentDay, videoIndex);
  },

  loadSurveyConfig(day) {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getSurveyConfig'
      }
    }).then(res => {
      if (res.result && res.result.data) {
        const config = {
          ...defaultSurveyConfig,
          ...res.result.data
        };
        getApp().globalData.period = config.period || 24;
        this.setData({
          period: config.period || 24,
          usageFields: config.usageFields || usageFields,
          likertOptions: config.likertOptions || likertOptions,
          groupOptions: config.groupOptions || defaultSurveyConfig.groupOptions,
          genderOptions: config.genderOptions || defaultSurveyConfig.genderOptions,
          gradeOptions: config.gradeOptions || defaultSurveyConfig.gradeOptions,
          primaryUsageOptions: config.primaryUsageOptions || defaultSurveyConfig.primaryUsageOptions,
          readinessOptions: config.readinessOptions || defaultSurveyConfig.readinessOptions,
          consentText: day === 3 && this.data.participantGroup
            ? (this.data.participantGroup === '1' ? config.interventionConsentText : config.controlConsentText)
            : (config.consentText || defaultSurveyConfig.consentText),
          feedbackQuestion: config.feedbackQuestion || defaultSurveyConfig.feedbackQuestion,
          closingThanks: config.closingThanks || defaultSurveyConfig.closingThanks,
          surveyConfig: config,
          scaleQuestions: getScaleQuestions(day, config, this.data.participantGroup)
        });
      }
    }).catch(err => {
      console.error('获取问卷配置失败:', err);
    });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  onChoiceTap(e) {
    const { field, value } = e.currentTarget.dataset;
    const update = { [`formData.${field}`]: value };
    if (field === 'group') {
      update.participantGroup = value;
      update.isInterventionGroup = value === '1';
    }
    this.setData(update);
  },

  onScaleTap(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`formData.scale.${field}`]: value });
  },

  onVideoEnded() {
    this.setData({ videoStarted: true, videoCompleted: true });
    wx.showToast({ title: '今日视频已完成', icon: 'success' });
  },

  onVideoPlay() {
    if (!this.data.videoStarted) {
      this.setData({ videoStarted: true });
    }
  },

  onRetryVideo() {
    if (this.data.selectedVideoIndex) {
      this.loadInterventionVideos(this.data.currentDay, this.data.selectedVideoIndex);
      return;
    }
    this.loadInterventionVideos(this.data.currentDay);
  },

  validateForm() {
    const { formData, currentDay, usageFields, scaleQuestions } = this.data;

    if (currentDay === 1 && (!formData.group || !formData.gender || !formData.grade || !formData.primaryUsage)) {
      wx.showToast({ title: '请完成基础信息', icon: 'none' });
      return false;
    }

    if (currentDay === 3 && formData.consent !== 'agreed') {
      wx.showToast({ title: '请确认知情同意', icon: 'none' });
      return false;
    }

    if (currentDay === 3 && !formData.readiness) {
      wx.showToast({ title: '请选择行为改变阶段', icon: 'none' });
      return false;
    }

    if (currentDay > 3 && this.data.isInterventionGroup) {
      if (!this.data.selectedVideoIndex) {
        wx.showToast({ title: '请先选择今日视频', icon: 'none' });
        return false;
      }
      if (!this.data.videoCompleted) {
        wx.showToast({ title: '请先完整观看今日视频', icon: 'none' });
        return false;
      }
    }

    for (let i = 0; i < usageFields.length; i++) {
      const item = usageFields[i];
      const count = formData[item.countField];
      const hours = formData[item.hoursField];
      if (count === '' || parseFloat(count) < 0 || hours === '' || parseFloat(hours) < 0) {
        wx.showToast({ title: `请填写${item.title}数据`, icon: 'none' });
        return false;
      }
    }

    for (let i = 0; i < scaleQuestions.length; i++) {
      const question = scaleQuestions[i];
      if (!formData.scale[question.field]) {
        wx.showToast({ title: `请选择第${question.no}题`, icon: 'none' });
        return false;
      }
    }

    return true;
  },

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    if (this.data.isSubmitting) {
      return;
    }

    if (this.data.videoCompleted && this.data.interventionVideo) {
      wx.createVideoContext('intervention-player', this).stop();
    }

    this.setData({ isSubmitting: true });

    wx.showLoading({
      title: '分析中...'
    });

    const { formData, currentDay, period, participantGroup, videoCompleted, selectedVideoIndex } = this.data;
    const app = getApp();

    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'analyzeUsage',
        day: currentDay,
        period: period,
        data: {
          ...formData,
          group: participantGroup || formData.group,
          videoCompleted,
          selectedVideoIndex
        },
        openid: app.globalData.openid,
        userInfo: app.globalData.userInfo
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        if (currentDay <= 4 || participantGroup !== '1' || !this.data.previousIntervention) {
          this.setData({ isSubmitting: false });
          wx.reLaunch({ url: '/pages/welcome/index' });
          return;
        }
        const previousIntervention = this.data.previousIntervention;
        const completionText = previousIntervention.completed ? '已完整观看' : '未完整观看';
        const completionTimeText = previousIntervention.completedTime
          ? `，完成时间：${previousIntervention.completedTime}`
          : '';
        this.setData({
          adviceData: {
            isFinal: false,
            resultType: 'previousIntervention',
            adviceList: [{
              content: `上一天选择的干预视频：${previousIntervention.title}`,
              tips: `完成情况：${completionText}${completionTimeText}`
            }]
          },
          showModal: true,
          isSubmitting: false
        });
      } else {
        wx.showToast({
          title: (res.result && res.result.errMsg) || '分析失败，请重试',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('云函数调用失败:', err);
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    });
  },

  onCloseModal() {
    this.setData({
      showModal: false,
      adviceData: null
    });
  },

  onReflectionSubmit(e) {
    if (this.data.isReflectionSubmitting) return;
    const { taskEvaluation } = e.detail;
    this.setData({ isReflectionSubmitting: true });

    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'saveInterventionReflection',
        day: this.data.currentDay,
        taskEvaluation
      }
    }).then(res => {
      if (!res.result || !res.result.success) {
        throw new Error((res.result && res.result.errMsg) || '保存失败');
      }
      this.setData({
        isReflectionSubmitting: false,
        showModal: false,
        adviceData: null
      });
      wx.reLaunch({ url: '/pages/welcome/index' });
    }).catch(err => {
      console.error('保存昨日干预完成情况失败:', err);
      this.setData({ isReflectionSubmitting: false });
      wx.showToast({ title: err.message || '保存失败，请重试', icon: 'none' });
    });
  },

  onReflectionClose() {
    if (this.data.isReflectionSubmitting) return;
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.reLaunch({ url: '/pages/welcome/index' });
  },

  onRetry() {
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.navigateBack();
  },

  onFinish() {
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.reLaunch({
      url: '/pages/welcome/index'
    });
  }
});